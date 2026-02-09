import type { DoughGatewayConfig } from './types';

export const DOUGH_SANDBOX_CONFIG: DoughGatewayConfig = {
  baseUrl: 'https://sandbox.dough.tech/api/v1',
  apiKey: process.env.DOUGH_SANDBOX_API_KEY || '',
  publicKey: process.env.DOUGH_SANDBOX_PUBLIC_KEY || '',
  processorId: process.env.DOUGH_SANDBOX_PROCESSOR_ID || '',
};

export const DOUGH_PRODUCTION_CONFIG: DoughGatewayConfig = {
  baseUrl: 'https://api.dough.tech/api/v1',
  apiKey: process.env.DOUGH_API_KEY || '',
  publicKey: process.env.DOUGH_PUBLIC_KEY || '',
  processorId: process.env.DOUGH_PROCESSOR_ID || '',
};

export function getDoughConfig(): DoughGatewayConfig {
  if (process.env.NODE_ENV === 'production') {
    return DOUGH_PRODUCTION_CONFIG;
  }
  return DOUGH_SANDBOX_CONFIG;
}

export const TEST_CARDS = {
  approval: {
    visa_debit: { number: '4111111111111111', expiration_date: '12/30', cvv: '999' },
    visa_credit: { number: '4012000033330026', expiration_date: '12/30', cvv: '999' },
    mastercard_debit: { number: '5112000200000002', expiration_date: '12/30', cvv: '999' },
    mastercard_credit: { number: '5500000000000004', expiration_date: '12/30', cvv: '999' },
    amex: { number: '371449635398431', expiration_date: '12/30', cvv: '9999' },
    discover: { number: '6011000990139424', expiration_date: '12/30', cvv: '999' },
  },
  decline: {
    decline: { number: '4000000000000002', expiration_date: '12/30', cvv: '999' },
    insufficient_funds: { number: '4000000000009995', expiration_date: '12/30', cvv: '999' },
    lost_card: { number: '4000000000009987', expiration_date: '12/30', cvv: '999' },
    stolen_card: { number: '4000000000009979', expiration_date: '12/30', cvv: '999' },
    expired_card: { number: '4000000000000069', expiration_date: '12/30', cvv: '999' },
    partial_approval: { number: '4000000000000077', expiration_date: '12/30', cvv: '999' },
  },
} as const;

export const CVV_TRIGGERS = {
  match: { cvv: 'any' },
  no_match: { cvv: '200' },
  not_verified: { cvv: '201' },
  not_participating: { cvv: '301' },
} as const;

export const AVS_TRIGGERS = {
  match: { zip: 'any' },
  no_match: { zip: '20000' },
  not_verified: { zip: '20001' },
} as const;

export function amountToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToAmount(cents: number): number {
  return Number((cents / 100).toFixed(2));
}
