/**
 * Audio Compatibility Components
 * ==============================
 * 
 * UI components for displaying browser audio recording compatibility status.
 * Shows warnings when browser has limitations and provides helpful guidance.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Mic, 
  Info,
  Smartphone,
} from 'lucide-react';
import { SiGooglechrome } from 'react-icons/si';
import type { BrowserSupport } from '@/hooks/use-audio-recorder';

interface CompatibilityBannerProps {
  support: BrowserSupport;
  showOnlyIfIssues?: boolean;
  compact?: boolean;
  className?: string;
}

export function AudioCompatibilityBanner({
  support,
  showOnlyIfIssues = true,
  compact = false,
  className = '',
}: CompatibilityBannerProps) {
  if (showOnlyIfIssues && support.isFullySupported) {
    return null;
  }
  
  const variant = support.isFullySupported ? 'default' : 'destructive';
  const Icon = support.isFullySupported ? CheckCircle : AlertTriangle;
  
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Icon className={`h-4 w-4 ${support.isFullySupported ? 'text-green-500' : 'text-yellow-500'}`} />
        <span>
          {support.isFullySupported 
            ? 'Audio recording supported'
            : `Limited support on ${support.browserName}`
          }
        </span>
        {!support.isFullySupported && support.limitations.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <ul className="list-disc list-inside">
                  {support.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }
  
  return (
    <Alert variant={variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {support.isFullySupported 
          ? 'Audio Recording Ready' 
          : `Limited Audio Support (${support.browserName})`
        }
      </AlertTitle>
      <AlertDescription>
        {support.isFullySupported ? (
          <span>Your browser fully supports audio recording.</span>
        ) : (
          <div className="space-y-2">
            <p>Your browser has the following limitations:</p>
            <ul className="list-disc list-inside space-y-1">
              {support.limitations.map((limitation, i) => (
                <li key={i}>{limitation}</li>
              ))}
            </ul>
            <p className="text-sm mt-2">
              For best results, use Chrome, Firefox, or Edge on desktop.
            </p>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface CompatibilityBadgeProps {
  support: BrowserSupport;
  showBrowserName?: boolean;
}

export function AudioCompatibilityBadge({
  support,
  showBrowserName = false,
}: CompatibilityBadgeProps) {
  if (support.isFullySupported) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-300">
        <Mic className="h-3 w-3 mr-1" />
        {showBrowserName ? support.browserName : 'Ready'}
      </Badge>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {showBrowserName ? support.browserName : 'Limited'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium mb-1">Browser Limitations:</p>
          <ul className="list-disc list-inside text-sm">
            {support.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SupportedFormatsProps {
  support: BrowserSupport;
  className?: string;
}

export function SupportedFormats({ support, className = '' }: SupportedFormatsProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm font-medium">Supported Audio Formats:</p>
      <div className="flex flex-wrap gap-2">
        {support.supportedMimeTypes.length > 0 ? (
          support.supportedMimeTypes.map((mime, i) => (
            <Badge 
              key={i} 
              variant={mime === support.recommendedMimeType ? 'default' : 'outline'}
              className="text-xs"
            >
              {mime.split(';')[0].replace('audio/', '')}
              {mime === support.recommendedMimeType && ' ✓'}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No formats detected</span>
        )}
      </div>
    </div>
  );
}

interface CompatibilityCheckProps {
  support: BrowserSupport;
  onRetry?: () => void;
  className?: string;
}

export function AudioCompatibilityCheck({ support, className = '' }: CompatibilityCheckProps) {
  const checks = [
    {
      name: 'MediaRecorder API',
      supported: support.mediaRecorder,
      description: 'Required for recording audio',
    },
    {
      name: 'Microphone Access',
      supported: support.getUserMedia,
      description: 'Required to capture audio from microphone',
    },
    {
      name: 'Audio Context',
      supported: support.audioContext,
      description: 'Enables audio level monitoring',
    },
    {
      name: 'Audio Formats',
      supported: support.supportedMimeTypes.length > 0,
      description: support.recommendedMimeType || 'No formats available',
    },
  ];
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Audio Recording Compatibility
        </h3>
        <AudioCompatibilityBadge support={support} showBrowserName />
      </div>
      
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <p className="font-medium">{check.name}</p>
              <p className="text-sm text-muted-foreground">{check.description}</p>
            </div>
            {check.supported ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        ))}
      </div>
      
      {!support.isFullySupported && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Recommended Browsers</AlertTitle>
          <AlertDescription>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <SiGooglechrome className="h-4 w-4" />
                <span>Chrome</span>
              </div>
              <span>Firefox</span>
              <span>Edge</span>
              <div className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                <span>Safari 14.1+</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface RecordingUnavailableProps {
  support: BrowserSupport;
  onUploadClick?: () => void;
  className?: string;
}

export function RecordingUnavailable({ 
  support, 
  onUploadClick,
  className = '' 
}: RecordingUnavailableProps) {
  return (
    <div className={`text-center py-8 px-4 border-2 border-dashed rounded-lg ${className}`}>
      <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">Recording Not Available</h3>
      <p className="text-muted-foreground mb-4">
        Your browser ({support.browserName}) doesn't support audio recording.
      </p>
      
      {support.limitations.length > 0 && (
        <ul className="text-sm text-muted-foreground mb-4 list-disc list-inside">
          {support.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      
      <div className="space-y-3">
        <p className="text-sm">Try one of these alternatives:</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a 
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <SiGooglechrome className="h-4 w-4" />
            Download Chrome
          </a>
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="text-blue-600 hover:underline"
            >
              Upload an audio file instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AudioCompatibilityBanner;
