import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Shield,
  Download,
  Eye,
  ChevronLeft,
  User,
  Phone,
  Mail,
  Scale,
  Sparkles,
  Paperclip
} from 'lucide-react';
import { LegalCase, CaseDocument, LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';
import {
  Card,
  Button,
  Badge,
  Alert,
  EmptyState,
  LoadingState,
  Modal
} from '../ui/index.js';

interface LawyerCaseRequestsViewProps {
  requestId?: string;
  lawyer: LawyerProfile;
  onNavigate: (view: string, params?: Record<string, any>) => void;
  onOpenCaseRoom: (caseId: string) => void;
  onRefreshCases?: () => void;
}

export const LawyerCaseRequestsView: React.FC<LawyerCaseRequestsViewProps> = ({
  requestId,
  lawyer,
  onNavigate,
  onOpenCaseRoom,
  onRefreshCases
}) => {
  const [requests, setRequests] = useState<(LegalCase & { documents: CaseDocument[] })[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<(LegalCase & { documents: CaseDocument[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectId, setTargetRejectId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [requestId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getLawyerRequests();
      setRequests(data.requests || []);

      if (requestId) {
        const found = data.requests.find((r) => r.id === requestId);
        if (found) {
          setSelectedRequest(found);
        } else {
          // Try fetching by id directly
          try {
            const single = await api.getLawyerRequestById(requestId);
            setSelectedRequest({ ...single.request, documents: single.documents });
          } catch (e) {
            console.error(e);
          }
        }
      } else {
        setSelectedRequest(null);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (caseId: string) => {
    setActionLoading(caseId);
    try {
      await api.takeCaseAction(caseId, 'accept', decisionNotes);
      setSuccessBanner('Case representation accepted! Vakalatnama relationship created and private Case Room access granted.');
      if (onRefreshCases) onRefreshCases();
      await loadRequests();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to accept case');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!targetRejectId) return;
    setActionLoading(targetRejectId);
    try {
      await api.takeCaseAction(targetRejectId, 'reject', decisionNotes);
      setRejectModalOpen(false);
      setTargetRejectId(null);
      setDecisionNotes('');
      if (onRefreshCases) onRefreshCases();
      await loadRequests();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to decline case');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <LoadingState message="Loading client case requests and confidential vaults..." />
      </div>
    );
  }

  // DETAILED VIEW FOR A SPECIFIC CASE REQUEST (/lawyer/requests/[id])
  if (selectedRequest) {
    const isAccepted = selectedRequest.lawyerId === lawyer.id && selectedRequest.implementationState === 'Active';
    return (
      <div id="lawyer-request-detail-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <button
          onClick={() => {
            setSelectedRequest(null);
            window.location.hash = '#lawyer/requests';
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to All Case Requests
        </button>

        {successBanner && (
          <Alert variant="success" title="Case Representation Activated">
            {successBanner}
          </Alert>
        )}

        <Card variant="default" className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedRequest.caseNumber}
                </span>
                <Badge variant="primary" size="sm">
                  {selectedRequest.category}
                </Badge>
                {selectedRequest.isUrgent ? (
                  <Badge variant="danger" size="sm">
                    Urgent Matter
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Standard Timeline
                  </Badge>
                )}
                <Badge variant={isAccepted ? 'success' : 'warning'} size="sm">
                  {isAccepted ? 'Representation Accepted' : selectedRequest.implementationState}
                </Badge>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
                {selectedRequest.title}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Submitted: {new Date(selectedRequest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedRequest.city}, {selectedRequest.state}
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isAccepted ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => onOpenCaseRoom(selectedRequest.id)}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Enter Confidential Case Room
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading === selectedRequest.id}
                    onClick={() => {
                      setTargetRejectId(selectedRequest.id);
                      setRejectModalOpen(true);
                    }}
                  >
                    Decline Request
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    isLoading={actionLoading === selectedRequest.id}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleAccept(selectedRequest.id)}
                  >
                    Accept Representation
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Client Description */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold font-serif text-slate-900 uppercase tracking-wider text-slate-600">
              Client's Factual Statement
            </h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {selectedRequest.description}
            </div>
          </div>

          {/* Client Overview Card */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-amber-100 text-amber-900 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{selectedRequest.clientName || 'Client'}</p>
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <span>{selectedRequest.clientPhone || '+91 98000 00000'}</span>
                  <span>•</span>
                  <span>{selectedRequest.city}, {selectedRequest.state}</span>
                </p>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-amber-200 sm:pl-4">
              <span className="text-xs text-slate-500">Proposed Retainer / Fee</span>
              <p className="text-base font-bold font-mono text-slate-900">
                ₹{(selectedRequest.totalFee || 15000).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Uploaded Evidence Documents */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold font-serif text-slate-900 uppercase tracking-wider text-slate-600">
                Client Evidence & Uploaded Documents ({selectedRequest.documents?.length || 0})
              </h2>
              <span className="text-xs text-slate-500">Privileged & Confidential</span>
            </div>

            {(!selectedRequest.documents || selectedRequest.documents.length === 0) ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No initial files were attached during submission. You can request documents in the Case Room.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedRequest.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-amber-50 text-amber-800 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {doc.fileSize || '1.4 MB'} • Category: <span className="capitalize">{doc.category || 'evidence'}</span>
                        </p>
                      </div>
                    </div>

                    <a
                      href={doc.fileUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                      title="Download / View"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // LIST VIEW (/lawyer/requests)
  return (
    <div id="lawyer-requests-list-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">
            Client Case Inquiries ({requests.length})
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Evaluate client factual statements, jurisdiction, urgency, and attached evidence before accepting vakalatnama representation.
          </p>
        </div>
        <Badge variant="warning" size="md">
          {requests.length} Pending Decision
        </Badge>
      </div>

      {successBanner && (
        <Alert variant="success" title="Case Representation Activated">
          {successBanner}
        </Alert>
      )}

      {requests.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10 text-slate-400" />}
          title="No Pending Case Requests"
          description="You have reviewed all incoming case inquiries. When a client submits a new matter in your practice areas, it will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((c) => (
            <Card key={c.id} variant="default" className="p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {c.caseNumber}
                    </span>
                    <Badge variant="primary" size="sm">
                      {c.category}
                    </Badge>
                    {c.isUrgent ? (
                      <Badge variant="danger" size="sm">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Urgent
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Standard
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">
                      Submitted: {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight hover:text-amber-700 transition-colors">
                    {c.title}
                  </h3>

                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Client: <strong className="text-slate-700">{c.clientName || 'Client'}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {c.city}, {c.state}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(c);
                      window.location.hash = `#lawyer/requests/${c.id}`;
                    }}
                    rightIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Full Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading === c.id}
                    onClick={() => {
                      setTargetRejectId(c.id);
                      setRejectModalOpen(true);
                    }}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    isLoading={actionLoading === c.id}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleAccept(c.id)}
                  >
                    Accept
                  </Button>
                </div>
              </div>

              {/* Client-provided Description */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed line-clamp-3">
                {c.description}
              </div>

              {/* Bottom bar with documents and fee */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <strong>{c.documents?.length || c.documentsCount || 0} Documents</strong> attached
                  </span>
                  <span className="text-slate-400">Location: {c.city}, {c.state}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-600">
                    Estimated Fee: <strong className="font-mono text-slate-900">₹{(c.totalFee || 15000).toLocaleString('en-IN')}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setSelectedRequest(c);
                      window.location.hash = `#lawyer/requests/${c.id}`;
                    }}
                    className="text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    Review Evidence & Statement <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Decline Confirmation Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Decline Case Inquiry"
        subtitle="This matter will be routed back to the open platform pool for alternate advocate representation."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={actionLoading === targetRejectId}
              onClick={handleRejectConfirm}
            >
              Confirm Decline
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Please share an optional reason or remark for the client and platform compliance log:
          </p>
          <textarea
            rows={3}
            value={decisionNotes}
            onChange={(e) => setDecisionNotes(e.target.value)}
            placeholder="e.g. Conflict of interest, jurisdiction out of territorial station, or chamber calendar full..."
            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
        </div>
      </Modal>
    </div>
  );
};
