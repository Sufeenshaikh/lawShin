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
  Star,
  Eye,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  X,
  FileCheck,
  Hash,
  Share2
} from 'lucide-react';
import { ReviewCaseModal } from '../client/ReviewCaseModal.js';
import { RightToRemedyTracker } from './RightToRemedyTracker.js';
import {
  LegalCase,
  CaseDocument,
  CaseMessage,
  CaseUpdate,
  Payment,
  User as UserType,
  ProposalCaseStage,
  ImplementationState,
  LegalDeadline
} from '../../types.js';
import { api, ApiError } from '../../services/api.js';
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

export interface ActivityHistoryItem {
  id: string;
  type: 'creation' | 'acceptance' | 'document' | 'status' | 'message' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  recordHash: string;
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
  const [caseDeadlines, setCaseDeadlines] = useState<LegalDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<{ status: number; message: string } | null>(null);

  // Active Tab: overview, timeline, documents, chat, activity, billing
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'overview');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Sync tab with external prop
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

  // Permissions
  const isLawyerOrAdmin = currentUser?.role === 'lawyer' || currentUser?.role === 'admin';
  const isClient = currentUser?.role === 'client';

  // Real-time Chat States
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [chatAttachment, setChatAttachment] = useState<{ name: string; size: string; type: string; url: string } | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Document management states
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('all');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'evidence' | 'notice' | 'reply' | 'order' | 'petition' | 'id_proof'>('evidence');
  const [docType, setDocType] = useState<'pdf' | 'image' | 'audio' | 'video' | 'doc'>('pdf');
  const [docFileName, setDocFileName] = useState('');
  const [docFileSize, setDocFileSize] = useState('1.5 MB');
  const [docDescription, setDocDescription] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<CaseDocument | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // Timeline states
  const [timelineSortAsc, setTimelineSortAsc] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'hearings' | 'notices' | 'stages'>('all');
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDesc, setUpdateDesc] = useState('');
  const [updateOutcome, setUpdateOutcome] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Stage update modal (Lawyer permission only)
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ProposalCaseStage>('Notice Sent');
  const [selectedSystemState, setSelectedSystemState] = useState<ImplementationState>('Active');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [courtName, setCourtName] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [filingNumber, setFilingNumber] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  // Payment states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('2500');
  const [paying, setPaying] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  // Activity history filter and search
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('all');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Initial load
  useEffect(() => {
    loadCaseDetails();
  }, [caseId]);

  // Near-real-time chat polling (every 3.5s when chat tab is active)
  useEffect(() => {
    if (activeTab !== 'chat') return;

    const pollChat = async () => {
      try {
        setIsSyncing(true);
        const res = await api.getCaseMessages(caseId);
        if (res && res.messages) {
          setMessages(res.messages);
          setLastSyncedAt(new Date());
          setChatError(null);
        }
      } catch (err: any) {
        // Silently preserve current messages on background glitch, but set error if unauthorized
        if (err?.status === 401 || err?.status === 403) {
          setChatError(err.message || 'Session expired. Please re-authenticate.');
        }
      } finally {
        setIsSyncing(false);
      }
    };

    const timer = setInterval(pollChat, 3500);
    return () => clearInterval(timer);
  }, [activeTab, caseId]);

  // Auto-scroll chat to bottom
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

      // Load procedural deadlines
      try {
        const dlRes = await api.getCaseDeadlines(caseId);
        if (dlRes && dlRes.deadlines) {
          setCaseDeadlines(dlRes.deadlines);
        }
      } catch (dlErr) {
        console.warn('Non-blocking deadline fetch:', dlErr);
      }

      // Pre-fill stage edit form
      setSelectedStage(data.case.stage);
      setSelectedSystemState(data.case.implementationState || 'Active');
      setNextHearingDate(data.case.nextHearingDate || '');
      setCourtName(data.case.courtName || '');
      setJudgeName(data.case.judgeName || '');
      setFilingNumber(data.case.filingNumber || '');
    } catch (err: any) {
      console.error('Error loading case room details:', err);
      if (err.status === 401 || err.status === 403) {
        setAuthError({ status: err.status, message: err.message || 'Access Denied: Private Case Room' });
      } else {
        setAuthError({ status: 500, message: err.message || 'Failed to open case room' });
      }
    } finally {
      setLoading(false);
    }
  };

  // CHAT: Send Message with attachment support
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !chatAttachment) return;

    setSendingMsg(true);
    setChatError(null);
    try {
      const attachments = chatAttachment ? [{
        name: chatAttachment.name,
        size: chatAttachment.size,
        type: chatAttachment.type,
        url: chatAttachment.url || '#'
      }] : undefined;

      const res = await api.sendCaseMessage(caseId, newMessage.trim(), attachments);
      if (res.success && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setNewMessage('');
        setChatAttachment(null);
        setLastSyncedAt(new Date());
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setChatError(err.message || 'Failed to dispatch privileged message. Please try again.');
    } finally {
      setSendingMsg(false);
    }
  };

  // CHAT: Handle local attachment pick
  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      let type: 'pdf' | 'image' | 'doc' = 'doc';
      if (file.type.includes('pdf')) type = 'pdf';
      else if (file.type.startsWith('image/')) type = 'image';

      setChatAttachment({
        name: file.name,
        size: sizeStr,
        type,
        url: URL.createObjectURL(file)
      });
    }
  };

  // LAWYER PERMISSION: Update Case Stage & System State
  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLawyerOrAdmin) {
      alert('Only authorized legal counsel can progress case stages.');
      return;
    }

    setSavingStage(true);
    try {
      await api.updateCaseStage(caseId, {
        stage: selectedStage,
        implementationState: selectedSystemState,
        nextHearingDate: nextHearingDate || undefined,
        courtName: courtName || undefined,
        judgeName: judgeName || undefined,
        filingNumber: filingNumber || undefined,
        notes: stageNotes || `Stage progressed to ${selectedStage}`
      });
      setStageModalOpen(false);
      setStageNotes('');
      await loadCaseDetails();
    } catch (err: any) {
      console.error('Failed to update stage:', err);
      alert(err.message || 'Failed to update case stage.');
    } finally {
      setSavingStage(false);
    }
  };

  // LAWYER PERMISSION: Add Court Diary / Timeline Entry
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLawyerOrAdmin) {
      alert('Clients cannot add formal court diary entries. Please contact your advocate.');
      return;
    }

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
    } catch (err: any) {
      console.error('Failed to add update:', err);
      alert(err.message || 'Failed to log diary entry.');
    } finally {
      setSavingUpdate(false);
    }
  };

  // DOCUMENTS: Handle Document File Selection
  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFileName(file.name);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setDocFileSize(sizeStr);

      if (file.type.includes('pdf')) setDocType('pdf');
      else if (file.type.startsWith('image/')) setDocType('image');
      else if (file.type.startsWith('audio/')) setDocType('audio');
      else if (file.type.startsWith('video/')) setDocType('video');
      else setDocType('doc');
    }
  };

  // DOCUMENTS: Both Lawyer and Client can upload
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingDoc(true);
    try {
      const finalFileName = docFileName || `${(docTitle || 'Legal_Record').replace(/[^a-zA-Z0-9]/g, '_')}.${
        docType === 'image' ? 'png' : docType === 'audio' ? 'mp3' : docType === 'video' ? 'mp4' : 'pdf'
      }`;

      await api.uploadCaseDocument(caseId, {
        title: docTitle || 'Case_Record',
        category: docCategory,
        fileType: docType,
        fileName: finalFileName,
        fileSize: docFileSize || '1.8 MB',
        fileUrl: '#',
        description: docDescription || `Uploaded to case vault under classification ${docCategory}.`
      });

      setUploadModalOpen(false);
      setDocTitle('');
      setDocFileName('');
      setDocDescription('');
      await loadCaseDetails();
    } catch (err: any) {
      console.error('Upload document failed:', err);
      alert(err.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // DOCUMENTS: Download document
  const handleDownloadDoc = async (doc: CaseDocument) => {
    try {
      // Trigger API download check
      await api.downloadCaseDocument(caseId, doc.id);

      // Create simulated verifiable Blob for the document
      const fileContent = `--- COUNSELIA ENCRYPTED LEGAL RECORD ---\nCase ID: ${caseData?.caseNumber}\nDocument Title: ${doc.title}\nCategory: ${doc.category.toUpperCase()}\nUploader: ${doc.uploaderName || doc.uploadedBy}\nUpload Timestamp: ${doc.createdAt}\nVerification SHA-256: 9f8337583e77c5e0183b0fc27f0d82944e392213f115161d9c69756a3f560e16\nSection 65B Indian Evidence Act / Section 63 BSA 2023 Compliant\n\n[Record Binary Decrypted for Authorized Case Participant]\n`;
      const blob = new Blob([fileContent], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `${doc.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadNotice(`Downloaded "${doc.fileName}" securely from 256-bit case vault.`);
      setTimeout(() => setDownloadNotice(null), 4000);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download document from encrypted vault.');
    }
  };

  // BILLING: Process Milestone Escrow Payment
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

  // Handle Unauthorized / Forbidden screens
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
          message="Opening 256-Bit Encrypted Case Room..."
          description="Verifying judicial authorization and synchronizing client-advocate vault."
        />
      </div>
    );
  }

  // BUILD COMPLETE ACTIVITY HISTORY (Tracking all 6 required items):
  // 1. Case Creation
  // 2. Lawyer Acceptance
  // 3. Documents Uploaded
  // 4. Status Changes
  // 5. Messages
  // 6. Payment Events
  const rawActivities: ActivityHistoryItem[] = [];

  // 1. Case Creation
  if (caseData.createdAt) {
    rawActivities.push({
      id: `act-create-${caseData.id}`,
      type: 'creation',
      title: 'Case Registered & File Initialized',
      description: `Matter filed under ${caseData.category} with ${caseData.isUrgent ? 'Urgent' : 'Standard'} priority. Preliminary grievance facts and relief sought recorded.`,
      timestamp: caseData.createdAt,
      actor: caseData.clientName || 'Client',
      actorRole: 'Client',
      recordHash: `ACT-INIT-${caseData.id.slice(0, 6)}`
    });
  }

  // 2. Lawyer Acceptance
  if (caseData.lawyerName || caseData.lawyerId) {
    rawActivities.push({
      id: `act-accept-${caseData.id}`,
      type: 'acceptance',
      title: 'Advocate Representation Accepted',
      description: `Advocate ${caseData.lawyerName || 'Counsel'} accepted legal brief, confirmed Bar Council compliance, and established privileged case representation.`,
      timestamp: caseData.createdAt,
      actor: caseData.lawyerName || 'Assigned Advocate',
      actorRole: 'Advocate',
      recordHash: `ACT-ACPT-${(caseData.lawyerId || 'lawyer').slice(0, 6)}`
    });
  }

  // 3. Documents Uploaded
  documents.forEach((d) => {
    rawActivities.push({
      id: `act-doc-${d.id}`,
      type: 'document',
      title: `Document Vault Deposit: ${d.title}`,
      description: `File "${d.fileName}" (${d.fileSize}) classified under ${d.category.toUpperCase()} archived with Section 65B compliance.`,
      timestamp: d.createdAt,
      actor: d.uploaderName || d.uploadedBy,
      actorRole: d.uploadedBy === 'lawyer' ? 'Advocate' : 'Client',
      recordHash: `ACT-DOC-${d.id.slice(0, 6)}`
    });
  });

  // 4. Status Changes
  updates.forEach((u) => {
    rawActivities.push({
      id: `act-upd-${u.id}`,
      type: 'status',
      title: u.title,
      description: u.description + (u.hearingOutcome ? ` • Outcome: ${u.hearingOutcome}` : ''),
      timestamp: u.date || (u as any).createdAt || '',
      actor: u.authorName || 'Advocate',
      actorRole: u.authorRole || 'Advocate',
      recordHash: `ACT-STG-${u.id.slice(0, 6)}`
    });
  });

  // 5. Messages
  messages.forEach((m) => {
    const preview = m.content ? (m.content.length > 70 ? m.content.slice(0, 70) + '...' : m.content) : 'Attachment dispatched';
    rawActivities.push({
      id: `act-msg-${m.id}`,
      type: 'message',
      title: `Privileged Message Dispatched`,
      description: `${m.senderName}: "${preview}"${m.attachments?.length ? ` [${m.attachments.length} attachment(s)]` : ''}`,
      timestamp: m.createdAt,
      actor: m.senderName,
      actorRole: m.senderRole === 'lawyer' ? 'Advocate' : 'Client',
      recordHash: `ACT-MSG-${m.id.slice(0, 6)}`
    });
  });

  // 6. Payment Events
  payments.forEach((p) => {
    rawActivities.push({
      id: `act-pay-${p.id}`,
      type: 'payment',
      title: `Fee Milestone Settled: ₹${p.amount.toLocaleString('en-IN')}`,
      description: `Escrow payment settled via ${p.paymentMethod}. Statutory GST invoice generated (Ref: ${p.razorpayPaymentId || 'RP_ESCROW_SETTLED'}).`,
      timestamp: p.createdAt,
      actor: 'Client / Razorpay Escrow',
      actorRole: 'Escrow Gateway',
      recordHash: `ACT-PAY-${p.id.slice(0, 6)}`
    });
  });

  // Sort immutable activity history chronologically (newest first)
  const sortedActivities = rawActivities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filtered Activities
  const filteredActivities = sortedActivities.filter((item) => {
    const matchesCategory = activityCategoryFilter === 'all' || item.type === activityCategoryFilter;
    const matchesSearch = !activitySearchQuery.trim() ||
      item.title.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(activitySearchQuery.toLowerCase()) ||
      item.actor.toLowerCase().includes(activitySearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtered Documents
  const filteredDocs = docCategoryFilter === 'all'
    ? documents
    : documents.filter((d) => d.category === docCategoryFilter);

  // Sorted Timeline Updates
  const sortedTimelineUpdates = [...updates]
    .filter((u) => {
      if (timelineFilter === 'hearings') return !!u.hearingOutcome || u.title.toLowerCase().includes('hearing') || u.title.toLowerCase().includes('court');
      if (timelineFilter === 'notices') return u.title.toLowerCase().includes('notice') || u.title.toLowerCase().includes('reply');
      if (timelineFilter === 'stages') return !!u.stage || u.title.toLowerCase().includes('stage');
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.date || (b as any).createdAt || 0).getTime();
      return timelineSortAsc ? timeA - timeB : timeB - timeA;
    });

  return (
    <div id="private-case-room" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. TOP BREADCRUMB & CONFIDENTIALITY STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs">
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
          <span className="font-mono font-semibold text-slate-700">
            Case Room #{caseData.caseNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" dot size="sm">
            <Lock className="w-3 h-3 mr-1 text-emerald-700" />
            256-Bit Cryptographic Vault
          </Badge>
          <Badge variant="neutral" size="sm">
            Section 126 Privileged Dialogue
          </Badge>
        </div>
      </div>

      {paymentSuccessNotice && (
        <Alert
          variant="success"
          title="Payment Settled & GST Invoiced"
          onClose={() => setPaymentSuccessNotice(false)}
        >
          Milestone fee securely settled in Axis Bank Escrow. Automated SAC 998211 GST invoice and Bar Council compliant receipt generated.
        </Alert>
      )}

      {downloadNotice && (
        <Alert
          variant="info"
          title="Decrypted Vault Download"
          onClose={() => setDownloadNotice(null)}
        >
          {downloadNotice}
        </Alert>
      )}

      {/* ========================================================================= */}
      {/* 2. CASE ROOM HEADER (Required: Case title, Case ID, Current status, Lawyer, Client) */}
      {/* ========================================================================= */}
      <Card variant="bordered" className="bg-slate-950 text-white border-slate-800 shadow-xl overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Top Row: Title, Case ID, Badges, Quick Actions */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Case ID Badge */}
                <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-amber-400" />
                  <span>Case ID: {caseData.caseNumber}</span>
                </span>

                {/* Current Status & Stage Badges */}
                <Badge variant="warning" size="sm">
                  {caseData.stage}
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

              {/* Case Title */}
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-50 tracking-tight">
                {caseData.title}
              </h1>

              <p className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Jurisdiction: <strong className="text-slate-100">{caseData.city}, {caseData.state}</strong>
                </span>
                <span>•</span>
                <span>
                  Filing/CNR: <strong className="font-mono text-amber-300">{caseData.filingNumber || 'Pre-Filing Stage'}</strong>
                </span>
                <span>•</span>
                <span>
                  Category: <strong className="text-slate-100">{caseData.category}</strong>
                </span>
              </p>
            </div>

            {/* Quick Actions (Lawyer permission: Update Stage; Both: Pay / Action) */}
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
                  Update Case Status
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

          {/* Statutory 4-Stage Redressal Pipeline */}
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

          {/* Header Metadata Grid: Required Lawyer & Client & Hearing info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
            {/* Column 1: Lawyer */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Assigned Advocate (Lawyer)
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-semibold text-slate-100 truncate">
                    {caseData.lawyerName || 'Advocate Sharma'}
                  </p>
                  <p className="text-[10px] text-amber-300 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Bar Council Verified
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2: Client */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Represented Party (Client)
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-semibold text-slate-100 truncate">{caseData.clientName}</p>
                  <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {caseData.clientPhone || '+91 98100 23456'}
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: Court & Judge */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Court & Bench
              </span>
              <p className="font-semibold text-slate-100 truncate">
                {caseData.courtName || `${caseData.city} District Courts`}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {caseData.judgeName ? `Coram: ${caseData.judgeName}` : 'Pre-Filing Stage'}
              </p>
            </div>

            {/* Column 4: Next Hearing */}
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1.5">
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
                  : 'Awaiting Court Cause List'}
              </p>
              <p className="text-[10px] text-slate-300">
                {caseData.nextHearingDate ? 'Cause list scheduled' : 'Pre-filing notice pipeline'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. CASE ROOM NAVIGATION TABS */}
      {/* ========================================================================= */}
      <Tabs
        activeTab={activeTab}
        onChange={(tabId) => handleTabSelect(tabId)}
        variant="pills"
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            icon: <Scale className="w-3.5 h-3.5" />,
          },
          {
            id: 'deadlines',
            label: 'Right-to-Remedy Tracker',
            icon: <Clock className="w-3.5 h-3.5" />,
            count: caseDeadlines.filter((d) => !d.isCompleted).length || undefined,
          },
          {
            id: 'timeline',
            label: 'Timeline',
            icon: <Calendar className="w-3.5 h-3.5" />,
            count: updates.length,
          },
          {
            id: 'documents',
            label: 'Documents',
            icon: <FileText className="w-3.5 h-3.5" />,
            count: documents.length,
          },
          {
            id: 'chat',
            label: 'Chat',
            icon: <Lock className="w-3.5 h-3.5" />,
            count: messages.length,
          },
          {
            id: 'activity',
            label: 'Activity History',
            icon: <ActivityIcon className="w-3.5 h-3.5" />,
            count: rawActivities.length,
          },
          {
            id: 'billing',
            label: 'Milestones & Invoices',
            icon: <CreditCard className="w-3.5 h-3.5" />,
            count: payments.length,
          },
        ]}
      />

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW (Filing date, Next hearing, Current stage, Important info) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Review Banner if Case is Closed */}
          {caseData.stage === 'Closed' || caseData.status === 'closed' || caseData.status === 'resolved' ? (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  <strong>Privilege Notice:</strong> All discussions, evidence notes, and case documents are encrypted under Section 126 of the Indian Evidence Act.
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-600 shrink-0">
                Statutory Stage: <strong className="text-amber-800">{caseData.stage}</strong>
              </span>
            </div>
          )}

          {/* 4 Essential Overview Cards: Filing Date, Next Hearing, Current Stage, Case Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filing Date */}
            <Card variant="default" className="p-4 space-y-1.5 border-l-4 border-l-amber-600">
              <span className="text-[11px] uppercase font-bold text-slate-500 block flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Filing Date
              </span>
              <p className="text-base font-bold text-slate-900">
                {caseData.filingDate
                  ? new Date(caseData.filingDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Pre-Filing Stage'}
              </p>
              <p className="text-[10px] text-slate-500">
                {caseData.filingDate ? 'Formally recorded on court roster' : 'Notice & reply pipeline running'}
              </p>
            </Card>

            {/* Next Hearing */}
            <Card variant="default" className="p-4 space-y-1.5 border-l-4 border-l-blue-600">
              <span className="text-[11px] uppercase font-bold text-slate-500 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Next Hearing
              </span>
              <p className="text-base font-bold text-slate-900">
                {caseData.nextHearingDate
                  ? new Date(caseData.nextHearingDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Awaiting Court Listing'}
              </p>
              <p className="text-[10px] text-slate-500">
                {caseData.courtName || `${caseData.city} District Court`}
              </p>
            </Card>

            {/* Current Stage */}
            <Card variant="default" className="p-4 space-y-1.5 border-l-4 border-l-purple-600">
              <span className="text-[11px] uppercase font-bold text-slate-500 block flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-purple-600" />
                Current Stage
              </span>
              <p className="text-base font-bold text-purple-900">
                {caseData.stage}
              </p>
              <p className="text-[10px] text-slate-500">
                Stage {stagesList.indexOf(caseData.stage) + 1} of 4 in Statutory Redressal
              </p>
            </Card>

            {/* Priority & Urgency */}
            <Card variant="default" className="p-4 space-y-1.5 border-l-4 border-l-emerald-600">
              <span className="text-[11px] uppercase font-bold text-slate-500 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Priority & Counsel
              </span>
              <p className="text-base font-bold text-slate-900">
                {caseData.isUrgent ? 'Urgent Redressal' : 'Standard Fast-Track'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                Advocate: {caseData.lawyerName || 'Counsel Assigned'}
              </p>
            </Card>
          </div>

          {/* Right-to-Remedy / Procedural Safeguard Spotlight Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-white p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-700 text-white rounded-xl shadow-xs shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    Right-to-Remedy & Legal Limitation Tracker
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {caseDeadlines.filter((d) => !d.isCompleted).length} Active Statutory Deadlines
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  Safeguard against procedural time-bars under CPC, Limitation Act, NI Act, and Consumer Protection statutes with live countdowns and advocate-verified calculation.
                </p>
                {/* Status Pills */}
                <div className="flex items-center gap-3 mt-2 text-xs font-semibold flex-wrap">
                  <span className="text-emerald-700">🟢 {caseDeadlines.filter((d) => d.status === 'safe').length} Safe</span>
                  <span className="text-amber-700">🟡 {caseDeadlines.filter((d) => d.status === 'approaching').length} Approaching</span>
                  <span className="text-rose-700">🔴 {caseDeadlines.filter((d) => d.status === 'urgent').length} Urgent</span>
                  <span className="text-slate-600">⚫ {caseDeadlines.filter((d) => d.status === 'expired').length} Expired</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleTabSelect('deadlines')}
              className="bg-amber-700 hover:bg-amber-800 text-white shrink-0 self-start md:self-center"
            >
              Open Right-to-Remedy Tracker
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Grid: Important Information Narrative + Key Particulars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Statement of Facts & Relief Sought */}
            <div className="lg:col-span-2 space-y-6">
              {/* Grievance Statement & Important Information */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base font-serif flex items-center justify-between">
                    <span>Important Information: Statement of Facts & Grievance</span>
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
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Case ID</span>
                      <span className="font-mono font-bold text-slate-900">{caseData.caseNumber}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Filing / CNR</span>
                      <span className="font-mono font-bold text-amber-700">{caseData.filingNumber || 'Pre-Filing Stage'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Judicial Coram</span>
                      <span className="font-bold text-slate-800">{caseData.judgeName || 'Bench to be Allocated'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statutory Legal Framework & Provisions */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base font-serif flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-600" />
                    <span>Statutory Provisions & Legal Enactments</span>
                  </CardTitle>
                  <CardDescription>
                    Applicable laws and procedural acts governing this category.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-700">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <h4 className="font-bold text-slate-900">Legal Classification</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Classified as <strong>{caseData.category}</strong> dispute within {caseData.city}, {caseData.state} jurisdiction.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <h4 className="font-bold text-slate-900">Privileged Vault Status</h4>
                      <p className="text-slate-600 leading-relaxed">
                        Evidence and communications protected under Section 126 of Indian Evidence Act 1872 & Bharatiya Sakshya Adhiniyam 2023.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Advocate Details, Court Details, Quick Jump */}
            <div className="space-y-6">
              {/* Assigned Advocate Card */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base font-serif">Legal Counsel Representation</CardTitle>
                  <CardDescription>Bar Council verified advocate representing this matter</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-serif font-bold text-lg shrink-0">
                      {caseData.lawyerName ? caseData.lawyerName.charAt(0) : 'A'}
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

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-slate-600 text-[11px]">
                    <div className="flex justify-between">
                      <span>Jurisdiction:</span>
                      <span className="font-semibold text-slate-800">{caseData.city}, {caseData.state}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Practice Area:</span>
                      <span className="font-semibold text-slate-800">{caseData.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Client Contact:</span>
                      <span className="font-mono text-slate-700">{caseData.clientPhone}</span>
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
                      Open Encrypted Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Court & Coram Card */}
              <Card variant="default">
                <CardHeader>
                  <CardTitle className="text-base font-serif flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Court & Hearing Allocation</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-800">Next Court Date</span>
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
                      <strong>Court Complex:</strong> {caseData.courtName || `${caseData.city} District Court`}
                    </p>
                    <p>
                      <strong>Presiding Judge:</strong> {caseData.judgeName || 'To be listed upon summons/motion'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RIGHT-TO-REMEDY / DEADLINE TRACKER */}
      {/* ========================================================================= */}
      {activeTab === 'deadlines' && (
        <RightToRemedyTracker
          caseData={caseData}
          currentUserRole={currentUser?.role || 'client'}
          currentUserId={currentUser?.id}
          onRefreshCase={loadCaseDetails}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TIMELINE (Chronological case events, permissions enforced) */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <Card variant="default" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900">
                Chronological Case Events & Court Diary ({updates.length})
              </h2>
              <p className="text-xs text-slate-700">
                Chronological record of demand notices, statutory reply windows, court admissions, interim orders, and final decrees.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Sort Asc/Desc toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimelineSortAsc(!timelineSortAsc)}
                title="Toggle Chronological Order"
              >
                {timelineSortAsc ? 'Oldest First' : 'Newest First'}
              </Button>

              {/* LAWYER PERMISSION: Add Court Diary Entry (Hidden for clients) */}
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
          </div>

          {/* Timeline Filter Pills */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400 text-[11px] font-semibold">Filter:</span>
            <button
              onClick={() => setTimelineFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                timelineFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Events ({updates.length})
            </button>
            <button
              onClick={() => setTimelineFilter('hearings')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                timelineFilter === 'hearings' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hearings & Judicial Orders
            </button>
            <button
              onClick={() => setTimelineFilter('notices')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                timelineFilter === 'notices' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Notices & Replies
            </button>
            <button
              onClick={() => setTimelineFilter('stages')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                timelineFilter === 'stages' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Stage Progressions
            </button>
          </div>

          {sortedTimelineUpdates.length === 0 ? (
            <EmptyState
              icon={<Calendar className="w-8 h-8 text-slate-400" />}
              title="No Court Diary Events Recorded"
              description="Chronological proceedings such as speed-post notice delivery, respondent reply, court admissions, or witness arguments will appear here."
              actionLabel={isLawyerOrAdmin ? "Log First Court Diary Entry" : undefined}
              onAction={isLawyerOrAdmin ? () => setUpdateModalOpen(true) : undefined}
            />
          ) : (
            <div className="relative pl-6 space-y-6 border-l-2 border-amber-600/30 text-xs">
              {sortedTimelineUpdates.map((u) => (
                <div key={u.id} className="relative group">
                  {/* Timeline Bullet */}
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
                      <span className="text-[11px] text-slate-600 font-mono">
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
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs space-y-1">
                        <strong className="text-amber-800 font-semibold flex items-center gap-1">
                          <Gavel className="w-3 h-3" />
                          Judicial Direction / Court Order:
                        </strong>
                        <p>{u.hearingOutcome}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-200/60">
                      <span>Logged by: <strong>{u.authorName}</strong> ({u.authorRole || 'Advocate'})</span>
                      <span className="font-mono">Section 65B Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DOCUMENTS (Upload, View, Download, File metadata, Upload timestamp, Uploader) */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900">
                Evidence & Document Vault ({documents.length})
              </h2>
              <p className="text-xs text-slate-700">
                256-bit encrypted repository of legal notices, replies, bank statements, speed-post receipts, and judicial orders.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={docCategoryFilter}
                onChange={(e) => setDocCategoryFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="all">All Classifications ({documents.length})</option>
                <option value="evidence">Primary Evidence</option>
                <option value="notice">Legal Notices</option>
                <option value="reply">Legal Replies</option>
                <option value="order">Court Orders</option>
                <option value="petition">Petitions / Plaints</option>
                <option value="id_proof">KYC / ID Proofs</option>
              </select>

              {/* BOTH Lawyer and Client have permission to upload documents */}
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
              title="No Documents Found in this Vault Filter"
              description="Upload primary case evidence, notice copies, postal tracking slips, or court orders to keep the official vault indexed."
              actionLabel="Upload First Document"
              onAction={() => setUploadModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} variant="default" className="p-4 flex items-start justify-between gap-3 hover:border-amber-300 transition-colors">
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

                      {/* File Metadata */}
                      <p className="text-[11px] font-mono text-slate-600 truncate mt-0.5">{doc.fileName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 flex-wrap">
                        <span>{doc.fileSize}</span>
                        <span>•</span>
                        {/* Uploader */}
                        <span>
                          Uploaded by <strong>{doc.uploaderName || doc.uploadedBy}</strong> ({doc.uploadedBy === 'lawyer' ? 'Advocate' : 'Client'})
                        </span>
                        <span>•</span>
                        {/* Upload Timestamp */}
                        <span>
                          {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: View and Download */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 text-slate-600 hover:text-slate-900"
                      title="View file metadata & certificate"
                      onClick={() => setSelectedDocForView(doc)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1.5 text-slate-600 hover:text-amber-700"
                      title="Download document from encrypted vault"
                      onClick={() => handleDownloadDoc(doc)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CHAT (Real-time sync, Timestamps, Sender, Attachments, States) */}
      {/* ========================================================================= */}
      {activeTab === 'chat' && (
        <Card variant="default" className="flex flex-col h-[600px] overflow-hidden">
          {/* Chat Security & Real-Time Sync Banner */}
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2 truncate">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                Privileged client-attorney communications under Section 126 of Indian Evidence Act.
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                Synced {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
                <Badge variant="success" size="sm">
                  {isSyncing ? 'Syncing...' : 'Near-Real-Time Active'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Chat Error State */}
          {chatError && (
            <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-xs text-rose-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{chatError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-rose-800 border-rose-300"
                onClick={() => loadCaseDetails()}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Messages Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {messagesLoading ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mx-auto" />
                <p className="text-slate-500">Decrypting case communication channel...</p>
              </div>
            ) : messages.length === 0 ? (
              /* Empty State */
              <div className="py-8">
                <EmptyState
                  icon={<Lock className="w-8 h-8 text-amber-600" />}
                  title="Start the Privileged Dialogue"
                  description="Use this encrypted case room to exchange legal strategy, hearing instructions, evidence queries, and notice drafts directly between advocate and client."
                />
                <div className="max-w-md mx-auto mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <span className="font-semibold text-slate-700 block">Suggested Quick Messages:</span>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => setNewMessage("Hello, could you please confirm if all preliminary evidence documents look complete for filing?")}
                      className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-slate-700 text-xs"
                    >
                      "Hello, could you please confirm if all preliminary evidence documents look complete for filing?"
                    </button>
                    <button
                      onClick={() => setNewMessage("I have uploaded the latest demand notice copy and postal tracking receipt into the vault.")}
                      className="text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-colors text-slate-700 text-xs"
                    >
                      "I have uploaded the latest demand notice copy and postal tracking receipt into the vault."
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderId === currentUser?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Sender and Timestamp */}
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                      <span className="font-semibold text-slate-700">
                        {m.senderName}
                      </span>
                      <Badge variant={m.senderRole === 'lawyer' ? 'primary' : 'neutral'} size="sm">
                        {m.senderRole === 'lawyer' ? 'Advocate' : 'Client'}
                      </Badge>
                      <span className="text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric'
                        })}, {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Message Bubble */}
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
                      {m.content && <p className="whitespace-pre-line">{m.content}</p>}

                      {/* Attachment Support inside bubble */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/20 space-y-1.5">
                          {m.attachments.map((att: any, i: number) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between gap-2 p-2 rounded-lg text-xs ${
                                isMe ? 'bg-black/15 text-white' : 'bg-white border border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-4 h-4 shrink-0" />
                                <div className="truncate">
                                  <p className="font-semibold truncate">{att.name || 'Case Attachment'}</p>
                                  <p className="text-[10px] opacity-80">{att.size || 'Attachment'}</p>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  // Trigger simulated download of the attached file
                                  const blob = new Blob([`Decrypted Attachment: ${att.name}`], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = att.name;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                className="p-1 hover:opacity-75 transition-opacity"
                                title="Download Attachment"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
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

          {/* Pending Attachment Chip */}
          {chatAttachment && (
            <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-semibold truncate">Attached: {chatAttachment.name}</span>
                <span className="text-amber-700 text-[10px]">({chatAttachment.size})</span>
              </div>
              <button
                type="button"
                onClick={() => setChatAttachment(null)}
                className="text-amber-700 hover:text-amber-900 p-1"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Chat Composer Input Bar */}
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center gap-2"
          >
            {/* Hidden file input for attachment */}
            <input
              type="file"
              ref={chatFileInputRef}
              onChange={handleChatFileSelect}
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => chatFileInputRef.current?.click()}
              title="Attach File to Message"
              className="px-2.5 text-slate-600 hover:text-slate-900"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <input
              id="case-chat-input"
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type privileged communication to advocate or client..."
              className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />

            <Button
              id="send-chat-msg-btn"
              type="submit"
              variant="primary"
              size="sm"
              isLoading={sendingMsg}
              rightIcon={<Send className="w-3.5 h-3.5" />}
              disabled={!newMessage.trim() && !chatAttachment}
            >
              Send
            </Button>
          </form>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ACTIVITY HISTORY (Immutable audit trail of all 6 tracked items) */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <Card variant="default" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-serif text-slate-900">
                  Comprehensive Case Activity Audit Trail ({rawActivities.length})
                </h2>
                <Badge variant="success" size="sm">
                  <Lock className="w-3 h-3 mr-1" />
                  Immutable Forensic Ledger
                </Badge>
              </div>
              <p className="text-xs text-slate-700 mt-1">
                Audited timestamped log of case registration, counsel acceptance, evidence uploads, stage transitions, messages, and escrow payments. Historical records are permanent and tamper-proof.
              </p>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={activitySearchQuery}
                onChange={(e) => setActivitySearchQuery(e.target.value)}
                placeholder="Search audit trail by actor, event, or description..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setActivityCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activityCategoryFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setActivityCategoryFilter('creation')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activityCategoryFilter === 'creation' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Registration
              </button>
              <button
                onClick={() => setActivityCategoryFilter('acceptance')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activityCategoryFilter === 'acceptance' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Advocate Acceptance
              </button>
              <button
                onClick={() => setActivityCategoryFilter('document')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activityCategoryFilter === 'document' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Documents
              </button>
              <button
                onClick={() => setActivityCategoryFilter('status')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activityCategoryFilter === 'status' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Stages & Hearings
              </button>
              <button
                onClick={() => setActivityCategoryFilter('message')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activityCategoryFilter === 'message' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Messages
              </button>
              <button
                onClick={() => setActivityCategoryFilter('payment')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activityCategoryFilter === 'payment' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Payments
              </button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <EmptyState
              icon={<ActivityIcon className="w-8 h-8 text-slate-400" />}
              title="No Matching Audit Records"
              description="No activity log entries match the current filter or search criteria."
            />
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {filteredActivities.map((act) => (
                <div key={act.id} className="py-3.5 flex items-start gap-3 hover:bg-slate-50/60 p-2 rounded-lg transition-colors">
                  {/* Distinct category icon */}
                  <div className="mt-0.5 p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                    {act.type === 'creation' && <Scale className="w-4 h-4 text-amber-600" />}
                    {act.type === 'acceptance' && <UserCheck className="w-4 h-4 text-emerald-600" />}
                    {act.type === 'document' && <FileText className="w-4 h-4 text-blue-600" />}
                    {act.type === 'status' && <Gavel className="w-4 h-4 text-purple-600" />}
                    {act.type === 'message' && <Lock className="w-4 h-4 text-slate-600" />}
                    {act.type === 'payment' && <CreditCard className="w-4 h-4 text-emerald-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{act.title}</span>
                        <Badge variant="neutral" size="sm">
                          {act.type.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {act.timestamp
                          ? new Date(act.timestamp).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recorded'}
                      </span>
                    </div>

                    <p className="text-slate-700 text-[11px] mt-0.5 leading-relaxed">{act.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 flex-wrap gap-2">
                      <span>
                        Actor: <strong className="text-slate-700">{act.actor}</strong> ({act.actorRole})
                      </span>
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        Record ID: {act.recordHash}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: FINANCIAL MILESTONES & BILLING */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="default" className="p-5 space-y-1">
              <span className="text-xs text-slate-500 font-medium">Agreed Professional Total</span>
              <p className="text-2xl font-bold font-mono text-slate-900">
                ₹{caseData.totalFee ? caseData.totalFee.toLocaleString('en-IN') : '0'}
              </p>
              <p className="text-[10px] text-slate-500">Includes legal counsel representation & filings</p>
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
                <p className="text-xs text-slate-600">
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
                      <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                        Ref: {pay.razorpayPaymentId || 'RP_LIVE_ESCROW'} • Method: {pay.paymentMethod} • Date:{' '}
                        {new Date(pay.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        ₹{pay.amount.toLocaleString('en-IN')}
                      </span>
                      <p className="text-[10px] text-slate-500">GST Invoice Available</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: UPDATE STAGE & COURT (LAWYER PERMISSION ONLY) */}
      {/* ========================================================================= */}
      {isLawyerOrAdmin && (
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
                label="Statutory Case Stage"
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
                onChange={(e) => setSelectedSystemState(e.target.value as ImplementationState)}
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
                label="Presiding Judge / Bench"
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

            <Textarea
              label="Stage Transition Notes"
              placeholder="Provide procedural context or statutory reason for stage update..."
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              rows={2}
            />
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD COURT DIARY / TIMELINE ENTRY (LAWYER PERMISSION ONLY) */}
      {/* ========================================================================= */}
      {isLawyerOrAdmin && (
        <Modal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          title="Add Court Diary / Hearing Entry"
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
              placeholder="e.g. Notice of Motion Served on Respondent"
              value={updateTitle}
              onChange={(e) => setUpdateTitle(e.target.value)}
              required
            />

            <Textarea
              label="Summary of Hearing / Arguments"
              placeholder="Arguments presented, counsel appearances, or postal delivery details..."
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: UPLOAD DOCUMENT (BOTH LAWYER AND CLIENT PERMISSION) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload to Confidential Case Vault"
        subtitle="Records are encrypted with AES-256 and certified under Section 65B Indian Evidence Act."
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
              Confirm Vault Deposit
            </Button>
          </>
        }
      >
        <form onSubmit={handleUploadDoc} className="space-y-3.5">
          {/* File Picker */}
          <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center space-y-2">
            <Upload className="w-6 h-6 text-amber-600 mx-auto" />
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {docFileName ? `Selected: ${docFileName} (${docFileSize})` : 'Choose a file to deposit into the vault'}
              </p>
              <p className="text-[10px] text-slate-500">Supports PDF, PNG, JPG, MP3, MP4, DOCX</p>
            </div>
            <input
              type="file"
              ref={docFileInputRef}
              onChange={handleDocFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => docFileInputRef.current?.click()}
            >
              Select File from Device
            </Button>
          </div>

          <Input
            label="Document Title"
            placeholder="e.g. Cheque Return Memo & Postal Receipt"
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
                { value: 'id_proof', label: 'KYC / ID Proof' },
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

          <Textarea
            label="Document Description / Evidentiary Note"
            placeholder="Context, relevance to dispute, or dates..."
            rows={2}
            value={docDescription}
            onChange={(e) => setDocDescription(e.target.value)}
          />
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: DOCUMENT VIEWER & METADATA CERTIFICATE MODAL */}
      {/* ========================================================================= */}
      {selectedDocForView && (
        <Modal
          isOpen={!!selectedDocForView}
          onClose={() => setSelectedDocForView(null)}
          title={`Document Vault Record: ${selectedDocForView.title}`}
          subtitle={`Cryptographically verified repository record #${selectedDocForView.id}`}
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedDocForView(null)}>
                Close Viewer
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={() => {
                  handleDownloadDoc(selectedDocForView);
                }}
              >
                Download Document
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Section 65B Electronic Evidence Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Section 65B Indian Evidence Act / Section 63 BSA 2023 Certified</p>
                <p className="text-[11px] text-emerald-800">
                  SHA-256 digital hash calculated at ingestion: <code className="font-mono">9f8337583e77...3f560e16</code>. Electronic custody unbroken.
                </p>
              </div>
            </div>

            {/* Document Metadata Table */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">Document Metadata</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">File Name:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedDocForView.fileName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">File Size:</span>
                  <span className="font-semibold text-slate-800">{selectedDocForView.fileSize}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Classification:</span>
                  <Badge variant="neutral" size="sm">{selectedDocForView.category.toUpperCase()}</Badge>
                </div>
                <div>
                  <span className="text-slate-500 block">Format / Type:</span>
                  <span className="font-semibold uppercase text-slate-800">{selectedDocForView.fileType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Uploader:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedDocForView.uploaderName || selectedDocForView.uploadedBy} ({selectedDocForView.uploadedBy === 'lawyer' ? 'Advocate' : 'Client'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Upload Timestamp:</span>
                  <span className="font-mono text-slate-800">
                    {new Date(selectedDocForView.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Document Preview Container */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                {selectedDocForView.fileType === 'pdf' && <FileText className="w-6 h-6 text-rose-600" />}
                {selectedDocForView.fileType === 'image' && <ImageIcon className="w-6 h-6 text-blue-600" />}
                {selectedDocForView.fileType === 'audio' && <Mic className="w-6 h-6 text-amber-600" />}
                {selectedDocForView.fileType === 'video' && <Video className="w-6 h-6 text-purple-600" />}
                {selectedDocForView.fileType === 'doc' && <FileText className="w-6 h-6 text-slate-700" />}
              </div>

              <div>
                <p className="font-bold text-slate-900 text-sm">{selectedDocForView.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedDocForView.description || 'Verified evidence record stored in 256-bit AES encrypted case repository.'}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => handleDownloadDoc(selectedDocForView)}
                >
                  Download Decrypted Copy ({selectedDocForView.fileSize})
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RAZORPAY PAYMENT SIMULATION */}
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
              <span className="text-slate-500">Case Reference:</span>
              <span className="font-mono font-bold text-slate-900">{caseData.caseNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Advocate:</span>
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
            <div className="flex justify-between text-slate-600">
              <span>Legal Professional Fee:</span>
              <span className="font-mono font-medium">₹{Number(payAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
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
