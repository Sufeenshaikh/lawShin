export type PaymentState =
  | 'Pending'
  | 'Processing'
  | 'Successful'
  | 'Failed'
  | 'Refunded'
  | 'Cancelled';

export interface CreateOrderParams {
  amount: number; // in INR
  currency?: string; // 'INR'
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  amount: number; // in INR
  amountSubunits: number; // in Paise (amount * 100)
  currency: string;
  keyId: string;
  isDemoMode: boolean;
  provider: string;
  demoSignatureForTest?: string; // provided only in demo mode for simulation
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface IPaymentProvider {
  id: string;
  name: string;
  isDemoMode: boolean;
  createOrder(params: CreateOrderParams): Promise<PaymentOrder>;
  verifyPayment(params: VerifyPaymentParams): Promise<{ valid: boolean; reason?: string }>;
}
