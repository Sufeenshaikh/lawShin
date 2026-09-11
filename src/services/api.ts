import {
  User,
  ClientProfile,
  LawyerProfile,
  LawFirm,
  LegalCase,
  CaseDocument,
  CaseMessage,
  CaseUpdate,
  Payment,
  Invoice,
  Appointment,
  Review,
  LegalQuery,
  VerifiedJudgment,
  ProposalCaseStage,
  ImplementationState,
  LegalDeadline,
  VerifiedLegalRule,
  AdvocateDraft,
  AdvocateSavedAuthority,
  AdvocateAuditLog
} from '../types.js';

export interface SessionData {
  user: User | null;
  token?: string;
  clientProfile: ClientProfile | null;
  lawyerProfile: LawyerProfile | null;
  availableUsers: User[];
}

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const TOKEN_KEY = 'counselia_auth_token';
const LEGACY_TOKEN_KEY = 'lawshin_auth_token';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(LEGACY_TOKEN_KEY, token);
    } catch {}
  },
  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {}
  }
};

async function customFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(url, { ...options, headers });
  return res;
}

export const api = {
  // Session & Authentication
  async getSession(): Promise<SessionData> {
    const res = await customFetch('/api/session');
    if (!res.ok) throw new ApiError('Failed to fetch session', res.status);
    const data = await res.json();
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  async switchSession(userId: string): Promise<{ success: boolean; token: string; user: User; clientProfile?: ClientProfile; lawyerProfile?: LawyerProfile }> {
    const res = await customFetch('/api/session/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to switch user' }));
      throw new ApiError(err.error || 'Failed to switch user', res.status, err.code);
    }
    const data = await res.json();
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  async login(emailOrPhone: string, password?: string, role?: string): Promise<{
    success: boolean;
    token: string;
    user: User;
    clientProfile?: ClientProfile;
    lawyerProfile?: LawyerProfile;
  }> {
    const res = await customFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone, password, role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new ApiError(err.message || err.error || 'Login failed', res.status, err.code);
    }
    const data = await res.json();
    if (data.token) {
      authStorage.setToken(data.token);
    }
    return data;
  },

  async logout(): Promise<{ success: boolean; message: string }> {
    authStorage.clearToken();
    const res = await customFetch('/api/auth/logout', { method: 'POST' });
    return res.json();
  },

  // Auth & OTP
  async sendOtp(phone: string): Promise<{ success: boolean; message: string; simulatedOtp: string }> {
    const res = await customFetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return res.json();
  },

  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; verified: boolean; message: string }> {
    const res = await customFetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'OTP verification failed' }));
      throw new ApiError(err.message || err.error || 'OTP verification failed', res.status, err.code);
    }
    return res.json();
  },

  async registerUser(data: any): Promise<{
    success: boolean;
    token: string;
    user: User;
    clientProfile?: ClientProfile;
    lawyerProfile?: LawyerProfile;
  }> {
    const res = await customFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new ApiError(err.message || err.error || 'Registration failed', res.status, err.code);
    }
    const result = await res.json();
    if (result.token) {
      authStorage.setToken(result.token);
    }
    return result;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken: string; resetLink: string }> {
    const res = await customFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to request password reset' }));
      throw new ApiError(err.message || err.error || 'Failed to request password reset', res.status, err.code);
    }
    return res.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await customFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reset password' }));
      throw new ApiError(err.message || err.error || 'Failed to reset password', res.status, err.code);
    }
    return res.json();
  },

  async sendVerificationEmail(): Promise<{ success: boolean; message: string; token: string; verificationLink: string }> {
    const res = await customFetch('/api/auth/send-verification-email', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to send verification email' }));
      throw new ApiError(err.message || err.error || 'Failed to send verification email', res.status, err.code);
    }
    return res.json();
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const res = await customFetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to verify email' }));
      throw new ApiError(err.message || err.error || 'Failed to verify email', res.status, err.code);
    }
    return res.json();
  },

  // Cases
  async getCases(): Promise<{ cases: LegalCase[] }> {
    const res = await customFetch('/api/cases');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch cases' }));
      throw new ApiError(err.message || err.error || 'Failed to fetch cases', res.status, err.code);
    }
    return res.json();
  },

  async getCaseById(id: string): Promise<{
    case: LegalCase;
    documents: CaseDocument[];
    messages: CaseMessage[];
    updates: CaseUpdate[];
    payments: Payment[];
  }> {
    const res = await customFetch(`/api/cases/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch case' }));
      throw new ApiError(err.message || err.error || 'Failed to fetch case', res.status, err.code);
    }
    return res.json();
  },

  async submitCase(caseData: {
    title: string;
    category: string;
    description: string;
    isUrgent?: boolean;
    lawyerId?: string;
    city?: string;
    state?: string;
    initialDocuments?: any[];
  }): Promise<{ success: boolean; case: LegalCase }> {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caseData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit case');
    }
    return res.json();
  },

  async updateCaseStage(id: string, data: {
    stage?: ProposalCaseStage;
    implementationState?: ImplementationState;
    filingDate?: string;
    nextHearingDate?: string;
    courtName?: string;
    judgeName?: string;
    filingNumber?: string;
    notes?: string;
  }): Promise<{ success: boolean; case: LegalCase }> {
    const res = await customFetch(`/api/cases/${id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update case stage' }));
      throw new ApiError(err.message || err.error || 'Failed to update case stage', res.status, err.code);
    }
    return res.json();
  },

  async takeCaseAction(id: string, action: 'accept' | 'reject', notes?: string): Promise<{ success: boolean; case: LegalCase }> {
    const res = await customFetch(`/api/cases/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to perform case action' }));
      throw new ApiError(err.message || err.error || 'Failed to perform case action', res.status, err.code);
    }
    return res.json();
  },

  // Case Room: Messages
  async getCaseMessages(caseId: string): Promise<{ messages: CaseMessage[] }> {
    const res = await customFetch(`/api/cases/${caseId}/messages`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch messages' }));
      throw new ApiError(err.message || err.error || 'Failed to fetch messages', res.status, err.code);
    }
    return res.json();
  },

  async sendCaseMessage(caseId: string, content: string, attachments?: any[]): Promise<{ success: boolean; message: CaseMessage }> {
    const res = await customFetch(`/api/cases/${caseId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, attachments })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to send message' }));
      throw new ApiError(err.message || err.error || 'Failed to send message', res.status, err.code);
    }
    return res.json();
  },

  // Case Room: Documents
  async getCaseDocuments(caseId: string): Promise<{ documents: CaseDocument[] }> {
    const res = await customFetch(`/api/cases/${caseId}/documents`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch documents' }));
      throw new ApiError(err.message || err.error || 'Failed to fetch documents', res.status, err.code);
    }
    return res.json();
  },

  async uploadCaseDocument(caseId: string, docData: {
    title: string;
    fileType: 'pdf' | 'image' | 'audio' | 'video' | 'doc';
    fileUrl: string;
    fileName: string;
    fileSize: string;
    category: 'evidence' | 'notice' | 'reply' | 'order' | 'petition' | 'id_proof';
    description?: string;
  }): Promise<{ success: boolean; document: CaseDocument }> {
    const res = await customFetch(`/api/cases/${caseId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to upload document' }));
      throw new ApiError(err.message || err.error || 'Failed to upload document', res.status, err.code);
    }
    return res.json();
  },

  async downloadCaseDocument(caseId: string, docId: string): Promise<{
    success: boolean;
    document: CaseDocument;
    downloadUrl: string;
    checksumSha256: string;
    section65BCertificate: any;
  }> {
    const res = await customFetch(`/api/cases/${caseId}/documents/${docId}/download`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to download document' }));
      throw new ApiError(err.message || err.error || 'Failed to download document', res.status, err.code);
    }
    return res.json();
  },

  // Case Room: Updates
  async getCaseUpdates(caseId: string): Promise<{ updates: CaseUpdate[] }> {
    const res = await customFetch(`/api/cases/${caseId}/updates`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch updates' }));
      throw new ApiError(err.message || err.error || 'Failed to fetch updates', res.status, err.code);
    }
    return res.json();
  },

  async addCaseUpdate(caseId: string, updateData: {
    title: string;
    description: string;
    stage?: ProposalCaseStage;
    hearingOutcome?: string;
    orderDocumentUrl?: string;
  }): Promise<{ success: boolean; update: CaseUpdate }> {
    const res = await customFetch(`/api/cases/${caseId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to add case update' }));
      throw new ApiError(err.message || err.error || 'Failed to add case update', res.status, err.code);
    }
    return res.json();
  },

  // Case Deadlines & Right-to-Remedy Tracker
  async getCaseDeadlines(caseId: string): Promise<{
    deadlines: LegalDeadline[];
    disclaimer: string;
    aiPolicyNotice: string;
  }> {
    const res = await customFetch(`/api/cases/${caseId}/deadlines`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch deadlines' }));
      throw new ApiError(err.message || err.error || 'Failed to fetch deadlines', res.status, err.code);
    }
    return res.json();
  },

  async createCaseDeadline(
    caseId: string,
    data: {
      title: string;
      deadlineType: string;
      startDate: string;
      deadlineDate?: string;
      calculationSource: 'manual_lawyer_entry' | 'verified_rule_engine';
      ruleId?: string;
      remedyActionRequired?: string;
      governingForum?: string;
      description?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; deadline: LegalDeadline; message: string }> {
    const res = await customFetch(`/api/cases/${caseId}/deadlines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to record deadline' }));
      throw new ApiError(err.message || err.error || 'Failed to record deadline', res.status, err.code);
    }
    return res.json();
  },

  async updateCaseDeadline(
    caseId: string,
    deadlineId: string,
    data: Partial<LegalDeadline>
  ): Promise<{ success: boolean; deadline: LegalDeadline }> {
    const res = await customFetch(`/api/cases/${caseId}/deadlines/${deadlineId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update deadline' }));
      throw new ApiError(err.message || err.error || 'Failed to update deadline', res.status, err.code);
    }
    return res.json();
  },

  async deleteCaseDeadline(
    caseId: string,
    deadlineId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await customFetch(`/api/cases/${caseId}/deadlines/${deadlineId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete deadline' }));
      throw new ApiError(err.message || err.error || 'Failed to delete deadline', res.status, err.code);
    }
    return res.json();
  },

  async getVerifiedLegalRules(): Promise<{
    rules: VerifiedLegalRule[];
    disclaimer: string;
    aiPolicyNotice: string;
  }> {
    const res = await customFetch('/api/legal-rules/verified');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch verified rules' }));
      throw new ApiError(err.message || err.error || 'Failed to fetch verified rules', res.status, err.code);
    }
    return res.json();
  },

  async checkDeadlineNotifications(caseId: string): Promise<{
    success: boolean;
    notificationsCreated: number;
    deadlines: LegalDeadline[];
  }> {
    const res = await customFetch(`/api/cases/${caseId}/deadlines/check-notifications`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to scan notifications' }));
      throw new ApiError(err.message || err.error || 'Failed to scan notifications', res.status, err.code);
    }
    return res.json();
  },

  // Lawyers & Law Firms
  async getLawyers(params?: { practiceArea?: string; city?: string; verifiedOnly?: boolean }): Promise<{ lawyers: LawyerProfile[] }> {
    const query = new URLSearchParams();
    if (params?.practiceArea) query.set('practiceArea', params.practiceArea);
    if (params?.city) query.set('city', params.city);
    if (params?.verifiedOnly) query.set('verifiedOnly', 'true');
    const res = await fetch(`/api/lawyers?${query.toString()}`);
    return res.json();
  },

  async getLawyerById(id: string): Promise<{ lawyer: LawyerProfile; reviews: Review[]; activeCasesCount: number }> {
    const res = await fetch(`/api/lawyers/${id}`);
    if (!res.ok) throw new Error('Lawyer not found');
    return res.json();
  },

  async getLawFirms(): Promise<{ lawFirms: LawFirm[] }> {
    const res = await fetch('/api/law-firms');
    return res.json();
  },

  async getLawFirmById(id: string): Promise<{ lawFirm: LawFirm; lawyers: LawyerProfile[] }> {
    const res = await fetch(`/api/law-firms/${id}`);
    if (!res.ok) throw new Error('Law firm not found');
    return res.json();
  },

  // Payments & Invoices (Razorpay Ready Architecture)
  async getPayments(params?: { status?: string; caseId?: string }): Promise<{
    payments: Payment[];
    isDemoMode: boolean;
    providerName: string;
    disclaimer?: string;
  }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.caseId) query.append('caseId', params.caseId);
    const url = `/api/payments${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url);
    return res.json();
  },

  async getPaymentById(id: string): Promise<{
    payment: Payment;
    case?: LegalCase;
    invoice?: Invoice;
    isDemoMode: boolean;
    providerName: string;
  }> {
    const res = await fetch(`/api/payments/${id}`);
    if (!res.ok) throw new Error('Payment requirement not found');
    return res.json();
  },

  async initializePayment(data: {
    paymentId?: string;
    caseId?: string;
    amount?: number;
    serviceCategory?: string;
  }): Promise<{ success: boolean; payment: Payment; order: any }> {
    const res = await fetch('/api/payments/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Payment initialization failed' }));
      throw new Error(err.error || 'Payment initialization failed');
    }
    return res.json();
  },

  async verifyPayment(
    id: string,
    data: {
      orderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  ): Promise<{ success: boolean; payment: Payment; invoice: Invoice; case?: LegalCase; error?: string }> {
    const res = await fetch(`/api/payments/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Server-side payment verification failed');
    }
    return result;
  },

  async cancelPayment(id: string, reason?: string): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch(`/api/payments/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Failed to cancel payment');
    return res.json();
  },

  async refundPayment(id: string, reason?: string): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch(`/api/payments/${id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Failed to refund payment');
    return res.json();
  },

  async simulateDemoAuthorize(orderId: string): Promise<{ razorpayPaymentId: string; razorpaySignature: string }> {
    const res = await fetch('/api/payments/demo-authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    if (!res.ok) throw new Error('Demo authorization failed');
    return res.json();
  },

  async simulatePaymentFailure(id: string, reason?: string): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch(`/api/payments/${id}/simulate-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Failed to simulate payment failure');
    return res.json();
  },

  async resetPaymentToPending(id: string): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch(`/api/payments/${id}/reset-pending`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reset payment to pending');
    return res.json();
  },

  async createDemoPendingRequirement(data?: {
    caseId?: string;
    amount?: number;
    serviceCategory?: string;
  }): Promise<{ success: boolean; payment: Payment }> {
    const res = await fetch('/api/payments/create-demo-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {})
    });
    if (!res.ok) throw new Error('Failed to create demo pending requirement');
    return res.json();
  },

  async createPayment(data: {
    caseId?: string;
    serviceCategory: string;
    amount: number;
    paymentMethod?: string;
  }): Promise<{ success: boolean; payment: Payment; invoice: Invoice }> {
    const res = await fetch('/api/payments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Payment creation failed');
    return res.json();
  },

  async getInvoices(): Promise<{ invoices: Invoice[] }> {
    const res = await fetch('/api/invoices');
    return res.json();
  },

  async getInvoiceById(id: string): Promise<{ invoice: Invoice }> {
    const res = await fetch(`/api/invoices/${id}`);
    if (!res.ok) throw new Error('Invoice not found');
    return res.json();
  },

  // Appointments (Offline Chamber Consultations & Scheduling)
  async getAppointments(): Promise<{ appointments: Appointment[] }> {
    const res = await fetch('/api/appointments');
    return res.json();
  },

  async getLawyerAvailability(lawyerId: string, date: string): Promise<{
    lawyerId: string;
    lawyerName: string;
    chamberAddress: string;
    consultationFee: number;
    date: string;
    slots: {
      timeSlot: string;
      isAvailable: boolean;
      status: 'Available' | 'Requested' | 'Confirmed';
      appointmentId?: string;
      clientName?: string;
    }[];
  }> {
    const res = await fetch(`/api/lawyers/${lawyerId}/availability?date=${encodeURIComponent(date)}`);
    if (!res.ok) throw new Error('Failed to fetch advocate availability');
    return res.json();
  },

  async createAppointment(data: {
    lawyerId: string;
    caseId?: string;
    date: string;
    timeSlot: string;
    location?: string;
    locationType?: string;
    mode?: string;
    notes?: string;
    fee?: number;
  }): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to schedule consultation' }));
      throw new Error(err.message || err.error || 'Failed to schedule consultation');
    }
    return res.json();
  },

  async updateAppointmentStatus(
    id: string,
    status: 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled',
    cancellationReason?: string
  ): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, cancellationReason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update appointment status' }));
      throw new Error(err.message || err.error || 'Failed to update appointment status');
    }
    return res.json();
  },

  // Queries
  async getQueries(): Promise<{ queries: LegalQuery[] }> {
    const res = await fetch('/api/queries');
    return res.json();
  },

  async submitQuery(data: {
    title: string;
    category: string;
    description: string;
    isAnonymous?: boolean;
    authorName?: string;
    city?: string;
    state?: string;
  }): Promise<{ success: boolean; query: LegalQuery }> {
    const res = await fetch('/api/queries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to post query');
    return res.json();
  },

  async replyQuery(queryId: string, content: string): Promise<{ success: boolean; reply: any }> {
    const res = await fetch(`/api/queries/${queryId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Failed to reply to query');
    return res.json();
  },

  // Reviews & Ratings (Verified Closed Case Policy)
  async getReviewableCases(): Promise<{
    cases: {
      caseId: string;
      caseNumber: string;
      caseTitle: string;
      caseCategory: string;
      lawyerId: string;
      lawyerName: string;
      stage: string;
      closedAt?: string;
      hasReviewed: boolean;
      review?: Review;
    }[];
  }> {
    const res = await fetch('/api/client/reviewable-cases');
    if (!res.ok) throw new Error('Failed to fetch reviewable cases');
    return res.json();
  },

  async getReviews(params?: { lawyerId?: string; minRating?: number; category?: string }): Promise<{ reviews: (Review & { lawyerName?: string; lawyerCity?: string; lawyerBarNumber?: string })[] }> {
    const query = new URLSearchParams();
    if (params?.lawyerId) query.set('lawyerId', params.lawyerId);
    if (params?.minRating) query.set('minRating', String(params.minRating));
    if (params?.category) query.set('category', params.category);
    const res = await fetch(`/api/reviews?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async submitReview(data: {
    lawyerId: string;
    caseId: string;
    rating: number;
    writtenReview: string;
    comment?: string;
    caseCategory?: string;
  }): Promise<{ success: boolean; review: Review; message?: string }> {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to submit review' }));
      throw new Error(err.message || err.error || 'Failed to submit review');
    }
    return res.json();
  },

  async getAdminReviews(params?: { status?: string; search?: string }): Promise<{
    success: boolean;
    counts: { total: number; pending: number; approved: number; rejected: number };
    reviews: (Review & { lawyerName?: string; lawyerCity?: string; caseTitle?: string })[];
  }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const res = await fetch(`/api/admin/reviews?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews for admin');
    return res.json();
  },

  async moderateReview(id: string, status: 'approved' | 'rejected' | 'pending', notes?: string): Promise<{ success: boolean; review: Review }> {
    const res = await fetch(`/api/admin/reviews/${id}/moderation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to moderate review' }));
      throw new Error(err.message || err.error || 'Failed to moderate review');
    }
    return res.json();
  },

  // Client Profile
  async getClientProfile(): Promise<{ client: ClientProfile; user: User }> {
    const res = await customFetch('/api/client/profile');
    if (!res.ok) throw new ApiError('Failed to fetch client profile', res.status);
    return res.json();
  },

  async updateClientProfile(data: {
    fullName?: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
  }): Promise<{ success: boolean; client: ClientProfile; user: User }> {
    const res = await customFetch('/api/client/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new ApiError('Failed to update client profile', res.status);
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: Notification[] }> {
    const res = await customFetch('/api/notifications');
    if (!res.ok) throw new ApiError('Failed to fetch notifications', res.status);
    return res.json();
  },

  async markNotificationRead(id: string): Promise<{ success: boolean; notification: Notification }> {
    const res = await customFetch(`/api/notifications/${id}/read`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new ApiError('Failed to mark notification as read', res.status);
    return res.json();
  },

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    const res = await customFetch('/api/notifications/mark-all-read', {
      method: 'POST'
    });
    if (!res.ok) throw new ApiError('Failed to mark all notifications as read', res.status);
    return res.json();
  },

  // Close Case
  async closeCase(caseId: string, notes?: string): Promise<{ success: boolean; case: LegalCase }> {
    const res = await customFetch(`/api/cases/${caseId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new ApiError('Failed to close case', res.status);
    return res.json();
  },

  // Admin
  async getAdminStats(): Promise<{
    totalCases: number;
    activeCases: number;
    totalClients: number;
    totalLawyers: number;
    pendingLawyerVerifications: number;
    totalGMV: number;
  }> {
    const res = await customFetch('/api/admin/stats');
    if (!res.ok) throw new ApiError('Failed to fetch admin stats', res.status);
    return res.json();
  },

  async getDatabaseStats(): Promise<{
    success: boolean;
    storageEngine: string;
    filePath: string;
    metrics: Record<string, { total: number; demo: number; real: number }>;
  }> {
    const res = await customFetch('/api/admin/database');
    if (!res.ok) throw new ApiError('Failed to fetch database metrics', res.status);
    return res.json();
  },

  async verifyLawyer(lawyerId: string, status: 'verified' | 'rejected', notes?: string): Promise<{ success: boolean; lawyer: LawyerProfile }> {
    const res = await customFetch(`/api/admin/lawyers/${lawyerId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new ApiError('Failed to verify advocate', res.status);
    return res.json();
  },

  // AI Drafting Tool
  async generateAiDraft(data: {
    documentType?: string;
    describeNeed?: string;
    additionalFacts?: string;
    caseId?: string;
    caseTitle?: string;
    prompt?: string;
    draftType?: string;
    clientName?: string;
    opponentName?: string;
    amount?: string | number;
    facts?: string;
  }): Promise<{ draft: string; disclaimer: string; generatedBy?: string; success?: boolean }> {
    const res = await customFetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'The draft could not be generated at this time. Please try again.');
    }
    return res.json();
  },

  // Lawyer Portal Methods
  async getLawyerProfile(): Promise<{
    success: boolean;
    lawyer: LawyerProfile;
    user: User;
    reviews: Review[];
    activeCasesCount: number;
  }> {
    const res = await customFetch('/api/lawyer/profile');
    if (!res.ok) throw new ApiError('Failed to fetch lawyer profile', res.status);
    return res.json();
  },

  async updateLawyerProfile(data: Partial<LawyerProfile>): Promise<{
    success: boolean;
    lawyer: LawyerProfile;
    user: User;
  }> {
    const res = await customFetch('/api/lawyer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new ApiError('Failed to update lawyer profile', res.status);
    return res.json();
  },

  async getLawyerVerification(): Promise<{
    success: boolean;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    isVerified: boolean;
    barCouncilNumber: string;
    stateBarCouncil: string;
    verificationNotes?: string;
  }> {
    const res = await customFetch('/api/lawyer/verification');
    if (!res.ok) throw new ApiError('Failed to fetch lawyer verification status', res.status);
    return res.json();
  },

  async submitLawyerVerification(data: {
    barCouncilNumber?: string;
    stateBarCouncil?: string;
    certificateUrl?: string;
    notes?: string;
    simulateInstantApproval?: boolean;
  }): Promise<{
    success: boolean;
    lawyer: LawyerProfile;
    message: string;
  }> {
    const res = await customFetch('/api/lawyer/verification/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new ApiError('Failed to submit verification', res.status);
    return res.json();
  },

  async getLawyerRequests(): Promise<{ requests: (LegalCase & { documents: CaseDocument[] })[] }> {
    const res = await customFetch('/api/lawyer/requests');
    if (!res.ok) throw new ApiError('Failed to fetch lawyer case requests', res.status);
    return res.json();
  },

  async getLawyerRequestById(id: string): Promise<{ request: LegalCase; documents: CaseDocument[] }> {
    const res = await customFetch(`/api/lawyer/requests/${id}`);
    if (!res.ok) throw new ApiError('Failed to fetch case request details', res.status);
    return res.json();
  },

  async getLawyerClients(): Promise<{
    clients: Array<{
      id: string;
      fullName: string;
      email: string;
      phone: string;
      city: string;
      state: string;
      activeCasesCount: number;
      closedCasesCount: number;
      totalCasesCount: number;
      latestCase?: LegalCase;
    }>;
  }> {
    const res = await customFetch('/api/lawyer/clients');
    if (!res.ok) throw new ApiError('Failed to fetch lawyer clients', res.status);
    return res.json();
  },

  // Judgment & Law Search (Provider-backed Verified Database)
  async searchJudgments(params: string | {
    keywords?: string;
    court?: string;
    jurisdiction?: string;
    date?: string;
    subject?: string;
  }): Promise<{
    query: any;
    results: {
      id: string;
      caseName: string;
      citation: string;
      court: string;
      jurisdiction: string;
      date: string;
      relevantPassage: string;
      source: string;
      sourceUrl: string;
      subject: string;
      bench?: string;
      legalSections?: string[];
      isDemo: boolean;
    }[];
    total: number;
    isDemoMode: boolean;
    providerName: string;
    disclaimer: string;
    message?: string;
  }> {
    let url = '/api/judgments/search';
    if (typeof params === 'string') {
      url += `?keywords=${encodeURIComponent(params)}`;
    } else {
      const qParams = new URLSearchParams();
      if (params.keywords) qParams.set('keywords', params.keywords);
      if (params.court) qParams.set('court', params.court);
      if (params.jurisdiction) qParams.set('jurisdiction', params.jurisdiction);
      if (params.date) qParams.set('date', params.date);
      if (params.subject) qParams.set('subject', params.subject);
      const qs = qParams.toString();
      if (qs) url += `?${qs}`;
    }
    const res = await customFetch(url);
    if (!res.ok) {
      throw new Error('Failed to execute search on legal database');
    }
    return res.json();
  },

  // Advocate Legal Research API
  async searchAdvocateResearch(params: {
    keywords?: string;
    q?: string;
    issue?: string;
    topic?: string;
    caseName?: string;
    section?: string;
    act?: string;
    court?: string;
    year?: string;
    citation?: string;
    jurisdiction?: string;
  }): Promise<{
    results: any[];
    total: number;
    isDemoMode: boolean;
    providerName: string;
    disclaimer: string;
    searchParams: any;
  }> {
    const qParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qParams.set(k, String(v));
    });
    const res = await customFetch(`/api/lawyer/legal-research?${qParams.toString()}`);
    if (!res.ok) throw new ApiError('Failed to execute advocate legal research', res.status);
    return res.json();
  },

  // Save Authority to Case
  async saveAuthorityToCase(caseId: string, authority: any, notes?: string): Promise<{
    success: boolean;
    authority: AdvocateSavedAuthority;
  }> {
    const res = await customFetch('/api/lawyer/judgments/save-to-case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseId, authority, notes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save authority to case' }));
      throw new ApiError(err.error || 'Failed to save authority', res.status);
    }
    return res.json();
  },

  // Get Case Authorities
  async getCaseAuthorities(caseId: string): Promise<{ authorities: AdvocateSavedAuthority[] }> {
    const res = await customFetch(`/api/lawyer/cases/${caseId}/authorities`);
    if (!res.ok) throw new ApiError('Failed to fetch case authorities', res.status);
    return res.json();
  },

  // Delete Case Authority
  async deleteCaseAuthority(caseId: string, authorityId: string): Promise<{ success: boolean }> {
    const res = await customFetch(`/api/lawyer/cases/${caseId}/authorities/${authorityId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new ApiError('Failed to delete saved authority', res.status);
    return res.json();
  },

  // Advocate Drafts: List
  async getAdvocateDrafts(params?: { caseId?: string; status?: string; documentType?: string }): Promise<{
    drafts: AdvocateDraft[];
  }> {
    const qParams = new URLSearchParams();
    if (params?.caseId) qParams.set('caseId', params.caseId);
    if (params?.status) qParams.set('status', params.status);
    if (params?.documentType) qParams.set('documentType', params.documentType);
    const qs = qParams.toString();
    const res = await customFetch(`/api/lawyer/drafts${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new ApiError('Failed to fetch advocate drafts', res.status);
    return res.json();
  },

  // Advocate Drafts: Get single
  async getAdvocateDraft(id: string): Promise<{ draft: AdvocateDraft }> {
    const res = await customFetch(`/api/lawyer/drafts/${id}`);
    if (!res.ok) throw new ApiError('Failed to fetch draft details', res.status);
    return res.json();
  },

  // Advocate Drafts: Create
  async createAdvocateDraft(data: Partial<AdvocateDraft>): Promise<{ success: boolean; draft: AdvocateDraft }> {
    const res = await customFetch('/api/lawyer/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create draft' }));
      throw new ApiError(err.error || 'Failed to create draft', res.status);
    }
    return res.json();
  },

  // Advocate Drafts: Update
  async updateAdvocateDraft(id: string, data: Partial<AdvocateDraft> & { changeSummary?: string; versionTitle?: string }): Promise<{
    success: boolean;
    draft: AdvocateDraft;
  }> {
    const res = await customFetch(`/api/lawyer/drafts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update draft' }));
      throw new ApiError(err.error || 'Failed to update draft', res.status);
    }
    return res.json();
  },

  // Advocate Drafts: Delete
  async deleteAdvocateDraft(id: string): Promise<{ success: boolean }> {
    const res = await customFetch(`/api/lawyer/drafts/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new ApiError('Failed to delete draft', res.status);
    return res.json();
  },

  // Advocate Drafts: Share with Client
  async shareDraftWithClient(id: string): Promise<{
    success: boolean;
    draft: AdvocateDraft;
    sharedDocument: CaseDocument;
  }> {
    const res = await customFetch(`/api/lawyer/drafts/${id}/share-with-client`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to share draft with client' }));
      throw new ApiError(err.error || 'Failed to share draft with client', res.status);
    }
    return res.json();
  },

  // Advocate Audit Logs
  async getAdvocateAuditLogs(params?: { caseId?: string; action?: string }): Promise<{ logs: AdvocateAuditLog[] }> {
    const qParams = new URLSearchParams();
    if (params?.caseId) qParams.set('caseId', params.caseId);
    if (params?.action) qParams.set('action', params.action);
    const qs = qParams.toString();
    const res = await customFetch(`/api/lawyer/audit-logs${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new ApiError('Failed to fetch audit logs', res.status);
    return res.json();
  },

  // Advocate Record Action in Audit Log
  async recordAdvocateAudit(data: {
    action: string;
    actionLabel?: string;
    details: string;
    caseId?: string;
    caseNumber?: string;
    draftId?: string;
  }): Promise<{ success: boolean; log: AdvocateAuditLog }> {
    const res = await customFetch('/api/lawyer/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new ApiError('Failed to record audit log', res.status);
    return res.json();
  }
};
