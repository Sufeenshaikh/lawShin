import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  Scale,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  AlertCircle,
  Search,
  Filter,
  User,
  Gavel,
  MessageSquare,
  AlertTriangle,
  Send,
  Eye,
  Paperclip,
  CheckSquare,
  Users
} from 'lucide-react';
import { LegalCase, LawyerProfile, CaseMessage } from '../../types.js';
import { api } from '../../services/api.js';
import {
  Card,
  Button,
  Badge,
  Alert,
  EmptyState,
  Input
} from '../ui/index.js';

interface LawyerDashboardProps {
  lawyer: LawyerProfile;
  cases: LegalCase[];
  onOpenCaseRoom: (caseId: string, tab?: string) => void;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  onRefreshCases: () => void;
}

export const LawyerDashboard: React.FC<LawyerDashboardProps> = ({
  lawyer,
  cases,
  onOpenCaseRoom,
  onNavigate,
  onRefreshCases,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<(CaseMessage & { caseTitle?: string; clientName?: string })[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Incoming cases waiting for advocate decision (New case requests)
  const incomingCases = cases.filter(
    (c) => c.implementationState === 'Submitted' || c.implementationState === 'Lawyer Reviewing'
  );

  // Active cases handled by this advocate
  const activeCases = cases.filter(
    (c) => c.implementationState === 'Active' || c.implementationState === 'Lawyer Accepted' || c.lawyerId === lawyer.id
  );

  // Upcoming hearings sorted by date
  const upcomingHearings = activeCases
    .filter((c) => c.nextHearingDate)
    .sort((a, b) => new Date(a.nextHearingDate!).getTime() - new Date(b.nextHearingDate!).getTime());

  // Load recent messages across active cases
  useEffect(() => {
    loadRecentMessages();
  }, [cases]);

  const loadRecentMessages = async () => {
    setLoadingMessages(true);
    try {
      // Pick active cases and fetch messages
      const msgs: (CaseMessage & { caseTitle?: string; clientName?: string })[] = [];
      for (const c of activeCases.slice(0, 4)) {
        try {
          const res = await api.getCaseMessages(c.id);
          if (res.messages && res.messages.length > 0) {
            const lastMsg = res.messages[res.messages.length - 1];
            msgs.push({
              ...lastMsg,
              caseTitle: c.title,
              clientName: c.clientName
            });
          }
        } catch (e) {
          // ignore error for individual cases
        }
      }
      setRecentMessages(msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Failed to load recent messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleAction = async (caseId: string, action: 'accept' | 'reject') => {
    setActionLoading(caseId);
    try {
      await api.takeCaseAction(caseId, action);
      onRefreshCases();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  // Build Pending Actions list
  const pendingActions: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'info';
    actionLabel: string;
    onAction: () => void;
  }> = [];

  // 1. Pending case inquiries
  if (incomingCases.length > 0) {
    pendingActions.push({
      id: 'pending-requests',
      title: `${incomingCases.length} New Case Inquiry Decision${incomingCases.length === 1 ? '' : 's'} Pending`,
      description: 'Clients are awaiting your representation decision and Vakalatnama authorization.',
      priority: 'high',
      actionLabel: 'Review Requests',
      onAction: () => onNavigate('lawyer-requests')
    });
  }

  // 2. Upcoming hearings in the next 14 days
  const now = new Date().getTime();
  const nearHearings = upcomingHearings.filter((c) => {
    const diffDays = (new Date(c.nextHearingDate!).getTime() - now) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 14;
  });
  if (nearHearings.length > 0) {
    pendingActions.push({
      id: 'upcoming-hearing-prep',
      title: `${nearHearings.length} Court Hearing${nearHearings.length === 1 ? '' : 's'} Listed Within 14 Days`,
      description: `Hearing preparation, witness affidavits, and written statements due before the Hon'ble Court.`,
      priority: 'medium',
      actionLabel: 'View Cause List',
      onAction: () => onNavigate('lawyer-cases')
    });
  }

  // 3. Verification status check
  if (!lawyer.isVerified || lawyer.verificationStatus !== 'verified') {
    pendingActions.push({
      id: 'verify-credentials',
      title: 'Bar Council Verification Incomplete',
      description: 'Only verified advocates appear in the public directory. Submit or verify your Bar Council Sanad.',
      priority: 'high',
      actionLabel: 'Complete Verification',
      onAction: () => onNavigate('lawyer-verification')
    });
  }

  return (
    <div id="lawyer-dashboard-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* 1. ADVOCATE CONSOLE HEADER */}
      <Card variant="bordered" className="bg-slate-950 text-white border-slate-800 shadow-xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={lawyer.avatarUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=200'}
                alt={lawyer.fullName}
                className="w-16 h-16 rounded-xl object-cover border-2 border-amber-500 shadow-md"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-950 flex items-center justify-center text-white ${
                  lawyer.isVerified ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={lawyer.isVerified ? 'Verified Practicing Advocate' : 'Verification Pending'}
              >
                {lawyer.isVerified ? <CheckCircle2 className="w-3 h-3 stroke-[3]" /> : <Clock className="w-3 h-3" />}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                Counselia Advocate Dashboard
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-100 tracking-tight">
                  Adv. {lawyer.fullName}
                </h1>
                <Badge variant={lawyer.isVerified ? 'success' : 'warning'} size="sm">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {lawyer.isVerified ? 'Bar Council Verified' : 'Verification Pending'}
                </Badge>
              </div>

              <p className="text-xs font-mono text-amber-300">
                Enrolment No: <strong>{lawyer.barCouncilNumber}</strong> ({lawyer.stateBarCouncil})
              </p>

              <p className="text-xs text-slate-400">
                {lawyer.experienceYears} Years Standing • {lawyer.courts?.slice(0, 3).join(', ')}
              </p>
            </div>
          </div>

          {/* Quick Launchers */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              id="lawyer-requests-header-cta"
              variant="outline"
              size="sm"
              className="bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
              leftIcon={<FileText className="w-3.5 h-3.5 text-amber-400" />}
              onClick={() => onNavigate('lawyer-requests')}
            >
              Case Requests ({incomingCases.length})
            </Button>
            <Button
              id="lawyer-research-cta"
              variant="outline"
              size="sm"
              className="bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
              leftIcon={<Scale className="w-3.5 h-3.5 text-amber-400" />}
              onClick={() => onNavigate('lawyer-legal-research')}
            >
              Counselia Legal Research
            </Button>
            <Button
              id="lawyer-ai-drafting-cta"
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('lawyer-drafting')}
            >
              Counselia AI Drafting
            </Button>
            <Button
              id="lawyer-drafts-cta"
              variant="outline"
              size="sm"
              className="bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
              leftIcon={<FileText className="w-3.5 h-3.5 text-slate-300" />}
              onClick={() => onNavigate('lawyer-drafts')}
            >
              Counselia Drafts
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. STATS LEDGER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => onNavigate('lawyer-requests')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
        >
          <span className="text-xs text-slate-500 font-medium">New Requests</span>
          <p className="text-2xl font-bold font-serif text-amber-700 mt-1">{incomingCases.length}</p>
          <span className="text-[10px] text-amber-600">Pending acceptance decisions</span>
        </div>

        <div
          onClick={() => onNavigate('lawyer-cases')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
        >
          <span className="text-xs text-slate-500 font-medium">Active Caseload</span>
          <p className="text-2xl font-bold font-serif text-slate-900 mt-1">{activeCases.length}</p>
          <span className="text-[10px] text-slate-500">Live advocate briefs</span>
        </div>

        <div
          onClick={() => onNavigate('lawyer-cases')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
        >
          <span className="text-xs text-slate-500 font-medium">Upcoming Hearings</span>
          <p className="text-2xl font-bold font-serif text-sky-700 mt-1">{upcomingHearings.length}</p>
          <span className="text-[10px] text-sky-600">Listed on court cause lists</span>
        </div>

        <div
          onClick={() => onNavigate('lawyer-clients')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
        >
          <span className="text-xs text-slate-500 font-medium">Represented Clients</span>
          <p className="text-2xl font-bold font-serif text-emerald-700 mt-1">
            {new Set(activeCases.map((c) => c.clientId)).size}
          </p>
          <span className="text-[10px] text-emerald-600">Active client directory</span>
        </div>
      </div>

      {/* 3. PENDING ACTIONS SECTION */}
      {pendingActions.length > 0 && (
        <Card variant="default" className="p-5 border-amber-200 bg-amber-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-serif text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Pending Actions Requiring Advocate Attention ({pendingActions.length})
            </h2>
            <Badge variant="warning" size="sm">Action Required</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingActions.map((action) => (
              <div
                key={action.id}
                className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-sm flex flex-col justify-between gap-2.5"
              >
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{action.title}</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{action.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={action.onAction}
                  rightIcon={<ArrowRight className="w-3 h-3" />}
                  className="w-full text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border-amber-200"
                >
                  {action.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. ADVOCATE PRACTICE SUITE: LEGAL RESEARCH & AI DRAFTING */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-700" />
              Advocate Practice Suite: Precedent Research & AI Drafting
            </h2>
            <p className="text-xs text-slate-500">
              Verified judicial search and formal Indian pleading drafting workspace (Advocate-Only).
            </p>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full hidden sm:inline-flex">
            Advocate Exclusive
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            variant="default"
            hoverEffect
            className="p-5 border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white flex flex-col justify-between gap-3 cursor-pointer"
            onClick={() => onNavigate('lawyer-legal-research')}
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-900">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Legal Precedent Research</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Search verified Supreme Court & High Court judgments by section, act, or citation. Save authorities directly to active case dockets.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-900 font-mono">/lawyer/legal-research</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('lawyer-legal-research')}
                rightIcon={<ArrowRight className="w-3 h-3" />}
                className="text-xs font-semibold text-amber-900 bg-white"
              >
                Search Law
              </Button>
            </div>
          </Card>

          <Card
            variant="default"
            hoverEffect
            className="p-5 border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white flex flex-col justify-between gap-3 cursor-pointer"
            onClick={() => onNavigate('lawyer-drafting')}
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-900">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">AI Drafting Workspace</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Generate first-draft legal notices, bail pleas, written statements, and consumer complaints with strict anti-hallucination placeholders.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-900 font-mono">/lawyer/drafting</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('lawyer-drafting')}
                rightIcon={<ArrowRight className="w-3 h-3" />}
                className="text-xs font-semibold"
              >
                Open Studio
              </Button>
            </div>
          </Card>

          <Card
            variant="default"
            hoverEffect
            className="p-5 border-slate-200 bg-white flex flex-col justify-between gap-3 cursor-pointer"
            onClick={() => onNavigate('lawyer-drafts')}
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pleading Repository & Drafts</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Manage saved drafts with complete version history. Export formatted Word (.docx) documents, print PDFs, or share with clients.
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 font-mono">/lawyer/drafts</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('lawyer-drafts')}
                rightIcon={<ArrowRight className="w-3 h-3" />}
                className="text-xs font-semibold text-slate-800"
              >
                View Drafts
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* 4. TWO-COLUMN SPLIT: NEW CASE REQUESTS & UPCOMING HEARINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: NEW CASE REQUESTS */}
        <Card variant="default" className="overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-serif text-slate-900">
                New Case Requests ({incomingCases.length})
              </h2>
              <p className="text-xs text-slate-500">
                Client submissions awaiting representation acceptance.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('lawyer-requests')}
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              View All
            </Button>
          </div>

          {incomingCases.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic">
              No pending case requests at this moment. You will be notified when new client matters are submitted.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {incomingCases.slice(0, 3).map((c) => (
                <div key={c.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {c.caseNumber}
                        </span>
                        <Badge variant="primary" size="sm">{c.category}</Badge>
                        {c.isUrgent && <Badge variant="danger" size="sm">Urgent</Badge>}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">{c.title}</h3>
                      <p className="text-xs text-slate-500">
                        Client: <strong>{c.clientName || 'Client'}</strong> • {c.city}, {c.state}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === c.id}
                        onClick={() => handleAction(c.id, 'reject')}
                      >
                        Decline
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        isLoading={actionLoading === c.id}
                        onClick={() => handleAction(c.id, 'accept')}
                      >
                        Accept
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                    {c.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>{c.documentsCount || 2} documents attached</span>
                    <button
                      onClick={() => onNavigate('lawyer-requests', { requestId: c.id })}
                      className="text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
                    >
                      View Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* RIGHT COLUMN: UPCOMING HEARINGS (CAUSE LIST) */}
        <Card variant="default" className="overflow-hidden flex flex-col justify-between">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-serif text-slate-900">
                Upcoming Court Hearings ({upcomingHearings.length})
              </h2>
              <p className="text-xs text-slate-500">
                Listed proceedings from court daily diaries and cause lists.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('lawyer-cases')}
              rightIcon={<ArrowRight className="w-3 h-3" />}
            >
              Caseload
            </Button>
          </div>

          {upcomingHearings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic">
              No upcoming hearings scheduled. Set next hearing dates inside your Case Rooms.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingHearings.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => onOpenCaseRoom(c.id, 'timeline')}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        {c.nextHearingDate}
                      </span>
                      <Badge variant="neutral" size="sm">Stage: {c.stage}</Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">{c.title}</h3>
                    <p className="text-xs text-slate-500 truncate">
                      Court: <strong>{c.courtName || 'District Court, Delhi'}</strong> • Client: {c.clientName || 'Client'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCaseRoom(c.id, 'timeline');
                    }}
                  >
                    Diary
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 5. RECENT CASE MESSAGES */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-sm font-bold font-serif text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              Recent Privileged Case Communications
            </h2>
            <p className="text-xs text-slate-500">
              Latest client and advocate communications across active Case Rooms.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">End-to-End Privileged</span>
        </div>

        {recentMessages.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 italic">
            No recent communications found. Messages sent in individual Case Rooms will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentMessages.slice(0, 4).map((msg) => (
              <div
                key={msg.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {msg.senderName} ({msg.senderRole === 'lawyer' ? 'Advocate' : 'Client'})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 mt-1 line-clamp-1">
                    Matter: {msg.caseTitle || 'Legal Proceeding'}
                  </p>

                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 italic bg-white p-2 rounded border border-slate-200/80">
                    "{msg.content}"
                  </p>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenCaseRoom(msg.caseId, 'chat')}
                    rightIcon={<Send className="w-3 h-3" />}
                    className="text-xs"
                  >
                    Reply in Case Room
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 6. ACTIVE CASES WORKBENCH TEASER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-serif text-slate-900">
            Active Cases ({activeCases.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('lawyer-cases')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Manage All Cases
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCases.slice(0, 3).map((c) => (
            <Card
              key={c.id}
              variant="default"
              hoverEffect
              className="p-5 flex flex-col justify-between gap-3 cursor-pointer"
              onClick={() => onOpenCaseRoom(c.id, 'overview')}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                    {c.caseNumber}
                  </span>
                  <Badge variant="warning" size="sm">Stage: {c.stage}</Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1 hover:text-amber-700 transition-colors">
                  {c.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Client: <strong className="text-slate-700">{c.clientName || 'Client'}</strong>
                </p>
                {c.nextHearingDate && (
                  <p className="text-xs text-amber-800 font-semibold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" /> Next: {c.nextHearingDate}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Vault: {c.documentsCount || 3} docs</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCaseRoom(c.id, 'overview');
                  }}
                  rightIcon={<ArrowRight className="w-3 h-3" />}
                >
                  Case Room
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
