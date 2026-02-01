import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ListenButtonProps {
  text: string;
  size?: "sm" | "icon";
  className?: string;
  "data-testid"?: string;
}

let globalAudioElement: HTMLAudioElement | null = null;
let globalStopCallback: (() => void) | null = null;

export function ListenButton({ text, size = "icon", className = "", "data-testid": dataTestId }: ListenButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlaying = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const handleClick = async () => {
    if (isPlaying) {
      stopPlaying();
      return;
    }

    if (isLoading) {
      return;
    }

    // Stop any other playing audio
    if (globalAudioElement && globalStopCallback) {
      globalStopCallback();
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/tts", { text });
      const data = await response.json();

      if (data.audio) {
        const audioData = `data:${data.format};base64,${data.audio}`;
        const audio = new Audio(audioData);
        audioRef.current = audio;
        globalAudioElement = audio;
        globalStopCallback = stopPlaying;

        audio.onplay = () => {
          setIsLoading(false);
          setIsPlaying(true);
        };

        audio.onended = () => {
          setIsPlaying(false);
          if (globalAudioElement === audio) {
            globalAudioElement = null;
            globalStopCallback = null;
          }
        };

        audio.onerror = () => {
          setIsLoading(false);
          setIsPlaying(false);
          console.error("Audio playback error");
        };

        await audio.play();
      } else {
        throw new Error("No audio data received");
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={`flex-shrink-0 ${className}`}
      title={isPlaying ? "Stop listening" : "Listen to this section"}
      data-testid={dataTestId || "button-listen"}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="w-4 h-4 text-primary" />
      ) : (
        <Volume2 className="w-4 h-4 text-muted-foreground" />
      )}
    </Button>
  );
}
