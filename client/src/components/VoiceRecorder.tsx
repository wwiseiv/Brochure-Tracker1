import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Square, Play, Pause, Trash2, AlertTriangle } from "lucide-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  existingAudioUrl?: string | null;
  onDelete?: () => void;
}

export function VoiceRecorder({ onRecordingComplete, existingAudioUrl, onDelete }: VoiceRecorderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(existingAudioUrl || null);
  const [displayDuration, setDisplayDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    browserSupport,
    start,
    stop,
    reset,
  } = useAudioRecorder({
    onStop: (blob, url, finalDuration) => {
      setDisplayUrl(url);
      setDisplayDuration(finalDuration);
      onRecordingComplete(blob, finalDuration);
    },
    onError: (err) => {
      console.error("Recording error:", err);
    },
  });

  useEffect(() => {
    if (existingAudioUrl) {
      setDisplayUrl(existingAudioUrl);
    }
  }, [existingAudioUrl]);

  const handleStartRecording = useCallback(async () => {
    await start();
  }, [start]);

  const handleStopRecording = useCallback(async () => {
    await stop();
  }, [stop]);

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
    reset();
    if (displayUrl && displayUrl !== existingAudioUrl) {
      URL.revokeObjectURL(displayUrl);
    }
    setDisplayUrl(null);
    setDisplayDuration(0);
    onDelete?.();
  }, [reset, displayUrl, existingAudioUrl, onDelete]);

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (displayUrl && displayUrl !== existingAudioUrl) {
        URL.revokeObjectURL(displayUrl);
      }
    };
  }, [displayUrl, existingAudioUrl]);

  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
        <Button
          type="button"
          variant="secondary"
          onClick={() => reset()}
          data-testid="button-retry-recording"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (displayUrl) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <audio
          ref={audioRef}
          src={displayUrl}
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
            {formatTime(displayDuration || 0)}
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
    <div className="space-y-3">
      {!browserSupport.isFullySupported && (
        <Alert className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
          <AlertDescription>
            <p className="text-sm">
              Recording not available on {browserSupport.browserName}. 
              Use Chrome, Firefox, or Edge for recording.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant={isRecording ? "destructive" : "secondary"}
          size="lg"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={!browserSupport.isFullySupported}
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
              {formatTime(duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
