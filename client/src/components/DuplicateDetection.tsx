/**
 * Duplicate Detection UI Components
 * ==================================
 * 
 * Components for handling duplicate prospect detection:
 * - DuplicateWarningDialog: Shows when adding a potential duplicate
 * - DuplicateScanner: Scans existing list for duplicates
 * - DuplicateMerger: UI for merging duplicate records
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle,
  CheckCircle,
  Users,
  Merge,
  Search,
  Loader2,
  ChevronRight,
  Phone,
  MapPin,
  Building,
  ExternalLink,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface DuplicateMatch {
  id: number;
  businessName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  matchDetails: {
    nameScore: number;
    phoneScore: number;
    addressScore: number;
    domainScore: number;
  };
}

interface DuplicateCheckResponse {
  isDuplicate: boolean;
  isPotentialDuplicate: boolean;
  highestScore: number;
  matches: DuplicateMatch[];
}

interface ProspectData {
  businessName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  email?: string;
}

// ============================================
// DUPLICATE WARNING DIALOG
// ============================================

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newProspect: ProspectData;
  duplicateCheck: DuplicateCheckResponse;
  onCreateAnyway: () => void;
  onViewExisting: (id: number) => void;
  onCancel: () => void;
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  newProspect,
  duplicateCheck,
  onCreateAnyway,
  onViewExisting,
  onCancel,
}: DuplicateWarningDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  
  const topMatch = duplicateCheck.matches[0];
  const isHighConfidence = topMatch?.confidence === 'high';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-5 w-5" />
            Potential Duplicate Found
          </DialogTitle>
          <DialogDescription>
            This prospect may already exist in your database
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">You're adding:</p>
            <p className="font-medium">{newProspect.businessName}</p>
            {newProspect.phone && (
              <p className="text-sm text-muted-foreground">{newProspect.phone}</p>
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">
              Potential matches ({duplicateCheck.matches.length}):
            </p>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {duplicateCheck.matches.map((match) => (
                  <DuplicateMatchCard
                    key={match.id}
                    match={match}
                    onView={() => onViewExisting(match.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {isHighConfidence && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                data-testid="checkbox-acknowledge-duplicate"
              />
              <label
                htmlFor="acknowledge"
                className="text-sm text-yellow-800 dark:text-yellow-200 cursor-pointer"
              >
                I've reviewed the match and confirm this is a different business
              </label>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-duplicate">
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onViewExisting(topMatch.id)}
            data-testid="button-view-existing"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Existing
          </Button>
          <Button
            onClick={onCreateAnyway}
            disabled={isHighConfidence && !acknowledged}
            className={cn(
              isHighConfidence && !acknowledged && 'opacity-50 cursor-not-allowed'
            )}
            data-testid="button-create-anyway"
          >
            Create Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// DUPLICATE MATCH CARD
// ============================================

interface DuplicateMatchCardProps {
  match: DuplicateMatch;
  onView: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

function DuplicateMatchCard({
  match,
  onView,
  selectable,
  selected,
  onSelect,
}: DuplicateMatchCardProps) {
  const confidenceColors = {
    high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
    low: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  };
  
  return (
    <div
      className={cn(
        'p-3 border rounded-lg transition-colors',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
        selectable && 'cursor-pointer'
      )}
      onClick={selectable ? onSelect : onView}
      data-testid={`card-duplicate-match-${match.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {selectable && (
            <Checkbox
              checked={selected}
              onCheckedChange={() => onSelect?.()}
              onClick={(e) => e.stopPropagation()}
              data-testid={`checkbox-select-match-${match.id}`}
            />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{match.businessName}</span>
              <Badge 
                variant="outline" 
                className={cn('text-xs', confidenceColors[match.confidence])}
              >
                {Math.round(match.score * 100)}% match
              </Badge>
            </div>
            
            <div className="mt-1 space-y-0.5">
              {match.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {match.phone}
                  {match.matchDetails.phoneScore === 1 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      Exact match
                    </Badge>
                  )}
                </p>
              )}
              {match.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {match.address}, {match.city}, {match.state}
                </p>
              )}
            </div>
            
            <div className="mt-2 flex flex-wrap gap-1">
              {match.reasons.map((reason, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        {!selectable && (
          <Button variant="ghost" size="sm" onClick={onView} data-testid={`button-view-match-${match.id}`}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// DUPLICATE SCANNER
// ============================================

interface DuplicateScannerProps {
  onMergeRequest: (group: any[]) => void;
}

export function DuplicateScanner({ onMergeRequest }: DuplicateScannerProps) {
  const [scanResults, setScanResults] = useState<any>(null);
  
  const scanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/prospects/scan-duplicates');
      return response.json();
    },
    onSuccess: (data) => {
      setScanResults(data);
    },
  });
  
  return (
    <Card data-testid="card-duplicate-scanner">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Duplicate Scanner
        </CardTitle>
        <CardDescription>
          Scan your prospect list for potential duplicates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!scanResults ? (
          <div className="text-center py-6">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Click scan to check for duplicate prospects
            </p>
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              data-testid="button-scan-duplicates"
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scan for Duplicates
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" data-testid="text-total-prospects">{scanResults.totalProspects}</div>
                <div className="text-sm text-muted-foreground">Total Prospects</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-duplicate-groups">
                  {scanResults.duplicateGroups}
                </div>
                <div className="text-sm text-muted-foreground">Duplicate Groups</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-duplicate-pairs">
                  {scanResults.duplicatePairs}
                </div>
                <div className="text-sm text-muted-foreground">Duplicate Pairs</div>
              </div>
            </div>
            
            {scanResults.duplicateGroups === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium text-green-600 dark:text-green-400">No duplicates found!</p>
                <p className="text-sm text-muted-foreground">
                  Your prospect list is clean
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {scanResults.groups.map((group: any, i: number) => (
                    <div key={i} className="p-3 border rounded-lg" data-testid={`group-duplicate-${i}`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">
                          {group.prospects.length} potential duplicates
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onMergeRequest(group.prospects)}
                          data-testid={`button-merge-group-${i}`}
                        >
                          <Merge className="h-3 w-3 mr-1" />
                          Merge
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {group.prospects.map((p: any) => (
                          <div key={p.id} className="text-sm flex items-center gap-2">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span>{p.businessName}</span>
                            {p.phone && (
                              <span className="text-muted-foreground">• {p.phone}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setScanResults(null);
                scanMutation.mutate();
              }}
              data-testid="button-scan-again"
            >
              Scan Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// DUPLICATE MERGER
// ============================================

interface DuplicateMergerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: any[];
  onMergeComplete: () => void;
}

export function DuplicateMerger({
  open,
  onOpenChange,
  duplicates,
  onMergeComplete,
}: DuplicateMergerProps) {
  const [keepId, setKeepId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const mergeMutation = useMutation({
    mutationFn: async () => {
      const mergeIds = duplicates
        .filter(d => d.id !== keepId)
        .map(d => d.id);
      
      const response = await apiRequest('POST', '/api/prospects/merge', {
        keepId,
        mergeIds,
      });
      return response.json();
    },
    onSuccess: () => {
      onMergeComplete();
      onOpenChange(false);
    },
  });
  
  useEffect(() => {
    if (open) {
      setKeepId(duplicates[0]?.id || null);
    }
  }, [open, duplicates]);
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Merge Duplicates
            </DialogTitle>
            <DialogDescription>
              Select which prospect to keep. Others will be merged into it.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click on the prospect you want to keep. Data from other prospects
              will be merged into it.
            </p>
            
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {duplicates.map((prospect) => (
                  <div
                    key={prospect.id}
                    className={cn(
                      'p-3 border rounded-lg cursor-pointer transition-all',
                      keepId === prospect.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => setKeepId(prospect.id)}
                    data-testid={`card-merge-candidate-${prospect.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                          keepId === prospect.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        )}
                      >
                        {keepId === prospect.id && (
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{prospect.businessName}</p>
                        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                          {prospect.phone && <span>{prospect.phone}</span>}
                          {prospect.city && (
                            <span>{prospect.city}, {prospect.state}</span>
                          )}
                        </div>
                      </div>
                      {keepId === prospect.id && (
                        <Badge>Keep</Badge>
                      )}
                      {keepId && keepId !== prospect.id && (
                        <Badge variant="secondary">Merge</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {keepId && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">After merge:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  <li>
                    <strong>{duplicates.find(d => d.id === keepId)?.businessName}</strong>{' '}
                    will be kept
                  </li>
                  <li>
                    {duplicates.length - 1} record(s) will be merged and deleted
                  </li>
                  <li>Missing data will be filled from merged records</li>
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-merge">
              Cancel
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!keepId || mergeMutation.isPending}
              data-testid="button-confirm-merge"
            >
              {mergeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                <>
                  <Merge className="h-4 w-4 mr-2" />
                  Merge Records
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Merge</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {duplicates.length - 1} prospect record(s)
              and merge their data into the selected record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-confirm-merge">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mergeMutation.mutate()} data-testid="button-execute-merge">
              Yes, merge records
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================
// INLINE DUPLICATE INDICATOR
// ============================================

interface DuplicateIndicatorProps {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export function DuplicateIndicator({ score, confidence, reasons }: DuplicateIndicatorProps) {
  const colors = {
    high: 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-950',
    medium: 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-950',
    low: 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-950',
  };
  
  return (
    <div 
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', colors[confidence])}
      data-testid="badge-duplicate-indicator"
    >
      <AlertTriangle className="h-3 w-3" />
      <span>{Math.round(score * 100)}% match</span>
    </div>
  );
}

// ============================================
// HOOK: USE DUPLICATE CHECK
// ============================================

export function useDuplicateCheck() {
  return useMutation({
    mutationFn: async (prospect: ProspectData) => {
      const response = await apiRequest('POST', '/api/prospects/check-duplicate', prospect);
      return response.json() as Promise<DuplicateCheckResponse>;
    },
  });
}

export default DuplicateWarningDialog;
