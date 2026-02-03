import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  Edit3,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ValidationIssue {
  field: string;
  issue: 'missing' | 'invalid' | 'suspicious' | 'out_of_range';
  message: string;
  severity: 'error' | 'warning' | 'info';
}

interface ConfidenceScore {
  overall: number;
  merchantInfo: number;
  volumeData: number;
  fees: number;
}

interface ExtractedData {
  merchantInfo: {
    name: string;
    processor: string;
    statementDate: string;
    mid: string;
  };
  volumeData: {
    totalVolume: number;
    totalTransactions: number;
    avgTicket: number;
    cardBreakdown: {
      visa: number;
      mastercard: number;
      discover: number;
      amex: number;
      other: number;
    };
  };
  fees: Array<{
    type: string;
    amount: number;
    category?: string;
  }>;
  effectiveRate: number;
}

interface ManualReviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  extractedData: ExtractedData;
  confidence: ConfidenceScore;
  reviewReasons: string[];
  validationIssues: ValidationIssue[];
  onReviewComplete: (data: ExtractedData) => void;
}

export function ManualReviewSheet({
  isOpen,
  onClose,
  jobId,
  extractedData,
  confidence,
  reviewReasons,
  validationIssues,
  onReviewComplete,
}: ManualReviewSheetProps) {
  const [editedData, setEditedData] = useState<ExtractedData>(extractedData);
  const [isEditing, setIsEditing] = useState(false);
  
  const submitReview = useMutation({
    mutationFn: async (data: { correctedData: ExtractedData; userConfirmed: boolean }) => {
      const response = await apiRequest(
        'POST',
        `/api/statement-analysis/jobs/${jobId}/manual-review`,
        data
      );
      return response.json();
    },
    onSuccess: (result) => {
      onReviewComplete(result.extractedData);
      onClose();
    },
  });
  
  const updateField = (path: string, value: any) => {
    setEditedData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = value;
      return newData;
    });
  };
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Manual Review Required
          </SheetTitle>
          <SheetDescription>
            The AI extraction has low confidence. Please verify and correct the data below.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                Extraction Confidence
                <Badge className={getConfidenceColor(confidence.overall)}>
                  {confidence.overall}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className={`text-lg font-semibold ${getConfidenceColor(confidence.merchantInfo)}`}>
                    {confidence.merchantInfo}%
                  </div>
                  <div className="text-muted-foreground">Merchant</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${getConfidenceColor(confidence.volumeData)}`}>
                    {confidence.volumeData}%
                  </div>
                  <div className="text-muted-foreground">Volume</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${getConfidenceColor(confidence.fees)}`}>
                    {confidence.fees}%
                  </div>
                  <div className="text-muted-foreground">Fees</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {reviewReasons.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Why Manual Review?</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {reviewReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {validationIssues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Issues Found ({validationIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {validationIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {getSeverityIcon(issue.severity)}
                      <span className="flex-1">{issue.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Extracted Data</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  View Mode
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Mode
                </>
              )}
            </Button>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Merchant Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Business Name</Label>
                {isEditing ? (
                  <Input
                    value={editedData.merchantInfo.name}
                    onChange={(e) => updateField('merchantInfo.name', e.target.value)}
                    className="mt-1"
                    data-testid="input-merchant-name"
                  />
                ) : (
                  <p className="font-medium">{editedData.merchantInfo.name}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Current Processor</Label>
                {isEditing ? (
                  <Input
                    value={editedData.merchantInfo.processor}
                    onChange={(e) => updateField('merchantInfo.processor', e.target.value)}
                    className="mt-1"
                    data-testid="input-merchant-processor"
                  />
                ) : (
                  <p className="font-medium">{editedData.merchantInfo.processor}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Statement Date</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedData.merchantInfo.statementDate}
                    onChange={(e) => updateField('merchantInfo.statementDate', e.target.value)}
                    className="mt-1"
                    data-testid="input-statement-date"
                  />
                ) : (
                  <p className="font-medium">{editedData.merchantInfo.statementDate}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">MID</Label>
                {isEditing ? (
                  <Input
                    value={editedData.merchantInfo.mid}
                    onChange={(e) => updateField('merchantInfo.mid', e.target.value)}
                    className="mt-1"
                    data-testid="input-mid"
                  />
                ) : (
                  <p className="font-medium">{editedData.merchantInfo.mid || '—'}</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Volume Data</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Monthly Volume</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedData.volumeData.totalVolume}
                    onChange={(e) => updateField('volumeData.totalVolume', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                    data-testid="input-total-volume"
                  />
                ) : (
                  <p className="font-medium">${editedData.volumeData.totalVolume.toLocaleString()}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Transactions</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedData.volumeData.totalTransactions}
                    onChange={(e) => updateField('volumeData.totalTransactions', parseInt(e.target.value) || 0)}
                    className="mt-1"
                    data-testid="input-total-transactions"
                  />
                ) : (
                  <p className="font-medium">{editedData.volumeData.totalTransactions.toLocaleString()}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Average Ticket</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedData.volumeData.avgTicket}
                    onChange={(e) => updateField('volumeData.avgTicket', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                    data-testid="input-avg-ticket"
                  />
                ) : (
                  <p className="font-medium">${editedData.volumeData.avgTicket.toFixed(2)}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Effective Rate</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedData.effectiveRate}
                    onChange={(e) => updateField('effectiveRate', parseFloat(e.target.value) || 0)}
                    className="mt-1"
                    data-testid="input-effective-rate"
                  />
                ) : (
                  <p className="font-medium">{editedData.effectiveRate.toFixed(2)}%</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Card Brand Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-5 gap-2">
              {['visa', 'mastercard', 'discover', 'amex', 'other'].map((brand) => (
                <div key={brand}>
                  <Label className="text-xs text-muted-foreground capitalize">{brand}</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedData.volumeData.cardBreakdown[brand as keyof typeof editedData.volumeData.cardBreakdown]}
                      onChange={(e) => updateField(`volumeData.cardBreakdown.${brand}`, parseFloat(e.target.value) || 0)}
                      className="mt-1"
                      data-testid={`input-card-${brand}`}
                    />
                  ) : (
                    <p className="font-medium text-sm">
                      ${editedData.volumeData.cardBreakdown[brand as keyof typeof editedData.volumeData.cardBreakdown].toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Fees ({editedData.fees.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editedData.fees.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {editedData.fees.map((fee, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{fee.type}</span>
                      <span className="font-medium">${fee.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Fees</span>
                    <span>${editedData.fees.reduce((sum, f) => sum + f.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No fees extracted</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <SheetFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-review">
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setEditedData(extractedData);
              setIsEditing(false);
            }}
            data-testid="button-reset-review"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={() => submitReview.mutate({ 
              correctedData: editedData, 
              userConfirmed: true 
            })}
            disabled={submitReview.isPending}
            data-testid="button-confirm-review"
          >
            {submitReview.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm & Continue
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ManualReviewSheet;
