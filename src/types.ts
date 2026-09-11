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
  chamberAddress?: string;
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

export type PaymentState =
  | 'Pending'
  | 'Processing'
  | 'Successful'
  | 'Failed'
  | 'Refunded'
  | 'Cancelled'
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'refunded'
  | 'cancelled'
  | 'completed';

export interface Payment {
  id: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  lawyerId?: string;
  lawyerName?: string;
  serviceCategory: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  currency?: string;
  provider?: string;
  status: PaymentState;
  transactionId: string;
  paymentMethod: 'UPI' | 'Credit/Debit Card' | 'Net Banking' | 'Razorpay' | string;
  paymentDate: string;
  invoiceId: string;
  invoiceNumber?: string;
  orderId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  refundStatus?: 'none' | 'requested' | 'processed';
  failureReason?: string;
  timestamps?: {
    created: string;
    processing?: string;
    completed?: string;
    failed?: string;
    cancelled?: string;
    refunded?: string;
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

export type AppointmentStatus = 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled';

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
  location: string;
  locationType?: 'chamber' | 'court' | 'client_premises' | 'custom' | string;
  status: AppointmentStatus | 'scheduled';
  mode: 'Offline Chamber Meeting' | 'Court Complex Consultation' | 'In-Person Consultation' | 'Video Call' | 'Phone Call' | string;
  notes?: string;
  fee?: number;
  meetingLink?: string;
  cancellationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  isDemo?: boolean;
}

export interface Review {
  id: string;
  lawyerId: string;
  clientId: string;
  clientName: string;
  caseId?: string;
  caseTitle?: string;
  rating: number; // 1-5 stars
  comment: string;
  writtenReview: string;
  caseCategory: string;
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationNotes?: string;
  createdAt: string;
  timestamp?: string;
  isVerifiedClient: boolean;
  isDemo?: boolean;
  lawyerName?: string;
  lawyerCity?: string;
  lawyerBarNumber?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'case_update' | 'new_message' | 'appointment' | 'payment' | 'verification' | 'system' | 'case_deadline';
  title: string;
  content: string;
  entityType?: 'case' | 'appointment' | 'payment' | 'user' | 'deadline';
  entityId?: string;
  link?: string;
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

// Right-to-Remedy / Deadline Tracker Types
export type DeadlineStatus = 'safe' | 'approaching' | 'urgent' | 'expired';

export type DeadlineType =
  | 'Statutory Limitation Period'
  | 'Legal Notice Response'
  | 'Written Statement / Reply Filing'
  | 'Appellate / Revision Window'
  | 'Consumer Forum Complaint'
  | 'Evidence / Rejoinder Submission'
  | 'Court Order Compliance'
  | 'Arbitration Notice / Claim'
  | 'Right to Information (RTI) Appeal'
  | 'Other Procedural Deadline';

export type DeadlineCalculationSource =
  | 'manual_lawyer_entry'
  | 'verified_rule_engine';

export interface VerifiedLegalRule {
  ruleId: string;
  actTitle: string;
  sectionOrArticle: string;
  standardPeriodDays: number;
  description: string;
  jurisdiction: string;
  officialSourceCitation: string;
  triggerEventDescription: string;
}

export interface LegalDeadline {
  id: string;
  caseId: string;
  title: string; // Legal Deadline / Remedy Action Title
  deadlineType: DeadlineType;
  startDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  daysRemaining: number;
  status: DeadlineStatus;
  description?: string;
  calculationSource: DeadlineCalculationSource;
  enteredById: string;
  enteredByName: string;
  enteredByRole: 'lawyer' | 'admin';
  verifiedRuleReference?: {
    ruleId?: string;
    actTitle: string;
    sectionOrArticle: string;
    citation: string;
  };
  remedyActionRequired?: string;
  governingForum?: string;
  isCompleted?: boolean;
  completedAt?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ADVOCATE-ONLY LEGAL RESEARCH & AI DRAFTING TYPES
// ============================================================================

export type AdvocateDraftStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'UNDER REVIEW'
  | 'REVIEWED'
  | 'FINAL'
  | 'FINALIZED';

export type AdvocateDocumentType =
  | 'Bail Application'
  | 'Anticipatory Bail Application'
  | 'Legal Notice'
  | 'Reply to Legal Notice'
  | 'Complaint'
  | 'Plaint'
  | 'Written Statement'
  | 'Petition'
  | 'Affidavit'
  | 'Application'
  | 'Representation'
  | 'Custom Legal Document'
  | string;

export interface AdvocateSavedAuthority {
  id: string;
  caseId?: string;
  caseNumber?: string;
  lawyerId: string;
  caseName: string;
  citation: string;
  court: string;
  bench?: string;
  decisionDate: string;
  legalSections?: string[];
  relevantPassage: string;
  shortSummary?: string;
  source: string;
  sourceUrl?: string;
  isVerified: boolean;
  notes?: string;
  addedAt: string;
}

export interface AdvocateDraftVersion {
  id: string;
  versionNumber: number;
  content: string;
  title: string;
  status: AdvocateDraftStatus;
  modifiedAt: string;
  modifiedBy: string;
  changeSummary?: string;
}

export interface AdvocateDraft {
  id: string;
  caseId?: string;
  caseNumber?: string;
  caseTitle?: string;
  clientName?: string;
  clientId?: string;
  opponentName?: string;
  lawyerId: string;
  lawyerName: string;
  documentType: AdvocateDocumentType;
  title: string;
  content: string;
  courtDetails?: string;
  courtName?: string;
  jurisdiction?: string;
  relevantSections?: string[];
  authorities?: any[];
  language?: string;
  additionalInstructions?: string;
  status: AdvocateDraftStatus;
  isSharedWithClient: boolean;
  sharedAt?: string;
  versions: AdvocateDraftVersion[];
  createdAt: string;
  updatedAt: string;
}

export type AdvocateAuditAction =
  | 'judgment_searched'
  | 'judgment_opened'
  | 'judgment_saved'
  | 'authority_added_to_draft'
  | 'draft_generated'
  | 'draft_edited'
  | 'draft_downloaded'
  | 'draft_shared_with_client'
  | 'draft_finalized';

export interface AdvocateAuditLog {
  id: string;
  lawyerId: string;
  lawyerName: string;
  action: AdvocateAuditAction;
  actionLabel: string;
  details: string;
  caseId?: string;
  caseNumber?: string;
  draftId?: string;
  timestamp: string;
}

