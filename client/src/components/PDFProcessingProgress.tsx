/**
 * PDF Processing Progress Component
 * ==================================
 * 
 * Shows real-time progress for large PDF processing jobs.
 * Supports both polling and Server-Sent Events.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  X,
} from 'lucide-react';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface JobProgress {
  percentComplete: number;
  currentStep: string;
  currentPage: number;
  totalPages: number;
  pagesProcessed: number;
  pagesFailed: number;
  estimatedTimeRemaining: number | null;
}

interface JobResult {
  success: boolean;
  data: any;
  pagesProcessed: number;
  pagesFailed: number;
  warnings: string[];
  processingTime: number;
}

interface JobStatus {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  progress?: JobProgress;
  result?: JobResult;
  error?: string;
  queuePosition?: number;
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to poll job status
 */
export function useJobPolling(
  jobId: string | null,
  pollInterval: number = 2000
): {
  job: JobStatus | null;
  isLoading: boolean;
  error: string | null;
} {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      return;
    }
    
    let isCancelled = false;
    let timeoutId: NodeJS.Timeout;
    
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/proposal/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }
        
        const data = await response.json();
        
        if (!isCancelled) {
          setJob(data);
          setIsLoading(false);
          setError(null);
          
          // Continue polling if not complete
          if (data.status !== 'completed' && data.status !== 'failed') {
            timeoutId = setTimeout(fetchStatus, pollInterval);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };
    
    fetchStatus();
    
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [jobId, pollInterval]);
  
  return { job, isLoading, error };
}

/**
 * Hook to use Server-Sent Events for job updates
 */
export function useJobSSE(
  jobId: string | null
): {
  job: JobStatus | null;
  isConnected: boolean;
  error: string | null;
} {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    
    const eventSource = new EventSource(`/api/proposal/jobs/${jobId}/stream`);
    
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        setJob(prev => {
          const updated = { ...prev, id: jobId } as JobStatus;
          
          switch (data.type) {
            case 'status':
              updated.status = data.status;
              break;
            case 'progress':
              updated.status = 'processing';
              updated.progress = data.progress;
              break;
            case 'completed':
              updated.status = 'completed';
              updated.result = data.result;
              break;
            case 'failed':
              updated.status = 'failed';
              updated.error = data.error;
              break;
          }
          
          return updated;
        });
        
        // Close connection when complete
        if (data.type === 'completed' || data.type === 'failed') {
          eventSource.close();
          setIsConnected(false);
        }
      } catch {
        // Ignore parse errors
      }
    };
    
    eventSource.onerror = () => {
      setError('Connection lost');
      setIsConnected(false);
      eventSource.close();
    };
    
    return () => {
      eventSource.close();
    };
  }, [jobId]);
  
  return { job, isConnected, error };
}

// ============================================
// COMPONENTS
// ============================================

interface PDFProcessingProgressProps {
  jobId: string | null;
  onComplete?: (result: JobResult) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  useSSE?: boolean;
}

