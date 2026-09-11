import React, { useState } from 'react';
import {
  Briefcase,
  Calendar,
  Clock,
  PlusCircle,
  FileText,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  Phone,
  Scale,
  MessageSquare,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { LegalCase, ProposalCaseStage, ImplementationState, Notification } from '../../types.js';
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
  Alert,
  EmptyState,
  Input
} from '../ui/index.js';

interface ClientDashboardProps {
  cases: LegalCase[];
  onOpenCaseRoom: (caseId: string) => void;
  onSubmitCaseClick: () => void;
  onNavigate: (view: string) => void;
  clientName: string;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  cases,
  onOpenCaseRoom,
  onSubmitCaseClick,
  onNavigate,
  clientName,
}) => {
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  React.useEffect(() => {
    api.getNotifications().then((res) => {
      setNotifications(res.notifications);
    }).catch(() => {});
  }, []);

  // Compute pending actions
  const pendingActions = [
    ...cases.filter((c) => c.stage === 'Closed' || c.status === 'closed').map((c) => ({
      id: `action_review_${c.id}`,
      caseId: c.id,
      title: `Submit Review for Advocate ${c.lawyerName || 'Counsel'}`,
      description: `Matter "${c.title}" is decreed/closed. Share your verified feedback.`,
      actionText: 'Write Review',
      urgent: false,
      tab: 'overview'
    })),
    ...cases.filter((c) => c.paidAmount < c.totalFee).map((c) => ({
      id: `action_fee_${c.id}`,
      caseId: c.id,
      title: `Fee Milestone Pending: ₹${(c.totalFee - c.paidAmount).toLocaleString('en-IN')}`,
      description: `Escrow milestone pending for "${c.title}".`,
      actionText: 'Settle Milestone',
      urgent: true,
      tab: 'billing'
    })),
    ...cases.filter((c) => c.nextHearingDate).map((c) => ({
      id: `action_hearing_${c.id}`,
      caseId: c.id,
      title: `Hearing Listed: ${c.nextHearingDate}`,
      description: `Listed before ${c.courtName || 'District Court'}. Review cause list notes.`,
      actionText: 'View Diary',
      urgent: false,
      tab: 'timeline'
    }))
  ];

  // Check for upcoming hearings
  const upcomingHearing = cases.find((c) => c.nextHearingDate);

  const getStageBadge = (stage: ProposalCaseStage) => {
    switch (stage) {
      case 'Notice Sent':
        return <Badge variant="warning" size="sm">Stage 1: Notice Sent</Badge>;
      case 'Reply Received':
        return <Badge variant="info" size="sm">Stage 2: Reply Received</Badge>;
      case 'In Court':
        return <Badge variant="purple" size="sm">Stage 3: In Court</Badge>;
      case 'Closed':
        return <Badge variant="success" size="sm">Stage 4: Decreed / Closed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{stage}</Badge>;
    }
  };

  const getStateBadge = (state: ImplementationState) => {
    switch (state) {
      case 'Active':
        return <Badge variant="success" dot size="sm">Active Matter</Badge>;
      case 'Lawyer Reviewing':
        return <Badge variant="warning" size="sm">Counsel Reviewing</Badge>;
      case 'Payment Pending':
        return <Badge variant="danger" size="sm">Milestone Pending</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{state}</Badge>;
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesStage =
      filterStage === 'all'
        ? true
        : filterStage === 'active'
        ? c.stage !== 'Closed'
        : filterStage === 'hearing'
        ? !!c.nextHearingDate
        : c.stage === filterStage;

    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStage && matchesSearch;
  });

  return (
    <div id="client-dashboard-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* 1. WELCOME BANNER & MOBILE-FIRST ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm">
              Client Grievance Portal
            </Badge>
            <span className="text-[11px] text-slate-500 font-medium">Secured by Bar Council Guidelines</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 tracking-tight">
            Namaste, {clientName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
            Track your ongoing legal cases, access verified court orders, talk to your advocate, and settle fee milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            id="client-submit-case-btn"
            variant="primary"
            size="md"
            fullWidth={false}
            className="w-full sm:w-auto"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={onSubmitCaseClick}
          >
            Submit New Case
          </Button>
        </div>
      </div>

      {/* 2. PROMINENT HEARING ALERT (IF ANY) */}
      {upcomingHearing && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-300 text-sm">Upcoming Court Hearing Alert</p>
              <p className="text-slate-300 text-xs mt-0.5">
                Case <strong className="font-mono text-white">{upcomingHearing.caseNumber}</strong> listed before{' '}
                <strong className="text-white">{upcomingHearing.courtName || 'District Court Bench'}</strong> on{' '}
                <strong className="text-amber-400">{upcomingHearing.nextHearingDate}</strong>.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenCaseRoom(upcomingHearing.id)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Case Room
          </Button>
        </div>
      )}

      {/* 2b. PROMINENT PAYMENT REQUIREMENT ALERT (IF ANY CASE REQUIRES PAYMENT) */}
      {cases.some((c) => c.implementationState === 'Payment Pending') && (
        <div id="banner-dashboard-payment-pending" className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-sm">Advocate Retainer / Milestone Payment Required</p>
              <p className="text-amber-800 text-xs mt-0.5">
                An advocate has accepted your matter. Settle the statutory retainer deposit to activate representation and unlock the Case Room.
              </p>
            </div>
          </div>
          <Button
            id="btn-dashboard-view-payment"
            variant="primary"
            size="sm"
            onClick={() => onNavigate('client-payments')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Review & Pay
          </Button>
        </div>
      )}

      {/* 3. METRIC CARDS (RESPONSIVE GRID) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card variant="default" className="p-4">
          <span className="text-xs text-slate-500 font-medium">Total Matters Filed</span>
          <p className="text-2xl font-bold font-serif text-slate-900 mt-1">{cases.length}</p>
          <span className="text-[10px] text-slate-400">All registered complaints</span>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs text-slate-500 font-medium">Active In Redressal</span>
          <p className="text-2xl font-bold font-serif text-emerald-700 mt-1">
            {cases.filter((c) => c.stage !== 'Closed').length}
          </p>
          <span className="text-[10px] text-emerald-600">Notice or In-Court stage</span>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs text-slate-500 font-medium">Scheduled Hearings</span>
          <p className="text-2xl font-bold font-serif text-amber-700 mt-1">
            {cases.filter((c) => c.nextHearingDate).length}
          </p>
          <span className="text-[10px] text-amber-600">Cause list updated</span>
        </Card>

        <Card variant="default" className="p-4">
          <span className="text-xs text-slate-500 font-medium">Privileged Vault Files</span>
          <p className="text-2xl font-bold font-serif text-sky-700 mt-1">
            {cases.reduce((sum, c) => sum + (c.documentsCount || 0), 0) + 3}
          </p>
          <span className="text-[10px] text-sky-600">Encrypted evidence & notices</span>
        </Card>
      </div>

      {/* PENDING ACTIONS (CLIENT ATTENTION REQUIRED) */}
      {pendingActions.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 font-serif">
                Pending Actions ({pendingActions.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">Requires your attention</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {pendingActions.map((action) => (
              <div
                key={action.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2.5 hover:border-amber-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      action.urgent ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {action.urgent ? 'Urgent' : 'Action'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">{action.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{action.description}</p>
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  fullWidth
                  onClick={() => onOpenCaseRoom(action.caseId)}
                  className="mt-1"
                >
                  {action.actionText} →
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT NOTIFICATIONS STRIP */}
      {notifications.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                Latest Alert: {notifications[0]?.title}
              </p>
              <p className="text-slate-500 text-[11px] line-clamp-1">
                {notifications[0]?.content}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('client-notifications')}
            className="text-amber-700 hover:text-amber-800 font-bold text-xs shrink-0 inline-flex items-center gap-1"
          >
            <span>View All Notifications ({notifications.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. FILTER PILLS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStage('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              filterStage === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Matters ({cases.length})
          </button>
          <button
            onClick={() => setFilterStage('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              filterStage === 'active'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Active Matters
          </button>
          <button
            onClick={() => setFilterStage('hearing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              filterStage === 'hearing'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            With Hearing Dates
          </button>
          <button
            onClick={() => setFilterStage('Closed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              filterStage === 'Closed'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Decreed / Closed
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search by case, category, CNR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {/* 5. CASE MATTERS LIST */}
      <div className="space-y-3.5">
        {filteredCases.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-8 h-8 text-slate-400" />}
            title="No Legal Grievances Found"
            description="You currently have no legal matters matching the selected filter. File your dispute to connect with an experienced advocate."
            actionLabel="Submit Legal Case"
            onAction={onSubmitCaseClick}
          />
        ) : (
          filteredCases.map((c) => (
            <Card
              key={c.id}
              variant="default"
              hoverEffect
              className="p-5 flex flex-col justify-between gap-4"
              onClick={() => onOpenCaseRoom(c.id)}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                      {c.caseNumber}
                    </span>
                    {getStageBadge(c.stage)}
                    {getStateBadge(c.implementationState)}
                    <span className="text-xs text-slate-500 font-medium">
                      Category: <strong className="text-slate-700">{c.category}</strong>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight hover:text-amber-700 transition-colors">
                    {c.title}
                  </h3>

                  <p className="text-xs text-slate-500">
                    Jurisdiction: {c.city}, {c.state} • Initiated:{' '}
                    {new Date(c.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCaseRoom(c.id);
                    }}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Open Case Room
                  </Button>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                {c.description}
              </p>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    Advocate:{' '}
                    <strong className="text-slate-900 font-semibold">
                      {c.lawyerName || 'Matching Advocate...'}
                    </strong>
                  </span>

                  {c.nextHearingDate && (
                    <span className="text-amber-800 font-semibold flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Next Hearing: {c.nextHearingDate}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-500">
                    Fee: ₹{(c.totalFee || 0).toLocaleString('en-IN')} (Paid: ₹{(c.paidAmount || 0).toLocaleString('en-IN')})
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 6. QUICK LINKS / SERVICES ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Card
          variant="subtle"
          hoverEffect
          className="p-4 flex items-center gap-3.5"
          onClick={() => onNavigate('find-lawyer')}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Find Verified Advocate</h4>
            <p className="text-[11px] text-slate-500">Search 4,800+ Bar Council verified lawyers</p>
          </div>
        </Card>

        <Card
          variant="subtle"
          hoverEffect
          className="p-4 flex items-center gap-3.5"
          onClick={() => onNavigate('client-consultations')}
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Book Video Consultation</h4>
            <p className="text-[11px] text-slate-500">30-minute private advice session</p>
          </div>
        </Card>

        <Card
          variant="subtle"
          hoverEffect
          className="p-4 flex items-center gap-3.5"
          onClick={() => onNavigate('queries')}
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Post Anonymous Legal Q&A</h4>
            <p className="text-[11px] text-slate-500">Free advice from practicing lawyers</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
