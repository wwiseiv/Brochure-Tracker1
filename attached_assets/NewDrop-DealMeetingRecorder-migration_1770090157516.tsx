/**
 * new-drop.tsx & DealMeetingRecorder.tsx Migration Guide
 * ======================================================
 * 
 * This file shows how to migrate the remaining audio recording components
 * to use the new useAudioRecorder hook.
 */

// ============================================
// NEW-DROP.TSX MIGRATION
// ============================================

/**
 * The new-drop page likely uses voice notes for drop documentation.
 * Here's how to migrate:
 */

// STEP 1: Add imports
import { 
  useAudioRecorder, 
  createAudioFilename,
  checkBrowserSupport 
} from '@/hooks/use-audio-recorder';
import { AudioCompatibilityBanner, RecordingUnavailable } from '@/components/AudioCompatibility';

// STEP 2: Replace recording logic in your component

function NewDropVoiceNoteMigrated() {
  const {
    isRecording,
    audioBlob,
    audioUrl,
    duration,
    browserSupport,
    error,
    start,
    stop,
    reset,
  } = useAudioRecorder({
    onStop: (blob, url, duration) => {
      // Auto-upload or store for later
      console.log('Voice note recorded:', duration, 'seconds');
    },
    maxDuration: 120, // 2 minute limit for drop notes
  });
  
  // If browser doesn't support recording, show alternative
  if (!browserSupport.isFullySupported) {
    return (
      <RecordingUnavailable 
        support={browserSupport}
        onUploadClick={() => {
          // Open file picker for audio upload
          document.getElementById('audio-upload')?.click();
        }}
      />
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Recording UI */}
      <div className="flex items-center gap-3">
        <Button
          onClick={isRecording ? stop : start}
          variant={isRecording ? "destructive" : "default"}
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stop ({Math.floor(duration)}s)
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 mr-2" />
              Add Voice Note
            </>
          )}
        </Button>
        
        {audioBlob && (
          <>
            <audio src={audioUrl!} controls />
            <Button variant="outline" onClick={reset}>
              Re-record
            </Button>
          </>
        )}
      </div>
      
      {/* Fallback file upload (hidden, triggered by RecordingUnavailable) */}
      <input
        type="file"
        id="audio-upload"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Handle uploaded audio file
            handleAudioFile(file);
          }
        }}
      />
    </div>
  );
}

// ============================================
// DEALMEETINGRECORDER.TSX MIGRATION
// ============================================

