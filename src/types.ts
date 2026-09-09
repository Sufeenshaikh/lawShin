export type UserRole = 'client' | 'lawyer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  avatarUrl?: string;
  createdAt: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  emailVerificationToken?: string;
  isDemo?: boolean;
}

export interface ClientProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  address?: string;
  isPhoneVerified: boolean;
  createdAt: string;
  isDemo?: boolean;
}

export interface LawyerProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  barCouncilNumber: string;
  stateBarCouncil: string;
  experienceYears: number;
  practiceAreas: string[];
  courts: string[];
  bio: string;
  education: string;
  consultationFee: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationNotes?: string;
  lawFirmId?: string;
  lawFirmName?: string;
  avatarUrl?: string;
  languages: string[];
  city: string;
  state: string;
  isDemo?: boolean;
}

export interface LawFirm {
  id: string;
  name: string;
  registrationNumber: string;
  foundedYear: number;
  headquarters: string;
  practiceAreas: string[];
  attorneyCount: number;
  rating: number;
  description: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  isDemo?: boolean;
}

// Proposal explicitly mentioned case stages:
export type ProposalCaseStage = 'Notice Sent' | 'Reply Received' | 'In Court' | 'Closed';

// Implementation states:
export type ImplementationState =
  | 'Draft'
  | 'Submitted'
  | 'Lawyer Reviewing'
  | 'Lawyer Accepted'
  | 'Payment Pending'
  | 'Active';

export type CaseUrgency = 'urgent' | 'high' | 'standard' | 'low';
export type CaseStatus = 'open' | 'assigned' | 'in_progress' | 'hearing_scheduled' | 'resolved' | 'closed';

export interface CaseDocument {
  id: string;
  caseId: string;
  uploaderId?: string;
  title: string;
  fileType: 'pdf' | 'image' | 'audio' | 'video' | 'doc';
  fileUrl: string;
  fileName: string;
  fileSize: string;
  storagePath?: string;
  fileSizeBytes?: number;
  uploadedBy: 'client' | 'lawyer' | 'admin';
  uploaderName: string;
  category: 'evidence' | 'notice' | 'reply' | 'order' | 'petition' | 'id_proof';
  description?: string;
  uploadTimestamp?: string;
  createdAt: string;
  isVerified: boolean;
  isDemo?: boolean;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  content: string;
  message?: string;
  attachmentRef?: string;
  attachments?: {
    name: string;
    url: string;
    type: string;
    size?: string;
  }[];
  timestamp?: string;
  createdAt: string;
  isRead: boolean;
  isDemo?: boolean;
}

export interface CaseUpdate {
  id: string;
  caseId: string;
  title: string;
  description: string;
  note?: string;
  stage?: ProposalCaseStage;
  implementationState?: ImplementationState;
  previousStatus?: string;
  newStatus?: string;
  previousStage?: string;
  newStage?: string;
  date: string;
  timestamp?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  updatedById?: string;
  orderDocumentUrl?: string;
  hearingOutcome?: string;
  isDemo?: boolean;
}

export interface CaseParticipant {
  id: string;
  caseId: string;
  userId: string;
  roleInCase: 'client' | 'lead_counsel' | 'co_counsel' | 'legal_assistant' | 'court_clerk' | 'observer';
  permissions: 'read_write' | 'read_only' | 'billing_only';
  joinedAt: string;
  isDemo?: boolean;
}

export interface LegalCase {
  id: string;
  caseNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  lawyerId?: string;
  lawyerName?: string;
  title: string;
  category: string;
  description: string;
  stage: ProposalCaseStage;
  status?: CaseStatus;
  urgency?: CaseUrgency;
  implementationState: ImplementationState;
  filingDate?: string;
  nextHearingDate?: string;
  closureDate?: string;
  courtName?: string;
  judgeName?: string;
  filingNumber?: string;
  createdAt: string;
  updatedAt: string;
  totalFee: number;
  paidAmount: number;
  isUrgent: boolean;
  city: string;
  state: string;
  documentsCount: number;
  unreadCount?: number;
  isDemo?: boolean;
}

export interface Payment {
  id: string;
  caseId?: string;
  caseNumber?: string;
  clientId: string;
  clientName: string;
  lawyerId?: string;
  lawyerName?: string;
  serviceCategory: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  currency?: string;
  provider?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId: string;
  paymentMethod: 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Razorpay' | string;
  paymentDate: string;
  invoiceId: string;
  refundStatus?: 'none' | 'requested' | 'processed';
  timestamps?: {
    created: string;
    completed?: string;
  };
  isDemo?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  paymentId: string;
  caseId?: string;
  caseNumber?: string;
  clientName: string;
  clientEmail: string;
  lawyerName?: string;
  serviceDescription: string;
  amount: number;
  gstRate: number;
  gstAmount: number;
  total: number;
  issueDate: string;
  status: 'paid' | 'unpaid' | 'cancelled';
  isDemo?: boolean;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  lawyerId: string;
  lawyerName: string;
  caseId?: string;
  caseTitle?: string;
  date: string;
  timeSlot: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  mode: 'Video Call' | 'Phone Call' | 'Chamber Meeting';
  notes?: string;
  fee?: number;
  meetingLink?: string;
  isDemo?: boolean;
}

export interface Review {
  id: string;
  lawyerId: string;
  clientId: string;
  clientName: string;
  caseId?: string;
  rating: number;
  comment: string;
  writtenReview?: string;
  caseCategory: string;
  moderationStatus?: 'approved' | 'pending' | 'flagged' | 'rejected';
  createdAt: string;
  timestamp?: string;
  isVerifiedClient: boolean;
  isDemo?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'case_update' | 'new_message' | 'appointment' | 'payment' | 'verification' | 'system';
  title: string;
  content: string;
  entityType?: 'case' | 'appointment' | 'payment' | 'user';
  entityId?: string;
  isRead: boolean;
  isDemo?: boolean;
  createdAt: string;
}

export interface LegalQueryReply {
  id: string;
  lawyerId: string;
  lawyerName: string;
  barNumber: string;
  content: string;
  createdAt: string;
}

export interface LegalQuery {
  id: string;
  clientId?: string;
  title: string;
  category: string;
  description: string;
  isAnonymous: boolean;
  authorName: string;
  city: string;
  state: string;
  replies: LegalQueryReply[];
  createdAt: string;
  views: number;
  isDemo?: boolean;
}

export interface VerifiedJudgment {
  id: string;
  title: string;
  citation: string;
  court: string;
  bench: string;
  decisionDate: string;
  legalSections: string[];
  summary: string;
  ratioDecidendi: string;
  sourceUrl: string;
  sourceName: string;
  isDemo?: boolean;
}

export interface PublicContent {
  id: string;
  slug: string;
  type: 'legal_guide' | 'bare_act_reference' | 'faq' | 'judgment_summary' | 'court_procedure';
  title: string;
  category: string;
  contentMarkdown: string;
  author: string;
  citation?: string;
  court?: string;
  bench?: string;
  decisionDate?: string;
  legalSections?: string[];
  ratioDecidendi?: string;
  sourceUrl?: string;
  sourceName?: string;
  tags?: string[];
  isPublished: boolean;
  viewsCount: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}
