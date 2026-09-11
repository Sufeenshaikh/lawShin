import crypto from 'crypto';
import { CreateOrderParams, IPaymentProvider, PaymentOrder, VerifyPaymentParams } from './types.js';

export class RazorpayProvider implements IPaymentProvider {
  id = 'razorpay-live';
  name = 'Razorpay Payment Gateway';
  isDemoMode = false;

  private keyId: string;
  private keySecret: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  async createOrder(params: CreateOrderParams): Promise<PaymentOrder> {
    const amountSubunits = Math.round(params.amount * 100); // Razorpay requires paise
    const authHeader = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`
        },
        body: JSON.stringify({
          amount: amountSubunits,
          currency: params.currency || 'INR',
          receipt: params.receipt,
          notes: params.notes || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Razorpay API Error: ${errorData.error?.description || response.statusText}`);
      }

      const orderData = await response.json();
      return {
        orderId: orderData.id,
        amount: params.amount,
        amountSubunits,
        currency: orderData.currency || 'INR',
        keyId: this.keyId,
        isDemoMode: false,
        provider: 'Razorpay'
      };
    } catch (err: any) {
      console.error('Razorpay order creation failed:', err);
      throw err;
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<{ valid: boolean; reason?: string }> {
    const { orderId, paymentId, signature } = params;

    if (!orderId || !paymentId || !signature) {
      return { valid: false, reason: 'Missing order ID, payment ID, or signature' };
    }

    try {
      // In Razorpay: signature = HMAC_SHA256(order_id + "|" + payment_id, secret)
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
      const signatureBuf = Buffer.from(signature, 'utf-8');

      if (expectedBuf.length !== signatureBuf.length) {
        return { valid: false, reason: 'Invalid signature length. Payment authenticity verification failed.' };
      }

      const isValid = crypto.timingSafeEqual(expectedBuf, signatureBuf);

      if (!isValid) {
        return { valid: false, reason: 'Invalid signature. Payment authenticity verification failed.' };
      }

      return { valid: true };
    } catch (err: any) {
      console.error('Razorpay signature verification error:', err);
      return { valid: false, reason: `Verification error: ${err.message}` };
    }
  }
}