/**
 * DealMeetingRecorder likely records longer meetings for transcription.
 * Here's a more full-featured migration:
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  Upload, 
  Trash2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  useAudioRecorder, 
  createAudioFilename,
  BrowserSupport 
} from '@/hooks/use-audio-recorder';
import { 
  AudioCompatibilityBanner, 
  AudioCompatibilityCheck 
} from '@/components/AudioCompatibility';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface DealMeetingRecorderProps {
  dealId: number;
  merchantName: string;
  onRecordingComplete?: (summary: string) => void;
}

export function DealMeetingRecorderMigrated({
  dealId,
  merchantName,
  onRecordingComplete,
}: DealMeetingRecorderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCompatibilityDetails, setShowCompatibilityDetails] = useState(false);
  
  // Audio level for visualizer
  const [audioLevel, setAudioLevel] = useState(0);
  
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
    onAudioLevel: setAudioLevel,
    onError: (err) => {
      toast({
        title: 'Recording Error',
        description: err.message,
        variant: 'destructive',
      });
    },
    maxDuration: 3600, // 1 hour max for meetings
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  
  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Upload and process recording
  const handleUpload = async () => {
    if (!audioBlob) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const filename = createAudioFilename(`meeting_${dealId}`, audioBlob.type);
      const formData = new FormData();
      formData.append('audio', audioBlob, filename);
      formData.append('dealId', dealId.toString());
      formData.append('merchantName', merchantName);
      formData.append('duration', duration.toString());
      
      // Simulate upload progress (or use XMLHttpRequest for real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const response = await apiRequest(
        'POST',
        '/api/meetings/transcribe',
        formData
      );
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const data = await response.json();
      
      if (data.summary) {
        onRecordingComplete?.(data.summary);
        toast({
          title: 'Meeting Recorded',
          description: 'Your meeting has been transcribed and summarized.',
        });
        reset();
      }
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: 'Could not upload recording. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Meeting Recorder
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompatibilityDetails(!showCompatibilityDetails)}
          >
            {browserSupport.isFullySupported ? '✓ Ready' : '⚠ Limited'}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Compatibility details (expandable) */}
        {showCompatibilityDetails && (
          <AudioCompatibilityCheck support={browserSupport} />
        )}
        
        {/* Compatibility warning */}
        <AudioCompatibilityBanner support={browserSupport} />
        
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error.message}
          </div>
        )}
        
        {/* Recording interface */}
        {browserSupport.isFullySupported && (
          <>
            {/* Status display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-lg">
                  {formatDuration(duration)}
                </span>
              </div>
              
              {isRecording && (
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${
                    isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                  }`} />
                  <span className="text-sm">
                    {isPaused ? 'Paused' : 'Recording'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Audio level visualizer */}
            {isRecording && !isPaused && (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                />
              </div>
            )}
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {!isRecording && !audioBlob && (
                <Button onClick={start} className="gap-2">
                  <Mic className="h-4 w-4" />
                  Start Recording
                </Button>
              )}
              
              {isRecording && (
                <>
                  <Button onClick={stop} variant="destructive" className="gap-2">
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
                </>
              )}
              
              {audioBlob && !isRecording && (
                <>
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Save & Transcribe'}
                  </Button>
                  
                  <Button 
                    onClick={reset} 
                    variant="outline"
                    disabled={isUploading}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Discard
                  </Button>
                </>
              )}
            </div>
            
            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading and transcribing...
                </p>
              </div>
            )}
            
            {/* Playback */}
            {audioBlob && !isRecording && (
              <audio 
                src={audioUrl!} 
                controls 
                className="w-full"
              />
            )}
          </>
        )}
        
        {/* Fallback for unsupported browsers */}
        {!browserSupport.isFullySupported && (
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Audio recording is not available in your browser.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" asChild>
                <a href="https://www.google.com/chrome/" target="_blank" rel="noopener">
                  Download Chrome
                </a>
              </Button>
              <Button variant="outline">
                Upload Audio File
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// SHARED PATTERN: AUDIO FILE HANDLER
// ============================================

/**
 * Use this pattern when you need to handle both recorded and uploaded audio
 */

interface AudioInputProps {
  onAudioReady: (blob: Blob, filename: string) => void;
  maxDuration?: number;
}

export function UniversalAudioInput({ onAudioReady, maxDuration = 300 }: AudioInputProps) {
  const {
    isRecording,
    audioBlob,
    browserSupport,
    start,
    stop,
    reset,
  } = useAudioRecorder({ maxDuration });
  
  // Handle recorded audio
  useEffect(() => {
    if (audioBlob) {
      const filename = createAudioFilename('audio', audioBlob.type);
      onAudioReady(audioBlob, filename);
    }
  }, [audioBlob, onAudioReady]);
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioReady(file, file.name);
    }
  };
  
  return (
    <div className="space-y-4">
      <AudioCompatibilityBanner support={browserSupport} />
      
      <div className="flex items-center gap-4">
        {/* Recording option */}
        {browserSupport.isFullySupported && (
          <Button
            onClick={isRecording ? stop : start}
            variant={isRecording ? "destructive" : "default"}
          >
            <Mic className="h-4 w-4 mr-2" />
            {isRecording ? 'Stop' : 'Record'}
          </Button>
        )}
        
        {/* Upload option - always available */}
        <div>
          <input
            type="file"
            id="audio-file-input"
            accept="audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('audio-file-input')?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DealMeetingRecorderMigrated;
