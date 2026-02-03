import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";
import { useAudioRecorder, createAudioFilename } from "@/hooks/use-audio-recorder";
import { AudioCompatibilityBanner } from "@/components/AudioCompatibility";
import {
  savePendingRecording,
  getPendingRecordingForMerchant,
  removePendingRecording,
  updatePendingRecordingRetryCount,
  type PendingRecording,
} from "@/lib/offlineStore";
import {
  Mic,
  Square,
  Loader2,
  CheckCircle,
  AlertCircle,
  Send,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  Pause,
  Play,
} from "lucide-react";
import type { Merchant, MeetingRecording } from "@shared/schema";

interface MeetingRecorderProps {
  merchant: Merchant;
  onComplete?: (recording: MeetingRecording) => void;
}

type RecordingState = "idle" | "recording" | "processing" | "completed" | "error" | "pending_upload";

const MAX_RECORDING_SECONDS = 90 * 60; // 90 minutes

export function MeetingRecorder({ merchant, onComplete }: MeetingRecorderProps) {
  const { toast } = useToast();
  const [state, setState] = useState<RecordingState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    summary?: string;
    sentiment?: string;
    emailSent?: boolean;
  } | null>(null);
  const [pendingRecording, setPendingRecording] = useState<PendingRecording | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [finalDuration, setFinalDuration] = useState(0);

  const recordingIdRef = useRef<number | null>(null);

  const { uploadFile } = useUpload();

  const handleRecordingStop = useCallback(async (blob: Blob, _url: string, durationSecs: number) => {
    setFinalDuration(Math.round(durationSecs));
    await processRecording(blob, blob.type, Math.round(durationSecs));
  }, []);

  const handleRecordingError = useCallback((err: Error) => {
    console.error("Recording error:", err);
    setState("error");
    setErrorMessage(err.message || "An error occurred during recording");
    recordingIdRef.current = null;
    toast({
      title: "Recording error",
      description: err.message || "Could not access your microphone. Please check browser permissions.",
      variant: "destructive",
    });
  }, [toast]);

  const audioRecorder = useAudioRecorder({
    maxDuration: MAX_RECORDING_SECONDS,
    onStop: handleRecordingStop,
    onError: handleRecordingError,
  });

  const {
    isRecording: hookIsRecording,
    isPaused,
    duration: hookDuration,
    browserSupport,
    start: startAudioRecording,
    stop: stopAudioRecording,
    pause: pauseRecording,
    resume: resumeRecording,
    reset: resetAudioRecorder,
  } = audioRecorder;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    async function checkPendingRecording() {
      const pending = await getPendingRecordingForMerchant(merchant.id);
      if (pending) {
        setPendingRecording(pending);
        recordingIdRef.current = pending.recordingId;
        setFinalDuration(pending.durationSeconds);
        setState("pending_upload");
      }
    }
    checkPendingRecording();
  }, [merchant.id]);

  const createRecordingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/meeting-recordings", {
        merchantId: merchant.id,
        businessName: merchant.businessName,
        contactName: merchant.contactName,
        businessPhone: merchant.businessPhone,
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
      if (pendingRecording) {
        await removePendingRecording(pendingRecording.id);
        setPendingRecording(null);
      }
      setState("completed");
      setAnalysisResult({
        summary: data.aiSummary,
        sentiment: data.sentiment,
        emailSent: data.emailSent,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-recordings"] });
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
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    if (!browserSupport.isFullySupported) {
      setErrorMessage(`Recording not supported: ${browserSupport.limitations.join(', ')}`);
      toast({
        title: "Browser not supported",
        description: "Your browser doesn't fully support audio recording. Try Chrome, Firefox, or Edge.",
        variant: "destructive",
      });
      return;
    }

    try {
      setErrorMessage("");
      setState("recording");
      setFinalDuration(0);

      const recording = await createRecordingMutation.mutateAsync();
      recordingIdRef.current = recording.id;

      const success = await startAudioRecording();
      if (!success) {
        setState("idle");
        recordingIdRef.current = null;
        setErrorMessage("Could not start recording. Please check microphone permissions.");
        toast({
          title: "Recording failed",
          description: "Could not start recording. Please check microphone permissions.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error starting recording:", error);
      setState("idle");
      recordingIdRef.current = null;
      
      const isApiError = error?.message?.includes("Failed") || error?.message?.includes("Unauthorized");
      const errorTitle = isApiError ? "Could not start recording" : "Microphone error";
      const errorDesc = isApiError 
        ? "Unable to create recording session. Please try again."
        : "Could not access your microphone. Please check browser permissions.";
      
      setErrorMessage(errorDesc);
      toast({
        title: errorTitle,
        description: errorDesc,
        variant: "destructive",
      });
    }
  }, [createRecordingMutation, toast, browserSupport, startAudioRecording]);

  const stopRecording = useCallback(async () => {
    await stopAudioRecording();
  }, [stopAudioRecording]);

  const processRecording = async (audioBlob: Blob, mimeType: string, durationSeconds: number) => {
    setState("processing");

    if (!recordingIdRef.current) {
      setState("error");
      setErrorMessage("Recording session was not created. Please try again.");
      return;
    }

    try {
      const filename = createAudioFilename("meeting", mimeType);
      const file = new File([audioBlob], filename, { type: mimeType });

      const uploadResult = await uploadFile(file);

      if (!uploadResult || !uploadResult.objectPath) {
        throw new Error("Failed to upload recording");
      }

      const recordingUrl = window.location.origin + uploadResult.objectPath;

      await completeRecordingMutation.mutateAsync({
        recordingId: recordingIdRef.current,
        recordingUrl,
        durationSeconds,
      });

    } catch (error) {
      console.error("Error processing recording:", error);

      try {
        const saved = await savePendingRecording({
          type: 'merchant',
          merchantId: merchant.id,
          recordingId: recordingIdRef.current!,
          businessName: merchant.businessName || undefined,
          contactName: merchant.contactName || undefined,
          businessPhone: merchant.businessPhone || undefined,
          audioBlob: audioBlob,
          mimeType: mimeType || audioBlob.type,
          durationSeconds,
        });
        setPendingRecording(saved);
        setState("pending_upload");
        toast({
          title: "Recording saved locally",
          description: "Upload failed but your recording is saved. Tap 'Retry Upload' when you have a better connection.",
        });
      } catch (saveError) {
        console.error("Failed to save recording locally:", saveError);
        setState("error");
        setErrorMessage("Upload failed and couldn't save locally. Please try recording again.");
        recordingIdRef.current = null;
        toast({
          title: "Upload failed",
          description: "Failed to save your recording. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const retryUpload = async () => {
    if (!pendingRecording) return;

    setState("processing");
    await updatePendingRecordingRetryCount(pendingRecording.id);
    setPendingRecording(prev => prev ? { ...prev, retryCount: prev.retryCount + 1 } : null);

    try {
      const filename = createAudioFilename("meeting", pendingRecording.mimeType);
      const file = new File([pendingRecording.audioBlob], filename, {
        type: pendingRecording.mimeType,
      });

      const uploadResult = await uploadFile(file);

      if (!uploadResult || !uploadResult.objectPath) {
        throw new Error("Failed to upload recording");
      }

      const recordingUrl = window.location.origin + uploadResult.objectPath;

      await completeRecordingMutation.mutateAsync({
        recordingId: pendingRecording.recordingId,
        recordingUrl,
        durationSeconds: pendingRecording.durationSeconds,
      });

    } catch (error) {
      console.error("Retry upload failed:", error);
      setState("pending_upload");
      toast({
        title: "Upload still failing",
        description: "Your recording is saved. Try again when you have a better connection.",
        variant: "destructive",
      });
    }
  };

  const discardPendingRecording = async () => {
    if (pendingRecording) {
      await removePendingRecording(pendingRecording.id);
      setPendingRecording(null);
    }
    recordingIdRef.current = null;
    setState("idle");
    setFinalDuration(0);
    setErrorMessage("");
    resetAudioRecorder();
  };

  const resetRecorder = () => {
    setState("idle");
    setFinalDuration(0);
    setErrorMessage("");
    setAnalysisResult(null);
    recordingIdRef.current = null;
    resetAudioRecorder();
  };

  if (state === "pending_upload" && pendingRecording) {
    return (
      <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <div className="flex items-start gap-3 mb-3">
          {isOnline ? (
            <Wifi className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <WifiOff className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-300">
              Recording Saved Locally
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingRecording.retryCount > 0 
                ? `Upload failed ${pendingRecording.retryCount} time${pendingRecording.retryCount > 1 ? 's' : ''}. Your recording is safe.`
                : "Upload failed but your recording is saved. Retry when you have a better connection."}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground">Duration: {formatTime(pendingRecording.durationSeconds)}</span>
          <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="space-y-2">
          <Button
            onClick={retryUpload}
            disabled={completeRecordingMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
            data-testid="button-retry-merchant-upload"
          >
            {completeRecordingMutation.isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5 mr-2" />
            )}
            Retry Upload
          </Button>
          <Button
            onClick={discardPendingRecording}
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            data-testid="button-discard-merchant-recording"
          >
            Discard Recording
          </Button>
        </div>
      </Card>
    );
  }

  if (state === "idle") {
    return (
      <div className="space-y-3">
        <AudioCompatibilityBanner support={browserSupport} compact className="mb-2" />
        <Button
          onClick={startRecording}
          disabled={createRecordingMutation.isPending || !browserSupport.isFullySupported}
          className="w-full h-14 bg-purple-600 hover:bg-purple-700"
          data-testid="button-start-meeting-recording"
        >
          {createRecordingMutation.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Mic className="w-5 h-5 mr-2" />
          )}
          Record Meeting
        </Button>
      </div>
    );
  }

  if (state === "recording") {
    const displayDuration = Math.round(hookDuration);
    return (
      <Card className="p-4 border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isPaused ? (
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            )}
            <span className="font-medium text-purple-700 dark:text-purple-300">
              {isPaused ? "Paused" : "Recording..."}
            </span>
          </div>
          <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(displayDuration)}</span>
            <span className="text-xs text-muted-foreground">/ 90:00</span>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          {isPaused ? (
            <Button
              onClick={resumeRecording}
              variant="outline"
              className="flex-1 h-12"
              data-testid="button-resume-meeting-recording"
            >
              <Play className="w-5 h-5 mr-2" />
              Resume
            </Button>
          ) : (
            <Button
              onClick={pauseRecording}
              variant="outline"
              className="flex-1 h-12"
              data-testid="button-pause-meeting-recording"
            >
              <Pause className="w-5 h-5 mr-2" />
              Pause
            </Button>
          )}
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="flex-1 h-12"
            data-testid="button-stop-meeting-recording"
          >
            <Square className="w-5 h-5 mr-2" />
            Stop & Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Recording will be analyzed and emailed to office when stopped
        </p>
      </Card>
    );
  }

  if (state === "processing") {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <div className="text-center">
            <p className="font-medium">Processing recording...</p>
            <p className="text-sm text-muted-foreground">
              Analyzing with AI and sending to office
            </p>
          </div>
          <Progress value={33} className="w-full" />
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
              Recording Complete!
            </p>
            {analysisResult.summary && (
              <p className="text-sm text-muted-foreground mt-1">
                {analysisResult.summary}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground">Duration: {formatTime(finalDuration)}</span>
          {analysisResult.sentiment && (
            <span className={`font-medium ${
              analysisResult.sentiment === "positive" ? "text-green-600" :
              analysisResult.sentiment === "negative" ? "text-red-600" :
              "text-gray-600"
            }`}>
              {analysisResult.sentiment.charAt(0).toUpperCase() + analysisResult.sentiment.slice(1)} sentiment
            </span>
          )}
        </div>
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
          data-testid="button-new-recording"
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
        <AudioCompatibilityBanner support={browserSupport} showOnlyIfIssues={false} className="mb-3" />
        <Button
          onClick={resetRecorder}
          variant="outline"
          className="w-full"
          data-testid="button-retry-recording"
        >
          Try Again
        </Button>
      </Card>
    );
  }

  return null;
}
