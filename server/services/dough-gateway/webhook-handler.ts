import { Request, Response, NextFunction } from 'express';
import * as crypto from 'node:crypto';
import type { DoughWebhookEvent, DoughWebhookConfig } from './types';

export function createWebhookHandler(config: DoughWebhookConfig) {
  return async (req: Request, res: Response, _next: NextFunction) => {
    const signature = req.headers['x-signature'] as string | undefined;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;
    const timestamp = new Date().toISOString();

    if (!signature) {
      console.warn(`[DoughWebhook] ${timestamp} Missing x-signature header`);
      return res.status(400).json({ error: 'Missing signature' });
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8')
      : typeof req.body === 'string' ? req.body
      : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', config.clientSecret)
      .update(rawBody)
      .digest('hex');

    try {
      if (!crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      )) {
        console.warn(`[DoughWebhook] ${timestamp} Invalid signature`);
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } catch {
      console.warn(`[DoughWebhook] ${timestamp} Signature comparison failed`);
      return res.status(400).json({ error: 'Invalid signature format' });
    }

    let event: DoughWebhookEvent;
    try {
      event = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
    } catch {
      console.error(`[DoughWebhook] ${timestamp} Failed to parse webhook body`);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log(
      `[DoughWebhook] ${timestamp} Received event: ${event.type} id=${event.id}${correlationId ? ` correlation-id=${correlationId}` : ''}`,
    );

    try {
      switch (event.type) {
        case 'transaction.settled':
          if (config.onTransactionSettled) {
            await config.onTransactionSettled(event);
          }
          break;
        case 'transaction.declined':
          if (config.onTransactionDeclined) {
            await config.onTransactionDeclined(event);
          }
          break;
        case 'settlement.batch':
          if (config.onSettlementBatch) {
            await config.onSettlementBatch(event);
          }
          break;
        case 'chargeback.created':
          if (config.onChargebackCreated) {
            await config.onChargebackCreated(event);
          }
          break;
        default:
          console.warn(`[DoughWebhook] ${timestamp} Unhandled event type: ${event.type}`);
      }

      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error(
        `[DoughWebhook] ${timestamp} Handler error for ${event.type}: ${error.message}`,
      );
      return res.status(500).json({ error: 'Webhook handler failed' });
    }
  };
}
