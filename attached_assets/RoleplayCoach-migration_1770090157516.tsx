/**
 * RoleplayCoach Migration Guide
 * =============================
 * 
 * This file shows how to migrate RoleplayCoach.tsx to use the new
 * useAudioRecorder hook for better browser compatibility.
 * 
 * The migration is NON-BREAKING - it replaces the internal recording
 * logic while keeping the same external behavior.
 */

// ============================================
// STEP 1: ADD NEW IMPORTS
// ============================================

// Add these imports at the top of RoleplayCoach.tsx
import { useAudioRecorder, getAudioFileExtension, createAudioFilename } from '@/hooks/use-audio-recorder';
import { AudioCompatibilityBanner, AudioCompatibilityBadge } from '@/components/AudioCompatibility';

// ============================================
// STEP 2: REPLACE RECORDING LOGIC
// ============================================

/**
 * BEFORE (current code around lines 300-400):
 * 
 * const [isRecording, setIsRecording] = useState(false);
 * const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
 * const mediaRecorderRef = useRef<MediaRecorder | null>(null);
 * const chunksRef = useRef<Blob[]>([]);
 * 
 * const startRecording = async () => {
 *   try {
 *     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 *     const mediaRecorder = new MediaRecorder(stream);
 *     // ... manual setup
 *   } catch (error) {
 *     // ... error handling
 *   }
 * };
 */

/**
 * AFTER (new code):
 */

// In your component, replace the recording state and logic with:

function RoleplayCoachMigrated() {
  // Replace all recording state with the hook
  const {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    duration,
    error: recordingError,
    browserSupport,
    start: startRecording,
    stop: stopRecording,
    pause: pauseRecording,
    resume: resumeRecording,
    reset: resetRecording,
  } = useAudioRecorder({
    onStop: (blob, url, duration) => {
      // This replaces your mediaRecorder.onstop handler
      console.log('Recording stopped:', { blob, url, duration });
    },
    onError: (error) => {
      // This replaces your try-catch error handling
      console.error('Recording error:', error);
      toast({
        title: 'Recording Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onAudioLevel: (level) => {
      // Optional: use for visualizer
      // level is 0-1
    },
    maxDuration: 300, // 5 minutes max
  });

  // ... rest of your component
}

// ============================================
// STEP 3: UPDATE RECORDING BUTTONS
// ============================================

/**
 * BEFORE:
 * 
 * <Button onClick={handleStartRecording}>
 *   Start Recording
 * </Button>
 */

/**
 * AFTER:
 */

// Add compatibility check before recording button
const RecordingSection = () => {
  const { browserSupport, isRecording, start, stop } = useAudioRecorder();
  
  return (
    <div className="space-y-4">
      {/* Show warning if browser has limitations */}
      <AudioCompatibilityBanner support={browserSupport} />
      
      {/* Recording button - automatically handles browser compat */}
      <Button 
        onClick={isRecording ? stop : start}
        disabled={!browserSupport.isFullySupported}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Button>
      
      {/* Show compatibility badge in header */}
      <div className="flex items-center gap-2">
        <span>Voice Input</span>
        <AudioCompatibilityBadge support={browserSupport} />
      </div>
    </div>
  );
};

// ============================================
// STEP 4: UPDATE FILE UPLOAD LOGIC
// ============================================

/**
 * BEFORE (lines 342-359):
 * 
 * let ext = "m4a"; // Default
 * const blobType = audioBlob.type.toLowerCase();
 * if (blobType.includes("webm")) ext = "webm";
 * else if (blobType.includes("mp4")) ext = "m4a";
 * // etc.
 */

/**
 * AFTER:
 */

// When preparing to upload the audio file
const uploadAudioFile = async (blob: Blob) => {
  // Use the helper function instead of manual detection
  const extension = getAudioFileExtension(blob);
  const filename = createAudioFilename('roleplay_recording', blob.type);
  
  // Create FormData
  const formData = new FormData();
  formData.append('audio', blob, filename);
  
  // Upload
  const response = await apiRequest('POST', '/api/roleplay/transcribe', formData);
  return response.json();
};

// ============================================
// STEP 5: FULL COMPONENT EXAMPLE
// ============================================

/**
 * Complete example of migrated recording section
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Pause, Play, Upload } from 'lucide-react';
import { useAudioRecorder, getAudioFileExtension, createAudioFilename } from '@/hooks/use-audio-recorder';
import { AudioCompatibilityBanner } from '@/components/AudioCompatibility';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface VoiceInputSectionProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputSection({ onTranscription, disabled }: VoiceInputSectionProps) {
  const { toast } = useToast();
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    duration,
    error,
    browserSupport,
    start,
    stop,
    pause,
    resume,
    reset,
  } = useAudioRecorder({
    onError: (err) => {
      toast({
        title: 'Recording Error',
        description: err.message,
        variant: 'destructive',
      });
    },
    maxDuration: 180, // 3 minute max for roleplay
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 16000, // Good for speech
    },
  });
  
  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle transcription
  const handleTranscribe = async () => {
    if (!audioBlob) return;
    
    setIsTranscribing(true);
    
    try {
      const filename = createAudioFilename('roleplay', audioBlob.type);
      const formData = new FormData();
      formData.append('audio', audioBlob, filename);
      
      const response = await apiRequest('POST', '/api/transcribe', formData);
      const data = await response.json();
      
      if (data.text) {
        onTranscription(data.text);
        reset(); // Clear the recording
      }
    } catch (err) {
      toast({
        title: 'Transcription Failed',
        description: 'Could not transcribe audio. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
    }
  };
  
  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* Compatibility warning */}
        <AudioCompatibilityBanner support={browserSupport} />
        
        {/* Recording controls */}
        <div className="flex items-center gap-3">
          {!isRecording && !audioBlob && (
            <Button
              onClick={start}
              disabled={disabled || !browserSupport.isFullySupported}
              className="gap-2"
            >
              <Mic className="h-4 w-4" />
              Record
            </Button>
          )}
          
          {isRecording && (
            <>
              <Button
                onClick={stop}
                variant="destructive"
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
              
              <Button
                onClick={isPaused ? resume : pause}
                variant="outline"
                className="gap-2"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                )}
              </Button>
              
              <span className="text-sm font-mono text-muted-foreground">
                {formatDuration(duration)}
              </span>
              
              {/* Recording indicator */}
              <span className={`h-2 w-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
            </>
          )}
          
          {audioBlob && !isRecording && (
            <>
              {/* Playback */}
              <audio src={audioUrl!} controls className="h-10" />
              
              <Button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isTranscribing ? 'Transcribing...' : 'Use Recording'}
              </Button>
              
              <Button
                onClick={reset}
                variant="outline"
              >
                Discard
              </Button>
            </>
          )}
        </div>
        
        {/* Error display */}
        {error && (
          <p className="text-sm text-red-500">{error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// WHAT YOU CAN REMOVE
// ============================================

/**
 * After migration, you can safely remove:
 * 
 * 1. Manual MediaRecorder setup code
 * 2. navigator.mediaDevices.getUserMedia calls
 * 3. chunksRef and related Blob handling
 * 4. Manual MIME type detection (lines 342-359)
 * 5. Format-specific extension logic
 * 6. Browser-specific workarounds
 * 
 * The hook handles all of this automatically.
 */
