import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ListenButton } from "@/components/ListenButton";
import { useDictation } from "@/hooks/use-dictation";
import { apiRequest } from "@/lib/queryClient";
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Loader2, 
  Volume2,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProspectingAdviceCoachProps {
  className?: string;
}

export function ProspectingAdviceCoach({ className }: ProspectingAdviceCoachProps) {
  const [input, setInput] = useState("");
  const [advice, setAdvice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPlayTTS, setAutoPlayTTS] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: dictationSupported,
    error: dictationError,
  } = useDictation({
    continuous: false,
    appendToExisting: true,
  });

  const handleMicClick = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(input);
    }
  }, [isListening, startListening, stopListening, input]);

  const playTTS = useCallback(async (text: string) => {
    if (!autoPlayTTS) return;
    
    try {
      const response = await apiRequest("POST", "/api/tts", { text });
      const data = await response.json();

      if (data.audio) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        
        const audioData = `data:${data.format};base64,${data.audio}`;
        const audio = new Audio(audioData);
        audioRef.current = audio;
        await audio.play();
      }
    } catch (err) {
      console.error("TTS playback error:", err);
    }
  }, [autoPlayTTS]);

  const getAdvice = async () => {
    const textToSend = transcript || input;
    if (!textToSend.trim()) return;

    setIsLoading(true);
    setError(null);
    setAdvice("");

    try {
      const response = await apiRequest("POST", "/api/prospecting-advice", {
        userInput: textToSend
      });

      if (!response.ok) {
        throw new Error("Failed to get advice");
      }

      const data = await response.json();
      setAdvice(data.advice);
      
      if (autoPlayTTS && data.advice) {
        playTTS(data.advice);
      }
    } catch (err) {
      console.error("Error getting advice:", err);
      setError("Unable to get advice at this time. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentInput = transcript || input;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const placeholders = [
    "I don't know who to call today...",
    "I keep getting rejected and I'm losing motivation...",
    "I need fresh ideas for finding new merchants...",
    "How do I approach restaurants that already have a processor?"
  ];

  return (
    <Card className={cn("overflow-hidden", className)} data-testid="card-prospecting-coach">
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Sales Spark
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  AI Coach
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Stuck? Get instant prospecting ideas
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" data-testid="button-toggle-coach">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          <p className="text-sm text-muted-foreground">
            Tell me what's on your mind and I'll give you actionable prospecting ideas for today.
          </p>

          <div className="relative">
            <Textarea
              value={currentInput}
              onChange={handleInputChange}
              placeholder={placeholders[Math.floor(Math.random() * placeholders.length)]}
              className="pr-12 min-h-[100px] resize-none"
              disabled={isListening || isLoading}
              rows={4}
              data-testid="textarea-coach-input"
            />
            
            {dictationSupported && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleMicClick}
                disabled={isLoading}
                className={cn(
                  "absolute right-2 top-2 h-8 w-8",
                  isListening && "text-destructive animate-pulse"
                )}
                data-testid={isListening ? "button-mic-listening" : "button-mic-start"}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {dictationError && (
            <p className="text-xs text-destructive">{dictationError}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-tts"
                checked={autoPlayTTS}
                onCheckedChange={(checked) => {
                  setAutoPlayTTS(checked);
                  if (!checked) stopAudio();
                }}
                data-testid="switch-auto-tts"
              />
              <Label htmlFor="auto-tts" className="text-sm flex items-center gap-1">
                <Volume2 className="w-4 h-4" />
                Read aloud
              </Label>
            </div>
          </div>

          <Button
            onClick={getAdvice}
            disabled={isLoading || !currentInput.trim()}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            data-testid="button-get-advice"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting Ideas...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Spark My Day
              </>
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {advice && (
            <div className="mt-4 p-4 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Your Prospecting Ideas
                </h4>
                <ListenButton 
                  text={advice} 
                  size="icon"
                  data-testid="button-listen-advice"
                />
              </div>
              <div className="prose dark:prose-invert prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {advice}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
