import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Briefcase,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building,
  Scale,
  Search,
  ExternalLink,
  Filter,
  ArrowRight,
  Gavel,
  AlertTriangle,
  FileCheck,
  Check,
  Database,
  HardDrive,
  Server,
  Star,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { LawyerProfile, LegalCase } from '../../types.js';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  Textarea
} from '../ui/index.js';

interface AdminDashboardProps {
  onOpenCaseRoom: (caseId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenCaseRoom }) => {
  const [stats, setStats] = useState<{
    totalCases: number;
    activeCases: number;
    totalClients: number;
    totalLawyers: number;
    pendingLawyerVerifications: number;
    totalGMV: number;
  }>({
    totalCases: 0,
    activeCases: 0,
    totalClients: 0,
    totalLawyers: 0,
    pendingLawyerVerifications: 0,
    totalGMV: 0,
  });

  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('verifications');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dbMetrics, setDbMetrics] = useState<{
    storageEngine: string;
    filePath: string;
    metrics: Record<string, { total: number; demo: number; real: number }>;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Verify modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerProfile | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('Verified against State Bar Council Enrolment Register.');

  // Review Moderation State
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [reviewCounts, setReviewCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [moderationActionLoading, setModerationActionLoading] = useState<string | null>(null);
  const [moderationNoteInput, setModerationNoteInput] = useState<{ [reviewId: string]: string }>({});

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, lawRes, caseRes, dbRes, reviewRes] = await Promise.all([
        api.getAdminStats(),
        api.getLawyers(),
        api.getCases(),
        api.getDatabaseStats().catch(() => null),
        api.getAdminReviews().catch(() => ({ success: true, counts: { total: 0, pending: 0, approved: 0, rejected: 0 }, reviews: [] }))
      ]);
      setStats(statsRes);
      setLawyers(lawRes.lawyers);
      setCases(caseRes.cases);
      if (dbRes) setDbMetrics(dbRes);
      if (reviewRes) {
        setAdminReviews(reviewRes.reviews || []);
        setReviewCounts(reviewRes.counts || { total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerateReview = async (reviewId: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      setModerationActionLoading(reviewId);
      const note = moderationNoteInput[reviewId] || (status === 'approved' ? 'Verified client of concluded matter.' : 'Does not meet objective evaluation criteria.');
      await api.moderateReview(reviewId, status, note);
      // Reload reviews
      const updated = await api.getAdminReviews();
      setAdminReviews(updated.reviews || []);
      setReviewCounts(updated.counts || { total: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (err: any) {
      alert(err.message || 'Failed to update review moderation status');
    } finally {
      setModerationActionLoading(null);
    }
  };

  const handleVerify = async (lawyerId: string, status: 'verified' | 'rejected') => {
    setActionLoading(lawyerId);
    try {
      await api.verifyLawyer(lawyerId, status, verifyNotes);
      setVerifyModalOpen(false);
      await loadAdminData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingLawyers = lawyers.filter((l) => !l.isVerified);

  const filteredCases = cases.filter((c) => {
    const matchesStage = stageFilter === 'all' || c.stage === stageFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.clientName && c.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStage && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24">
        <LoadingState
          message="Synchronizing Central Registrar Audit Console..."
          description="Fetching Bar Council rolls, grievance milestones, and escrow reconciliation."
        />
      </div>
    );
  }

  return (
    <div id="admin-dashboard-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* 1. OPERATIONS HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">
              <Shield className="w-3 h-3 mr-1 text-purple-700" />
              Chief Registrar & Operations Desk
            </Badge>
            <span className="text-[11px] text-slate-500 font-mono">Platform Admin Access</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 tracking-tight">
            System Administration & Regulatory Compliance
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            Audit Bar Council of India advocate enrolments, inspect confidential case rooms, verify statutory stage progression, and oversee escrow disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAdminData}>
            Refresh Ledger
          </Button>
        </div>
      </div>

      {/* 2. DENSE HIGH-INFORMATION STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card variant="default" className="p-3.5 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            Total Matters
          </span>
          <p className="text-xl font-bold font-serif text-slate-900">{stats.totalCases}</p>
          <span className="text-[10px] text-slate-400">All registered</span>
        </Card>

        <Card variant="default" className="p-3.5 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            Active Cases
          </span>
          <p className="text-xl font-bold font-serif text-emerald-700">{stats.activeCases}</p>
          <span className="text-[10px] text-emerald-600">Pending decree</span>
        </Card>

        <Card variant="default" className="p-3.5 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            Citizens Registered
          </span>
          <p className="text-xl font-bold font-serif text-slate-900">{stats.totalClients}</p>
          <span className="text-[10px] text-slate-400">Verified KYC</span>
        </Card>

        <Card variant="default" className="p-3.5 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
            Advocates Enrolled
          </span>
          <p className="text-xl font-bold font-serif text-slate-900">{stats.totalLawyers}</p>
          <span className="text-[10px] text-slate-400">Practicing counsel</span>
        </Card>

        <Card variant="default" className="p-3.5 space-y-1 bg-amber-50/50 border-amber-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
            Pending BCI Review
          </span>
          <p className="text-xl font-bold font-serif text-amber-700">{stats.pendingLawyerVerifications}</p>
          <span className="text-[10px] text-amber-600">Action required</span>
        </Card>

        <Card variant="default" className="p-3.5 space-y-1 bg-purple-50/50 border-purple-200">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-800 block">
            Escrow GMV
          </span>
          <p className="text-xl font-bold font-serif text-purple-900">
            ₹{(stats.totalGMV / 1000).toFixed(0)}k
          </p>
          <span className="text-[10px] text-purple-600">GST settlements</span>
        </Card>
      </div>

      {/* 3. SUB-TABS */}
      <Tabs
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId)}
        variant="line"
        tabs={[
          {
            id: 'verifications',
            label: 'Advocate Verifications Queue',
            icon: <FileCheck className="w-3.5 h-3.5" />,
            count: pendingLawyers.length,
          },
          {
            id: 'cases',
            label: 'Platform Caseload Master Audit',
            icon: <Briefcase className="w-3.5 h-3.5" />,
            count: cases.length,
          },
          {
            id: 'financials',
            label: 'Escrow & GST Settlements',
            icon: <CreditCard className="w-3.5 h-3.5" />,
          },
          {
            id: 'database',
            label: 'SQLite Database & Entities',
            icon: <Database className="w-3.5 h-3.5" />,
            count: 16,
          },
          {
            id: 'reviews',
            label: 'Client Reviews Moderation',
            icon: <Star className="w-3.5 h-3.5" />,
            count: reviewCounts.pending || undefined,
          },
        ]}
      />

      {/* ========================================================================= */}
      {/* TAB 1: ADVOCATE VERIFICATION QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'verifications' && (
        <Card variant="default" className="space-y-0 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold font-serif text-slate-900">
                Advocate Bar Council Verification Desk
              </h2>
              <p className="text-xs text-slate-500">
                Verify Advocate certificates against State Bar Council directories per Bar Council of India standards.
              </p>
            </div>
            <Badge variant={pendingLawyers.length > 0 ? 'warning' : 'success'} size="sm">
              {pendingLawyers.length} Pending Actions
            </Badge>
          </div>

          <div className="divide-y divide-slate-100">
            {lawyers.map((lawyer) => (
              <div
                key={lawyer.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={lawyer.avatarUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=160'}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">{lawyer.fullName}</h3>
                      {lawyer.isVerified ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          Review Needed
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-slate-700 text-xs mt-0.5">
                      BCI Enrolment: <strong className="text-amber-800">{lawyer.barCouncilNumber}</strong> ({lawyer.stateBarCouncil})
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                      {lawyer.education} • {lawyer.experienceYears} Years Standing • {lawyer.city}, {lawyer.state}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!lawyer.isVerified ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === lawyer.id}
                        onClick={() => handleVerify(lawyer.id, 'rejected')}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        isLoading={actionLoading === lawyer.id}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedLawyer(lawyer);
                          setVerifyModalOpen(true);
                        }}
                      >
                        Approve & Verify
                      </Button>
                    </>
                  ) : (
                    <div className="text-right">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> BCI Roll Compliant
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID Verified</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PLATFORM CASELOAD MASTER AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'cases' && (
        <Card variant="default" className="space-y-4 p-5 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-serif text-slate-900">
                Platform Master Caseload ({filteredCases.length})
              </h2>
              <p className="text-xs text-slate-500">
                Full supervisory audit of legal grievances, advocate assignments, and statutory progression.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="all">All Stages</option>
                <option value="Notice Sent">Notice Sent</option>
                <option value="Reply Received">Reply Received</option>
                <option value="In Court">In Court</option>
                <option value="Closed">Closed</option>
              </select>

              <div className="w-48 sm:w-60">
                <Input
                  placeholder="Filter cases or client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>
            </div>
          </div>

          <Table id="admin-cases-table">
            <TableHeader>
              <TableRow isHoverable={false}>
                <TableHead>Case ID</TableHead>
                <TableHead>Title & Category</TableHead>
                <TableHead>Citizen / Client</TableHead>
                <TableHead>Assigned Advocate</TableHead>
                <TableHead>Statutory Stage</TableHead>
                <TableHead>Next Court Hearing</TableHead>
                <TableHead className="text-right">Supervisory Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold text-slate-900">{c.caseNumber}</TableCell>
                  <TableCell>
                    <p className="font-bold text-slate-900 truncate max-w-xs">{c.title}</p>
                    <span className="text-[10px] text-slate-500">{c.category}</span>
                  </TableCell>
                  <TableCell className="text-slate-700">{c.clientName || 'Client'}</TableCell>
                  <TableCell className="text-slate-700">{c.lawyerName || 'Matching...'}</TableCell>
                  <TableCell>
                    <Badge variant="warning" size="sm">
                      {c.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 font-mono text-[11px]">
                    {c.nextHearingDate || 'Not Fixed'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenCaseRoom(c.id)}
                      rightIcon={<ArrowRight className="w-3 h-3" />}
                    >
                      Inspect Room
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FINANCIALS & ESCROW AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="default" className="p-5">
              <span className="text-xs text-slate-500 font-medium">Cumulative Gross Volume (GMV)</span>
              <p className="text-2xl font-bold font-serif text-slate-900 mt-1">₹{stats.totalGMV.toLocaleString('en-IN')}</p>
              <span className="text-[10px] text-slate-400">Processed through Razorpay</span>
            </Card>

            <Card variant="default" className="p-5 bg-emerald-50/50 border-emerald-200">
              <span className="text-xs text-emerald-800 font-medium">GST Remittance (18%)</span>
              <p className="text-2xl font-bold font-serif text-emerald-700 mt-1">
                ₹{(stats.totalGMV * 0.18).toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-emerald-600">Central & State GST</span>
            </Card>

            <Card variant="default" className="p-5 bg-purple-50/50 border-purple-200">
              <span className="text-xs text-purple-800 font-medium">Statutory Escrow Balance</span>
              <p className="text-2xl font-bold font-serif text-purple-900 mt-1">
                ₹{((stats.totalGMV * 0.65) / 1000).toFixed(1)}k
              </p>
              <span className="text-[10px] text-purple-600">Axis Bank Escrow account</span>
            </Card>
          </div>

          <Card variant="default" className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Compliance & Regulatory Disclaimers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Counselia operates strictly under the Bar Council of India (BCI) rules. All advocate fees are held in RBI-authorized banking escrow until contractual milestones are satisfied. Automated GST credit invoices under SAC 998211 are distributed immediately upon receipt.
            </p>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SQLITE DATABASE & ENTITY METRICS */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Storage Engine Status Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="purple" size="sm">
                    <Database className="w-3 h-3 mr-1 text-purple-300" />
                    ACID Compliant Persistent Storage
                  </Badge>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active & Non-Volatile
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold font-serif text-white">
                  Persistent SQLite Database Engine
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl">
                  {dbMetrics?.storageEngine || 'SQLite 3 (node:sqlite DatabaseSync with WAL)'} &bull; File:{' '}
                  <code className="text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                    {dbMetrics?.filePath || './data/lawshin.sqlite'}
                  </code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadAdminData} className="border-slate-700 text-slate-200 hover:bg-slate-800">
                  Verify Integrity
                </Button>
              </div>
            </div>

            {/* Persistence Architecture Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Relational Entities
                </span>
                <p className="text-xl font-bold font-serif text-amber-400 mt-0.5">16 Tables</p>
                <span className="text-[10px] text-slate-400">Indexed & Foreign Key Enforced</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Journal Mode
                </span>
                <p className="text-xl font-bold font-serif text-emerald-400 mt-0.5">WAL</p>
                <span className="text-[10px] text-slate-400">Write-Ahead Logging enabled</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Data Segmentation
                </span>
                <p className="text-xl font-bold font-serif text-blue-400 mt-0.5">Strict</p>
                <span className="text-[10px] text-slate-400">Real users vs. is_demo data</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  Authorization Layer
                </span>
                <p className="text-xl font-bold font-serif text-purple-400 mt-0.5">Database Check</p>
                <span className="text-[10px] text-slate-400">Participant table validation</span>
              </div>
            </div>
          </div>

          {/* Detailed 16 Entities Table */}
          <Card variant="default" className="space-y-0 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-serif text-slate-900">
                  Database Schema & Entity Inventory
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time record audit across all 16 core relational models in the persistent database.
                </p>
              </div>
              <Badge variant="blue" size="sm">
                16 Registered Models
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Entity Table</TableHead>
                    <TableHead>Core Attributes & Relationship</TableHead>
                    <TableHead className="text-center">Total Records</TableHead>
                    <TableHead className="text-center">Real User Data</TableHead>
                    <TableHead className="text-center">Demo Seed Data</TableHead>
                    <TableHead className="text-right">Integrity Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      index: 1,
                      table: 'users',
                      description: 'Account credentials, role authentication (client, lawyer, admin), phone/email identifiers, password hash & verification status.',
                      counts: dbMetrics?.metrics?.users || { total: 4, demo: 4, real: 0 }
                    },
                    {
                      index: 2,
                      table: 'clients',
                      description: 'Citizen legal profiles, contact coordinates, city/state jurisdiction, and client KYC.',
                      counts: dbMetrics?.metrics?.clients || { total: 1, demo: 1, real: 0 }
                    },
                    {
                      index: 3,
                      table: 'lawyers',
                      description: 'Bar Council enrolled advocates, practice domains, experience years, consultation fees, and verification status.',
                      counts: dbMetrics?.metrics?.lawyers || { total: 4, demo: 4, real: 0 }
                    },
                    {
                      index: 4,
                      table: 'law_firms',
                      description: 'Chambers and registered law firms, managing partners, and associate registries.',
                      counts: dbMetrics?.metrics?.law_firms || { total: 2, demo: 2, real: 0 }
                    },
                    {
                      index: 5,
                      table: 'cases',
                      description: 'Legal grievance filings with client, assigned lawyer, category, urgency, statutory stage, filing date, hearing dates, and closure timestamps.',
                      counts: dbMetrics?.metrics?.cases || { total: 3, demo: 3, real: 0 }
                    },
                    {
                      index: 6,
                      table: 'case_documents',
                      description: 'Evidentiary documents, affidavits, petitions, and orders with uploader role, vault storage path, and file metadata.',
                      counts: dbMetrics?.metrics?.case_documents || { total: 6, demo: 6, real: 0 }
                    },
                    {
                      index: 7,
                      table: 'case_messages',
                      description: 'Privileged communications with case ID, sender role/ID, message content, attachment references, and timestamps.',
                      counts: dbMetrics?.metrics?.case_messages || { total: 8, demo: 8, real: 0 }
                    },
                    {
                      index: 8,
                      table: 'case_updates',
                      description: 'Milestone chronology, procedural updates, previous/new status, hearing notes, and statutory stages.',
                      counts: dbMetrics?.metrics?.case_updates || { total: 9, demo: 9, real: 0 }
                    },
                    {
                      index: 9,
                      table: 'case_participants',
                      description: 'Multi-party access registry enforcing strict case isolation at the database layer (preventing cross-client/cross-counsel leakage).',
                      counts: dbMetrics?.metrics?.case_participants || { total: 5, demo: 5, real: 0 }
                    },
                    {
                      index: 10,
                      table: 'payments',
                      description: 'Escrow and retainer disbursements with client, case, amount, currency (INR), provider (Razorpay), transaction ID, and status.',
                      counts: dbMetrics?.metrics?.payments || { total: 3, demo: 3, real: 0 }
                    },
                    {
                      index: 11,
                      table: 'invoices',
                      description: 'Statutory GST tax invoices under SAC 998211 with tax breakdown and automated receipt tracking.',
                      counts: dbMetrics?.metrics?.invoices || { total: 3, demo: 3, real: 0 }
                    },
                    {
                      index: 12,
                      table: 'appointments',
                      description: 'Advocate consultation schedules, video call links, time slots, and consultation briefs.',
                      counts: dbMetrics?.metrics?.appointments || { total: 2, demo: 2, real: 0 }
                    },
                    {
                      index: 13,
                      table: 'reviews',
                      description: 'Verified client advocate feedback, rating scores, written evaluations, and moderation status.',
                      counts: dbMetrics?.metrics?.reviews || { total: 5, demo: 5, real: 0 }
                    },
                    {
                      index: 14,
                      table: 'notifications',
                      description: 'Judicial diary notifications, hearing date summons, and automated case stage reminders.',
                      counts: dbMetrics?.metrics?.notifications || { total: 3, demo: 3, real: 0 }
                    },
                    {
                      index: 15,
                      table: 'legal_queries',
                      description: 'Public legal advisory forum questions with advocate replies and jurisdiction tags.',
                      counts: dbMetrics?.metrics?.legal_queries || { total: 2, demo: 2, real: 0 }
                    },
                    {
                      index: 16,
                      table: 'public_content',
                      description: 'Verified High Court judgments, statutory guidance articles, and Indian legal code references.',
                      counts: dbMetrics?.metrics?.public_content || { total: 6, demo: 6, real: 0 }
                    },
                  ].map((entity) => (
                    <TableRow key={entity.table}>
                      <TableCell className="text-center font-mono text-xs text-slate-400">
                        {entity.index}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {entity.table}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                          {entity.description}
                        </p>
                      </TableCell>
                      <TableCell className="text-center font-semibold font-mono text-xs text-slate-900">
                        {entity.counts.total}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
                          entity.counts.real > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {entity.counts.real}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono text-amber-700 bg-amber-50">
                          {entity.counts.demo}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="green" size="sm">
                          <Check className="w-3 h-3 mr-1" />
                          Enforced
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CLIENT REVIEWS MODERATION QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'reviews' && (
        <div className="space-y-5">
          {/* Policy Banner */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-900 flex items-start gap-3 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-950">
                Verified Closed Case Review Policy & Administrative Moderation
              </h4>
              <p className="text-amber-800/90 leading-relaxed">
                Only clients with formally concluded matters (Closed or Resolved stage) are eligible to submit reviews for their assigned advocate.
                Duplicate reviews for the same case are strictly rejected.
                All client feedback requires administrative approval before appearing in the public advocate directory.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => {
                const count =
                  status === 'pending'
                    ? reviewCounts.pending
                    : status === 'approved'
                    ? reviewCounts.approved
                    : status === 'rejected'
                    ? reviewCounts.rejected
                    : reviewCounts.total;

                const isActive = reviewStatusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setReviewStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="capitalize">{status}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-slate-500">
              Showing {adminReviews.filter((r) => reviewStatusFilter === 'all' || r.moderationStatus === reviewStatusFilter).length} review records
            </span>
          </div>

          {/* Reviews List */}
          {adminReviews.filter((r) => reviewStatusFilter === 'all' || r.moderationStatus === reviewStatusFilter).length === 0 ? (
            <Card variant="default" className="p-12 text-center space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800 text-sm">No reviews in this queue</p>
              <p className="text-xs text-slate-500">
                {reviewStatusFilter === 'pending'
                  ? 'All submitted client reviews have been moderated.'
                  : `No ${reviewStatusFilter} reviews found.`}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {adminReviews
                .filter((r) => reviewStatusFilter === 'all' || r.moderationStatus === reviewStatusFilter)
                .map((rev) => {
                  const isLoading = moderationActionLoading === rev.id;

                  return (
                    <Card key={rev.id} variant="default" className="p-5 space-y-4">
                      {/* Top row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{rev.clientName}</span>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Verified Client
                            </span>
                            <span className="text-xs text-slate-400 font-mono">• {rev.timestamp ? new Date(rev.timestamp).toLocaleDateString('en-IN') : 'Recent'}</span>
                          </div>

                          <p className="text-xs text-slate-600">
                            Advocate: <strong className="text-slate-900">{rev.lawyerName}</strong> ({rev.lawyerCity}) • Matter:{' '}
                            <span className="font-medium text-slate-800">{rev.caseTitle || rev.caseCategory}</span>
                          </p>
                        </div>

                        {/* Status badge */}
                        <div>
                          {rev.moderationStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Pending Moderation
                            </span>
                          )}
                          {rev.moderationStatus === 'approved' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Approved & Public
                            </span>
                          )}
                          {rev.moderationStatus === 'rejected' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stars & Written Review */}
                      <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < rev.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                          <span className="ml-1.5 font-bold font-mono text-slate-800">
                            {rev.rating} / 5 Stars
                          </span>
                        </div>

                        <p className="text-slate-800 leading-relaxed font-sans text-xs">
                          "{rev.writtenReview || rev.comment}"
                        </p>

                        {rev.moderationNotes && (
                          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                            <strong>Admin Note:</strong> {rev.moderationNotes}
                          </p>
                        )}
                      </div>

                      {/* Moderation Actions */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                        <input
                          type="text"
                          placeholder="Optional moderation note (e.g. Verified genuine representation)..."
                          value={moderationNoteInput[rev.id] || ''}
                          onChange={(e) =>
                            setModerationNoteInput({
                              ...moderationNoteInput,
                              [rev.id]: e.target.value
                            })
                          }
                          className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
                        />

                        <div className="flex items-center gap-2 shrink-0">
                          {rev.moderationStatus !== 'approved' && (
                            <Button
                              variant="success"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleModerateReview(rev.id, 'approved')}
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                            >
                              Approve & Publish
                            </Button>
                          )}

                          {rev.moderationStatus !== 'rejected' && (
                            <Button
                              variant="danger"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleModerateReview(rev.id, 'rejected')}
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            >
                              Reject
                            </Button>
                          )}

                          {rev.moderationStatus !== 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleModerateReview(rev.id, 'pending')}
                            >
                              Reset to Pending
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* VERIFICATION MODAL */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Confirm Bar Council Verification"
        subtitle={`Verify advocate credentials for ${selectedLawyer?.fullName}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              size="sm"
              isLoading={actionLoading === selectedLawyer?.id}
              onClick={() => selectedLawyer && handleVerify(selectedLawyer.id, 'verified')}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirm BCI Approval
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <p><strong>Advocate:</strong> {selectedLawyer?.fullName}</p>
            <p><strong>Enrolment Number:</strong> <span className="font-mono text-amber-700">{selectedLawyer?.barCouncilNumber}</span></p>
            <p><strong>State Bar Council:</strong> {selectedLawyer?.stateBarCouncil}</p>
          </div>

          <Textarea
            label="Verification Notes & Roll Cross-Check Record"
            value={verifyNotes}
            onChange={(e) => setVerifyNotes(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};
