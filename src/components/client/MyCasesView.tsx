import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Calendar,
  Clock,
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  User,
  Star,
  Gavel,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
import { LegalCase, LawyerProfile } from '../../types.js';
import { ReviewCaseModal } from './ReviewCaseModal.js';

interface MyCasesViewProps {
  cases: LegalCase[];
  lawyers: LawyerProfile[];
  onOpenCaseRoom: (caseId: string, subTab?: string) => void;
  onSubmitCaseClick: () => void;
  onRefreshCases?: () => void;
}

export const MyCasesView: React.FC<MyCasesViewProps> = ({
  cases,
  lawyers,
  onOpenCaseRoom,
  onSubmitCaseClick,
  onRefreshCases
}) => {
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseForReview, setSelectedCaseForReview] = useState<LegalCase | null>(null);

  // Compute action required based on case stage and fee state
  const getActionRequired = (c: LegalCase) => {
    if (c.stage === 'Closed' || c.status === 'closed' || c.status === 'resolved') {
      return {
        label: 'Case Concluded — Review Counsel',
        variant: 'success',
        urgent: false,
        action: 'review'
      };
    }
    if (c.paidAmount < c.totalFee) {
      return {
        label: `Pay Pending Fee Milestone (₹${(c.totalFee - c.paidAmount).toLocaleString('en-IN')})`,
        variant: 'danger',
        urgent: true,
        action: 'billing'
      };
    }
    if (c.nextHearingDate) {
      return {
        label: `Court Appearance Scheduled (${new Date(c.nextHearingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`,
        variant: 'warning',
        urgent: false,
        action: 'timeline'
      };
    }
    if (c.stage === 'Notice Sent') {
      return {
        label: 'Await Statutory 15-Day Reply Window',
        variant: 'info',
        urgent: false,
        action: 'timeline'
      };
    }
    if (c.stage === 'Reply Received') {
      return {
        label: 'Rejoinder / Plaint Filing Instructions',
        variant: 'purple',
        urgent: false,
        action: 'chat'
      };
    }
    return {
      label: 'Advocate Evaluating Legal Record',
      variant: 'neutral',
      urgent: false,
      action: 'overview'
    };
  };

  const filteredCases = cases.filter((c) => {
    const matchesFilter =
      filterStage === 'all'
        ? true
        : filterStage === 'active'
        ? c.stage !== 'Closed' && c.status !== 'closed'
        : filterStage === 'closed'
        ? c.stage === 'Closed' || c.status === 'closed' || c.status === 'resolved'
        : filterStage === 'court'
        ? c.stage === 'In Court' || !!c.nextHearingDate
        : c.stage === filterStage;

    const matchesSearch =
      searchQuery.trim() === '' ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lawyerName && c.lawyerName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div id="client-my-cases-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Citizen Case Records
          </span>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 mt-2">
            My Legal Matters
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            View detailed case summaries, advocate assignments, next hearing cause lists, and actions required.
          </p>
        </div>

        <button
          onClick={onSubmitCaseClick}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit New Case</span>
        </button>
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Matters', count: cases.length },
            { id: 'active', label: 'Active Pipeline', count: cases.filter((c) => c.stage !== 'Closed').length },
            { id: 'court', label: 'In Court / Hearings', count: cases.filter((c) => c.stage === 'In Court' || !!c.nextHearingDate).length },
            { id: 'closed', label: 'Concluded / Closed', count: cases.filter((c) => c.stage === 'Closed' || c.status === 'closed').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStage(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterStage === tab.id
                  ? 'bg-amber-600 text-white font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterStage === tab.id ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by case name, CNR, advocate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-amber-600 bg-slate-50"
          />
        </div>
      </div>

      {/* Cases List */}
      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Legal Cases Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No records matching "${searchQuery}". Try adjusting your search query.`
              : 'You have no legal cases registered under this status.'}
          </p>
          <button
            onClick={onSubmitCaseClick}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit a New Case</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCases.map((c) => {
            const action = getActionRequired(c);
            const isClosed = c.stage === 'Closed' || c.status === 'closed' || c.status === 'resolved';

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400/80 transition-all overflow-hidden flex flex-col"
              >
                {/* Top Status & CNR Bar */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[11px] text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {c.caseNumber}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                      {c.category}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                      isClosed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : c.stage === 'In Court'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      Stage: {c.stage}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Updated: <strong className="text-slate-700 font-medium">
                        {new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Main Card Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <h2
                        onClick={() => onOpenCaseRoom(c.id, 'overview')}
                        className="text-base sm:text-lg font-bold font-serif text-slate-900 hover:text-amber-700 cursor-pointer transition-colors"
                      >
                        {c.title}
                      </h2>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    </div>

                    {/* Action Required Box */}
                    <div className="shrink-0 bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-w-[240px] space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Action Required
                      </span>
                      <p className={`font-bold text-xs ${
                        action.urgent ? 'text-rose-700' : isClosed ? 'text-emerald-700' : 'text-slate-800'
                      }`}>
                        {action.label}
                      </p>
                    </div>
                  </div>

                  {/* 4 Details Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                    {/* Column 1: Assigned Lawyer */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Assigned Lawyer
                      </span>
                      <p className="font-bold text-slate-900 truncate">
                        {c.lawyerName || 'Assignment in Progress'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {c.lawyerId ? 'Verified Bar Counsel' : 'Evaluating match'}
                      </p>
                    </div>

                    {/* Column 2: Last Update */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Last Case Update
                      </span>
                      <p className="font-bold text-slate-900 truncate">
                        {c.stage === 'Closed'
                          ? 'Matter Concluded & Decreed'
                          : c.stage === 'In Court'
                          ? 'Listed before Court'
                          : c.stage === 'Reply Received'
                          ? 'Notice Response In Record'
                          : 'Statutory Notice Dispatched'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>

                    {/* Column 3: Next Hearing */}
                    <div className={`p-3 rounded-xl border space-y-0.5 ${
                      c.nextHearingDate
                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                        : 'bg-slate-50 border-slate-100 text-slate-600'
                    }`}>
                      <span className="text-[10px] font-bold uppercase block flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Next Court Hearing
                      </span>
                      <p className="font-bold truncate">
                        {c.nextHearingDate
                          ? new Date(c.nextHearingDate).toLocaleDateString('en-IN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short'
                            })
                          : 'None Scheduled'}
                      </p>
                      <p className="text-[11px] truncate">
                        {c.courtName || (c.city ? `${c.city} District Court` : 'Pre-Filing Stage')}
                      </p>
                    </div>

                    {/* Column 4: Financial Balance */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Fee Milestone Status
                      </span>
                      <p className="font-bold text-slate-900 font-mono">
                        ₹{c.paidAmount.toLocaleString('en-IN')} / ₹{c.totalFee.toLocaleString('en-IN')}
                      </p>
                      <p className={`text-[11px] font-medium ${c.paidAmount >= c.totalFee ? 'text-emerald-600' : 'text-amber-700'}`}>
                        {c.paidAmount >= c.totalFee ? 'All Milestones Settled' : `₹${(c.totalFee - c.paidAmount).toLocaleString('en-IN')} Pending`}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenCaseRoom(c.id, 'overview')}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <span>Case Overview</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenCaseRoom(c.id, 'chat')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                      >
                        Encrypted Chat
                      </button>

                      <button
                        onClick={() => onOpenCaseRoom(c.id, 'documents')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                      >
                        Evidence & Docs ({c.documentsCount || 0})
                      </button>

                      <button
                        onClick={() => onOpenCaseRoom(c.id, 'timeline')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                      >
                        Court Diary
                      </button>
                    </div>

                    {/* Review CTA: Only allowed for closed cases */}
                    {isClosed ? (
                      <button
                        onClick={() => setSelectedCaseForReview(c)}
                        className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>Write Verified Review</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Reviews available after case closure
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedCaseForReview && (
        <ReviewCaseModal
          isOpen={!!selectedCaseForReview}
          onClose={() => setSelectedCaseForReview(null)}
          caseData={selectedCaseForReview}
          onSuccess={() => {
            if (onRefreshCases) onRefreshCases();
          }}
        />
      )}
    </div>
  );
};
