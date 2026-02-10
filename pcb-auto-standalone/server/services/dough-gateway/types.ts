export type DoughTransactionType = 'sale' | 'auth' | 'credit' | 'validate';

export type DoughTransactionStatus = 'pending' | 'settled' | 'declined' | 'voided' | 'refunded';

export interface DoughAddress {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface DoughCardPayment {
  number: string;
  expiration_date: string;
  cvv: string;
  billing_address?: DoughAddress;
}

export type DoughPaymentMethod =
  | { card: DoughCardPayment }
  | { token: string }
  | { customer_id: string };

export interface DoughTransactionRequest {
  type: DoughTransactionType;
  amount: number;
  payment_method: DoughPaymentMethod;
  currency?: string;
  description?: string;
  order_id?: string;
  processor_id?: string;
  idempotency_key?: string;
  billing_address?: DoughAddress;
  shipping_address?: DoughAddress;
  ip_address?: string;
}

export interface DoughTransactionResponse {
  id: string;
  type: DoughTransactionType;
  amount: number;
  status: DoughTransactionStatus;
  response_code: string;
  response_text: string;
  authorization_code: string;
  avs_response: string;
  cvv_response: string;
  processor_id: string;
  created_at: string;
  updated_at: string;
  payment_method: {
    last4: string;
    brand: string;
    exp: string;
  };
  billing_address?: DoughAddress;
  metadata?: Record<string, unknown>;
}

export interface DoughCaptureRequest {
  amount?: number;
}

export interface DoughRefundRequest {
  amount?: number;
}

export interface DoughSearchRequest {
  date_start: string;
  date_end: string;
  type?: DoughTransactionType;
  status?: DoughTransactionStatus;
  amount_min?: number;
  amount_max?: number;
  order_id?: string;
  page?: number;
  per_page?: number;
}

export interface DoughSearchResponse {
  total: number;
  page: number;
  per_page: number;
  data: DoughTransactionResponse[];
}

export type DoughACHAccountType = 'checking' | 'savings';
export type DoughACHSecCode = 'web' | 'ccd' | 'ppd';

export interface DoughACHPayment {
  routing_number: string;
  account_number: string;
  account_type: DoughACHAccountType;
  sec_code: DoughACHSecCode;
}

export interface DoughCustomerRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  payment_method?: { card: DoughCardPayment } | { ach: DoughACHPayment };
}

export interface DoughCustomerPaymentMethod {
  id: string;
  type: 'card' | 'ach';
  last4: string;
  brand?: string;
  exp?: string;
  account_type?: DoughACHAccountType;
}

export interface DoughCustomerResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  payment_methods: DoughCustomerPaymentMethod[];
  created_at: string;
  updated_at: string;
}

export interface DoughCalculateRequest {
  amount: number;
  payment_method_type: 'card' | 'ach';
}

export interface DoughCalculateResponse {
  base_amount: number;
  surcharge_amount: number;
  total_amount: number;
  surcharge_rate: number;
}

export type DoughWebhookEventType =
  | 'transaction.settled'
  | 'transaction.declined'
  | 'settlement.batch'
  | 'chargeback.created';

export interface DoughWebhookEvent {
  id: string;
  type: DoughWebhookEventType;
  data: Record<string, unknown>;
  created_at: string;
}

export interface DoughWebhookConfig {
  clientSecret: string;
  onTransactionSettled?: (event: DoughWebhookEvent) => void | Promise<void>;
  onTransactionDeclined?: (event: DoughWebhookEvent) => void | Promise<void>;
  onSettlementBatch?: (event: DoughWebhookEvent) => void | Promise<void>;
  onChargebackCreated?: (event: DoughWebhookEvent) => void | Promise<void>;
}

export type PCBAutoPaymentType = 'cash_price' | 'card_price';

export interface PCBAutoLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PCBAutoRepairOrderPayment {
  repairOrderId: number;
  customerName: string;
  vehicleInfo?: string;
  subtotal: number;
  tax: number;
  total: number;
  tipAmount?: number;
  deposit?: number;
  paymentType: PCBAutoPaymentType;
  lineItems: PCBAutoLineItem[];
}

export interface PCBAutoReceiptData {
  amount: number;
  last4: string;
  brand: string;
  authCode: string;
  timestamp: string;
}

export interface PCBAutoPaymentResult {
  success: boolean;
  transactionId?: string;
  receiptData?: PCBAutoReceiptData;
  errorMessage?: string;
  errorCode?: string;
}

export interface PCBAutoPaymentFormProps {
  publicKey: string;
  gatewayUrl: string;
  repairOrder: PCBAutoRepairOrderPayment;
  onPaymentSuccess: (token: string) => void;
  onPaymentError: (error: string) => void;
  isDualPricing?: boolean;
}

export interface DoughGatewayConfig {
  baseUrl: string;
  apiKey: string;
  publicKey: string;
  processorId: string;
}
