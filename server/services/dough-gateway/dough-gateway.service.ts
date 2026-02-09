import type {
  DoughGatewayConfig,
  DoughTransactionRequest,
  DoughTransactionResponse,
  DoughCaptureRequest,
  DoughRefundRequest,
  DoughSearchRequest,
  DoughSearchResponse,
  DoughCalculateRequest,
  DoughCalculateResponse,
  DoughCustomerRequest,
  DoughCustomerResponse,
} from './types';

export class DoughGatewayService {
  private baseUrl: string;
  private apiKey: string;
  private processorId: string;

  constructor(config: DoughGatewayConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.processorId = config.processorId;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = { method, headers };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    const correlationId = response.headers.get('x-correlation-id');
    if (correlationId) {
      console.log(`[DoughGateway] ${method} ${endpoint} correlation-id: ${correlationId}`);
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {}
      throw new Error(
        `DoughGateway ${method} ${endpoint} failed (${response.status}): ${errorBody}`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async createTransaction(req: DoughTransactionRequest): Promise<DoughTransactionResponse> {
    if (this.processorId && !req.processor_id) {
      req = { ...req, processor_id: this.processorId };
    }
    return this.request<DoughTransactionResponse>('POST', '/api/transaction', req);
  }

  async getTransaction(id: string): Promise<DoughTransactionResponse> {
    return this.request<DoughTransactionResponse>('GET', `/api/transaction/${id}`);
  }

  async captureTransaction(id: string, req?: DoughCaptureRequest): Promise<DoughTransactionResponse> {
    return this.request<DoughTransactionResponse>('POST', `/api/transaction/${id}/capture`, req);
  }

  async voidTransaction(id: string): Promise<DoughTransactionResponse> {
    return this.request<DoughTransactionResponse>('POST', `/api/transaction/${id}/void`);
  }

  async refundTransaction(id: string, req?: DoughRefundRequest): Promise<DoughTransactionResponse> {
    return this.request<DoughTransactionResponse>('POST', `/api/transaction/${id}/refund`, req);
  }

  async searchTransactions(req: DoughSearchRequest): Promise<DoughSearchResponse> {
    return this.request<DoughSearchResponse>('POST', '/api/transaction/search', req);
  }

  async calculateAmounts(req: DoughCalculateRequest): Promise<DoughCalculateResponse> {
    return this.request<DoughCalculateResponse>('POST', '/api/calculate/amounts', req);
  }

  async lookupFees(req: DoughCalculateRequest): Promise<DoughCalculateResponse> {
    return this.request<DoughCalculateResponse>('POST', '/api/lookup/fees', req);
  }

  async createCustomer(req: DoughCustomerRequest): Promise<DoughCustomerResponse> {
    return this.request<DoughCustomerResponse>('POST', '/api/customer', req);
  }

  async getCustomer(id: string): Promise<DoughCustomerResponse> {
    return this.request<DoughCustomerResponse>('GET', `/api/customer/${id}`);
  }

  async updateCustomer(id: string, req: Partial<DoughCustomerRequest>): Promise<DoughCustomerResponse> {
    return this.request<DoughCustomerResponse>('PUT', `/api/customer/${id}`, req);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.request<void>('DELETE', `/api/customer/${id}`);
  }
}
