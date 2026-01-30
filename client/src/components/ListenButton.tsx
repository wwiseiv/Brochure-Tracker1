import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface ListenButtonProps {
  text: string;
  size?: "sm" | "icon";
  className?: string;
}

let globalCurrentUtterance: SpeechSynthesisUtterance | null = null;
let globalStopCallback: (() => void) | null = null;

export function ListenButton({ text, size = "icon", className = "" }: ListenButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!window.speechSynthesis) return;

    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesReady(true);
      }
    };

    checkVoices();
    window.speechSynthesis.onvoiceschanged = checkVoices;

    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const stopPlaying = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cleanTextForSpeech = (input: string): string => {
    return input
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '. ')
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleClick = () => {
    if (isPlaying) {
      stopPlaying();
      return;
    }

    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported");
      return;
    }

    if (globalCurrentUtterance && globalStopCallback) {
      globalStopCallback();
    }

    setIsLoading(true);
    window.speechSynthesis.cancel();

    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        console.warn("Speech synthesis timeout - may not be supported");
      }
    }, 3000);

    const cleanedText = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utteranceRef.current = utterance;
    globalCurrentUtterance = utterance;
    globalStopCallback = stopPlaying;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))
      ) || voices.find((v) => v.lang.startsWith("en-US")) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.onstart = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      if (globalCurrentUtterance === utterance) {
        globalCurrentUtterance = null;
        globalStopCallback = null;
      }
    };

    utterance.onerror = (event) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
      setIsPlaying(false);
      if (event.error !== 'canceled') {
        console.error("Speech synthesis error:", event.error);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!window.speechSynthesis) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={`flex-shrink-0 ${className}`}
      title={isPlaying ? "Stop listening" : "Listen to this section"}
      data-testid="button-listen"
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
