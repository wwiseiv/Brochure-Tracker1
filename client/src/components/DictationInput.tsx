import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useDictation } from "@/hooks/use-dictation";
import { cn } from "@/lib/utils";

interface DictationInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
  rows?: number;
  id?: string;
  "data-testid"?: string;
}

export function DictationInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  className,
  disabled = false,
  rows = 3,
  id,
  "data-testid": dataTestId,
}: DictationInputProps) {
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error,
  } = useDictation({
    continuous: false,
    appendToExisting: true,
  });

  const currentValue = value ?? "";
  
  useEffect(() => {
    if (transcript && transcript !== currentValue) {
      onChange(transcript);
    }
  }, [transcript, onChange, currentValue]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(currentValue);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange(e.target.value);
  };

  const inputProps = {
    value: currentValue,
    onChange: handleInputChange,
    placeholder,
    disabled: disabled || isListening,
    id,
    "data-testid": dataTestId,
  };

  return (
    <div className={cn("relative", className)}>
      {multiline ? (
        <Textarea
          {...inputProps}
          className="pr-12"
          rows={rows}
        />
      ) : (
        <Input
          {...inputProps}
          className="pr-12"
        />
      )}

      {isSupported && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleMicClick}
          disabled={disabled}
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2",
            multiline && "top-3 translate-y-0",
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

      {error && (
        <p className="text-xs text-destructive mt-1" data-testid="text-dictation-error">
          {error}
        </p>
      )}
    </div>
  );
}
