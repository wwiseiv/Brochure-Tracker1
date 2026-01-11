import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  existingAudioUrl?: string | null;
  onDelete?: () => void;
}

export function VoiceRecorder({ onRecordingComplete, existingAudioUrl, onDelete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (existingAudioUrl) {
      setAudioUrl(existingAudioUrl);
    }
  }, [existingAudioUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob, recordingTime);
        
        stream.getTracks().forEach((track) => track.stop());
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [onRecordingComplete, recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleDelete = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl && !existingAudioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    onDelete?.();
  }, [audioUrl, existingAudioUrl, onDelete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl && !existingAudioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, existingAudioUrl]);

  if (audioUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePlayback}
          className="w-10 h-10"
          data-testid="button-play-voice"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>
        
        <div className="flex-1">
          <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full w-full bg-primary rounded-full" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTime(recordingTime || 0)}
          </p>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="w-10 h-10 text-destructive"
          data-testid="button-delete-voice"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Button
        type="button"
        variant={isRecording ? "destructive" : "secondary"}
        size="lg"
        onClick={isRecording ? stopRecording : startRecording}
        className={`min-h-touch gap-2 ${isRecording ? "animate-pulse" : ""}`}
        data-testid={isRecording ? "button-stop-recording" : "button-start-recording"}
      >
        {isRecording ? (
          <>
            <Square className="w-5 h-5" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            Record Voice Note
          </>
        )}
      </Button>
      
      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
          <span className="font-mono text-lg font-semibold">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}
    </div>
  );
}
