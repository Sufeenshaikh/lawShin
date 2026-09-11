import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  BookOpen,
  Info,
  Scale,
  Bell,
  Trash2,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  Building2,
  AlertCircle
} from 'lucide-react';
import {
  LegalDeadline,
  DeadlineStatus,
  DeadlineType,
  VerifiedLegalRule,
  LegalCase
} from '../../types';
import { api } from '../../services/api';
import {
  DEADLINE_TRACKER_DISCLAIMER,
  AI_DEADLINE_POLICY_NOTICE,
  calculateDaysRemainingAndStatus,
  computeTimelineProgress,
  getDetailedCountdown
} from '../../services/deadlineEngine';

interface RightToRemedyTrackerProps {
  caseData: LegalCase;
  currentUserRole?: string;
  currentUserId?: string;
  onRefreshCase?: () => void;
}

const DEADLINE_TYPES: DeadlineType[] = [
  'Statutory Limitation Period',
  'Written Statement / Reply Filing',
  'Legal Notice Response',
  'Evidence / Rejoinder Submission',
  'Appellate / Revision Window',
  'Consumer Forum Complaint',
  'Arbitration Notice / Claim',
  'Court Order Compliance',
  'Right to Information (RTI) Appeal',
  'Other Procedural Deadline'
];

export const RightToRemedyTracker: React.FC<RightToRemedyTrackerProps> = ({
  caseData,
  currentUserRole = 'client',
  currentUserId,
  onRefreshCase
}) => {
  const isLawyerOrAdmin = currentUserRole === 'lawyer' || currentUserRole === 'admin';

  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);
  const [verifiedRules, setVerifiedRules] = useState<VerifiedLegalRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | DeadlineStatus>('all');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live countdown clock tick (refreshed every second)
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modal State for adding new deadline
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formCalculationSource, setFormCalculationSource] = useState<'verified_rule_engine' | 'manual_lawyer_entry'>('verified_rule_engine');
  const [formSelectedRuleId, setFormSelectedRuleId] = useState<string>('cpc_order_viii_rule_1');
  const [formTitle, setFormTitle] = useState('');
  const [formDeadlineType, setFormDeadlineType] = useState<DeadlineType>('Written Statement / Reply Filing');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formManualDeadlineDate, setFormManualDeadlineDate] = useState('');
  const [formRemedyAction, setFormRemedyAction] = useState('');
  const [formForum, setFormForum] = useState(caseData.courtName || '');
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Deadlines and Verified Rules
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [deadlinesRes, rulesRes] = await Promise.all([
        api.getCaseDeadlines(caseData.id),
        api.getVerifiedLegalRules()
      ]);
      setDeadlines(deadlinesRes.deadlines || []);
      setVerifiedRules(rulesRes.rules || []);
    } catch (err: any) {
      console.error('Failed to load deadline tracker data:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Unable to load deadline data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseData.id]);

  // Selected rule details in modal
  const selectedRule = useMemo(() => {
    return verifiedRules.find((r) => r.ruleId === formSelectedRuleId);
  }, [verifiedRules, formSelectedRuleId]);

  // Computed preview date when using rule engine
  const computedPreviewDeadlineDate = useMemo(() => {
    if (formCalculationSource === 'manual_lawyer_entry') {
      return formManualDeadlineDate;
    }
    if (!selectedRule || !formStartDate) return '';
    try {
      const start = new Date(formStartDate);
      if (isNaN(start.getTime())) return '';
      const target = new Date(start.getTime() + selectedRule.standardPeriodDays * 24 * 60 * 60 * 1000);
      return target.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }, [formCalculationSource, formManualDeadlineDate, selectedRule, formStartDate]);

  // Auto-fill title and type when rule changes
  const handleRuleChange = (ruleId: string) => {
    setFormSelectedRuleId(ruleId);
    const r = verifiedRules.find((rule) => rule.ruleId === ruleId);
    if (r) {
      if (r.ruleId.includes('order_viii')) {
        setFormTitle('Written Statement Defense Filing (CPC Order VIII R1)');
        setFormDeadlineType('Written Statement / Reply Filing');
        setFormRemedyAction('Draft and submit Written Statement with affidavit of admission/denial.');
      } else if (r.ruleId.includes('limitation_act_art_113')) {
        setFormTitle('Civil Plaint Statutory Limitation Cutoff (Limitation Act Art. 113)');
        setFormDeadlineType('Statutory Limitation Period');
        setFormRemedyAction('Institute formal civil plaint before jurisdictional court prior to limitation expiry.');
      } else if (r.ruleId.includes('limitation_act_art_54')) {
        setFormTitle('Specific Performance Limitation Period (Art. 54)');
        setFormDeadlineType('Statutory Limitation Period');
        setFormRemedyAction('File suit for specific performance upon notice of contractual refusal.');
      } else if (r.ruleId.includes('consumer_protection')) {
        setFormTitle('Consumer Forum Filing Cutoff (Sec 69 CPA)');
        setFormDeadlineType('Consumer Forum Complaint');
        setFormRemedyAction('Lodge complaint before District Consumer Commission with deficiency receipts.');
      } else if (r.ruleId.includes('ni_act_sec_142')) {
        setFormTitle('Sec 138 Criminal Complaint Filing Window (NI Act Sec 142(1)(b))');
        setFormDeadlineType('Statutory Limitation Period');
        setFormRemedyAction('Submit verified criminal complaint with bank return memo before Magistrate.');
      } else if (r.ruleId.includes('ni_act_sec_138_notice')) {
        setFormTitle('Cheque Dishonour Statutory Notice Period (Sec 138 Proviso b)');
        setFormDeadlineType('Legal Notice Response');
        setFormRemedyAction('Serve registered legal demand notice within 30 days of dishonour memo.');
      } else if (r.ruleId.includes('arbitration')) {
        setFormTitle('Section 34 Petition to Challenge Arbitral Award');
        setFormDeadlineType('Arbitration Notice / Claim');
        setFormRemedyAction('File Section 34 application challenging arbitral award within 3 months.');
      } else if (r.ruleId.includes('rera')) {
        setFormTitle('RERA Appellate Tribunal Appeal Window (Sec 44(2))');
        setFormDeadlineType('Appellate / Revision Window');
        setFormRemedyAction('Prefer statutory appeal before Real Estate Appellate Tribunal.');
      } else if (r.ruleId.includes('rti')) {
        setFormTitle('RTI First Appeal Filing Deadline (Sec 19(1))');
        setFormDeadlineType('Right to Information (RTI) Appeal');
        setFormRemedyAction('File First Appeal to public authority appellate officer.');
      } else if (r.ruleId.includes('mact')) {
        setFormTitle('MACT Motor Accident Claim Limitation (Sec 166(3))');
        setFormDeadlineType('Statutory Limitation Period');
        setFormRemedyAction('Lodge claim application before Motor Accidents Claims Tribunal.');
      }
    }
  };

  // Create Deadline Handler
  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a deadline title or action.' });
      return;
    }

    if (formCalculationSource === 'manual_lawyer_entry' && !formManualDeadlineDate) {
      setStatusMessage({ type: 'error', text: 'Please specify the deadline date.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createCaseDeadline(caseData.id, {
        title: formTitle,
        deadlineType: formDeadlineType,
        startDate: formStartDate,
        deadlineDate: formCalculationSource === 'manual_lawyer_entry' ? formManualDeadlineDate : undefined,
        calculationSource: formCalculationSource,
        ruleId: formCalculationSource === 'verified_rule_engine' ? formSelectedRuleId : undefined,
        remedyActionRequired: formRemedyAction,
        governingForum: formForum,
        description: formDescription
      });

      setStatusMessage({ type: 'success', text: res.message || 'Deadline added successfully.' });
      setIsAddModalOpen(false);
      resetForm();
      loadData();
      if (onRefreshCase) onRefreshCase();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to record deadline.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormManualDeadlineDate('');
    setFormRemedyAction('');
    setFormDescription('');
  };

  // Toggle Completion
  const handleToggleCompleted = async (deadline: LegalDeadline) => {
    if (!isLawyerOrAdmin) {
      setStatusMessage({
        type: 'error',
        text: 'Action Restricted: Only the advocate on record can mark a procedural legal deadline as filed or satisfied.'
      });
      return;
    }

    try {
      const updatedState = !deadline.isCompleted;
      await api.updateCaseDeadline(caseData.id, deadline.id, {
        isCompleted: updatedState
      });
      setStatusMessage({
        type: 'success',
        text: updatedState ? 'Deadline marked as filed/completed.' : 'Deadline marked as active.'
      });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  };

  // Delete Deadline
  const handleDeleteDeadline = async (deadlineId: string) => {
    if (!window.confirm('Are you sure you want to remove this procedural deadline from the case room?')) {
      return;
    }
    try {
      await api.deleteCaseDeadline(caseData.id, deadlineId);
      setStatusMessage({ type: 'success', text: 'Deadline record removed.' });
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove deadline.' });
    }
  };

  // Scan Notifications
  const handleCheckNotifications = async () => {
    try {
      const res = await api.checkDeadlineNotifications(caseData.id);
      setStatusMessage({
        type: 'success',
        text: `Approaching deadline check complete. ${res.notificationsCreated} active alerts processed.`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Notification check failed.' });
    }
  };

  // Filtered Deadlines
  const filteredDeadlines = useMemo(() => {
    if (activeFilter === 'all') return deadlines;
    return deadlines.filter((d) => d.status === activeFilter);
  }, [deadlines, activeFilter]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = deadlines.length;
    const safeCount = deadlines.filter((d) => d.status === 'safe').length;
    const approachingCount = deadlines.filter((d) => d.status === 'approaching').length;
    const urgentCount = deadlines.filter((d) => d.status === 'urgent').length;
    const expiredCount = deadlines.filter((d) => d.status === 'expired').length;
    const completedCount = deadlines.filter((d) => d.isCompleted).length;
    return { total, safeCount, approachingCount, urgentCount, expiredCount, completedCount };
  }, [deadlines]);

  // Priority Deadline for Countdown Card (Closest pending urgent or approaching deadline)
  const priorityDeadline = useMemo(() => {
    const pending = deadlines.filter((d) => !d.isCompleted);
    // Sort by daysRemaining ascending
    const sorted = [...pending].sort((a, b) => a.daysRemaining - b.daysRemaining);
    // Prefer urgent first, then approaching, then safe
    return sorted[0] || deadlines[0] || null;
  }, [deadlines]);

  const priorityCountdown = useMemo(() => {
    if (!priorityDeadline) return null;
    return getDetailedCountdown(priorityDeadline.deadlineDate, now);
  }, [priorityDeadline, now]);

  return (
    <div className="space-y-6" id="right-to-remedy-tracker-root">
      {/* Top Banner & Title Section */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm" id="tracker-header-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-50 text-amber-800 rounded-lg border border-amber-200/70 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">Right-to-Remedy / Legal Deadline Tracker</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Statutory Limitation Safeguard
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1">
                Authoritative procedural timeline and right-to-remedy tracking for matter{' '}
                <span className="font-semibold text-slate-800">{caseData.caseNumber || caseData.id}</span> (
                {caseData.courtName || 'Court of Record'}).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={handleCheckNotifications}
              title="Test notification trigger for approaching deadlines"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              id="btn-scan-alerts"
            >
              <Bell className="w-3.5 h-3.5 text-slate-600" />
              Check Alerts
            </button>

            {isLawyerOrAdmin ? (
              <button
                onClick={() => {
                  resetForm();
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors"
                id="btn-add-deadline-modal"
              >
                <Plus className="w-4 h-4" />
                Add Legal Deadline
              </button>
            ) : (
              <div
                className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-1.5"
                title="Only assigned advocate can log or amend formal legal deadlines"
              >
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Advocate Controlled Diary
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="font-bold underline ml-3 text-xs opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Status Counters Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setActiveFilter('all')}
            className={`p-3 rounded-lg text-left transition-all border ${
              activeFilter === 'all'
                ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400'
                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="text-xs font-medium text-slate-500">All Deadlines</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.total}</div>
          </button>

          <button
            onClick={() => setActiveFilter('safe')}
            className={`p-3 rounded-lg text-left transition-all border ${
              activeFilter === 'safe'
                ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50'
            }`}
          >
            <div className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              🟢 Safe (&gt;14d)
            </div>
            <div className="text-lg font-bold text-emerald-900 mt-0.5">{stats.safeCount}</div>
          </button>

          <button
            onClick={() => setActiveFilter('approaching')}
            className={`p-3 rounded-lg text-left transition-all border ${
              activeFilter === 'approaching'
                ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                : 'bg-amber-50/40 border-amber-200/80 hover:bg-amber-50'
            }`}
          >
            <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              🟡 Approaching (4-14d)
            </div>
            <div className="text-lg font-bold text-amber-900 mt-0.5">{stats.approachingCount}</div>
          </button>

          <button
            onClick={() => setActiveFilter('urgent')}
            className={`p-3 rounded-lg text-left transition-all border ${
              activeFilter === 'urgent'
                ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400'
                : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50'
            }`}
          >
            <div className="text-xs font-medium text-rose-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse"></span>
              🔴 Urgent (0-3d)
            </div>
            <div className="text-lg font-bold text-rose-900 mt-0.5">{stats.urgentCount}</div>
          </button>

          <button
            onClick={() => setActiveFilter('expired')}
            className={`p-3 rounded-lg text-left transition-all border ${
              activeFilter === 'expired'
                ? 'bg-slate-200 border-slate-500 ring-1 ring-slate-500'
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200/80'
            }`}
          >
            <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-800 inline-block"></span>
              ⚫ Expired (&lt;0d)
            </div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{stats.expiredCount}</div>
          </button>
        </div>
      </div>

      {/* Priority Live Visual Timeline & Countdown Hero Card */}
      {priorityDeadline && priorityCountdown && (
        <div
          className={`rounded-xl p-6 border shadow-sm transition-all ${
            priorityDeadline.status === 'urgent'
              ? 'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 border-rose-200'
              : priorityDeadline.status === 'approaching'
              ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-200'
              : priorityDeadline.status === 'expired'
              ? 'bg-gradient-to-br from-slate-100 via-white to-slate-50 border-slate-300'
              : 'bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 border-emerald-200'
          }`}
          id="priority-countdown-hero"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left Info */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-slate-800 text-white">
                  Next Priority Action
                </span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    priorityDeadline.status === 'urgent'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : priorityDeadline.status === 'approaching'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : priorityDeadline.status === 'expired'
                      ? 'bg-slate-800 text-white border-slate-900'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {priorityDeadline.status === 'urgent' && '🔴 Urgent Window'}
                  {priorityDeadline.status === 'approaching' && '🟡 Approaching Cutoff'}
                  {priorityDeadline.status === 'safe' && '🟢 Safe Period'}
                  {priorityDeadline.status === 'expired' && '⚫ Time-Barred / Expired'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {priorityDeadline.deadlineType}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{priorityDeadline.title}</h3>

              {priorityDeadline.remedyActionRequired && (
                <p className="text-sm text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/70 inline-block max-w-2xl">
                  <span className="font-semibold text-slate-900">Required Remedy:</span>{' '}
                  {priorityDeadline.remedyActionRequired}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Trigger/Start:</strong> {priorityDeadline.startDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <strong>Filing Deadline:</strong>{' '}
                  <span className="font-bold text-slate-900">{priorityDeadline.deadlineDate}</span>
                </span>
                {priorityDeadline.governingForum && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Forum:</strong> {priorityDeadline.governingForum}
                  </span>
                )}
              </div>
            </div>

            {/* Right Live Ticking Countdown Timer */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200/90 shadow-sm shrink-0 min-w-[280px]">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                Live Procedural Countdown
              </div>

              {priorityCountdown.isExpired ? (
                <div className="text-center py-2">
                  <div className="text-2xl font-black text-slate-800">TIME-BARRED</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Expired {Math.abs(priorityDeadline.daysRemaining)} day(s) ago
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Seek Section 5 Limitation Act condonation if cause exists
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-lg px-3 py-2 min-w-[56px]">
                    <span className="text-2xl font-black font-mono leading-none">
                      {String(priorityCountdown.days).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium uppercase mt-1">Days</span>
                  </div>
                  <span className="text-xl font-bold text-slate-400">:</span>

                  <div className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-lg px-3 py-2 min-w-[56px]">
                    <span className="text-2xl font-black font-mono leading-none">
                      {String(priorityCountdown.hours).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium uppercase mt-1">Hours</span>
                  </div>
                  <span className="text-xl font-bold text-slate-400">:</span>

                  <div className="flex flex-col items-center justify-center bg-slate-900 text-white rounded-lg px-3 py-2 min-w-[56px]">
                    <span className="text-2xl font-black font-mono leading-none">
                      {String(priorityCountdown.minutes).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium uppercase mt-1">Mins</span>
                  </div>
                  <span className="text-xl font-bold text-slate-400">:</span>

                  <div className="flex flex-col items-center justify-center bg-amber-700 text-white rounded-lg px-3 py-2 min-w-[56px]">
                    <span className="text-2xl font-black font-mono leading-none">
                      {String(priorityCountdown.seconds).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] text-amber-200 font-medium uppercase mt-1">Secs</span>
                  </div>
                </div>
              )}

              {/* Verified Rule / Entry Method Tag */}
              <div className="mt-3 text-[11px] text-slate-600 text-center">
                {priorityDeadline.calculationSource === 'verified_rule_engine' ? (
                  <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                    <BookOpen className="w-3 h-3" />
                    Rule: {priorityDeadline.verifiedRuleReference?.sectionOrArticle || 'Statutory Code'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Advocate Affirmed: {priorityDeadline.enteredByName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Visual Timeline Progress Bar */}
          <div className="mt-6 pt-4 border-t border-slate-200/70">
            {(() => {
              const progress = computeTimelineProgress(priorityDeadline.startDate, priorityDeadline.deadlineDate, now);
              return (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>
                      Start: <strong>{priorityDeadline.startDate}</strong>
                    </span>
                    <span>
                      Elapsed: <strong>{progress.elapsedDays}</strong> of <strong>{progress.totalDays}</strong> total statutory days ({progress.percentage}%)
                    </span>
                    <span>
                      Cutoff: <strong>{priorityDeadline.deadlineDate}</strong>
                    </span>
                  </div>

                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex p-0.5 relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        priorityDeadline.status === 'urgent'
                          ? 'bg-rose-600'
                          : priorityDeadline.status === 'approaching'
                          ? 'bg-amber-500'
                          : priorityDeadline.status === 'expired'
                          ? 'bg-slate-800'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>Cause of Action / Summons Service</span>
                    <span className="text-amber-800 font-semibold">Today (Time Elapsed: {progress.percentage}%)</span>
                    <span>Absolute Time-Bar Boundary</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Mandatory Statutory Notice & AI Guardrail Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="statutory-disclaimer-strip">
        <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Organizational Reminder Disclaimer:</span>
            {DEADLINE_TRACKER_DISCLAIMER}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Strict Anti-Hallucination Integrity Guardrail:</span>
            {AI_DEADLINE_POLICY_NOTICE}
          </div>
        </div>
      </div>

      {/* Deadlines List / Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="deadlines-list-container">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">Right-to-Remedy Procedural Schedule</h3>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
              {filteredDeadlines.length} {activeFilter !== 'all' ? `(${activeFilter})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Showing: <span className="font-semibold text-slate-700 capitalize">{activeFilter}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <Clock className="w-6 h-6 text-amber-600 animate-spin mx-auto mb-2" />
            Synchronizing statutory limitation records...
          </div>
        ) : filteredDeadlines.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-semibold text-slate-700">No procedural deadlines in this category</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {isLawyerOrAdmin
                ? 'Click "Add Legal Deadline" above to compute or enter statutory limitation dates for this case.'
                : 'Your advocate will record statutory response and filing dates as summons and notices are exchanged.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDeadlines.map((deadline) => {
              const progress = computeTimelineProgress(deadline.startDate, deadline.deadlineDate, now);

              return (
                <div
                  key={deadline.id}
                  className={`p-5 transition-colors hover:bg-slate-50/80 ${
                    deadline.isCompleted ? 'opacity-70 bg-slate-50/40' : ''
                  }`}
                  id={`deadline-item-${deadline.id}`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left Column: Title, Type, Status */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            deadline.status === 'urgent'
                              ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                              : deadline.status === 'approaching'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : deadline.status === 'expired'
                              ? 'bg-slate-800 text-white border-slate-900'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {deadline.status === 'safe' && '🟢 Safe'}
                          {deadline.status === 'approaching' && '🟡 Approaching'}
                          {deadline.status === 'urgent' && '🔴 Urgent'}
                          {deadline.status === 'expired' && '⚫ Expired'}
                        </span>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {deadline.deadlineType}
                        </span>

                        {deadline.isCompleted && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Filed / Satisfied
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-base font-bold text-slate-900 ${
                          deadline.isCompleted ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {deadline.title}
                      </h4>

                      {deadline.description && (
                        <p className="text-xs text-slate-600">{deadline.description}</p>
                      )}

                      {/* Required Remedy Action */}
                      {deadline.remedyActionRequired && (
                        <div className="text-xs text-slate-800 bg-amber-50/50 p-2 rounded border border-amber-100 mt-1">
                          <span className="font-semibold text-amber-900">Remedy Action:</span>{' '}
                          {deadline.remedyActionRequired}
                        </div>
                      )}

                      {/* Verified Rule / Citation Box */}
                      {deadline.verifiedRuleReference ? (
                        <div className="text-[11px] text-blue-900 bg-blue-50/60 p-2 rounded border border-blue-200/70 mt-1">
                          <div className="font-semibold flex items-center gap-1 text-blue-800">
                            <BookOpen className="w-3 h-3" />
                            Verified Statute: {deadline.verifiedRuleReference.actTitle} -{' '}
                            {deadline.verifiedRuleReference.sectionOrArticle}
                          </div>
                          <div className="text-blue-700 mt-0.5 text-[10px]">
                            Citation: {deadline.verifiedRuleReference.citation}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-slate-400" />
                          Source: Explicit Advocate Entry by {deadline.enteredByName} ({deadline.enteredByRole})
                        </div>
                      )}
                    </div>

                    {/* Right Column: Dates, Days Remaining, Action Controls */}
                    <div className="flex flex-col md:items-end gap-2 shrink-0 md:min-w-[240px]">
                      {/* Days Remaining Pill */}
                      <div className="text-right">
                        <div
                          className={`text-sm font-black ${
                            deadline.status === 'urgent'
                              ? 'text-rose-700'
                              : deadline.status === 'approaching'
                              ? 'text-amber-700'
                              : deadline.status === 'expired'
                              ? 'text-slate-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {deadline.status === 'expired'
                            ? `Expired ${Math.abs(deadline.daysRemaining)} day(s) ago`
                            : deadline.daysRemaining === 0
                            ? 'Due Today (Final Hours)'
                            : `${deadline.daysRemaining} day(s) remaining`}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          Deadline: <strong className="text-slate-800">{deadline.deadlineDate}</strong>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Trigger Start: {deadline.startDate}
                        </div>
                      </div>

                      {/* Timeline Mini-Bar */}
                      <div className="w-full md:w-48 bg-slate-100 rounded-full h-2 overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            deadline.status === 'urgent'
                              ? 'bg-rose-600'
                              : deadline.status === 'approaching'
                              ? 'bg-amber-500'
                              : deadline.status === 'expired'
                              ? 'bg-slate-700'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>

                      {/* Lawyer Controls */}
                      {isLawyerOrAdmin && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 w-full justify-end">
                          <button
                            onClick={() => handleToggleCompleted(deadline)}
                            className={`px-2.5 py-1 text-xs rounded font-semibold transition-colors ${
                              deadline.isCompleted
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {deadline.isCompleted ? 'Mark Pending' : 'Mark as Filed'}
                          </button>

                          <button
                            onClick={() => handleDeleteDeadline(deadline.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete deadline record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Deadline Modal (Strictly Lawyer or Admin) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
            id="modal-add-deadline"
          >
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Procedural Legal Deadline</h3>
                <p className="text-xs text-slate-500">
                  Case: {caseData.title} ({caseData.caseNumber || caseData.id})
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeadline} className="p-6 space-y-5">
              {/* Mandatory AI Anti-Hallucination Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Counselia Integrity Rule:</span> Limitation dates must be derived from verified statutory rules or explicitly entered by an enrolled advocate. Gemini is strictly prohibited from autonomously determining limitation dates.
                </div>
              </div>

              {/* Calculation Source Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Deadline Calculation Source *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormCalculationSource('verified_rule_engine')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      formCalculationSource === 'verified_rule_engine'
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                      <BookOpen className="w-4 h-4 text-blue-700" />
                      Verified Statutory Rule
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Computed strictly using established Indian Acts (CPC, Limitation Act, NI Act, CPA).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCalculationSource('manual_lawyer_entry')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      formCalculationSource === 'manual_lawyer_entry'
                        ? 'bg-amber-50/70 border-amber-600 ring-2 ring-amber-600/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                      <Scale className="w-4 h-4 text-amber-700" />
                      Explicit Advocate Entry
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Direct date fixed by court diary, specific judge order, or notice cure terms.
                    </p>
                  </button>
                </div>
              </div>

              {/* Verified Rule Selection (If Rule Engine) */}
              {formCalculationSource === 'verified_rule_engine' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Verified Statutory Limitation Rule *
                    </label>
                    <select
                      value={formSelectedRuleId}
                      onChange={(e) => handleRuleChange(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {verifiedRules.map((rule) => (
                        <option key={rule.ruleId} value={rule.ruleId}>
                          {rule.actTitle} - {rule.sectionOrArticle} ({rule.standardPeriodDays} days)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedRule && (
                    <div className="text-xs text-slate-700 space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="font-semibold text-slate-900">Statutory Formula:</span>{' '}
                        {selectedRule.standardPeriodDays} calendar days from trigger event ({selectedRule.triggerEventDescription}).
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Statutory Citation:</span>{' '}
                        <span className="font-mono text-blue-800">{selectedRule.officialSourceCitation}</span>
                      </div>
                      <div className="text-slate-600 italic mt-0.5">{selectedRule.description}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Title / Action Required */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Legal Deadline Title / Remedy Action *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Written Statement / Reply Filing under CPC Order VIII Rule 1"
                  required
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Deadline Type & Forum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deadline Type *</label>
                  <select
                    value={formDeadlineType}
                    onChange={(e) => setFormDeadlineType(e.target.value as DeadlineType)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {DEADLINE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Governing Forum / Court</label>
                  <input
                    type="text"
                    value={formForum}
                    onChange={(e) => setFormForum(e.target.value)}
                    placeholder="e.g. Saket District Court, Courtroom 302"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trigger Event / Start Date *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">
                    {selectedRule?.triggerEventDescription || 'Date summons/notice served'}
                  </span>
                </div>

                {formCalculationSource === 'manual_lawyer_entry' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Explicit Deadline Date *
                    </label>
                    <input
                      type="date"
                      value={formManualDeadlineDate}
                      onChange={(e) => setFormManualDeadlineDate(e.target.value)}
                      required
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Confirmed by Advocate</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Computed Deadline Cutoff (Statutory)
                    </label>
                    <div className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900">
                      {computedPreviewDeadlineDate || 'Select valid start date'}
                    </div>
                    <span className="text-[10px] text-blue-700 font-medium">
                      Calculated: {selectedRule?.standardPeriodDays} days from trigger date
                    </span>
                  </div>
                )}
              </div>

              {/* Remedy Action Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pleadings / Remedy Action Required
                </label>
                <textarea
                  value={formRemedyAction}
                  onChange={(e) => setFormRemedyAction(e.target.value)}
                  placeholder="e.g. Finalize written statement with supporting affidavit of admission/denial."
                  rows={2}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Advocate Case Notes</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional internal reminder or document status"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  id="btn-confirm-add-deadline"
                >
                  {isSubmitting ? 'Recording...' : 'Record & Track Deadline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
