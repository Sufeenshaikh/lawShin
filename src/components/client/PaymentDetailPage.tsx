import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Building2,
  FileText,
  ExternalLink,
  Lock,
  Sparkles,
  Smartphone,
  ChevronRight,
  Printer,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import { Payment, LegalCase, Invoice } from '../../types';

interface PaymentDetailPageProps {
  paymentId: string;
  onBack: () => void;
  onNavigateCase?: (caseId: string) => void;
}

export const PaymentDetailPage: React.FC<PaymentDetailPageProps> = ({
  paymentId,
  onBack,
  onNavigateCase
}) => {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [legalCase, setLegalCase] = useState<LegalCase | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [providerName, setProviderName] = useState<string>('Razorpay');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction states
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState<boolean>(false);
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPaymentById(paymentId);
      setPayment(res.payment);
      if (res.case) setLegalCase(res.case);
      if (res.invoice) setInvoice(res.invoice);
      setIsDemoMode(res.isDemoMode);
      setProviderName(res.providerName || 'Razorpay');
    } catch (err: any) {
      console.error('Failed to load payment details:', err);
      setError(err.message || 'Unable to load payment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId]);

  // Step 1: Initialize Payment Order on the Server
  const handleInitiatePayment = async () => {
    if (!payment) return;
    setProcessing(true);
    setVerificationFeedback(null);

    try {
      const initRes = await api.initializePayment({
        paymentId: payment.id,
        amount: payment.totalAmount,
        serviceCategory: payment.serviceCategory
      });

      setPayment(initRes.payment);
      setActiveOrderId(initRes.order.orderId);

      if (isDemoMode) {
        // Open DEMO Payment Modal
        setShowDemoModal(true);
        setProcessing(false);
      } else {
        // Real Razorpay Integration (Live Keys configured)
        if (typeof (window as any).Razorpay !== 'undefined') {
          const options = {
            key: initRes.order.keyId,
            amount: initRes.order.amount,
            currency: initRes.order.currency,
            name: 'Counselia Legal Technologies',
            description: payment.serviceCategory,
            order_id: initRes.order.orderId,
            prefill: {
              name: payment.clientName,
              email: payment.clientEmail || 'client@counselia.in'
            },
            theme: {
              color: '#0f172a'
            },
            handler: async (response: any) => {
              await handleVerifyServerPayment({
                orderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              });
            },
            modal: {
              ondismiss: () => {
                setProcessing(false);
              }
            }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          // Fallback if script is blocked
          setShowDemoModal(true);
          setProcessing(false);
        }
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Failed to initialize payment session.'
      });
      setProcessing(false);
    }
  };

  // Step 2 & 3: Server-side Verification
  const handleVerifyServerPayment = async (data: {
    orderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    if (!payment) return;
    setProcessing(true);
    try {
      const verifyRes = await api.verifyPayment(payment.id, data);
      setPayment(verifyRes.payment);
      if (verifyRes.invoice) setInvoice(verifyRes.invoice);
      if (verifyRes.case) setLegalCase(verifyRes.case);
      setShowDemoModal(false);
      setVerificationFeedback({
        type: 'success',
        message: `Payment of ₹${verifyRes.payment.totalAmount.toLocaleString('en-IN')} verified server-side! Case is now officially Active.`
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Server rejected payment verification.'
      });
      // Refresh payment to reflect failed state
      fetchPaymentDetails();
    } finally {
      setProcessing(false);
    }
  };

  // Demo authorization trigger
  const handleSimulateDemoPayment = async (corruptSignature = false) => {
    if (!payment || !activeOrderId) return;
    setProcessing(true);
    try {
      const demoAuth = await api.simulateDemoAuthorize(activeOrderId);
      const signatureToSubmit = corruptSignature ? 'INVALID_TAMPERED_HMAC_SIG' : demoAuth.razorpaySignature;

      await handleVerifyServerPayment({
        orderId: activeOrderId,
        razorpayPaymentId: demoAuth.razorpayPaymentId,
        razorpaySignature: signatureToSubmit
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Verification failed.'
      });
      setProcessing(false);
    }
  };

  // 1-Click Direct Success Simulation
  const handleSimulateDirectSuccess = async () => {
    if (!payment) return;
    setProcessing(true);
    setVerificationFeedback(null);
    try {
      let orderId = activeOrderId;
      if (!orderId) {
        const initRes = await api.initializePayment({
          paymentId: payment.id,
          amount: payment.totalAmount,
          serviceCategory: payment.serviceCategory
        });
        orderId = initRes.order.orderId;
        setActiveOrderId(orderId);
      }

      const demoAuth = await api.simulateDemoAuthorize(orderId);
      await handleVerifyServerPayment({
        orderId,
        razorpayPaymentId: demoAuth.razorpayPaymentId,
        razorpaySignature: demoAuth.razorpaySignature
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Simulation of successful payment failed.'
      });
      setProcessing(false);
    }
  };

  // 1-Click Direct Failure Simulation (Bank/Card Decline)
  const handleSimulateDirectFailure = async (reason = 'Card authorization declined by issuing bank (Demo Payment simulation)') => {
    if (!payment) return;
    setProcessing(true);
    setVerificationFeedback(null);
    try {
      const res = await api.simulatePaymentFailure(payment.id, reason);
      setPayment(res.payment);
      setShowDemoModal(false);
      setVerificationFeedback({
        type: 'error',
        message: `Payment Failed (Simulated): ${reason}`
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Failed to simulate failure.'
      });
    } finally {
      setProcessing(false);
    }
  };

  // 1-Click Tampered Signature Rejection Simulation
  const handleSimulateTamperedSignature = async () => {
    if (!payment) return;
    setProcessing(true);
    setVerificationFeedback(null);
    try {
      let orderId = activeOrderId;
      if (!orderId) {
        const initRes = await api.initializePayment({
          paymentId: payment.id,
          amount: payment.totalAmount,
          serviceCategory: payment.serviceCategory
        });
        orderId = initRes.order.orderId;
        setActiveOrderId(orderId);
      }
      const demoAuth = await api.simulateDemoAuthorize(orderId);
      await handleVerifyServerPayment({
        orderId,
        razorpayPaymentId: demoAuth.razorpayPaymentId,
        razorpaySignature: 'CORRUPTED_TAMPERED_DEMO_SIGNATURE'
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Tampered signature simulation failed.'
      });
      setProcessing(false);
    }
  };

  // Reset Payment State Back to Pending (to test payment flow again)
  const handleResetToPending = async () => {
    if (!payment) return;
    setProcessing(true);
    try {
      const res = await api.resetPaymentToPending(payment.id);
      setPayment(res.payment);
      setActiveOrderId('');
      setShowDemoModal(false);
      setVerificationFeedback({
        type: 'success',
        message: 'Payment requirement has been reset to PENDING status for testing.'
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Failed to reset payment to pending.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!payment) return;
    if (!window.confirm('Are you sure you want to cancel this payment requirement?')) return;
    try {
      setProcessing(true);
      const res = await api.cancelPayment(payment.id, 'Cancelled by client');
      setPayment(res.payment);
      setVerificationFeedback({
        type: 'success',
        message: 'Payment requirement has been cancelled.'
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Failed to cancel payment.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!payment) return;
    if (!window.confirm('Simulate processing a refund for this transaction?')) return;
    try {
      setProcessing(true);
      const res = await api.refundPayment(payment.id, 'Client refund request');
      setPayment(res.payment);
      setVerificationFeedback({
        type: 'success',
        message: 'Payment marked as Refunded.'
      });
    } catch (err: any) {
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Failed to refund payment.'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-600">Retrieving secure payment session...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold">Payment Requirement Not Found</h3>
          </div>
          <p className="text-sm text-red-700">{error || 'The requested payment record could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  const isSuccessful = payment.status === 'Successful' || payment.status === 'completed';
  const isPending = payment.status === 'Pending';
  const isProcessing = payment.status === 'Processing';
  const isFailed = payment.status === 'Failed';
  const isRefunded = payment.status === 'Refunded';
  const isCancelled = payment.status === 'Cancelled';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          id="btn-back-payments"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payment Records
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span>SECURE REQ ID:</span>
          <span className="font-semibold text-slate-800">{payment.id}</span>
        </div>
      </div>

      {/* DEMO MODE NOTICE */}
      {isDemoMode && (
        <div id="banner-demo-payment-mode" className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-semibold uppercase tracking-wider text-amber-800">DEMO PAYMENT MODE ACTIVE</p>
            <p className="mt-0.5">
              Live Razorpay API keys are not detected in environment configuration. The system is operating in safe sandbox simulation.
              Orders and payments generate verifiable test tokens and are strictly verified server-side with HMAC cryptography.
            </p>
          </div>
        </div>
      )}

      {/* Payment Flow Visualizer */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-xs">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Counselia Payment Architecture Flow</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase text-emerald-600 font-semibold mb-1">Step 1</span>
            Lawyer Accepts Case
          </div>
          <div className={`p-2.5 rounded-lg border font-medium flex flex-col items-center justify-center ${
            isPending || isProcessing || isSuccessful ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-[10px] uppercase text-emerald-600 font-semibold mb-1">Step 2</span>
            Payment Requirement
          </div>
          <div className={`p-2.5 rounded-lg border font-medium flex flex-col items-center justify-center ${
            isPending || isProcessing ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold ring-2 ring-blue-500/20' : isSuccessful ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-[10px] uppercase text-blue-600 font-semibold mb-1">Step 3</span>
            Payment Page
          </div>
          <div className={`p-2.5 rounded-lg border font-medium flex flex-col items-center justify-center ${
            isProcessing ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : isSuccessful ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Step 4</span>
            Payment Provider
          </div>
          <div className={`p-2.5 rounded-lg border font-medium flex flex-col items-center justify-center ${
            isSuccessful ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Step 5</span>
            Server Verification
          </div>
          <div className={`p-2.5 rounded-lg border font-medium flex flex-col items-center justify-center ${
            isSuccessful ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Step 6</span>
            Case Active & Invoice
          </div>
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Details & Payment Action */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card with State */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Requirement</span>
                <h1 className="text-xl font-bold text-slate-900 mt-1">{payment.serviceCategory}</h1>
              </div>

              {/* Status Badge & Demo Payment Badge */}
              <div className="flex flex-wrap items-center gap-2">
                {isSuccessful && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Successful
                  </span>
                )}
                {isPending && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                )}
                {isProcessing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> Processing
                  </span>
                )}
                {isFailed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5" /> Failed
                  </span>
                )}
                {isRefunded && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                    <RotateCcw className="w-3.5 h-3.5" /> Refunded
                  </span>
                )}
                {isCancelled && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                    <XCircle className="w-3.5 h-3.5" /> Cancelled
                  </span>
                )}
                {(payment.isDemo || isDemoMode) && (
                  <span id="badge-demo-payment" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Demo Payment
                  </span>
                )}
              </div>
            </div>

            {/* Case Information */}
            <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-medium">Matter / Case Title:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{payment.caseTitle || legalCase?.title || 'Case Evaluation & Notice'}</p>
                {payment.caseNumber && (
                  <span className="inline-block mt-1 font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Case #{payment.caseNumber}
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Assigned Advocate:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{payment.lawyerName || legalCase?.lawyerName || 'Panel Advocate'}</p>
                <p className="text-xs text-slate-500">Bar Council of India Verified Counsel</p>
              </div>
            </div>

            {/* Feedback / Alert Banners */}
            {verificationFeedback && (
              <div
                className={`mt-4 p-4 rounded-lg text-sm border flex items-start gap-2.5 ${
                  verificationFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {verificationFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{verificationFeedback.message}</p>
                </div>
              </div>
            )}

            {isFailed && payment.failureReason && (
              <div className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                <span className="font-semibold">Failure Diagnostic: </span>
                {payment.failureReason}
              </div>
            )}
          </div>

          {/* Payment Action Section */}
          {(isPending || isProcessing || isFailed) && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-700" /> Select Payment Method
              </h2>

              <div className="space-y-3 mb-6">
                <label
                  onClick={() => setSelectedMethod('upi')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                    selectedMethod === 'upi'
                      ? 'border-slate-900 bg-slate-50/70 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      UPI
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">UPI Instant Transfer</p>
                      <p className="text-xs text-slate-500">Google Pay, PhonePe, Paytm, BHIM</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedMethod === 'upi'}
                    onChange={() => setSelectedMethod('upi')}
                    className="text-slate-900 focus:ring-slate-900"
                  />
                </label>

                <label
                  onClick={() => setSelectedMethod('card')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                    selectedMethod === 'card'
                      ? 'border-slate-900 bg-slate-50/70 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                      CARD
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">Credit / Debit Card</p>
                      <p className="text-xs text-slate-500">Visa, MasterCard, RuPay, Diners</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedMethod === 'card'}
                    onChange={() => setSelectedMethod('card')}
                    className="text-slate-900 focus:ring-slate-900"
                  />
                </label>

                <label
                  onClick={() => setSelectedMethod('netbanking')}
                  className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                    selectedMethod === 'netbanking'
                      ? 'border-slate-900 bg-slate-50/70 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs">
                      NET
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">Net Banking</p>
                      <p className="text-xs text-slate-500">HDFC, ICICI, SBI, Axis & 50+ Banks</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedMethod === 'netbanking'}
                    onChange={() => setSelectedMethod('netbanking')}
                    className="text-slate-900 focus:ring-slate-900"
                  />
                </label>
              </div>

              {/* Primary Action Button & Retry Controls */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {isFailed ? (
                  <button
                    id="btn-retry-failed-payment"
                    disabled={processing}
                    onClick={handleResetToPending}
                    className="w-full sm:flex-1 py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                    {processing ? 'Resetting Session...' : 'Retry Payment'}
                  </button>
                ) : (
                  <button
                    id="btn-pay-razorpay"
                    disabled={processing}
                    onClick={handleInitiatePayment}
                    className="w-full sm:flex-1 py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    {processing ? 'Connecting Gateway...' : `Pay ₹${payment.totalAmount.toLocaleString('en-IN')} via ${providerName}`}
                  </button>
                )}

                <button
                  id="btn-cancel-payment"
                  disabled={processing}
                  onClick={handleCancelPayment}
                  className="w-full sm:w-auto py-3 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel Requirement
                </button>
              </div>

              {/* In Demo Mode: Dedicated 1-Click Simulation Panel */}
              {isDemoMode && (
                <div id="demo-simulation-controls" className="mt-5 p-4 rounded-xl bg-gradient-to-br from-amber-50/60 via-indigo-50/40 to-slate-50 border border-amber-200/80">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" /> Demo Payment Simulation
                    </span>
                    <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300/60 px-2 py-0.5 rounded-full">
                      Server HMAC Cryptographic Verification
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    Test the complete payment lifecycle through simulated gateway outcomes. All authorization tokens and tax invoices are created and validated server-side:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      id="btn-demo-sim-success"
                      type="button"
                      disabled={processing}
                      onClick={handleSimulateDirectSuccess}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simulate Success</span>
                    </button>

                    <button
                      id="btn-demo-sim-failure"
                      type="button"
                      disabled={processing}
                      onClick={() => handleSimulateDirectFailure('Card authorization declined by issuer bank (Simulated Demo Payment)')}
                      className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Simulate Failure</span>
                    </button>

                    <button
                      id="btn-demo-sim-tampered"
                      type="button"
                      disabled={processing}
                      onClick={handleSimulateTamperedSignature}
                      className="py-2.5 px-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Tampered Sig (Fail)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>256-Bit SSL Encryption • Escrow Retainer Protection • Verified Server HMAC</span>
              </div>
            </div>
          )}

          {/* Successful State Post-Verification Summary */}
          {isSuccessful && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold uppercase text-emerald-800 tracking-wider">Payment Verified & Settled</span>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">Case Representation is now Officially Active</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Your professional retainer has been confirmed and verified server-side.
                    Advocate {payment.lawyerName || 'Rajeshwar Sharma'} has been notified, and the private privileged Case Room is now unlocked.
                  </p>

                  <div className="mt-4 pt-4 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Transaction ID:</span>
                      <p className="font-mono font-semibold text-slate-800">{payment.transactionId}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Payment Date:</span>
                      <p className="font-semibold text-slate-800">
                        {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tax Invoice:</span>
                      <p className="font-semibold text-slate-800">{payment.invoiceNumber || invoice?.invoiceNumber || 'INV-LS-2025-4819'}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {payment.caseId && onNavigateCase && (
                      <button
                        id="btn-goto-case-room"
                        onClick={() => onNavigateCase(payment.caseId!)}
                        className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition inline-flex items-center gap-2 cursor-pointer"
                      >
                        Enter Case Room <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      id="btn-view-invoice-modal"
                      onClick={() => setShowInvoiceModal(true)}
                      className="py-2.5 px-5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-xs rounded-lg transition inline-flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-600" /> View GST Tax Invoice
                    </button>
                    {isDemoMode && (
                      <button
                        id="btn-demo-reset-success"
                        onClick={handleResetToPending}
                        className="py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset to Pending (Test Flow)
                      </button>
                    )}
                    {isDemoMode && (
                      <button
                        onClick={handleRefundPayment}
                        className="py-2.5 px-4 text-xs font-medium text-purple-700 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                      >
                        [Demo: Test Refund Flow]
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Refunded or Cancelled Notices */}
          {isRefunded && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-sm text-purple-900">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-bold">
                  <RotateCcw className="w-4 h-4 text-purple-700" /> Refund Processed
                </div>
                {isDemoMode && (
                  <button
                    onClick={handleResetToPending}
                    className="text-xs font-semibold text-purple-800 underline hover:text-purple-900 cursor-pointer"
                  >
                    Reset to Pending
                  </button>
                )}
              </div>
              <p className="text-xs text-purple-800">
                This transaction has been refunded back to the source account. Case representation has been paused.
              </p>
            </div>
          )}

          {isCancelled && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-700">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-bold">
                  <XCircle className="w-4 h-4 text-slate-500" /> Payment Requirement Cancelled
                </div>
                {isDemoMode && (
                  <button
                    onClick={handleResetToPending}
                    className="text-xs font-semibold text-slate-800 underline hover:text-slate-900 cursor-pointer"
                  >
                    Reset to Pending
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-600">
                This payment request was cancelled. You may contact your advocate or re-initiate consultation if required.
              </p>
            </div>
          )}
        </div>

        {/* Right 1 Column: Itemized Financial Breakdown */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-700" /> Fee Summary & Taxes
            </h3>

            <div className="py-4 space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Base Legal Retainer:</span>
                <span className="font-semibold text-slate-900">₹{payment.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1">
                  Statutory GST (18%):
                  <span className="text-[10px] text-slate-400">SAC 998211</span>
                </span>
                <span className="font-semibold text-slate-900">₹{payment.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-slate-400 pl-2">
                • CGST (9%): ₹{(payment.gstAmount / 2).toLocaleString('en-IN')}<br />
                • SGST (9%): ₹{(payment.gstAmount / 2).toLocaleString('en-IN')}
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-base font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="text-lg text-slate-900">₹{payment.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 text-xs text-slate-600 mt-2 space-y-1.5">
              <p className="font-semibold text-slate-800">Compliance & Regulatory Notice:</p>
              <p className="leading-relaxed">
                Fees are deposited into an advocate client account in accordance with Bar Council of India standards.
                A formal GST Tax Invoice is generated automatically upon server verification.
              </p>
            </div>
          </div>

          {/* Legal Help Callout */}
          <div className="bg-slate-900 text-white rounded-xl p-6 text-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-100">Counselia Client Guarantee</h4>
            <p className="text-slate-300 leading-relaxed">
              Every fee payment is logged with an immutable audit trail. In case of any dispute or rescheduling, our client grievance desk is available 24/7.
            </p>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400">
              <span>Support Desk:</span>
              <span className="font-mono text-slate-200">billing@counselia.in</span>
            </div>
          </div>
        </div>
      </div>

      {/* DEMO PAYMENT MODAL */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  DP
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Demo Payment Gateway</h3>
                  <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Demo Mode Sandbox Active</span>
                </div>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg space-y-1 font-mono text-slate-700 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">Order ID:</span>
                  <span className="font-bold">{activeOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="font-bold text-slate-900">₹{payment.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Merchant:</span>
                  <span>Counselia Legal Technologies</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction Type:</span>
                  <span className="text-indigo-700 font-semibold">Demo Payment</span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Simulates Razorpay client authorization without live payment credentials. When submitted, the demo gateway generates a signed cryptographic token and validates HMAC verification on the server.
              </p>

              <div className="space-y-2 pt-2">
                <button
                  id="btn-confirm-demo-payment"
                  disabled={processing}
                  onClick={() => handleSimulateDemoPayment(false)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {processing ? 'Verifying with Server...' : 'Authorize & Verify Payment (Success)'}
                </button>

                <button
                  id="btn-demo-modal-fail"
                  disabled={processing}
                  onClick={() => handleSimulateDirectFailure('Bank transaction declined by issuer (Demo Payment simulation)')}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl transition border border-red-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Simulate Bank Decline (Failure)
                </button>

                <button
                  id="btn-test-invalid-signature"
                  disabled={processing}
                  onClick={() => handleSimulateDemoPayment(true)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition border border-slate-200 text-[11px] cursor-pointer"
                >
                  Test Corrupted Signature (Verifies Server Rejection)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GST TAX INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Demo Payment Notice on Invoice */}
            {(payment.isDemo || isDemoMode || invoice?.isDemo) && (
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  DEMO PAYMENT TAX INVOICE (SIMULATED RECORD)
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                  DEMO PAYMENT
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-serif text-lg font-bold">
                  LS
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    TAX INVOICE {(payment.isDemo || isDemoMode) && <span className="text-xs text-amber-700 font-normal ml-1">(Demo Payment)</span>}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">Invoice #{payment.invoiceNumber || invoice?.invoiceNumber || 'INV-LS-2025-4819'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="py-6 space-y-6 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Counselia Legal Tech Pvt Ltd</p>
                  <p className="mt-1 text-slate-500">Legal Practice Escrow & Platform Services</p>
                  <p className="text-slate-500">Barakhamba Road, Connaught Place, New Delhi 110001</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-600">GSTIN: 07AAACL1928B1Z8</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-500">Billed To (Client):</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{payment.clientName}</p>
                  <p className="text-slate-500">{payment.clientEmail || 'client@counselia.in'}</p>
                  <p className="mt-2 text-slate-500 font-mono">Date: {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</p>
                  <p className="font-mono text-emerald-700 font-bold uppercase">STATUS: PAID & VERIFIED</p>
                </div>
              </div>

              {/* Line items */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-3">Description of Service</th>
                      <th className="p-3">SAC Code</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900">{payment.serviceCategory}</p>
                        <p className="text-[11px] text-slate-500">Matter #{payment.caseNumber || 'LS-2025'}: {payment.caseTitle || legalCase?.title}</p>
                        <p className="text-[10px] text-slate-400">Counsel: {payment.lawyerName || 'Panel Advocate'}</p>
                      </td>
                      <td className="p-3 font-mono text-slate-500">998211</td>
                      <td className="p-3 text-right font-semibold text-slate-900">{payment.amount.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-600">Central GST (CGST @ 9%)</td>
                      <td className="p-3 font-mono text-slate-400">998211</td>
                      <td className="p-3 text-right text-slate-700">₹{(payment.gstAmount / 2).toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-600">State GST (SGST @ 9%)</td>
                      <td className="p-3 font-mono text-slate-400">998211</td>
                      <td className="p-3 text-right text-slate-700">₹{(payment.gstAmount / 2).toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                    <tr>
                      <td colSpan={2} className="p-3 text-right uppercase text-[11px] tracking-wider">Total Tax Invoice Value:</td>
                      <td className="p-3 text-right text-sm">₹{payment.totalAmount.toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Digital Authentication & Electronic Seal:</p>
                <p>This is a computer-generated tax invoice verified under Information Technology Act, 2000. Gateway transaction signature: <code className="font-mono text-[10px]">{payment.transactionId}</code>.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
