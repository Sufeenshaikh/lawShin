import crypto from 'crypto';
import { CreateOrderParams, IPaymentProvider, PaymentOrder, VerifyPaymentParams } from './types.js';

// Server-side internal key for demo signature generation & cryptographic validation
const DEMO_HMAC_SECRET = 'counselia_demo_provider_secret_v1_statutory_escrow';

export class DemoPaymentProvider implements IPaymentProvider {
  id = 'demo-payment-provider';
  name = 'Demo Payment Gateway';
  isDemoMode = true;

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderId = `order_demo_${timestamp}_${randomSuffix}`;
    const amountSubunits = Math.round(params.amount * 100);

    return {
      orderId,
      amount: params.amount,
      amountSubunits,
      currency: params.currency || 'INR',
      keyId: 'demo_key_counselia_sandbox',
      isDemoMode: true,
      provider: 'Demo Payment Gateway'
    };
  }

  /**
   * Generates a valid demo signature for the client-side simulation gateway
   */
  public generateDemoSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', DEMO_HMAC_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<{ valid: boolean; reason?: string }> {
    const { orderId, paymentId, signature } = params;

    if (!orderId || !paymentId || !signature) {
      return { valid: false, reason: 'Missing orderId, paymentId, or signature in verification payload' };
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', DEMO_HMAC_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Check signature with timing-safe comparison
      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const signatureBuf = Buffer.from(signature, 'utf-8');

      if (expectedBuf.length !== signatureBuf.length) {
        return {
          valid: false,
          reason: 'Invalid demo signature length. Server-side provider verification failed.'
        };
      }

      const isValid = crypto.timingSafeEqual(expectedBuf, signatureBuf);
      if (!isValid) {
        return {
          valid: false,
          reason: 'Invalid demo signature. Server-side provider verification failed.'
        };
      }

      return { valid: true };
    } catch (err: any) {
      return { valid: false, reason: `Demo verification exception: ${err.message}` };
    }
  }
}
