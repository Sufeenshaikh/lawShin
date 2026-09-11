import { IPaymentProvider, PaymentOrder, VerifyPaymentParams } from './types.js';
import { RazorpayProvider } from './razorpayProvider.js';
import { DemoPaymentProvider } from './demoProvider.js';

export class PaymentService {
  private activeProvider: IPaymentProvider;
  private demoProvider: DemoPaymentProvider;
  private paymentMode: 'demo' | 'live' = 'demo';

  constructor() {
    this.demoProvider = new DemoPaymentProvider();

    const configuredMode = (process.env.PAYMENT_MODE || 'demo').toLowerCase().trim();
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Only activate live Razorpay if explicitly configured and credentials are present
    if (configuredMode === 'live' && keyId && keySecret && keyId.trim().length > 0 && keySecret.trim().length > 0) {
      console.log('PaymentService: Live Razorpay credentials configured. Running in LIVE mode.');
      this.activeProvider = new RazorpayProvider(keyId.trim(), keySecret.trim());
      this.paymentMode = 'live';
    } else {
      // Default to DEMO mode without requiring any Razorpay credentials
      this.activeProvider = this.demoProvider;
      this.paymentMode = 'demo';
      console.log(`PaymentService: Running in DEMO PAYMENT MODE (PAYMENT_MODE=${configuredMode}). No Razorpay credentials required.`);
    }
  }

  public getPaymentMode(): 'demo' | 'live' {
    return this.paymentMode;
  }

  public isDemoMode(): boolean {
    return this.activeProvider.isDemoMode;
  }

  public getProviderName(): string {
    return this.activeProvider.name;
  }

  public async createOrder(params: {
    amount: number;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<PaymentOrder> {
    return this.activeProvider.createOrder({
      amount: params.amount,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes
    });
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<{ valid: boolean; reason?: string }> {
    // CRITICAL: Never mark payment as successful without provider server-side validation
    return this.activeProvider.verifyPayment(params);
  }

  /**
   * For DEMO MODE only: generates a mock gateway completion token to pass to verifyPayment
   */
  public generateDemoGatewaySignature(orderId: string, paymentId: string): string {
    return this.demoProvider.generateDemoSignature(orderId, paymentId);
  }
}

export const paymentService = new PaymentService();
