import { useState, useCallback, useRef, useEffect } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseDictationOptions {
  continuous?: boolean;
  appendToExisting?: boolean;
  language?: string;
  onTranscript?: (transcript: string) => void;
}

interface UseDictationReturn {
  isListening: boolean;
  transcript: string;
  startListening: (existingText?: string) => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
  clearTranscript: () => void;
}

export function useDictation(options: UseDictationOptions = {}): UseDictationReturn {
  const {
    continuous = false,
    appendToExisting = true,
    language = "en-US",
    onTranscript,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const existingTextRef = useRef<string>("");

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined;

  const isSupported = Boolean(SpeechRecognitionAPI);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(
    (existingText: string = "") => {
      if (!SpeechRecognitionAPI) {
        setError("Speech recognition is not supported in this browser");
        return;
      }

      setError(null);
      existingTextRef.current = appendToExisting ? existingText : "";

      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentTranscript = finalTranscript || interimTranscript;
        const prefix = existingTextRef.current;
        const separator = prefix && currentTranscript ? " " : "";
        const fullTranscript = prefix + separator + currentTranscript;

        setTranscript(fullTranscript);
        onTranscript?.(fullTranscript);

        if (finalTranscript) {
          existingTextRef.current = fullTranscript;
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "no-speech") {
          setError("No speech detected. Please try again.");
        } else if (event.error === "audio-capture") {
          setError("No microphone found. Please check your audio settings.");
        } else if (event.error === "not-allowed") {
          setError("Microphone access denied. Please allow microphone access.");
        } else if (event.error === "network") {
          setError("Network error. Please check your internet connection and try again.");
        } else if (event.error === "service-not-allowed") {
          setError("Speech service unavailable. Please try again later.");
        } else if (event.error !== "aborted") {
          setError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      try {
        recognition.start();
      } catch (err) {
        setError("Failed to start speech recognition");
        setIsListening(false);
      }
    },
    [SpeechRecognitionAPI, continuous, appendToExisting, language, onTranscript]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    existingTextRef.current = "";
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error,
    clearTranscript,
  };
}
