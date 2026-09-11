import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Printer,
  Share2,
  Trash2,
  Edit,
  History,
  Scale,
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { AdvocateDraft, AdvocateAuditLog, LegalCase } from '../../types.js';
import { api } from '../../services/api.js';
import { exportDraftToDocx, downloadDocxFile, printDraftAsPdf } from '../../utils/docxExport.js';
import { Card, Button, Badge, Modal, EmptyState } from '../ui/index.js';

interface AdvocateDraftsListViewProps {
  cases: LegalCase[];
  onOpenDraftInWorkspace: (draft: AdvocateDraft) => void;
  onNavigateToDrafting: () => void;
  onNavigateToResearch: () => void;
}

export const AdvocateDraftsListView: React.FC<AdvocateDraftsListViewProps> = ({
  cases,
  onOpenDraftInWorkspace,
  onNavigateToDrafting,
  onNavigateToResearch
}) => {
  const [drafts, setDrafts] = useState<AdvocateDraft[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdvocateAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'drafts' | 'audit'>('drafts');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('');

  // Modals
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdvocateAuditLog | null>(null);

  useEffect(() => {
    loadDraftsAndLogs();
  }, []);

  const loadDraftsAndLogs = async () => {
    setLoading(true);
    try {
      const [draftsRes, logsRes] = await Promise.all([
        api.getAdvocateDrafts(),
        api.getAdvocateAuditLogs().catch(() => ({ logs: [] }))
      ]);
      setDrafts(draftsRes.drafts || []);
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to load drafts / audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this draft from your workspace?')) return;
    try {
      await api.deleteAdvocateDraft(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete draft');
    }
  };

  const handleShareWithClient = async (draft: AdvocateDraft, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draft.caseId) {
      alert('This draft is not associated with an active matter. Link a matter to share with client.');
      return;
    }
    if (!window.confirm(`Share verified draft "${draft.title}" with client? It will be deposited in their Case Documents vault.`)) return;

    try {
      await api.shareDraftWithClient(draft.id);
      setDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? { ...d, isSharedWithClient: true, status: 'FINAL' } : d))
      );
      alert('Draft shared with client successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to share draft');
    }
  };

  const filteredDrafts = drafts.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.caseNumber && d.caseNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (d.clientName && d.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      d.documentType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || d.status === statusFilter;
    const matchesDocType = !docTypeFilter || d.documentType === docTypeFilter;
    return matchesSearch && matchesStatus && matchesDocType;
  });

  return (
    <div id="advocate-drafts-list-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              Counselia Drafts Repository
            </span>
            <span className="text-xs text-slate-500 font-mono">/lawyer/drafts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            Counselia Drafts & Pleadings
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Counsel draft library with automatic version tracking, Word/PDF document generation, and direct client sharing workflows.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateToDrafting}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create New Counselia Draft
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToResearch}
            leftIcon={<Scale className="w-3.5 h-3.5 text-amber-700" />}
          >
            Counselia Legal Research
          </Button>
        </div>
      </div>

      {/* Navigation Tabs (Drafts vs. Advocate Audit Trail) */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('drafts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'drafts'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Pleadings & Drafts ({drafts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-amber-600 text-amber-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          Advocate Practice Audit Trail ({auditLogs.length})
        </button>
      </div>

      {activeTab === 'drafts' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <Card variant="default" className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by draft title, client, or case number..."
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="FINAL">FINAL</option>
                </select>
              </div>

              <div>
                <select
                  value={docTypeFilter}
                  onChange={(e) => setDocTypeFilter(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">All Document Types</option>
                  <option value="Legal Notice">Legal Notice</option>
                  <option value="Cheque Bounce Notice">Cheque Bounce Notice</option>
                  <option value="Bail Application">Bail Application</option>
                  <option value="Written Statement">Written Statement</option>
                  <option value="Consumer Complaint">Consumer Complaint</option>
                  <option value="Writ Petition">Writ Petition</option>
                  <option value="Plaint">Plaint</option>
                  <option value="Affidavit">Affidavit</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Drafts List */}
          {loading ? (
            <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Loading advocate drafts...</p>
            </div>
          ) : filteredDrafts.length === 0 ? (
            <EmptyState
              title="No Drafts Found"
              description="No legal drafts match the current filter criteria."
              actionLabel="Create New Draft"
              onAction={onNavigateToDrafting}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredDrafts.map((draft) => (
                <Card
                  key={draft.id}
                  variant="default"
                  className="p-5 border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => onOpenDraftInWorkspace(draft)}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold font-serif text-slate-900 hover:text-amber-800 transition-colors">
                        {draft.title}
                      </h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          draft.status === 'FINAL'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : draft.status === 'UNDER_REVIEW'
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {draft.status}
                      </span>
                      {draft.isSharedWithClient && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                          Shared with Client
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-700">
                        {draft.documentType}
                      </span>
                      {draft.caseNumber && (
                        <span>• Matter: <strong>{draft.caseNumber}</strong> ({draft.clientName})</span>
                      )}
                      {draft.courtDetails && (
                        <span>• {draft.courtDetails}</span>
                      )}
                      <span>• {draft.versions?.length || 1} Version{draft.versions?.length === 1 ? '' : 's'}</span>
                      <span>• Modified: {new Date(draft.updatedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenDraftInWorkspace(draft)}
                      leftIcon={<Edit className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const blob = await exportDraftToDocx(draft);
                          downloadDocxFile(blob, `${(draft.title || 'Legal_Draft').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`);
                        } catch (err: any) {
                          alert('Failed to export Word document: ' + (err.message || err));
                        }
                      }}
                      title="Export formatted Word file"
                    >
                      Word
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => printDraftAsPdf(draft)}
                      title="Print or Save PDF"
                    >
                      PDF
                    </Button>

                    {draft.caseId && !draft.isSharedWithClient && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => handleShareWithClient(draft, e)}
                        leftIcon={<Share2 className="w-3.5 h-3.5" />}
                        title="Share with client"
                      >
                        Share
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteDraft(draft.id, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete draft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Audit Trail Tab */
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Advocate Practice Audit Log:</span> Counselia maintains an immutable record of precedent queries, saved authorities, draft revisions, and client sharing actions to support professional practice accountability.
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500 italic">
              No practice logs recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-3 font-semibold">Timestamp</th>
                    <th className="p-3 font-semibold">Action</th>
                    <th className="p-3 font-semibold">Matter / Docket</th>
                    <th className="p-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] border border-slate-200">
                          {log.actionLabel || log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        {log.caseNumber || 'General Practice'}
                      </td>
                      <td className="p-3 text-slate-600 leading-relaxed max-w-md">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