export function PDFProcessingProgress({
  jobId,
  onComplete,
  onError,
  onCancel,
  useSSE = false,
}: PDFProcessingProgressProps) {
  // Use either SSE or polling based on prop
  const sseState = useJobSSE(useSSE ? jobId : null);
  const pollingState = useJobPolling(!useSSE ? jobId : null);
  
  const { job, isLoading, error } = useSSE 
    ? { ...sseState, isLoading: false, error: sseState.error }
    : pollingState;
  
  // Handle completion
  useEffect(() => {
    if (job?.status === 'completed' && job.result) {
      onComplete?.(job.result);
    }
    if (job?.status === 'failed' && job.error) {
      onError?.(job.error);
    }
  }, [job?.status, job?.result, job?.error, onComplete, onError]);
  
  // Handle cancel
  const handleCancel = async () => {
    if (!jobId) return;
    
    try {
      await fetch(`/api/proposal/jobs/${jobId}`, { method: 'DELETE' });
      onCancel?.();
    } catch {
      // Ignore errors
    }
  };
  
  if (!jobId) {
    return null;
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!job) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">Processing Statement</CardTitle>
          </div>
          <StatusBadge status={job.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Queued State */}
        {job.status === 'queued' && (
          <div className="text-center py-4">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {job.queuePosition 
                ? `Position ${job.queuePosition} in queue`
                : 'Waiting to start...'
              }
            </p>
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleCancel}
                data-testid="button-cancel-job"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        )}
        
        {/* Processing State */}
        {job.status === 'processing' && job.progress && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{job.progress.currentStep}</span>
                <span>{job.progress.percentComplete}%</span>
              </div>
              <Progress value={job.progress.percentComplete} />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-2xl font-semibold">
                  {job.progress.currentPage}
                </div>
                <div className="text-muted-foreground">
                  of {job.progress.totalPages} pages
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-green-600">
                  {job.progress.pagesProcessed}
                </div>
                <div className="text-muted-foreground">processed</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-red-600">
                  {job.progress.pagesFailed}
                </div>
                <div className="text-muted-foreground">failed</div>
              </div>
            </div>
            
            {job.progress.estimatedTimeRemaining && (
              <p className="text-sm text-center text-muted-foreground">
                Estimated time remaining: {formatTime(job.progress.estimatedTimeRemaining)}
              </p>
            )}
          </>
        )}
        
        {/* Completed State */}
        {job.status === 'completed' && job.result && (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Processing Complete</p>
            <p className="text-sm text-muted-foreground mt-1">
              {job.result.pagesProcessed} pages analyzed
              {job.result.pagesFailed > 0 && (
                <span className="text-yellow-600">
                  {' '}({job.result.pagesFailed} failed)
                </span>
              )}
            </p>
            {job.result.warnings.length > 0 && (
              <div className="mt-3 text-left">
                <p className="text-sm font-medium text-yellow-600">Warnings:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {job.result.warnings.slice(0, 3).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {/* Failed State */}
        {job.status === 'failed' && (
          <div className="text-center py-4">
            <XCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
            <p className="font-medium text-red-600">Processing Failed</p>
            <p className="text-sm text-muted-foreground mt-1">
              {job.error || 'An unknown error occurred'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config = {
    queued: { label: 'Queued', variant: 'secondary' as const, icon: Clock },
    processing: { label: 'Processing', variant: 'default' as const, icon: Loader2 },
    completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
    failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
  };
  
  const { label, variant, icon: Icon } = config[status as keyof typeof config] || config.queued;
  
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================
// UPLOAD COMPONENT WITH PROGRESS
// ============================================

interface PDFUploadWithProgressProps {
  onUploadComplete: (result: JobResult) => void;
  extractionPrompt?: string;
  maxFileSize?: number;
}

export function PDFUploadWithProgress({
  onUploadComplete,
  extractionPrompt,
  maxFileSize = 50 * 1024 * 1024,
}: PDFUploadWithProgressProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    if (selectedFile.type !== 'application/pdf') {
      setUploadError('Please select a PDF file');
      return;
    }
    
    if (selectedFile.size > maxFileSize) {
      setUploadError(`File too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`);
      return;
    }
    
    setFile(selectedFile);
    setUploadError(null);
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('statement', file);
      if (extractionPrompt) {
        formData.append('extractionPrompt', extractionPrompt);
      }
      
      const response = await fetch('/api/proposal/analyze-statement/async', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      const data = await response.json();
      setJobId(data.jobId);
      
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleComplete = useCallback((result: JobResult) => {
    setFile(null);
    setJobId(null);
    onUploadComplete(result);
  }, [onUploadComplete]);
  
  const handleCancel = () => {
    setFile(null);
    setJobId(null);
  };
  
  if (jobId) {
    return (
      <PDFProcessingProgress
        jobId={jobId}
        onComplete={handleComplete}
        onCancel={handleCancel}
        useSSE
      />
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Statement</CardTitle>
        <CardDescription>
          Upload a merchant statement PDF for analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
            data-testid="input-pdf-file"
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <span className="text-sm font-medium">
              {file ? file.name : 'Click to select PDF'}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Max {maxFileSize / 1024 / 1024}MB
            </span>
          </label>
        </div>
        
        {uploadError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
        
        <Button
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
          data-testid="button-analyze-statement"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Analyze Statement'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default PDFProcessingProgress;
