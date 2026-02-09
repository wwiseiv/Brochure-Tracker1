import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Lock, AlertCircle, Check, Loader2 } from 'lucide-react';

interface PCBAutoPaymentFormProps {
  publicKey: string;
  gatewayUrl: string;
  repairOrder: {
    repairOrderId: number;
    customerName: string;
    vehicleInfo?: string;
    subtotal: number;
    tax: number;
    total: number;
    tipAmount?: number;
    deposit?: number;
    paymentType: 'cash_price' | 'card_price';
  };
  onPaymentSuccess: (token: string) => void;
  onPaymentError: (error: string) => void;
  isDualPricing?: boolean;
}

declare global {
  interface Window {
    DoughTokenizer?: {
      create: (config: { publicKey: string; container: string }) => {
        getToken: () => Promise<string>;
        on: (event: string, callback: () => void) => void;
      };
    };
  }
}

const centsToAmount = (cents: number): string => (cents / 100).toFixed(2);

export default function PCBAutoPaymentForm({
  publicKey,
  gatewayUrl,
  repairOrder,
  onPaymentSuccess,
  onPaymentError,
  isDualPricing,
}: PCBAutoPaymentFormProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenizerReady, setIsTokenizerReady] = useState(false);
  const [tipAmount, setTipAmount] = useState(repairOrder.tipAmount || 0);
  const [customTipInput, setCustomTipInput] = useState('');
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [scriptLoadError, setScriptLoadError] = useState(false);
  const tokenizerRef = useRef<ReturnType<NonNullable<Window['DoughTokenizer']>['create']> | null>(null);

  const totalWithTip = repairOrder.total + tipAmount;

  useEffect(() => {
    const existingScript = document.querySelector(`script[src*="tokenizer.js"]`);
    if (existingScript) {
      initializeTokenizer();
      return;
    }

    const script = document.createElement('script');
    script.src = `${gatewayUrl}/tokenizer/tokenizer.js`;
    script.async = true;
    script.onload = () => {
      initializeTokenizer();
    };
    script.onerror = () => {
      setScriptLoadError(true);
      setError('Payment gateway is not available. Please try again later.');
    };
    document.head.appendChild(script);

    return () => {
      const scriptEl = document.querySelector(`script[src*="tokenizer.js"]`);
      if (scriptEl) {
        scriptEl.remove();
      }
    };
  }, [gatewayUrl, publicKey]);

  const initializeTokenizer = useCallback(() => {
    if (!window.DoughTokenizer) {
      setScriptLoadError(true);
      setError('Payment tokenizer could not be initialized.');
      return;
    }

    try {
      const instance = window.DoughTokenizer.create({
        publicKey,
        container: '#dough-tokenizer-container',
      });

      tokenizerRef.current = instance;

      if (instance.on) {
        instance.on('ready', () => {
          setIsTokenizerReady(true);
        });
      } else {
        setIsTokenizerReady(true);
      }
    } catch (err) {
      setError('Failed to initialize payment form.');
      setScriptLoadError(true);
    }
  }, [publicKey]);

  const handleTipSelect = (percentage: number) => {
    setShowCustomTip(false);
    if (percentage === 0) {
      setTipAmount(0);
    } else {
      setTipAmount(Math.round(repairOrder.subtotal * (percentage / 100)));
    }
  };

  const handleCustomTip = () => {
    setShowCustomTip(true);
  };

  const applyCustomTip = () => {
    const val = parseFloat(customTipInput);
    if (!isNaN(val) && val >= 0) {
      setTipAmount(Math.round(val * 100));
      setShowCustomTip(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!tokenizerRef.current) {
        throw new Error('Payment form not ready. Please wait and try again.');
      }

      const paymentToken = await tokenizerRef.current.getToken();

      if (!paymentToken) {
        throw new Error('Failed to generate payment token. Please check your card details.');
      }

      setToken(paymentToken);
      onPaymentSuccess(paymentToken);
    } catch (err: any) {
      const errorMessage = err?.message || 'Payment failed. Please try again.';
      setError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-testid="payment-form" className="w-full max-w-lg mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 flex-wrap">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-lg">Payment</CardTitle>
          {isDualPricing && (
            <Badge variant="secondary" className="ml-auto">
              Dual Pricing
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Customer</Label>
              <span data-testid="text-customer-name" className="font-medium">
                {repairOrder.customerName}
              </span>
            </div>
            {repairOrder.vehicleInfo && (
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground">Vehicle</Label>
                <span className="font-medium">{repairOrder.vehicleInfo}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">RO #</Label>
              <span className="font-medium">{repairOrder.repairOrderId}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Subtotal</Label>
              <span>${centsToAmount(repairOrder.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <Label className="text-muted-foreground">Tax</Label>
              <span>${centsToAmount(repairOrder.tax)}</span>
            </div>
            {repairOrder.deposit && repairOrder.deposit > 0 && (
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground">Deposit</Label>
                <span className="text-green-600">-${centsToAmount(repairOrder.deposit)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground">Tip</Label>
                <span>${centsToAmount(tipAmount)}</span>
              </div>
            )}
            {isDualPricing && (
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Payment type</span>
                <span>{repairOrder.paymentType === 'cash_price' ? 'Cash Price' : 'Card Price'}</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between items-center text-lg font-semibold">
              <Label>Total</Label>
              <span data-testid="text-total">${centsToAmount(totalWithTip)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Add a Tip</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={tipAmount === 0 ? 'default' : 'outline'}
                size="sm"
                data-testid="tip-no-tip"
                onClick={() => handleTipSelect(0)}
                type="button"
              >
                No Tip
              </Button>
              <Button
                variant={tipAmount === Math.round(repairOrder.subtotal * 0.15) ? 'default' : 'outline'}
                size="sm"
                data-testid="tip-15"
                onClick={() => handleTipSelect(15)}
                type="button"
              >
                15%
              </Button>
              <Button
                variant={tipAmount === Math.round(repairOrder.subtotal * 0.18) ? 'default' : 'outline'}
                size="sm"
                data-testid="tip-18"
                onClick={() => handleTipSelect(18)}
                type="button"
              >
                18%
              </Button>
              <Button
                variant={tipAmount === Math.round(repairOrder.subtotal * 0.20) ? 'default' : 'outline'}
                size="sm"
                data-testid="tip-20"
                onClick={() => handleTipSelect(20)}
                type="button"
              >
                20%
              </Button>
              <Button
                variant={showCustomTip ? 'default' : 'outline'}
                size="sm"
                data-testid="tip-custom"
                onClick={handleCustomTip}
                type="button"
              >
                Custom
              </Button>
            </div>
            {showCustomTip && (
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={customTipInput}
                  onChange={(e) => setCustomTipInput(e.target.value)}
                  className="w-24"
                  data-testid="input-custom-tip"
                />
                <Button size="sm" variant="secondary" onClick={applyCustomTip} type="button">
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Card Details</Label>
            {scriptLoadError ? (
              <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
                <AlertCircle className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <p>Payment gateway is currently unavailable.</p>
                <p className="text-xs mt-1">Please ensure the Dough Gateway sandbox is configured.</p>
              </div>
            ) : (
              <div
                id="dough-tokenizer-container"
                className="border rounded-md min-h-[60px] p-2"
              />
            )}
          </div>

          <div className="flex items-center gap-1 justify-center text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Secured by Dough Gateway</span>
          </div>

          {token && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>Payment token received</span>
            </div>
          )}

          {error && (
            <div
              data-testid="text-payment-error"
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            data-testid="button-submit-payment"
            className="w-full"
            onClick={handleSubmit}
            disabled={isLoading || (!isTokenizerReady && !scriptLoadError)}
            type="button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>Pay ${centsToAmount(totalWithTip)}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
