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
  ImplementationState
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

const TOKEN_KEY = 'lawshin_auth_token';

export const authStorage = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
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
    const res = await fetch(`/api/cases/${id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update case stage');
    return res.json();
  },

  async takeCaseAction(id: string, action: 'accept' | 'reject', notes?: string): Promise<{ success: boolean; case: LegalCase }> {
    const res = await fetch(`/api/cases/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes })
    });
    if (!res.ok) throw new Error('Failed to perform case action');
    return res.json();
  },

  // Case Room: Messages
  async getCaseMessages(caseId: string): Promise<{ messages: CaseMessage[] }> {
    const res = await fetch(`/api/cases/${caseId}/messages`);
    return res.json();
  },

  async sendCaseMessage(caseId: string, content: string, attachments?: any[]): Promise<{ success: boolean; message: CaseMessage }> {
    const res = await fetch(`/api/cases/${caseId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, attachments })
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
  },

  // Case Room: Documents
  async getCaseDocuments(caseId: string): Promise<{ documents: CaseDocument[] }> {
    const res = await fetch(`/api/cases/${caseId}/documents`);
    return res.json();
  },

  async uploadCaseDocument(caseId: string, docData: {
    title: string;
    fileType: 'pdf' | 'image' | 'audio' | 'video' | 'doc';
    fileUrl: string;
    fileName: string;
    fileSize: string;
    category: 'evidence' | 'notice' | 'reply' | 'order' | 'petition' | 'id_proof';
  }): Promise<{ success: boolean; document: CaseDocument }> {
    const res = await fetch(`/api/cases/${caseId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    if (!res.ok) throw new Error('Failed to upload document');
    return res.json();
  },

  // Case Room: Updates
  async getCaseUpdates(caseId: string): Promise<{ updates: CaseUpdate[] }> {
    const res = await fetch(`/api/cases/${caseId}/updates`);
    return res.json();
  },

  async addCaseUpdate(caseId: string, updateData: {
    title: string;
    description: string;
    stage?: ProposalCaseStage;
    hearingOutcome?: string;
    orderDocumentUrl?: string;
  }): Promise<{ success: boolean; update: CaseUpdate }> {
    const res = await fetch(`/api/cases/${caseId}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (!res.ok) throw new Error('Failed to add case update');
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

  // Payments & Invoices
  async getPayments(): Promise<{ payments: Payment[] }> {
    const res = await fetch('/api/payments');
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

  // Appointments
  async getAppointments(): Promise<{ appointments: Appointment[] }> {
    const res = await fetch('/api/appointments');
    return res.json();
  },

  async createAppointment(data: {
    lawyerId: string;
    caseId?: string;
    date: string;
    timeSlot: string;
    mode: 'Video Call' | 'Phone Call' | 'Chamber Meeting';
    notes?: string;
  }): Promise<{ success: boolean; appointment: Appointment }> {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to schedule appointment');
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

  // Reviews
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
    caseId?: string;
    rating: number;
    comment: string;
    writtenReview?: string;
    caseCategory?: string;
  }): Promise<{ success: boolean; review: Review }> {
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
    prompt: string;
    draftType?: string;
    clientName?: string;
    opponentName?: string;
    amount?: string | number;
    facts?: string;
  }): Promise<{ draft: string; disclaimer: string; generatedBy: string }> {
    const res = await fetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('AI drafting failed');
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

  // Judgment Search
  async searchJudgments(q: string): Promise<{
    query: string;
    results: VerifiedJudgment[];
    total: number;
    message?: string;
    disclaimer: string;
  }> {
    const res = await fetch(`/api/judgments/search?q=${encodeURIComponent(q)}`);
    return res.json();
  }
};
