/**
 * Universal Audio Recording Hook
 * ===============================
 * 
 * A drop-in replacement for MediaRecorder usage that handles browser compatibility
 * automatically. Works across Chrome, Firefox, Safari, Edge, and mobile browsers.
 * 
 * INSTALLATION:
 *   Copy to: client/src/hooks/use-audio-recorder.ts
 * 
 * USAGE:
 *   import { useAudioRecorder } from '@/hooks/use-audio-recorder';
 *   
 *   const {
 *     isRecording,
 *     isPaused,
 *     audioBlob,
 *     audioUrl,
 *     duration,
 *     start,
 *     stop,
 *     pause,
 *     resume,
 *     reset,
 *     error,
 *     browserSupport,
 *   } = useAudioRecorder();
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BrowserSupport {
  mediaRecorder: boolean;
  getUserMedia: boolean;
  audioContext: boolean;
  supportedMimeTypes: string[];
  recommendedMimeType: string | null;
  browserName: string;
  isFullySupported: boolean;
  limitations: string[];
}

export interface AudioRecorderOptions {
  /** Called when recording stops with the audio blob */
  onStop?: (blob: Blob, url: string, duration: number) => void;
  /** Called on recording error */
  onError?: (error: Error) => void;
  /** Called with audio level (0-1) during recording */
  onAudioLevel?: (level: number) => void;
  /** Maximum recording duration in seconds (0 = unlimited) */
  maxDuration?: number;
  /** Preferred MIME type (will fallback if unsupported) */
  preferredMimeType?: string;
  /** Audio constraints for getUserMedia */
  audioConstraints?: MediaTrackConstraints;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: Error | null;
  browserSupport: BrowserSupport;
}

export interface AudioRecorderControls {
  start: () => Promise<boolean>;
  stop: () => Promise<Blob | null>;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export type UseAudioRecorderReturn = AudioRecorderState & AudioRecorderControls;

// ============================================
// BROWSER DETECTION & CAPABILITY CHECKING
// ============================================

/**
 * Detect browser name from user agent
 */
function detectBrowser(): string {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
  
  // Mobile detection
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS Safari';
  if (/android/.test(ua)) return 'Android Browser';
  
  return 'Unknown';
}

/**
 * MIME types in order of preference
 * - webm/opus: Best quality, Chrome/Firefox/Edge
 * - mp4/aac: Safari/iOS
 * - webm/vorbis: Fallback for older browsers
 * - ogg: Firefox fallback
 */
const MIME_TYPE_PRIORITY = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
];

/**
 * Get all supported MIME types for this browser
 */
function getSupportedMimeTypes(): string[] {
  if (typeof MediaRecorder === 'undefined') return [];
  
  return MIME_TYPE_PRIORITY.filter(mimeType => {
    try {
      return MediaRecorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  });
}

/**
 * Get the best MIME type for this browser
 */
function getRecommendedMimeType(preferred?: string): string | null {
  const supported = getSupportedMimeTypes();
  
  // If preferred type is supported, use it
  if (preferred && supported.includes(preferred)) {
    return preferred;
  }
  
  // Return first supported type
  return supported[0] || null;
}

/**
 * Check full browser support and return detailed info
 */
export function checkBrowserSupport(): BrowserSupport {
  const browserName = detectBrowser();
  const limitations: string[] = [];
  
  // Check MediaRecorder
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  if (!hasMediaRecorder) {
    limitations.push('MediaRecorder API not supported');
  }
  
  // Check getUserMedia
  const hasGetUserMedia = !!(
    navigator.mediaDevices?.getUserMedia ||
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia
  );
  if (!hasGetUserMedia) {
    limitations.push('getUserMedia not supported');
  }
  
  // Check AudioContext
  const hasAudioContext = !!(
    window.AudioContext ||
    (window as any).webkitAudioContext
  );
  if (!hasAudioContext) {
    limitations.push('AudioContext not supported (no audio level monitoring)');
  }
  
  // Get supported MIME types
  const supportedMimeTypes = getSupportedMimeTypes();
  const recommendedMimeType = getRecommendedMimeType();
  
  if (supportedMimeTypes.length === 0 && hasMediaRecorder) {
    limitations.push('No supported audio formats detected');
  }
  
  // Browser-specific limitations
  if (browserName === 'Safari' || browserName === 'iOS Safari') {
    if (!supportedMimeTypes.some(t => t.includes('mp4') || t.includes('aac'))) {
      limitations.push('Safari may have limited format support');
    }
  }
  
  const isFullySupported = hasMediaRecorder && hasGetUserMedia && supportedMimeTypes.length > 0;
  
  return {
    mediaRecorder: hasMediaRecorder,
    getUserMedia: hasGetUserMedia,
    audioContext: hasAudioContext,
    supportedMimeTypes,
    recommendedMimeType,
    browserName,
    isFullySupported,
    limitations,
  };
}

// ============================================
// FILE EXTENSION HELPER
// ============================================

/**
 * Get the correct file extension for a MIME type or blob
 */
export function getAudioFileExtension(mimeTypeOrBlob: string | Blob): string {
  const mimeType = typeof mimeTypeOrBlob === 'string' 
    ? mimeTypeOrBlob 
    : mimeTypeOrBlob.type;
  
  const type = mimeType.toLowerCase();
  
  // Handle specific codec variations
  if (type.includes('webm')) return 'webm';
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('aac')) return 'aac';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('flac')) return 'flac';
  
  // Default based on browser
  const browser = detectBrowser();
  if (browser === 'Safari' || browser === 'iOS Safari') return 'm4a';
  
  return 'webm'; // Default for most browsers
}

