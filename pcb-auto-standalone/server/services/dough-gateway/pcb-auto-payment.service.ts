import * as crypto from 'node:crypto';
import type {
  DoughGatewayConfig,
  DoughCardPayment,
  DoughTransactionResponse,
  PCBAutoRepairOrderPayment,
  PCBAutoPaymentResult,
  PCBAutoReceiptData,
} from './types';
import { DoughGatewayService } from './dough-gateway.service';

export class PCBAutoPaymentService {
  private gateway: DoughGatewayService;

  constructor(config: DoughGatewayConfig) {
    this.gateway = new DoughGatewayService(config);
  }

  async processTokenPayment(
    repairOrder: PCBAutoRepairOrderPayment,
    token: string,
  ): Promise<PCBAutoPaymentResult> {
    try {
      const description = `RO#${repairOrder.repairOrderId} - ${repairOrder.customerName}${repairOrder.vehicleInfo ? ` - ${repairOrder.vehicleInfo}` : ''}`;
      const tx = await this.gateway.createTransaction({
        type: 'sale',
        amount: repairOrder.total,
        payment_method: { token },
        order_id: String(repairOrder.repairOrderId),
        description,
        idempotency_key: crypto.randomUUID(),
      });

      if (tx.status === 'declined') {
        return {
          success: false,
          transactionId: tx.id,
          errorMessage: tx.response_text,
          errorCode: tx.response_code,
        };
      }

      return {
        success: true,
        transactionId: tx.id,
        receiptData: this.buildReceiptData(tx),
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message || 'Payment processing failed',
      };
    }
  }

  async processCardPayment(
    repairOrder: PCBAutoRepairOrderPayment,
    card: DoughCardPayment,
  ): Promise<PCBAutoPaymentResult> {
    try {
      const description = `RO#${repairOrder.repairOrderId} - ${repairOrder.customerName}${repairOrder.vehicleInfo ? ` - ${repairOrder.vehicleInfo}` : ''}`;
      const tx = await this.gateway.createTransaction({
        type: 'sale',
        amount: repairOrder.total,
        payment_method: { card },
        order_id: String(repairOrder.repairOrderId),
        description,
        idempotency_key: crypto.randomUUID(),
        billing_address: card.billing_address,
      });

      if (tx.status === 'declined') {
        return {
          success: false,
          transactionId: tx.id,
          errorMessage: tx.response_text,
          errorCode: tx.response_code,
        };
      }

      return {
        success: true,
        transactionId: tx.id,
        receiptData: this.buildReceiptData(tx),
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message || 'Payment processing failed',
      };
    }
  }

  async processDeposit(
    repairOrder: PCBAutoRepairOrderPayment,
    token: string,
    depositAmount: number,
  ): Promise<PCBAutoPaymentResult> {
    try {
      const description = `Deposit - RO#${repairOrder.repairOrderId} - ${repairOrder.customerName}${repairOrder.vehicleInfo ? ` - ${repairOrder.vehicleInfo}` : ''}`;
      const tx = await this.gateway.createTransaction({
        type: 'sale',
        amount: depositAmount,
        payment_method: { token },
        order_id: String(repairOrder.repairOrderId),
        description,
        idempotency_key: crypto.randomUUID(),
      });

      if (tx.status === 'declined') {
        return {
          success: false,
          transactionId: tx.id,
          errorMessage: tx.response_text,
          errorCode: tx.response_code,
        };
      }

      return {
        success: true,
        transactionId: tx.id,
        receiptData: this.buildReceiptData(tx),
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message || 'Deposit processing failed',
      };
    }
  }

  async voidPayment(transactionId: string): Promise<PCBAutoPaymentResult> {
    try {
      const tx = await this.gateway.voidTransaction(transactionId);
      return {
        success: true,
        transactionId: tx.id,
        receiptData: this.buildReceiptData(tx),
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: transactionId,
        errorMessage: error.message || 'Void failed',
      };
    }
  }

  async refundPayment(transactionId: string, amount?: number): Promise<PCBAutoPaymentResult> {
    try {
      const tx = await this.gateway.refundTransaction(
        transactionId,
        amount !== undefined ? { amount } : undefined,
      );
      return {
        success: true,
        transactionId: tx.id,
        receiptData: this.buildReceiptData(tx),
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: transactionId,
        errorMessage: error.message || 'Refund failed',
      };
    }
  }

  async createCustomerVault(
    customerName: string,
    email: string,
    token: string,
  ): Promise<{ customerId: string } | { error: string }> {
    try {
      const nameParts = customerName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const customer = await this.gateway.createCustomer({
        first_name: firstName,
        last_name: lastName,
        email,
        payment_method: { card: { number: '', expiration_date: '', cvv: '' } },
      });

      return { customerId: customer.id };
    } catch (error: any) {
      return { error: error.message || 'Failed to create customer vault' };
    }
  }

  async chargeVaultCustomer(
    repairOrder: PCBAutoRepairOrderPayment,
    customerId: string,
  ): Promise<PCBAutoPaymentResult> {
    try {
      const description = `RO#${repairOrder.repairOrderId} - ${repairOrder.customerName}${repairOrder.vehicleInfo ? ` - ${repairOrder.vehicleInfo}` : ''}`;
      const tx = await this.gateway.createTransaction({
        type: 'sale',
        amount: repairOrder.total,
        payment_method: { customer_id: customerId },
        order_id: String(repairOrder.repairOrderId),
        description,
        idempotency_key: crypto.randomUUID(),
      });

      if (tx.status === 'declined') {
        return {
          success: false,
          transactionId: tx.id,
          errorMessage: tx.response_text,
          errorCode: tx.response_code,
        };
      }

      return {
        success: true,
        transactionId: tx.id,
        receiptData: this.buildReceiptData(tx),
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error.message || 'Vault charge failed',
      };
    }
  }

  async calculateDualPricing(
    subtotalCents: number,
  ): Promise<{ cashPrice: number; cardPrice: number; surchargeAmount: number; surchargeRate: number }> {
    const result = await this.gateway.calculateAmounts({
      amount: subtotalCents,
      payment_method_type: 'card',
    });

    return {
      cashPrice: result.base_amount,
      cardPrice: result.total_amount,
      surchargeAmount: result.surcharge_amount,
      surchargeRate: result.surcharge_rate,
    };
  }

  async getTransactionDetails(transactionId: string): Promise<DoughTransactionResponse> {
    return this.gateway.getTransaction(transactionId);
  }

  private buildReceiptData(tx: DoughTransactionResponse): PCBAutoReceiptData {
    return {
      amount: tx.amount,
      last4: tx.payment_method?.last4 || '****',
      brand: tx.payment_method?.brand || 'Unknown',
      authCode: tx.authorization_code || '',
      timestamp: tx.created_at,
    };
  }
}
