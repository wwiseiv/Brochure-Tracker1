import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useAutoAuth } from "@/hooks/use-auto-auth";
import { AutoLayout } from "./AutoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Settings, Printer, Mail, CreditCard, Banknote,
  Check, Loader2, Receipt, ChevronDown,
} from "lucide-react";

interface Shop {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  cardFeePercent: string;
  partsTaxRate: string;
  laborTaxRate: string;
  laborTaxable: boolean;
}

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

interface Vehicle {
  id: number;
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  mileage: number | null;
}

interface LineItem {
  id: number;
  type: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unitPriceCash: string;
  unitPriceCard: string;
  totalCash: string;
  totalCard: string;
  isTaxable: boolean;
}

interface RepairOrder {
  id: number;
  roNumber: string;
  status: string;
  subtotalCash: string;
  subtotalCard: string;
  taxAmount: string;
  taxPartsAmount: string;
  taxLaborAmount: string;
  totalCash: string;
  totalCard: string;
  feeAmount: string;
  shopSupplyAmountCash: string;
  shopSupplyAmountCard: string;
  discountAmountCash: string;
  discountAmountCard: string;
  paidAmount: string;
  balanceDue: string;
  mileageIn: number | null;
  createdAt: string;
  paidAt: string | null;
}

interface Payment {
  id: number;
  amount: string;
  method: string;
  status: string;
  processedAt: string | null;
}

type Screen = "invoice" | "settings" | "payment" | "processing" | "receipt";

