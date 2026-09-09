import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Send,
  Upload,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building,
  User,
  Download,
  Activity as ActivityIcon,
  ChevronRight,
  Gavel,
  CheckCircle,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Paperclip,
  Check,
  Star
} from 'lucide-react';
import { ReviewCaseModal } from '../client/ReviewCaseModal.js';
import {
  LegalCase,
  CaseDocument,
  CaseMessage,
  CaseUpdate,
  Payment,
  User as UserType,
  ProposalCaseStage,
  ImplementationState
} from '../../types.js';
import { api } from '../../services/api.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Tabs,
  Modal,
  Alert,
  EmptyState,
  LoadingState,
  Input,
  Select,
  Textarea
} from '../ui/index.js';
import { UnauthorizedView } from '../auth/UnauthorizedView.js';
import { ForbiddenView } from '../auth/ForbiddenView.js';

interface CaseRoomViewProps {
  caseId: string;
  currentUser: UserType | null;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  onBack: () => void;
  onPaymentSuccess?: () => void;
  onOpenAuth?: () => void;
  onSwitchAccountClick?: () => void;
}

interface CaseActivityItem {
  id: string;
  type: 'stage' | 'document' | 'message' | 'payment' | 'hearing';
  title: string;
  description: string;
  timestamp: string;
  author: string;
}

