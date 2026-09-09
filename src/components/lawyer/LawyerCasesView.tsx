import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Calendar,
  Clock,
  ArrowRight,
  FileText,
  MessageSquare,
  History,
  Shield,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { LegalCase, LawyerProfile } from '../../types.js';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  EmptyState
} from '../ui/index.js';

interface LawyerCasesViewProps {
  cases: LegalCase[];
  lawyer: LawyerProfile;
  onOpenCaseRoom: (caseId: string, tab?: string) => void;
  onNavigate: (view: string) => void;
}

export const LawyerCasesView: React.FC<LawyerCasesViewProps> = ({
  cases,
  lawyer,
  onOpenCaseRoom,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter cases assigned to this lawyer
  const lawyerCases = cases.filter(
    (c) => c.lawyerId === lawyer.id || c.implementationState === 'Active' || c.implementationState === 'Lawyer Accepted'
  );

  const filteredCases = lawyerCases.filter((c) => {
    // Stage filter
    if (stageFilter !== 'all' && c.stage !== stageFilter) {
      return false;
    }
    // Status filter
    if (statusFilter === 'active' && c.stage === 'Closed') return false;
    if (statusFilter === 'closed' && c.stage !== 'Closed') return false;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(term);
      const matchNumber = c.caseNumber.toLowerCase().includes(term);
      const matchClient = c.clientName ? c.clientName.toLowerCase().includes(term) : false;
      const matchCourt = c.courtName ? c.courtName.toLowerCase().includes(term) : false;
      const matchCNR = c.filingNumber ? c.filingNumber.toLowerCase().includes(term) : false;
      if (!matchTitle && !matchNumber && !matchClient && !matchCourt && !matchCNR) {
        return false;
      }
    }
    return true;
  });

  const activeCount = lawyerCases.filter((c) => c.stage !== 'Closed').length;
  const inCourtCount = lawyerCases.filter((c) => c.stage === 'In Court').length;
  const closedCount = lawyerCases.filter((c) => c.stage === 'Closed').length;

  return (
    <div id="lawyer-cases-workbench" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">
            Advocate Caseload & Case Rooms ({lawyerCases.length})
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage stage progression, confidential vaults, court cause lists, and client communication for active proceedings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('lawyer-requests')}
          >
            Review Case Requests
          </Button>
        </div>
      </div>

      {/* Stage Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => { setStageFilter('all'); setStatusFilter('all'); }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${stageFilter === 'all' && statusFilter === 'all' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-xs text-slate-500 font-medium">All Caseload</span>
          <p className="text-xl font-bold font-serif text-slate-900 mt-0.5">{lawyerCases.length}</p>
          <span className="text-[10px] text-slate-500">Total matters</span>
        </div>

        <div
          onClick={() => { setStageFilter('In Court'); setStatusFilter('all'); }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${stageFilter === 'In Court' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-xs text-slate-500 font-medium">In Court</span>
          <p className="text-xl font-bold font-serif text-amber-800 mt-0.5">{inCourtCount}</p>
          <span className="text-[10px] text-amber-600">Active trial & hearings</span>
        </div>

        <div
          onClick={() => { setStageFilter('all'); setStatusFilter('active'); }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${statusFilter === 'active' && stageFilter === 'all' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-xs text-slate-500 font-medium">Active Matters</span>
          <p className="text-xl font-bold font-serif text-sky-800 mt-0.5">{activeCount}</p>
          <span className="text-[10px] text-sky-600">Pre-trial & in progress</span>
        </div>

        <div
          onClick={() => { setStageFilter('Closed'); setStatusFilter('all'); }}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${stageFilter === 'Closed' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <span className="text-xs text-slate-500 font-medium">Concluded / Decreed</span>
          <p className="text-xl font-bold font-serif text-emerald-800 mt-0.5">{closedCount}</p>
          <span className="text-[10px] text-emerald-600">Decreed matters</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="default" className="p-4 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by case title, client name, CNR or case number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            label=""
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Case Stages' },
              { value: 'Notice Sent', label: 'Stage: Notice Sent' },
              { value: 'Reply Received', label: 'Stage: Reply Received' },
              { value: 'In Court', label: 'Stage: In Court' },
              { value: 'Closed', label: 'Stage: Closed' },
            ]}
          />

          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Status: Active Only' },
              { value: 'closed', label: 'Status: Closed Only' },
            ]}
          />
        </div>
      </Card>

      {/* Case List */}
      {filteredCases.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-10 h-10 text-slate-400" />}
          title="No Cases Found Matching Filters"
          description="Try adjusting your stage or search filter, or check incoming inquiries."
          actionLabel="View All Caseload"
          onAction={() => {
            setSearchTerm('');
            setStageFilter('all');
            setStatusFilter('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCases.map((c) => {
            const isClosed = c.stage === 'Closed';
            return (
              <Card
                key={c.id}
                variant="default"
                className="p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-all cursor-pointer"
                onClick={() => onOpenCaseRoom(c.id, 'overview')}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {c.caseNumber}
                      </span>
                      <Badge variant="primary" size="sm">
                        {c.category}
                      </Badge>
                      <Badge
                        variant={
                          c.stage === 'Closed'
                            ? 'neutral'
                            : c.stage === 'In Court'
                            ? 'warning'
                            : 'success'
                        }
                        size="sm"
                      >
                        Stage: {c.stage}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {c.implementationState || 'Active'}
                      </Badge>
                      {c.isUrgent && (
                        <Badge variant="danger" size="sm">
                          Urgent
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 tracking-tight hover:text-amber-700 transition-colors">
                      {c.title}
                    </h3>

                    <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Client: <strong className="text-slate-700">{c.clientName || 'Client'}</strong></span>
                      <span>•</span>
                      <span>Court: <strong className="text-slate-700">{c.courtName || 'District Court, Delhi'}</strong></span>
                      {c.judgeName && (
                        <>
                          <span>•</span>
                          <span>Coram: <strong className="text-slate-700">{c.judgeName}</strong></span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Primary Action Button */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenCaseRoom(c.id, 'overview')}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Open Case Room
                    </Button>
                  </div>
                </div>

                {/* Sub-feature Deep Links */}
                <div
                  className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => onOpenCaseRoom(c.id, 'documents')}
                      className="text-slate-600 hover:text-amber-800 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Documents ({c.documentsCount || 3})
                    </button>

                    <button
                      onClick={() => onOpenCaseRoom(c.id, 'chat')}
                      className="text-slate-600 hover:text-amber-800 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      Privileged Chat
                    </button>

                    <button
                      onClick={() => onOpenCaseRoom(c.id, 'timeline')}
                      className="text-slate-600 hover:text-amber-800 font-medium inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Hearing Diary & Orders
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {c.nextHearingDate ? (
                      <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Next Hearing: {c.nextHearingDate}
                      </span>
                    ) : (
                      <span className="text-slate-400">Next date not listed</span>
                    )}
                    {c.filingNumber && (
                      <span className="font-mono text-slate-500">CNR: {c.filingNumber}</span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