const fmt = (v: number) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AutoInvoice() {
  const params = useParams<{ roId: string }>();
  const roId = params.roId;
  const [, setLocation] = useLocation();
  const { autoFetch, user } = useAutoAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ro, setRo] = useState<RepairOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);

  const [screen, setScreen] = useState<Screen>("invoice");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [dualPricingRate, setDualPricingRate] = useState(3.5);
  const [cardBrand, setCardBrand] = useState("Visa");
  const [cardLast4, setCardLast4] = useState("4242");
  const [authCode, setAuthCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [paidAt, setPaidAt] = useState<Date | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roRes, shopRes] = await Promise.all([
        autoFetch(`/api/auto/repair-orders/${roId}`),
        autoFetch("/api/auto/shop/settings"),
      ]);
      if (!roRes.ok) {
        setError("Repair order not found");
        setLoading(false);
        return;
      }
      const roData = await roRes.json();
      const shopData = await shopRes.json();
      setRo(roData.repairOrder);
      setCustomer(roData.customer);
      setVehicle(roData.vehicle);
      setLineItems(roData.lineItems || []);
      setPayments(roData.payments || []);
      setShop(shopData);
      setDualPricingRate(parseFloat(shopData.cardFeePercent || "3.5"));
    } catch {
      setError("Failed to load invoice data");
    } finally {
      setLoading(false);
    }
  }, [autoFetch, roId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const p = (v: string | undefined | null) => parseFloat(v || "0");

  const subtotalCash = p(ro?.subtotalCash);
  const subtotalCard = p(ro?.subtotalCard);
  const taxPartsAmount = p(ro?.taxPartsAmount);
  const taxLaborAmount = p(ro?.taxLaborAmount);
  const taxAmount = p(ro?.taxAmount);
  const shopSupplyCash = p(ro?.shopSupplyAmountCash);
  const shopSupplyCard = p(ro?.shopSupplyAmountCard);
  const discountCash = p(ro?.discountAmountCash);
  const discountCard = p(ro?.discountAmountCard);
  const totalCash = p(ro?.totalCash);
  const totalCard = p(ro?.totalCard);
  const feeAmount = p(ro?.feeAmount);
  const paidAmount = p(ro?.paidAmount);
  const balanceDue = p(ro?.balanceDue);

  const finalAmount = paymentMethod === "card" ? totalCard : totalCash;
  const activeAmount = balanceDue > 0 ? Math.min(balanceDue, finalAmount) : finalAmount;
  const totalWithTip = +(activeAmount + tipAmount).toFixed(2);

  const handleTipSelect = (pct: number) => {
    setCustomTip("");
    setTipAmount(+(activeAmount * pct / 100).toFixed(2));
  };

  const handleCustomTipChange = (val: string) => {
    setCustomTip(val);
    const n = parseFloat(val);
    setTipAmount(isNaN(n) ? 0 : +n.toFixed(2));
  };

  const processPayment = async () => {
    setScreen("processing");
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setAuthCode(code);

    try {
      const body: any = {
        amount: totalWithTip,
        method: paymentMethod,
        notes: `Payment via invoice page${tipAmount > 0 ? ` (includes $${fmt(tipAmount)} tip)` : ""}`,
      };
      if (paymentMethod === "card") {
        body.referenceNumber = `${cardBrand} *${cardLast4} Auth:${code}`;
      }

      const res = await autoFetch(`/api/auto/repair-orders/${roId}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Payment failed");
      }

      setPaidAt(new Date());
      await fetchData();

      setTimeout(() => {
        setScreen("receipt");
      }, 2000);
    } catch (err: any) {
      toast({ title: "Payment Error", description: err.message, variant: "destructive" });
      setScreen("payment");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await autoFetch("/api/auto/shop/settings", {
        method: "PATCH",
        body: JSON.stringify({ cardFeePercent: dualPricingRate.toString() }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setShop(updated);
      toast({ title: "Settings saved" });
      setScreen("invoice");
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePrint = () => window.print();

  const handleEmailInvoice = async (type: "invoice" | "receipt" = "invoice") => {
    if (!customer?.email) {
      toast({ title: "No email", description: "Customer has no email address on file", variant: "destructive" });
      return;
    }
    setEmailSending(true);
    try {
      const res = await autoFetch("/api/auto/email/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roId: parseInt(roId!),
          type,
          paymentMethod: paymentMethod || undefined,
          cardBrand: paymentMethod === "card" ? cardBrand : undefined,
          cardLast4: paymentMethod === "card" ? cardLast4 : undefined,
          authCode: paymentMethod === "card" ? authCode : undefined,
          tipAmount: tipAmount > 0 ? tipAmount : undefined,
          totalCharged: totalWithTip > 0 ? totalWithTip : undefined,
          paidAt: paidAt ? paidAt.toLocaleString() : undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEmailSent(true);
        toast({ title: "Email sent", description: `${type === "receipt" ? "Receipt" : "Invoice"} emailed to ${customer.email}` });
        setTimeout(() => setEmailSent(false), 10000);
      } else {
        toast({ title: "Email failed", description: result.error || "Could not send email", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Email error", description: "Failed to send email", variant: "destructive" });
    } finally {
      setEmailSending(false);
    }
  };

  const resetPayment = () => {
    setPaymentMethod(null);
    setTipAmount(0);
    setCustomTip("");
    setPaidAt(null);
    setScreen("invoice");
  };

  if (loading) {
    return (
      <AutoLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-main" />
        </div>
      </AutoLayout>
    );
  }

  if (error || !ro) {
    return (
      <AutoLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-lg text-destructive" data-testid="text-error">{error || "Repair order not found"}</p>
          <Link href="/auto/repair-orders">
            <Button variant="outline" data-testid="button-back-ro-list">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Repair Orders
            </Button>
          </Link>
        </div>
      </AutoLayout>
    );
  }

  return (
    <AutoLayout>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .receipt-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        {screen === "invoice" && (
          <InvoiceScreen
            ro={ro}
            customer={customer}
            vehicle={vehicle}
            lineItems={lineItems}
            shop={shop}
            dualPricingRate={dualPricingRate}
            subtotalCash={subtotalCash}
            subtotalCard={subtotalCard}
            taxPartsAmount={taxPartsAmount}
            taxLaborAmount={taxLaborAmount}
            taxAmount={taxAmount}
            shopSupplyCash={shopSupplyCash}
            shopSupplyCard={shopSupplyCard}
            discountCash={discountCash}
            discountCard={discountCard}
            totalCash={totalCash}
            totalCard={totalCard}
            feeAmount={feeAmount}
            paidAmount={paidAmount}
            balanceDue={balanceDue}
            emailSent={emailSent}
            emailSending={emailSending}
            onTakePayment={() => setScreen("payment")}
            onSettings={() => setScreen("settings")}
            onPrint={handlePrint}
            onEmail={() => handleEmailInvoice("invoice")}
            roId={roId!}
          />
        )}

        {screen === "settings" && (
          <SettingsScreen
            dualPricingRate={dualPricingRate}
            onRateChange={setDualPricingRate}
            onSave={handleSaveSettings}
            onBack={() => setScreen("invoice")}
            saving={savingSettings}
          />
        )}

        {screen === "payment" && (
          <PaymentScreen
            paymentMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
            totalCash={totalCash}
            totalCard={totalCard}
            activeAmount={activeAmount}
            tipAmount={tipAmount}
            customTip={customTip}
            totalWithTip={totalWithTip}
            dualPricingRate={dualPricingRate}
            feeAmount={feeAmount}
            cardBrand={cardBrand}
            cardLast4={cardLast4}
            onCardBrandChange={setCardBrand}
            onCardLast4Change={setCardLast4}
            onTipSelect={handleTipSelect}
            onCustomTipChange={handleCustomTipChange}
            onProcess={processPayment}
            onBack={() => setScreen("invoice")}
            balanceDue={balanceDue}
          />
        )}

        {screen === "processing" && (
          <ProcessingScreen
            paymentMethod={paymentMethod!}
            totalWithTip={totalWithTip}
          />
        )}

        {screen === "receipt" && (
          <ReceiptScreen
            ro={ro}
            customer={customer}
            vehicle={vehicle}
            lineItems={lineItems}
            shop={shop}
            paymentMethod={paymentMethod!}
            authCode={authCode}
            cardBrand={cardBrand}
            cardLast4={cardLast4}
            tipAmount={tipAmount}
            totalWithTip={totalWithTip}
            activeAmount={activeAmount}
            paidAt={paidAt}
            dualPricingRate={dualPricingRate}
            feeAmount={feeAmount}
            subtotalCash={subtotalCash}
            taxAmount={taxAmount}
            onPrint={handlePrint}
            onEmail={() => handleEmailInvoice("receipt")}
            onViewInvoice={resetPayment}
            onBackToRO={() => setLocation(`/auto/repair-orders/${roId}`)}
            roId={roId!}
          />
        )}
      </div>
    </AutoLayout>
  );
}

function InvoiceScreen({
  ro, customer, vehicle, lineItems, shop, dualPricingRate,
  subtotalCash, subtotalCard, taxPartsAmount, taxLaborAmount, taxAmount,
  shopSupplyCash, shopSupplyCard, discountCash, discountCard,
  totalCash, totalCard, feeAmount, paidAmount, balanceDue,
  emailSent, emailSending, onTakePayment, onSettings, onPrint, onEmail, roId,
}: {
  ro: RepairOrder; customer: Customer | null; vehicle: Vehicle | null;
  lineItems: LineItem[]; shop: Shop | null; dualPricingRate: number;
  subtotalCash: number; subtotalCard: number;
  taxPartsAmount: number; taxLaborAmount: number; taxAmount: number;
  shopSupplyCash: number; shopSupplyCard: number;
  discountCash: number; discountCard: number;
  totalCash: number; totalCard: number; feeAmount: number;
  paidAmount: number; balanceDue: number;
  emailSent: boolean; emailSending: boolean;
  onTakePayment: () => void; onSettings: () => void;
  onPrint: () => void; onEmail: () => void;
  roId: string;
}) {
  return (
    <>
      <div className="no-print flex items-center gap-2 mb-2">
        <Link href={`/auto/repair-orders/${roId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-to-ro">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold" data-testid="text-invoice-title">Invoice</h1>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold" data-testid="text-shop-name">{shop?.name || "Auto Shop"}</h2>
            {shop?.address && (
              <p className="text-sm text-muted-foreground" data-testid="text-shop-address">
                {shop.address}{shop.city ? `, ${shop.city}` : ""}{shop.state ? `, ${shop.state}` : ""} {shop.zip || ""}
              </p>
            )}
            {shop?.phone && (
              <p className="text-sm text-muted-foreground" data-testid="text-shop-phone">{shop.phone}</p>
            )}
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-bold tracking-wide">INVOICE</p>
              <p className="text-sm text-muted-foreground" data-testid="text-ro-number">RO #{ro.roNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground" data-testid="text-invoice-date">
                {new Date(ro.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <Badge variant="outline" className="text-xs" data-testid="badge-status">{ro.status}</Badge>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-1">Customer</p>
              {customer && (
                <>
                  <p data-testid="text-customer-name">{customer.firstName} {customer.lastName}</p>
                  {customer.phone && <p className="text-muted-foreground" data-testid="text-customer-phone">{customer.phone}</p>}
                  {customer.email && <p className="text-muted-foreground" data-testid="text-customer-email">{customer.email}</p>}
                </>
              )}
            </div>
            <div>
              <p className="font-semibold mb-1">Vehicle</p>
              {vehicle && (
                <>
                  <p data-testid="text-vehicle-info">
                    {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
                  </p>
                  {vehicle.vin && <p className="text-muted-foreground text-xs" data-testid="text-vehicle-vin">VIN: {vehicle.vin}</p>}
                  {(vehicle.mileage || ro.mileageIn) && (
                    <p className="text-muted-foreground text-xs" data-testid="text-vehicle-mileage">
                      Mileage: {(vehicle.mileage || ro.mileageIn)?.toLocaleString()}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-semibold">Description</th>
                  <th className="pb-2 font-semibold text-center">Type</th>
                  <th className="pb-2 font-semibold text-center">Qty</th>
                  <th className="pb-2 font-semibold text-right">Unit Price</th>
                  <th className="pb-2 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/50" data-testid={`row-line-item-${item.id}`}>
                    <td className="py-2 pr-2">
                      <p>{item.description}</p>
                      {item.partNumber && <p className="text-xs text-muted-foreground">#{item.partNumber}</p>}
                    </td>
                    <td className="py-2 text-center">
                      <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                    </td>
                    <td className="py-2 text-center font-mono">{parseFloat(item.quantity)}</td>
                    <td className="py-2 text-right font-mono">${fmt(parseFloat(item.unitPriceCash))}</td>
                    <td className="py-2 text-right font-mono">${fmt(parseFloat(item.totalCash))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span>Subtotal</span>
              <span className="font-mono" data-testid="text-subtotal-cash">${fmt(subtotalCash)}</span>
            </div>

            {taxAmount > 0 && (
              <div className="flex justify-between gap-2">
                <span>Tax</span>
                <span className="font-mono">${fmt(taxAmount)}</span>
              </div>
            )}

            {shopSupplyCash > 0 && (
              <div className="flex justify-between gap-2">
                <span>Shop Supplies</span>
                <span className="font-mono">${fmt(shopSupplyCash)}</span>
              </div>
            )}

            {discountCash > 0 && (
              <div className="flex justify-between gap-2 text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span className="font-mono">-${fmt(discountCash)}</span>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="border rounded-md p-4 text-center" data-testid="box-cash-price">
                <p className="text-sm font-semibold text-muted-foreground mb-1">Cash Price</p>
                <p className="text-2xl font-bold font-mono text-green-600 dark:text-green-400">${fmt(totalCash)}</p>
              </div>
              <div className="border rounded-md p-4 text-center" data-testid="box-card-price">
                <p className="text-sm font-semibold text-muted-foreground mb-1">Card Price</p>
                <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">${fmt(totalCard)}</p>
              </div>
            </div>

            {paidAmount > 0 && (
              <div className="space-y-1 pt-2">
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>Amount Paid</span>
                  <span className="font-mono" data-testid="text-paid-amount">${fmt(paidAmount)}</span>
                </div>
                <div className="flex justify-between gap-2 font-bold text-destructive">
                  <span>Balance Due</span>
                  <span className="font-mono" data-testid="text-balance-due">${fmt(balanceDue)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="no-print grid grid-cols-2 gap-3">
        <Button className="col-span-2" onClick={onTakePayment} data-testid="button-take-payment">
          <CreditCard className="h-4 w-4 mr-2" />
          Take Payment
        </Button>
        <Button variant="outline" onClick={onSettings} data-testid="button-settings">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button variant="outline" onClick={onPrint} data-testid="button-print-invoice">
          <Printer className="h-4 w-4 mr-2" />
          Print Invoice
        </Button>
        <Button variant="outline" className="col-span-2" onClick={onEmail} disabled={emailSent || emailSending} data-testid="button-email-invoice">
          {emailSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
          {emailSending ? "Sending..." : emailSent ? "Email Sent" : "Email Invoice"}
        </Button>
      </div>
    </>
  );
}

function SettingsScreen({
  dualPricingRate, onRateChange, onSave, onBack, saving,
}: {
  dualPricingRate: number;
  onRateChange: (v: number) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [localRate, setLocalRate] = useState(dualPricingRate);

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-settings-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold" data-testid="text-settings-title">Dual Pricing Settings</h1>
      </div>

      <Card>
        <CardContent className="p-5 space-y-6">
          <div className="space-y-3">
            <Label>Dual Pricing Rate</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[localRate]}
                onValueChange={([v]) => setLocalRate(v)}
                min={0}
                max={4}
                step={0.25}
                className="flex-1"
                data-testid="slider-dual-pricing-rate"
              />
              <span className="font-mono text-lg font-bold min-w-[4rem] text-right" data-testid="text-dual-pricing-value">
                {localRate.toFixed(2)}%
              </span>
            </div>
            <Input
              type="number"
              value={localRate}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v >= 0 && v <= 4) setLocalRate(v);
              }}
              min={0}
              max={4}
              step={0.25}
              data-testid="input-dual-pricing-rate"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Disclosure Preview</Label>
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground" data-testid="text-disclosure-preview">
                  {localRate > 0
                    ? `This is the difference between your cash price and card price. The card price is automatically calculated as: Cash Price + (Cash Price × ${localRate.toFixed(2)}%) = Card Price`
                    : "No dual pricing applied. Cash and card prices are the same."}
                </p>
              </CardContent>
            </Card>
          </div>

          <Button
            className="w-full"
            onClick={() => { onRateChange(localRate); onSave(); }}
            disabled={saving}
            data-testid="button-save-settings"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function PaymentScreen({
  paymentMethod, onSelectMethod, totalCash, totalCard,
  activeAmount, tipAmount, customTip, totalWithTip,
  dualPricingRate, feeAmount, cardBrand, cardLast4,
  onCardBrandChange, onCardLast4Change,
  onTipSelect, onCustomTipChange, onProcess, onBack, balanceDue,
}: {
  paymentMethod: "cash" | "card" | null;
  onSelectMethod: (m: "cash" | "card") => void;
  totalCash: number; totalCard: number;
  activeAmount: number; tipAmount: number;
  customTip: string; totalWithTip: number;
  dualPricingRate: number; feeAmount: number;
  cardBrand: string; cardLast4: string;
  onCardBrandChange: (v: string) => void;
  onCardLast4Change: (v: string) => void;
  onTipSelect: (pct: number) => void;
  onCustomTipChange: (v: string) => void;
  onProcess: () => void;
  onBack: () => void;
  balanceDue: number;
}) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-payment-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold" data-testid="text-payment-title">Take Payment</h1>
      </div>

      {balanceDue > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-sm text-center text-muted-foreground">
              Balance Due: <span className="font-mono font-bold text-foreground">${fmt(balanceDue)}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={paymentMethod === "cash" ? "default" : "outline"}
          className={`h-24 flex-col gap-2 ${paymentMethod === "cash" ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : ""}`}
          onClick={() => onSelectMethod("cash")}
          data-testid="button-select-cash"
        >
          <Banknote className="h-8 w-8" />
          <div className="text-center">
            <span className="font-semibold text-sm">CASH</span>
            <p className="text-lg font-bold font-mono mt-1">${fmt(totalCash)}</p>
          </div>
        </Button>
        <Button
          variant={paymentMethod === "card" ? "default" : "outline"}
          className={`h-24 flex-col gap-2 ${paymentMethod === "card" ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" : ""}`}
          onClick={() => onSelectMethod("card")}
          data-testid="button-select-card"
        >
          <CreditCard className="h-8 w-8" />
          <div className="text-center">
            <span className="font-semibold text-sm">CARD</span>
            <p className="text-lg font-bold font-mono mt-1">${fmt(totalCard)}</p>
          </div>
        </Button>
      </div>

      {paymentMethod && (
        <>
          <Card>
            <CardContent className="p-5 space-y-4">
              {paymentMethod === "cash" && (
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Cash Price</p>
                  <p className="text-3xl font-bold font-mono text-green-600 dark:text-green-400" data-testid="text-cash-price">
                    ${fmt(activeAmount)}
                  </p>
                </div>
              )}

              {paymentMethod === "card" && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground">Card Price</p>
                    <p className="text-3xl font-bold font-mono text-blue-600 dark:text-blue-400" data-testid="text-card-price">
                      ${fmt(activeAmount)}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Card Brand</Label>
                      <Select value={cardBrand} onValueChange={onCardBrandChange}>
                        <SelectTrigger data-testid="select-card-brand">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Visa">Visa</SelectItem>
                          <SelectItem value="Mastercard">Mastercard</SelectItem>
                          <SelectItem value="Amex">Amex</SelectItem>
                          <SelectItem value="Discover">Discover</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Last 4 Digits</Label>
                      <Input
                        value={cardLast4}
                        onChange={(e) => onCardLast4Change(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4}
                        placeholder="4242"
                        data-testid="input-card-last4"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Label>Add Tip</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <Button
                      key={pct}
                      variant="outline"
                      size="sm"
                      className={`toggle-elevate ${tipAmount === +(activeAmount * pct / 100).toFixed(2) && customTip === "" ? "toggle-elevated" : ""}`}
                      onClick={() => onTipSelect(pct)}
                      data-testid={`button-tip-${pct}`}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="shrink-0">Custom $</Label>
                  <Input
                    type="number"
                    value={customTip}
                    onChange={(e) => onCustomTipChange(e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    data-testid="input-custom-tip"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span>{paymentMethod === "card" ? "Card Amount" : "Cash Amount"}</span>
                  <span className="font-mono">${fmt(activeAmount)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between gap-2 text-muted-foreground">
                    <span>Tip</span>
                    <span className="font-mono">${fmt(tipAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between gap-2 font-bold text-lg">
                  <span>Total</span>
                  <span className="font-mono" data-testid="text-payment-total">${fmt(totalWithTip)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={onProcess} data-testid="button-process-payment">
            <Check className="h-4 w-4 mr-2" />
            Process Payment — ${fmt(totalWithTip)}
          </Button>
        </>
      )}
    </>
  );
}

function ProcessingScreen({
  paymentMethod, totalWithTip,
}: {
  paymentMethod: "cash" | "card";
  totalWithTip: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
      <Loader2 className="h-16 w-16 animate-spin text-primary" data-testid="loader-processing" />
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold" data-testid="text-processing-label">
          {paymentMethod === "card" ? "Processing Card Payment..." : "Recording Cash Payment..."}
        </p>
        <p className="text-3xl font-bold font-mono" data-testid="text-processing-amount">
          ${fmt(totalWithTip)}
        </p>
      </div>
    </div>
  );
}

function ReceiptScreen({
  ro, customer, vehicle, lineItems, shop,
  paymentMethod, authCode, cardBrand, cardLast4,
  tipAmount, totalWithTip, activeAmount, paidAt,
  dualPricingRate, feeAmount, subtotalCash, taxAmount,
  onPrint, onEmail, onViewInvoice, onBackToRO, roId,
}: {
  ro: RepairOrder; customer: Customer | null; vehicle: Vehicle | null;
  lineItems: LineItem[]; shop: Shop | null;
  paymentMethod: "cash" | "card";
  authCode: string; cardBrand: string; cardLast4: string;
  tipAmount: number; totalWithTip: number; activeAmount: number;
  paidAt: Date | null;
  dualPricingRate: number; feeAmount: number;
  subtotalCash: number; taxAmount: number;
  onPrint: () => void; onEmail: () => void;
  onViewInvoice: () => void; onBackToRO: () => void;
  roId: string;
}) {
  const isCard = paymentMethod === "card";
  const bannerColor = isCard
    ? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200"
    : "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200";

  return (
    <>
      <Card className={`border-2 ${isCard ? "border-blue-200 dark:border-blue-800" : "border-green-200 dark:border-green-800"}`}>
        <CardContent className={`p-5 ${bannerColor} rounded-t-md`}>
          <div className="flex items-center justify-center gap-2" data-testid="text-receipt-success">
            <Check className="h-6 w-6" />
            <p className="text-lg font-bold">Payment Successful</p>
          </div>
        </CardContent>
        <CardContent className="p-5 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Method</div>
            <div className="text-right font-semibold" data-testid="text-receipt-method">
              {isCard ? `${cardBrand} ****${cardLast4}` : "Cash"}
            </div>
            {isCard && (
              <>
                <div className="text-muted-foreground">Auth Code</div>
                <div className="text-right font-mono" data-testid="text-receipt-auth">{authCode}</div>
              </>
            )}
            <div className="text-muted-foreground">Time</div>
            <div className="text-right" data-testid="text-receipt-time">
              {paidAt ? paidAt.toLocaleString() : new Date().toLocaleString()}
            </div>
            <div className="text-muted-foreground">Amount</div>
            <div className="text-right font-mono" data-testid="text-receipt-amount">${fmt(activeAmount)}</div>
            {tipAmount > 0 && (
              <>
                <div className="text-muted-foreground">Tip</div>
                <div className="text-right font-mono" data-testid="text-receipt-tip">${fmt(tipAmount)}</div>
              </>
            )}
            <Separator className="col-span-2" />
            <div className="font-bold">Total Charged</div>
            <div className="text-right font-mono font-bold text-lg" data-testid="text-receipt-total">${fmt(totalWithTip)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="no-print grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onPrint} data-testid="button-print-receipt">
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        <Button variant="outline" onClick={onEmail} data-testid="button-email-receipt">
          <Mail className="h-4 w-4 mr-2" />
          Email Receipt
        </Button>
        <Button variant="outline" onClick={onViewInvoice} data-testid="button-view-invoice">
          <Receipt className="h-4 w-4 mr-2" />
          View Full Invoice
        </Button>
        <Link href={`/auto/repair-orders/${roId}`}>
          <Button variant="outline" className="w-full" onClick={onBackToRO} data-testid="button-back-to-ro-detail">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to RO
          </Button>
        </Link>
      </div>

      <div className="receipt-container">
        <Card>
          <CardContent className="p-5 space-y-4 text-sm">
            <div className="text-center space-y-1">
              <p className="font-bold text-base">{shop?.name || "Auto Shop"}</p>
              {shop?.address && (
                <p className="text-xs text-muted-foreground">
                  {shop.address}{shop.city ? `, ${shop.city}` : ""}{shop.state ? `, ${shop.state}` : ""} {shop.zip || ""}
                </p>
              )}
              {shop?.phone && <p className="text-xs text-muted-foreground">{shop.phone}</p>}
            </div>

            <Separator />

            <div className="space-y-1 text-xs">
              <p>RO #{ro.roNumber}</p>
              {customer && <p>Customer: {customer.firstName} {customer.lastName}</p>}
              {vehicle && (
                <p>Vehicle: {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}</p>
              )}
              {(vehicle?.mileage || ro.mileageIn) && <p>Mileage: {(vehicle?.mileage || ro.mileageIn)?.toLocaleString()}</p>}
              <p>Date: {new Date(ro.createdAt).toLocaleDateString()}</p>
            </div>

            <Separator />

            <div>
              {lineItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-2 py-1 text-xs">
                  <span className="truncate flex-1">{item.description}</span>
                  <span className="font-mono shrink-0">
                    ${fmt(parseFloat(isCard ? item.totalCard : item.totalCash))}
                  </span>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-2">
                <span>Subtotal</span>
                <span className="font-mono">${fmt(isCard ? (activeAmount - taxAmount) : subtotalCash)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between gap-2">
                  <span>Tax</span>
                  <span className="font-mono">${fmt(taxAmount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between gap-2">
                  <span>Tip</span>
                  <span className="font-mono">${fmt(tipAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between gap-2 font-bold">
                <span>Total</span>
                <span className="font-mono">${fmt(totalWithTip)}</span>
              </div>
            </div>

            <Separator />

            <div className="text-xs space-y-1">
              <p>Payment: {isCard ? `${cardBrand} ****${cardLast4}` : "Cash"}</p>
              {isCard && <p>Auth: {authCode}</p>}
              <p>Date: {paidAt ? paidAt.toLocaleString() : new Date().toLocaleString()}</p>
            </div>

            <div className="text-center space-y-1 pt-2">
              <p className="text-sm font-semibold">Thank you for your business!</p>
              <p className="text-xs text-muted-foreground">Powered by PCB Auto</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
