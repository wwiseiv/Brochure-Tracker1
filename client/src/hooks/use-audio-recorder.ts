/**
 * Universal Audio Recording Hook
 * ===============================
 * 
 * A drop-in replacement for MediaRecorder usage that handles browser compatibility
 * automatically. Works across Chrome, Firefox, Safari, Edge, and mobile browsers.
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
  onStop?: (blob: Blob, url: string, duration: number) => void;
  onError?: (error: Error) => void;
  onAudioLevel?: (level: number) => void;
  maxDuration?: number;
  preferredMimeType?: string;
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

function detectBrowser(): string {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
  
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS Safari';
  if (/android/.test(ua)) return 'Android Browser';
  
  return 'Unknown';
}

const MIME_TYPE_PRIORITY = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
];

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

function getRecommendedMimeType(preferred?: string): string | null {
  const supported = getSupportedMimeTypes();
  
  if (preferred && supported.includes(preferred)) {
    return preferred;
  }
  
  return supported[0] || null;
}

export function checkBrowserSupport(): BrowserSupport {
  const browserName = detectBrowser();
  const limitations: string[] = [];
  
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
  if (!hasMediaRecorder) {
    limitations.push('MediaRecorder API not supported');
  }
  
  const hasGetUserMedia = !!(
    navigator.mediaDevices?.getUserMedia ||
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia
  );
  if (!hasGetUserMedia) {
    limitations.push('getUserMedia not supported');
  }
  
  const hasAudioContext = !!(
    window.AudioContext ||
    (window as any).webkitAudioContext
  );
  if (!hasAudioContext) {
    limitations.push('AudioContext not supported (no audio level monitoring)');
  }
  
  const supportedMimeTypes = getSupportedMimeTypes();
  const recommendedMimeType = getRecommendedMimeType();
  
  if (supportedMimeTypes.length === 0 && hasMediaRecorder) {
    limitations.push('No supported audio formats detected');
  }
  
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

export function getAudioFileExtension(mimeTypeOrBlob: string | Blob): string {
  const mimeType = typeof mimeTypeOrBlob === 'string' 
    ? mimeTypeOrBlob 
    : mimeTypeOrBlob.type;
  
  const type = mimeType.toLowerCase();
  
  if (type.includes('webm')) return 'webm';
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('aac')) return 'aac';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  if (type.includes('flac')) return 'flac';
  
  const browser = detectBrowser();
  if (browser === 'Safari' || browser === 'iOS Safari') return 'm4a';
  
  return 'webm';
}

export function createAudioFilename(prefix: string, mimeType: string): string {
  const ext = getAudioFileExtension(mimeType);
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.${ext}`;
}

export function useAudioRecorder(options: AudioRecorderOptions = {}): UseAudioRecorderReturn {
  const {
    onStop,
    onError,
    onAudioLevel,
    maxDuration = 0,
    preferredMimeType,
    audioConstraints = { echoCancellation: true, noiseSuppression: true },
  } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [browserSupport] = useState(() => checkBrowserSupport());
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const mimeType = getRecommendedMimeType(preferredMimeType);
  
  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
      analyserRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
  }, []);
  
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
        const level = Math.min(average / 128, 1);
        
        onAudioLevel(level);
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      };
      
      checkLevel();
    } catch (err) {
      console.warn('Could not setup audio level monitoring:', err);
    }
  }, [onAudioLevel, browserSupport.audioContext]);
  
  const start = useCallback(async (): Promise<boolean> => {
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
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      streamRef.current = stream;
      
      setupAudioLevelMonitoring(stream);
      
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
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
      
      recorder.onerror = (event: any) => {
        const err = new Error(event.error?.message || 'Recording error');
        setError(err);
        setIsRecording(false);
        cleanup();
        onError?.(err);
      };
      
      recorder.start(1000);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setDuration(elapsed);
        
        if (maxDuration > 0 && elapsed >= maxDuration) {
          stop();
        }
      }, 100);
      
      return true;
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      
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
  
  const stop = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve(audioBlob);
        return;
      }
      
      const originalOnStop = mediaRecorderRef.current.onstop;
      
      mediaRecorderRef.current.onstop = (event) => {
        originalOnStop?.call(mediaRecorderRef.current, event);
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
  
  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, []);
  
  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
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
  
  const reset = useCallback(() => {
    cleanup();
    
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
  
  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [cleanup, audioUrl]);
  
  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    browserSupport,
    start,
    stop,
    pause,
    resume,
    reset,
  };
}

export default useAudioRecorder;