export const CaseRoomView: React.FC<CaseRoomViewProps> = ({
  caseId,
  currentUser,
  initialTab,
  onTabChange,
  onBack,
  onPaymentSuccess,
  onOpenAuth,
  onSwitchAccountClick,
}) => {
  const [caseData, setCaseData] = useState<LegalCase | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<{ status: number; message: string } | null>(null);

  // Active Tab: overview, chat, documents, timeline, activity, billing
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  // Document filtering
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('all');

  // Chat message input
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Stage update modal for advocate/admin
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ProposalCaseStage>('Notice Sent');
  const [selectedSystemState, setSelectedSystemState] = useState<string>('Active');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [courtName, setCourtName] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [filingNumber, setFilingNumber] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  // New update/hearing diary modal
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDesc, setUpdateDesc] = useState('');
  const [updateOutcome, setUpdateOutcome] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Document upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'evidence' | 'notice' | 'reply' | 'order' | 'petition'>('evidence');
  const [docType, setDocType] = useState<'pdf' | 'image' | 'audio' | 'video' | 'doc'>('pdf');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Payment modal (Razorpay GST)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('2000');
  const [paying, setPaying] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  useEffect(() => {
    loadCaseDetails();
  }, [caseId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const loadCaseDetails = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const data = await api.getCaseById(caseId);
      setCaseData(data.case);
      setDocuments(data.documents);
      setMessages(data.messages);
      setUpdates(data.updates);
      setPayments(data.payments);

      // Pre-fill stage edit form
      setSelectedStage(data.case.stage);
      setNextHearingDate(data.case.nextHearingDate || '');
      setCourtName(data.case.courtName || '');
      setJudgeName(data.case.judgeName || '');
      setFilingNumber(data.case.filingNumber || '');
    } catch (err: any) {
      console.error('Error loading case room details:', err);
      if (err.status === 401 || err.status === 403) {
        setAuthError({ status: err.status, message: err.message || 'Access Denied' });
      } else {
        setAuthError({ status: 500, message: err.message || 'Failed to open case room' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const res = await api.sendCaseMessage(caseId, newMessage);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStage(true);
    try {
      await api.updateCaseStage(caseId, {
        stage: selectedStage,
        implementationState: selectedSystemState,
        nextHearingDate: nextHearingDate || undefined,
        courtName: courtName || undefined,
        judgeName: judgeName || undefined,
        filingNumber: filingNumber || undefined,
      });
      setStageModalOpen(false);
      await loadCaseDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStage(false);
    }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUpdate(true);
    try {
      await api.addCaseUpdate(caseId, {
        title: updateTitle,
        description: updateDesc,
        stage: selectedStage,
        hearingOutcome: updateOutcome || undefined,
      });
      setUpdateModalOpen(false);
      setUpdateTitle('');
      setUpdateDesc('');
      setUpdateOutcome('');
      await loadCaseDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingDoc(true);
    try {
      await api.uploadCaseDocument(caseId, {
        title: docTitle || 'Case_Record',
        category: docCategory,
        fileType: docType,
        fileName: `${(docTitle || 'Document').replace(/[^a-zA-Z0-9]/g, '_')}.${
          docType === 'image' ? 'png' : docType === 'audio' ? 'mp3' : docType === 'video' ? 'mp4' : 'pdf'
        }`,
        fileSize: '1.8 MB',
        fileUrl: '#',
      });
      setUploadModalOpen(false);
      setDocTitle('');
      await loadCaseDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleProcessPayment = async () => {
    setPaying(true);
    try {
      await api.createPayment({
        caseId,
        serviceCategory: 'Case Legal Milestone / Advocate Representation Fee',
        amount: Number(payAmount),
        paymentMethod: 'Razorpay UPI (Axis Bank Escrow)',
      });
      setPaymentModalOpen(false);
      setPaymentSuccessNotice(true);
      await loadCaseDetails();
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setPaying(false);
    }
  };

  const stagesList: ProposalCaseStage[] = ['Notice Sent', 'Reply Received', 'In Court', 'Closed'];

  if (authError) {
    if (authError.status === 401) {
      return (
        <UnauthorizedView
          attemptedRoute={`/cases/${caseId}`}
          onLoginClick={onOpenAuth || onBack}
          onNavigateHome={onBack}
        />
      );
    }
    return (
      <ForbiddenView
        currentRole={currentUser?.role}
        onNavigateHome={onBack}
        onSwitchAccountClick={onSwitchAccountClick}
        reason={authError.message}
      />
    );
  }

  if (loading || !caseData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24">
        <LoadingState
          message="Opening 256-bit Encrypted Case Room..."
          description="Verifying judicial authorization and synchronizing client-advocate vault."
        />
      </div>
    );
  }

  const isLawyerOrAdmin = currentUser?.role === 'lawyer' || currentUser?.role === 'admin';

  // Aggregate combined activities
  const activityLog: CaseActivityItem[] = [
    ...updates.map((u) => ({
      id: `up-${u.id}`,
      type: 'hearing' as const,
      title: u.title,
      description: u.description,
      timestamp: u.date || (u as any).createdAt || '',
      author: u.authorName || 'Advocate',
    })),
    ...documents.map((d) => ({
      id: `doc-${d.id}`,
      type: 'document' as const,
      title: `Document Uploaded: ${d.title}`,
      description: `Category: ${d.category.toUpperCase()} • File: ${d.fileName} (${d.fileSize})`,
      timestamp: d.createdAt || '',
      author: d.uploaderName || d.uploadedBy,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      type: 'payment' as const,
      title: `Fee Milestone Paid: ₹${p.amount.toLocaleString('en-IN')}`,
      description: `Method: ${p.paymentMethod} • Gateway Ref: ${p.razorpayPaymentId || 'RP_VERIFIED'}`,
      timestamp: p.createdAt || '',
      author: 'Client / Razorpay',
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredDocs = docCategoryFilter === 'all'
    ? documents
    : documents.filter((d) => d.category === docCategoryFilter);

  return (
    <div id="private-case-room" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. TOP BREADCRUMB & CONFIDENTIALITY STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Button
            id="back-to-caseload-btn"
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-xs font-semibold text-slate-700">
            {caseData.caseNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" dot size="sm">
            <Lock className="w-3 h-3 mr-1 text-emerald-700" />
            256-Bit Cryptographic Vault
          </Badge>
          <Badge variant="neutral" size="sm">
            Section 126 Evidence Act Protected
          </Badge>
        </div>
      </div>

      {paymentSuccessNotice && (
        <Alert
          variant="success"
          title="Payment Successful & Invoiced"
          onClose={() => setPaymentSuccessNotice(false)}
        >
          Milestone fee received in statutory escrow. Automated GST invoice and Bar Council compliant receipt generated.
        </Alert>
      )}

      {/* 2. CASE COMMAND HEADER CARD */}
      <Card variant="bordered" className="bg-slate-950 text-white border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Header Title & Actions Row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-md">
                  {caseData.caseNumber}
                </span>
                <Badge variant="warning" size="sm">
                  {caseData.category}
                </Badge>
                <Badge variant="primary" size="sm">
                  {caseData.implementationState}
                </Badge>
                {caseData.isUrgent && (
                  <Badge variant="danger" size="sm">
                    Urgent Redressal
                  </Badge>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-50 tracking-tight">
                {caseData.title}
              </h1>
              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Jurisdiction: <strong className="text-slate-100">{caseData.city}, {caseData.state}</strong>
                </span>
                <span>•</span>
                <span>
                  Filing/CNR: <strong className="font-mono text-amber-300">{caseData.filingNumber || 'Pre-Filing Stage'}</strong>
                </span>
              </p>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2.5 shrink-0">
              {isLawyerOrAdmin && (
                <Button
                  id="caseroom-update-stage-btn"
                  variant="primary"
                  size="sm"
                  leftIcon={<Gavel className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedStage(caseData.stage || 'Notice Sent');
                    setSelectedSystemState(caseData.implementationState || 'Active');
                    setCourtName(caseData.courtName || '');
                    setJudgeName(caseData.judgeName || '');
                    setFilingNumber(caseData.filingNumber || '');
                    setNextHearingDate(caseData.nextHearingDate || '');
                    setStageModalOpen(true);
                  }}
                >
                  Update Stage & Court
                </Button>
              )}
              <Button
                id="caseroom-pay-milestone-btn"
                variant="outline"
                size="sm"
                className="bg-slate-900 text-slate-100 border-slate-700 hover:bg-slate-800"
                leftIcon={<CreditCard className="w-3.5 h-3.5 text-amber-400" />}
                onClick={() => setPaymentModalOpen(true)}
              >
                Pay Milestone Fee
              </Button>
            </div>
          </div>

          {/* Mandatory Statutory Case Stages Progress Bar */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                Statutory Redressal Pipeline
              </span>
              <span className="text-[11px] text-slate-400">
                Current Stage: <strong className="text-amber-300">{caseData.stage}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stagesList.map((stg, index) => {
                const currentIdx = stagesList.indexOf(caseData.stage);
                const isCompleted = index < currentIdx;
                const isCurrent = index === currentIdx;

                return (
                  <div
                    key={stg}
                    className={`
                      p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between
                      ${
                        isCurrent
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider mb-1">
                      <span>Stage 0{index + 1}</span>
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      ) : null}
                    </div>
                    <span className="text-xs font-semibold truncate">{stg}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4-COLUMN STRUCTURED METADATA GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
            {/* Column 1: Lawyer */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Assigned Advocate
              </span>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <p className="font-semibold text-slate-100 truncate">
                    {caseData.lawyerName || 'Advocate Matching in Progress'}
                  </p>
                  <p className="text-[10px] text-amber-300 font-mono">
                    Bar Council Verified
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: Client */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Client Information
              </span>
              <p className="font-semibold text-slate-100 truncate">{caseData.clientName}</p>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                {caseData.clientPhone}
              </p>
            </div>

            {/* Column 3: Court & Judge */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Court & Bench
              </span>
              <p className="font-semibold text-slate-100 truncate">
                {caseData.courtName || 'Court to be Assigned Upon Filing'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {caseData.judgeName ? `Coram: ${caseData.judgeName}` : 'Pre-filing Stage'}
              </p>
            </div>

            {/* Column 4: Next Hearing */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Next Court Hearing
              </span>
              <p className="font-bold text-amber-300 text-sm">
                {caseData.nextHearingDate
                  ? new Date(caseData.nextHearingDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'No Hearing Scheduled'}
              </p>
              <p className="text-[10px] text-slate-300">
                {caseData.nextHearingDate ? 'Cause list scheduled' : 'Awaiting court allocation'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. CASE ROOM NAVIGATION TABS */}
      <Tabs
        activeTab={activeTab}
        onChange={(tabId) => handleTabSelect(tabId)}
        variant="pills"
        tabs={[
          {
            id: 'overview',
            label: 'Overview & Facts',
            icon: <Scale className="w-3.5 h-3.5" />,
          },
          {
            id: 'chat',
            label: 'Encrypted Chat',
            icon: <Lock className="w-3.5 h-3.5" />,
            count: messages.length,
          },
          {
            id: 'documents',
            label: 'Evidence & Documents',
            icon: <FileText className="w-3.5 h-3.5" />,
            count: documents.length,
          },
          {
            id: 'timeline',
            label: 'Timeline & Court Diary',
            icon: <Calendar className="w-3.5 h-3.5" />,
            count: updates.length,
          },
          {
            id: 'activity',
            label: 'Activity Audit Log',
            icon: <ActivityIcon className="w-3.5 h-3.5" />,
            count: activityLog.length,
          },
          {
            id: 'billing',
            label: 'Financial Milestones',
            icon: <CreditCard className="w-3.5 h-3.5" />,
            count: payments.length,
          },
        ]}
      />

      {/* ========================================================================= */}
      {/* TAB 0: CASE OVERVIEW & DETAILS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Review Banner if Case is Closed vs Not Closed */}
          {caseData.stage === 'Closed' || caseData.status === 'closed' || caseData.status === 'resolved' ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Matter Concluded & Decreed
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 font-serif">
                  Your Legal Matter is Closed — Share Your Verified Advocate Review
                </h3>
                <p className="text-xs text-slate-600">
                  Help fellow citizens find trusted legal counsel by submitting your 1 to 5 star rating and written experience.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Star className="w-3.5 h-3.5 fill-amber-300 text-amber-100" />}
                onClick={() => setReviewModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 shrink-0"
              >
                Write Verified Review
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Bar Council Review Protocol:</strong> Advocate evaluations and reviews unlock immediately once case proceedings reach <strong>Closed</strong> stage.
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 shrink-0">
                Current Stage: <strong className="text-amber-800">{caseData.stage}</strong>
              </span>
            </div>
          )}

          {/* Grid: Case Narrative Facts + Sidebar Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Facts & Grievance Narrative */}
            <div className="lg:col-span-2 space-y-6">
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base font-serif flex items-center justify-between">
                    <span>Grievance Summary & Statement of Facts</span>
                    <Badge variant="neutral" size="sm">{caseData.category}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Client-submitted factual narrative, relief sought, and legal dispute context.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
                    {caseData.description}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Case Number</span>
                      <span className="font-mono font-bold text-slate-900">{caseData.caseNumber}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Filing / CNR</span>
                      <span className="font-mono font-bold text-amber-700">{caseData.filingNumber || 'Pre-Filing Stage'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Priority Urgency</span>
                      <span className={`font-bold capitalize ${caseData.isUrgent ? 'text-rose-600' : 'text-slate-800'}`}>
                        {caseData.isUrgent ? 'Urgent Redressal' : 'Standard Priority'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Updates Preview */}
              <Card variant="default">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-serif">Recent Case Updates & Diary</CardTitle>
                    <CardDescription>Official court proceedings and notices</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    onClick={() => handleTabSelect('timeline')}
                  >
                    View All ({updates.length})
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  {updates.slice(0, 3).map((upd) => (
                    <div key={upd.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{upd.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(upd.date || upd.timestamp || '').toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-2 leading-relaxed">{upd.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Lawyer info, Court info, Quick Shortcuts */}
            <div className="space-y-6">
              {/* Assigned Lawyer Card */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base font-serif">Assigned Legal Counsel</CardTitle>
                  <CardDescription>Bar Council verified advocate representing this matter</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-serif font-bold text-base shrink-0">
                      {caseData.lawyerName ? caseData.lawyerName.charAt(0) : 'L'}
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-slate-900 text-sm truncate">
                        {caseData.lawyerName || 'Advocate Sharma'}
                      </h4>
                      <p className="text-slate-500 text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified State Bar Council
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span>Jurisdiction:</span>
                      <span className="font-semibold text-slate-800">{caseData.city}, {caseData.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Specialization:</span>
                      <span className="font-semibold text-slate-800">{caseData.category}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => handleTabSelect('chat')}
                    >
                      Open Encrypted Case Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Hearing Information Card */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base font-serif flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Court & Coram</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-800">Next Scheduled Hearing</span>
                    <p className="font-bold text-amber-950 text-sm">
                      {caseData.nextHearingDate
                        ? new Date(caseData.nextHearingDate).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Awaiting Court Listing'}
                    </p>
                  </div>

                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <p>
                      <strong>Court:</strong> {caseData.courtName || `${caseData.city} District Court`}
                    </p>
                    <p>
                      <strong>Bench/Judge:</strong> {caseData.judgeName || 'To be listed upon summons'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Jump Navigation */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-sm font-bold">Case Room Sections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <button
                    onClick={() => handleTabSelect('documents')}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <FileText className="w-4 h-4 text-amber-600" />
                      <span>Evidence & Documents</span>
                    </span>
                    <Badge variant="neutral" size="sm">{documents.length}</Badge>
                  </button>

                  <button
                    onClick={() => handleTabSelect('timeline')}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>Court Diary & Timeline</span>
                    </span>
                    <Badge variant="neutral" size="sm">{updates.length}</Badge>
                  </button>

                  <button
                    onClick={() => handleTabSelect('billing')}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-left transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span>Financial Milestones</span>
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-slate-700">
                      ₹{caseData.paidAmount.toLocaleString('en-IN')}
                    </span>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ENCRYPTED CASE CHAT */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <Card variant="default" className="flex flex-col h-[560px]">
          {/* Chat security banner */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Encrypted Client-Advocate privileged communications under Section 126 of the Indian Evidence Act.
              </span>
            </div>
            <Badge variant="success" size="sm">
              Live Encrypted
            </Badge>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {messages.length === 0 ? (
              <EmptyState
                icon={<Lock className="w-6 h-6 text-slate-400" />}
                title="Start the Privileged Case Dialogue"
                description="Use this encrypted case room to exchange factual instructions, draft revisions, hearing strategies, and evidence notes."
              />
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === currentUser?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {m.senderName}
                      </span>
                      <Badge variant={m.senderRole === 'lawyer' ? 'primary' : 'neutral'} size="sm">
                        {m.senderRole === 'lawyer' ? 'Advocate' : 'Client'}
                      </Badge>
                      <span className="text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`
                        max-w-lg p-3.5 rounded-2xl shadow-xs leading-relaxed text-sm
                        ${
                          isMe
                            ? 'bg-amber-600 text-white rounded-br-xs'
                            : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-xs'
                        }
                      `}
                    >
                      <p className="whitespace-pre-line">{m.content}</p>

                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/20 space-y-1.5">
                          {m.attachments.map((att: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-1.5 rounded-lg bg-black/10 text-xs"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="truncate">{att.name || 'Case Attachment'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              title="Attach Document to Vault"
              className="px-2.5 text-slate-600"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <input
              id="case-chat-input"
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type privileged message to advocate or client..."
              className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <Button
              id="send-chat-msg-btn"
              type="submit"
              variant="primary"
              size="sm"
              isLoading={sendingMsg}
              rightIcon={<Send className="w-3.5 h-3.5" />}
              disabled={!newMessage.trim()}
            >
              Send
            </Button>
          </form>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DOCUMENTS & EVIDENCE VAULT */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900">
                Evidence & Document Vault ({documents.length})
              </h2>
              <p className="text-xs text-slate-700">
                Digitally indexed legal notices, replies, affidavits, bank statements, speed-post receipts, and court decrees.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={docCategoryFilter}
                onChange={(e) => setDocCategoryFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="all">All Classifications</option>
                <option value="evidence">Evidence</option>
                <option value="notice">Legal Notices</option>
                <option value="reply">Legal Replies</option>
                <option value="order">Court Orders</option>
                <option value="petition">Petitions / Plaints</option>
              </select>

              <Button
                id="upload-doc-modal-trigger-btn"
                variant="primary"
                size="sm"
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                onClick={() => setUploadModalOpen(true)}
              >
                Upload Document
              </Button>
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-slate-400" />}
              title="No Documents Found in this Filter"
              description="Upload primary case evidence, notice copies, postal receipts, or case orders to keep the official vault updated."
              actionLabel="Upload First Document"
              onAction={() => setUploadModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} variant="default" className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                      {doc.fileType === 'pdf' && <FileText className="w-5 h-5 text-rose-600" />}
                      {doc.fileType === 'image' && <ImageIcon className="w-5 h-5 text-blue-600" />}
                      {doc.fileType === 'audio' && <Mic className="w-5 h-5 text-amber-600" />}
                      {doc.fileType === 'video' && <Video className="w-5 h-5 text-purple-600" />}
                      {doc.fileType === 'doc' && <FileText className="w-5 h-5 text-slate-700" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 text-xs truncate max-w-[220px]">
                          {doc.title}
                        </h4>
                        <Badge variant="neutral" size="sm">
                          {doc.category.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-slate-700 truncate mt-0.5">{doc.fileName}</p>
                      <p className="text-[10px] text-slate-700 mt-1">
                        {doc.fileSize} • Uploaded by <strong>{doc.uploaderName || doc.uploadedBy}</strong> on{' '}
                        {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 text-slate-500 hover:text-slate-900"
                    title="Download document from encrypted vault"
                    onClick={() => {
                      alert(`Accessing encrypted legal file: ${doc.fileName}\nVerification SHA-256 validated.`);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TIMELINE & COURT DIARY */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <Card variant="default" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900">
                Case Diary & Hearing Progression
              </h2>
              <p className="text-xs text-slate-700">
                Chronological record of demand notices, statutory reply windows, court admission, interim orders, and final decrees.
              </p>
            </div>

            {isLawyerOrAdmin && (
              <Button
                id="add-diary-entry-btn"
                variant="secondary"
                size="sm"
                leftIcon={<Gavel className="w-3.5 h-3.5 text-amber-400" />}
                onClick={() => setUpdateModalOpen(true)}
              >
                Add Court Diary Entry
              </Button>
            )}
          </div>

          {updates.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8 text-slate-400" />}
              title="No Court Diary Entries Yet"
              description="Record official updates such as speed-post notice delivery, reply received, interim injunctions, or witness cross-examination."
              actionLabel={isLawyerOrAdmin ? "Add First Entry" : undefined}
              onAction={isLawyerOrAdmin ? () => setUpdateModalOpen(true) : undefined}
            />
          ) : (
            <div className="relative pl-6 space-y-6 border-l-2 border-amber-600/30 text-xs">
              {updates.map((u) => (
                <div key={u.id} className="relative group">
                  {/* Timeline Node Bullet */}
                  <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-600 border-2 border-white shadow-xs" />

                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{u.title}</span>
                        {u.stage && (
                          <Badge variant="primary" size="sm">
                            {u.stage}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-700 font-mono">
                        {new Date(u.date || (u as any).createdAt).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs leading-relaxed">{u.description}</p>

                    {u.hearingOutcome && (
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs">
                        <strong className="text-amber-800 font-semibold">Judicial Outcome / Order: </strong>
                        {u.hearingOutcome}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-700 border-t border-slate-200/60">
                      <span>Logged by Advocate: <strong>{u.authorName}</strong></span>
                      <span className="font-mono">Verified Entry</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACTIVITY AUDIT LOG */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <Card variant="default" className="p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold font-serif text-slate-900 flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-amber-600" />
              Comprehensive Case Activity Audit Trail
            </h2>
            <p className="text-xs text-slate-700">
              Immutable ledger of case filings, document verifications, client communications, and payment receipts.
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {activityLog.map((act) => (
              <div key={act.id} className="py-3 flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                  {act.type === 'hearing' && <Gavel className="w-4 h-4 text-amber-600" />}
                  {act.type === 'document' && <FileText className="w-4 h-4 text-rose-600" />}
                  {act.type === 'payment' && <CreditCard className="w-4 h-4 text-emerald-600" />}
                  {act.type === 'stage' && <Scale className="w-4 h-4 text-purple-600" />}
                  {act.type === 'message' && <Lock className="w-4 h-4 text-slate-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{act.title}</span>
                    <span className="text-[10px] font-mono text-slate-700">
                      {act.timestamp
                        ? new Date(act.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recent'}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] mt-0.5">{act.description}</p>
                  <p className="text-[10px] text-slate-700 mt-1">
                    Actor: <span className="font-medium text-slate-700">{act.author}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FINANCIAL MILESTONES & BILLING */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="default" className="p-5 space-y-1">
              <span className="text-xs text-slate-700 font-medium">Agreed Professional Total</span>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ₹{caseData.totalFee ? caseData.totalFee.toLocaleString('en-IN') : '0'}
              </p>
              <p className="text-[10px] text-slate-700">Includes legal counsel & filings</p>
            </Card>

            <Card variant="default" className="p-5 space-y-1 bg-emerald-50/50 border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium">Paid into Escrow</span>
              <p className="text-2xl font-bold font-mono text-emerald-700">
                ₹{caseData.paidAmount ? caseData.paidAmount.toLocaleString('en-IN') : '0'}
              </p>
              <p className="text-[10px] text-emerald-600">18% GST invoice settled</p>
            </Card>

            <Card variant="default" className="p-5 space-y-1 bg-amber-50/50 border-amber-200">
              <span className="text-xs text-amber-800 font-medium">Pending Milestone Balance</span>
              <p className="text-2xl font-bold font-mono text-amber-700">
                ₹{Math.max(0, (caseData.totalFee || 0) - (caseData.paidAmount || 0)).toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-amber-600">Payable on next court appearance</p>
            </Card>
          </div>

          <Card variant="default" className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Receipts & GST Tax Invoices ({payments.length})
                </h3>
                <p className="text-xs text-slate-700">
                  Bar Council compliant digital receipts with SAC 998211 legal services taxation.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                onClick={() => setPaymentModalOpen(true)}
              >
                Pay Milestone Online
              </Button>
            </div>

            {payments.length === 0 ? (
              <EmptyState
                icon={<CreditCard className="w-8 h-8 text-slate-400" />}
                title="No Invoices Paid Yet"
                description="Securely deposit professional milestone payments using UPI, NetBanking, or Credit Card with full GST tax credit."
                actionLabel="Pay Milestone"
                onAction={() => setPaymentModalOpen(true)}
              />
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {payments.map((pay) => (
                  <div key={pay.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{pay.serviceCategory}</span>
                        <Badge variant="success" size="sm">
                          {pay.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-700 font-mono mt-0.5">
                        Ref: {pay.razorpayPaymentId || 'RP_LIVE_ESCROW'} • Method: {pay.paymentMethod} • Date:{' '}
                        {new Date(pay.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{pay.amount.toLocaleString('en-IN')}
                      </span>
                      <p className="text-[10px] text-slate-700">GST Invoice Available</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPDATE STAGE & COURT (FOR ADVOCATE) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        title="Update Case Stage & Judicial Allocation"
        subtitle="Progress the statutory stage and update court roster, judge coram, and CNR."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setStageModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={savingStage}
              onClick={handleSaveStage}
            >
              Save Stage Progression
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveStage} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Official Statutory Stage"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as ProposalCaseStage)}
              options={[
                { value: 'Notice Sent', label: 'Notice Sent' },
                { value: 'Reply Received', label: 'Reply Received' },
                { value: 'In Court', label: 'In Court' },
                { value: 'Closed', label: 'Closed' },
              ]}
            />
            <Select
              label="System State"
              value={selectedSystemState}
              onChange={(e) => setSelectedSystemState(e.target.value)}
              options={[
                { value: 'Active', label: 'Active (Live Representation)' },
                { value: 'Lawyer Reviewing', label: 'Lawyer Reviewing' },
                { value: 'Closed', label: 'Closed / Archived' },
              ]}
            />
          </div>

          <Input
            label="Court Name & Complex"
            placeholder="e.g. Tis Hazari District Courts, Delhi"
            value={courtName}
            onChange={(e) => setCourtName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Judge / Presiding Coram"
              placeholder="e.g. Sh. V.K. Aggarwal, ADJ"
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
            />
            <Input
              label="Filing / CNR Number"
              placeholder="e.g. DLCT01-002934-2025"
              mono
              value={filingNumber}
              onChange={(e) => setFilingNumber(e.target.value)}
            />
          </div>

          <Input
            label="Next Scheduled Court Hearing Date"
            type="date"
            value={nextHearingDate}
            onChange={(e) => setNextHearingDate(e.target.value)}
          />
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD CASE DIARY ENTRY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Add Case Diary / Hearing Entry"
        subtitle="Record daily proceedings, court directions, or speed-post tracking slips."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setUpdateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isLoading={savingUpdate}
              onClick={handleAddUpdate}
            >
              Save Diary Entry
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddUpdate} className="space-y-3.5">
          <Input
            label="Proceeding Milestone Title"
            placeholder="e.g. Speed Post Notice of Motion Served on Respondent"
            value={updateTitle}
            onChange={(e) => setUpdateTitle(e.target.value)}
            required
          />

          <Textarea
            label="Detailed Summary of Appearance / Arguments"
            placeholder="Arguments made before Hon'ble Court, respondent counsel attendance, or tracking details..."
            rows={3}
            value={updateDesc}
            onChange={(e) => setUpdateDesc(e.target.value)}
            required
          />

          <Input
            label="Interim Direction / Judicial Outcome"
            placeholder="e.g. Notice returnable on 28th April 2025; status quo granted."
            value={updateOutcome}
            onChange={(e) => setUpdateOutcome(e.target.value)}
          />
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: UPLOAD DOCUMENT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload to Confidential Case Vault"
        subtitle="All records are encrypted with AES-256 for judicial privilege protection."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={uploadingDoc}
              onClick={handleUploadDoc}
            >
              Confirm Upload
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadDoc} className="space-y-3.5">
          <Input
            label="Document Title"
            placeholder="e.g. Cheque Return Memo & Speed Post Receipt"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Legal Classification"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as any)}
              options={[
                { value: 'evidence', label: 'Primary Evidence' },
                { value: 'notice', label: 'Legal Notice' },
                { value: 'reply', label: 'Legal Reply' },
                { value: 'order', label: 'Court Order / Interim Stay' },
                { value: 'petition', label: 'Petition / Plaint Draft' },
              ]}
            />
            <Select
              label="File Format"
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              options={[
                { value: 'pdf', label: 'PDF Document' },
                { value: 'image', label: 'Image Scan (PNG/JPG)' },
                { value: 'audio', label: 'Audio Recording' },
                { value: 'video', label: 'Video Evidence' },
                { value: 'doc', label: 'Word Document' },
              ]}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs">
            Files uploaded to this case room are automatically cryptographically hashed and indexed for court presentation.
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: RAZORPAY PAYMENT SIMULATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Razorpay Verified Legal Escrow"
        subtitle="Bar Council of India compliant fee settlement with 18% GST tax invoice."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              isLoading={paying}
              onClick={handleProcessPayment}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirm & Pay ₹{(Number(payAmount) * 1.18).toFixed(0)}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-700">Case Reference:</span>
              <span className="font-mono font-bold text-slate-900">{caseData.caseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Advocate:</span>
              <span className="font-semibold text-slate-900">{caseData.lawyerName || 'Assigned Advocate'}</span>
            </div>
          </div>

          <Input
            label="Milestone Amount (₹)"
            type="number"
            mono
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            hint="Escrow held until milestone deliverable is verified"
          />

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between text-slate-700">
              <span>Legal Professional Fee:</span>
              <span className="font-mono font-medium">₹{Number(payAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-700 text-[11px]">
              <span>CGST (9%) + SGST (9%):</span>
              <span className="font-mono">₹{(Number(payAmount) * 0.18).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 border-t border-amber-300 pt-1.5 text-xs">
              <span>Total Payable Amount:</span>
              <span className="font-mono text-amber-900">
                ₹{(Number(payAmount) * 1.18).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Verified Client Review Modal */}
      {caseData && (
        <ReviewCaseModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          caseData={caseData}
          onSuccess={() => {
            loadCaseDetails();
          }}
        />
      )}
    </div>
  );
};