/**
 * Create a filename with correct extension
 */
export function createAudioFilename(prefix: string, mimeType: string): string {
  const ext = getAudioFileExtension(mimeType);
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.${ext}`;
}

// ============================================
// MAIN HOOK
// ============================================

export function useAudioRecorder(options: AudioRecorderOptions = {}): UseAudioRecorderReturn {
  const {
    onStop,
    onError,
    onAudioLevel,
    maxDuration = 0,
    preferredMimeType,
    audioConstraints = { echoCancellation: true, noiseSuppression: true },
  } = options;
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [browserSupport] = useState(() => checkBrowserSupport());
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Get the MIME type to use
  const mimeType = getRecommendedMimeType(preferredMimeType);
  
  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear media recorder
    mediaRecorderRef.current = null;
  }, []);
  
  /**
   * Setup audio level monitoring
   */
  const setupAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    if (!onAudioLevel || !browserSupport.audioContext) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const checkLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.min(average / 128, 1); // Normalize to 0-1
        
        onAudioLevel(level);
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      };
      
      checkLevel();
    } catch (err) {
      console.warn('Could not setup audio level monitoring:', err);
    }
  }, [onAudioLevel, browserSupport.audioContext]);
  
  /**
   * Start recording
   */
  const start = useCallback(async (): Promise<boolean> => {
    // Check browser support
    if (!browserSupport.isFullySupported) {
      const err = new Error(`Recording not fully supported: ${browserSupport.limitations.join(', ')}`);
      setError(err);
      onError?.(err);
      return false;
    }
    
    if (!mimeType) {
      const err = new Error('No supported audio format found');
      setError(err);
      onError?.(err);
      return false;
    }
    
    try {
      // Reset state
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      chunksRef.current = [];
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;
      
      // Setup audio level monitoring
      setupAudioLevelMonitoring(stream);
      
      // Create MediaRecorder with best available format
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      
      mediaRecorderRef.current = recorder;
      
      // Handle data available
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Handle stop
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const finalDuration = (Date.now() - startTimeRef.current) / 1000;
        
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        setIsPaused(false);
        
        cleanup();
        
        onStop?.(blob, url, finalDuration);
      };
      
      // Handle error
      recorder.onerror = (event: any) => {
        const err = new Error(event.error?.message || 'Recording error');
        setError(err);
        setIsRecording(false);
        cleanup();
        onError?.(err);
      };
      
      // Start recording
      recorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
        
        // Check max duration
        if (maxDuration > 0 && elapsed >= maxDuration) {
          stop();
        }
      }, 100);
      
      return true;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      
      // Provide helpful error messages
      if (error.name === 'NotAllowedError') {
        error.message = 'Microphone access denied. Please allow microphone access and try again.';
      } else if (error.name === 'NotFoundError') {
        error.message = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError') {
        error.message = 'Microphone is in use by another application.';
      }
      
      setError(error);
      cleanup();
      onError?.(error);
      return false;
    }
  }, [browserSupport, mimeType, audioConstraints, maxDuration, onStop, onError, setupAudioLevelMonitoring, cleanup]);
  
  /**
   * Stop recording
   */
  const stop = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(audioBlob);
        return;
      }
      
      // Store original onstop
      const originalOnStop = mediaRecorderRef.current.onstop;
      
      mediaRecorderRef.current.onstop = (event) => {
        originalOnStop?.call(mediaRecorderRef.current, event);
        // Wait a tick for state to update
        setTimeout(() => {
          resolve(chunksRef.current.length > 0 
            ? new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
            : null
          );
        }, 0);
      };
      
      mediaRecorderRef.current.stop();
    });
  }, [audioBlob, mimeType]);
  
  /**
   * Pause recording
   */
  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Pause duration timer
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, []);
  
  /**
   * Resume recording
   */
  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume duration timer
      const pausedDuration = duration;
      const resumeTime = Date.now();
      
      durationIntervalRef.current = setInterval(() => {
        const additionalTime = (Date.now() - resumeTime) / 1000;
        const total = pausedDuration + additionalTime;
        setDuration(total);
        
        if (maxDuration > 0 && total >= maxDuration) {
          stop();
        }
      }, 100);
    }
  }, [duration, maxDuration, stop]);
  
  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    cleanup();
    
    // Revoke old URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
    chunksRef.current = [];
  }, [cleanup, audioUrl]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [cleanup, audioUrl]);
  
  return {
    // State
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    browserSupport,
    
    // Controls
    start,
    stop,
    pause,
    resume,
    reset,
  };
}

export default useAudioRecorder;
