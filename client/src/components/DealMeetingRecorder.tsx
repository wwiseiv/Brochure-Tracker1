import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";
import {
  Mic,
  Square,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  Clock,
} from "lucide-react";
import type { Deal, MeetingRecording } from "@shared/schema";

interface DealMeetingRecorderProps {
  deal: Deal;
  onComplete?: (recording: MeetingRecording) => void;
}

type RecordingState = "idle" | "recording" | "processing" | "completed" | "error";

const MAX_RECORDING_SECONDS = 90 * 60; // 90 minutes

export function DealMeetingRecorder({ deal, onComplete }: DealMeetingRecorderProps) {
  const { toast } = useToast();
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    summary?: string;
    sentiment?: string;
    emailSent?: boolean;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIdRef = useRef<number | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  const { uploadFile } = useUpload();

  const createRecordingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/meeting-recordings", {
        dealId: deal.id,
        businessName: deal.businessName,
        contactName: deal.contactName,
        businessPhone: deal.businessPhone,
        status: "recording",
      });
      return response.json();
    },
  });

  const completeRecordingMutation = useMutation({
    mutationFn: async ({ recordingId, recordingUrl, durationSeconds }: { 
      recordingId: number;
      recordingUrl: string;
      durationSeconds: number;
    }) => {
      const response = await apiRequest("POST", `/api/meeting-recordings/${recordingId}/complete`, {
        recordingUrl,
        durationSeconds,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      audioBlobRef.current = null;
      setState("completed");
      setAnalysisResult({
        summary: data.aiSummary,
        sentiment: data.sentiment,
        emailSent: data.emailSent,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-recordings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deals", deal.id] });
      onComplete?.(data);
      toast({
        title: "Meeting recorded",
        description: data.emailSent 
          ? "Recording analyzed and sent to office for review!"
          : "Recording analyzed successfully.",
      });
    },
    onError: (error) => {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to process recording");
      toast({
        title: "Processing failed",
        description: "Failed to analyze the recording. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const processRecording = useCallback(async (audioBlob: Blob, mimeType: string) => {
    if (!recordingIdRef.current) {
      setState("error");
      setErrorMessage("Recording ID not found");
      return;
    }

    setState("processing");

    try {
      const extension = mimeType.includes("mp4") ? "m4a" : "webm";
      const file = new File([audioBlob], `meeting-${deal.id}-${Date.now()}.${extension}`, { type: mimeType });
      const uploadedUrl = await uploadFile(file);
      
      await completeRecordingMutation.mutateAsync({
        recordingId: recordingIdRef.current,
        recordingUrl: uploadedUrl,
        durationSeconds: recordingTime,
      });
    } catch (error) {
      console.error("Error processing recording:", error);
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload recording");
    }
  }, [deal.id, recordingTime, uploadFile, completeRecordingMutation]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage("");
      setState("recording");
      setRecordingTime(0);
      audioChunksRef.current = [];
      audioBlobRef.current = null;

      const recording = await createRecordingMutation.mutateAsync();
      recordingIdRef.current = recording.id;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioBlobRef.current = audioBlob;
        await processRecording(audioBlob, mimeType);
      };

      mediaRecorder.start(1000);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            toast({
              title: "Maximum length reached",
              description: "Recording automatically stopped at 90 minutes.",
            });
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (error: any) {
      console.error("Error starting recording:", error);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setState("idle");
      recordingIdRef.current = null;

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage("Microphone permission denied. Please allow microphone access in your browser settings.");
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access in your browser settings.",
          variant: "destructive",
        });
      } else {
        setErrorMessage(error.message || "Failed to start recording");
        toast({
          title: "Recording failed",
          description: error.message || "Failed to start recording. Check microphone permissions.",
          variant: "destructive",
        });
      }
    }
  }, [createRecordingMutation, stopRecording, processRecording, toast]);

  const resetRecorder = useCallback(() => {
    setState("idle");
    setRecordingTime(0);
    setErrorMessage("");
    setAnalysisResult(null);
    recordingIdRef.current = null;
    audioBlobRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (state === "idle") {
    return (
      <Button
        onClick={startRecording}
        disabled={createRecordingMutation.isPending}
        className="w-full h-14 bg-purple-600 hover:bg-purple-700"
        data-testid="button-start-deal-recording"
      >
        {createRecordingMutation.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Mic className="w-5 h-5 mr-2" />
        )}
        Start Recording Sales Call
      </Button>
    );
  }

  if (state === "recording") {
    return (
      <Card className="p-4 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium text-purple-700 dark:text-purple-300">Recording...</span>
          </div>
          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(recordingTime)}</span>
            <span className="text-xs text-muted-foreground">/ 90:00</span>
          </div>
        </div>
        <Button
          onClick={stopRecording}
          variant="destructive"
          className="w-full h-12"
          data-testid="button-stop-deal-recording"
        >
          <Square className="w-5 h-5 mr-2" />
          Stop & Send to Office
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Recording will be analyzed and emailed to office when stopped
        </p>
      </Card>
    );
  }

  if (state === "processing") {
    return (
      <Card className="p-4 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <div className="text-center">
            <p className="font-medium text-purple-700 dark:text-purple-300">Processing recording...</p>
            <p className="text-sm text-muted-foreground">AI is analyzing and emailing to office</p>
          </div>
        </div>
      </Card>
    );
  }

  if (state === "completed" && analysisResult) {
    return (
      <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <div className="flex items-start gap-3 mb-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-700 dark:text-green-300">
              Recording Complete
            </p>
            {analysisResult.summary && (
              <p className="text-sm text-muted-foreground mt-1">
                {analysisResult.summary}
              </p>
            )}
          </div>
        </div>
        {analysisResult.sentiment && (
          <div className="text-sm mb-3">
            <span className={`font-medium ${
              analysisResult.sentiment === "positive" ? "text-green-600" :
              analysisResult.sentiment === "negative" ? "text-red-600" :
              "text-gray-600"
            }`}>
              {analysisResult.sentiment.charAt(0).toUpperCase() + analysisResult.sentiment.slice(1)} sentiment
            </span>
          </div>
        )}
        {analysisResult.emailSent && (
          <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 mb-3">
            <Send className="w-4 h-4" />
            Sent to office for coaching repository
          </div>
        )}
        <Button
          onClick={resetRecorder}
          variant="outline"
          className="w-full"
          data-testid="button-new-deal-recording"
        >
          Record Another Meeting
        </Button>
      </Card>
    );
  }

  if (state === "error") {
    return (
      <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-700 dark:text-red-300">
              Recording Failed
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {errorMessage || "An error occurred during recording"}
            </p>
          </div>
        </div>
        <Button
          onClick={resetRecorder}
          variant="outline"
          className="w-full"
          data-testid="button-retry-deal-recording"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  return null;
}
