import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Save,
  Download,
  Printer,
  Share2,
  AlertTriangle,
  CheckCircle2,
  History,
  Scale,
  ArrowRight,
  BookOpen,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Check,
  Building2,
  HelpCircle,
  Copy
} from 'lucide-react';
import {
  LegalCase,
  AdvocateDraft,
  AdvocateDraftVersion,
  AdvocateDraftStatus,
  AdvocateSavedAuthority
} from '../../types.js';
import { api } from '../../services/api.js';
import { exportDraftToDocx, downloadDocxFile, printDraftAsPdf } from '../../utils/docxExport.js';
import { Card, Button, Badge, Modal, Input, Select, Textarea } from '../ui/index.js';

interface AdvocateDraftingWorkspaceProps {
  cases: LegalCase[];
  preloadedAuthority?: any;
  preselectedCaseId?: string;
  onNavigateToResearch: () => void;
  onNavigateToDrafts: () => void;
  onOpenCaseRoom?: (caseId: string, tab?: string) => void;
}

const DOCUMENT_TYPES = [
  'Bail Application',
  'Written Statement',
  'Legal Notice',
  'Consumer Complaint',
  'Cheque Bounce Notice',
  'Writ Petition',
  'Plaint',
  'Affidavit',
  'Appeal',
  'Caveat',
  'Special Leave Petition',
  'Revision Petition'
];

export const AdvocateDraftingWorkspace: React.FC<AdvocateDraftingWorkspaceProps> = ({
  cases,
  preloadedAuthority,
  preselectedCaseId,
  onNavigateToResearch,
  onNavigateToDrafts,
  onOpenCaseRoom
}) => {
  // Configuration State
  const [selectedCaseId, setSelectedCaseId] = useState<string>(preselectedCaseId || '');
  const [documentType, setDocumentType] = useState<string>('Legal Notice');
  const [draftTitle, setDraftTitle] = useState<string>('Legal Notice under Section 138 NI Act');
  const [courtDetails, setCourtDetails] = useState<string>('Court of Metropolitan Magistrate, Tis Hazari Courts, Delhi');
  const [jurisdiction, setJurisdiction] = useState<string>('Civil & Criminal Original Jurisdiction');
  const [clientName, setClientName] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [statutorySections, setStatutorySections] = useState<string>('Section 138, Negotiable Instruments Act, 1881');
  const [legalPurpose, setLegalPurpose] = useState<string>('Demand payment for dishonoured cheque returned unpaid with memo "Funds Insufficient"');
  const [factualParticulars, setFactualParticulars] = useState<string>('Cheque No. 492012 dated 15-08-2024 drawn on HDFC Bank was returned unpaid on 22-08-2024. Notice issued within 30 days.');

  // Authorities State
  const [selectedAuthorities, setSelectedAuthorities] = useState<any[]>(
    preloadedAuthority ? [preloadedAuthority] : []
  );

  // Editor & Draft State
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string>('');
  const [draftStatus, setDraftStatus] = useState<AdvocateDraftStatus>('DRAFT');
  const [versions, setVersions] = useState<AdvocateDraftVersion[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Missing info detection
  const [missingTags, setMissingTags] = useState<string[]>([]);
  const [activeVersionView, setActiveVersionView] = useState<number | null>(null);

  // Sync when case selection changes
  useEffect(() => {
    if (selectedCaseId) {
      const c = cases.find((item) => item.id === selectedCaseId);
      if (c) {
        setClientName(c.clientName || '');
        if (c.opponentName) setOpponentName(c.opponentName);
        if (c.courtName) setCourtDetails(c.courtName);
        if (c.disputedAmount) setAmount(String(c.disputedAmount));
        setDraftTitle(`${documentType} - ${c.caseNumber || c.title}`);
      }
    }
  }, [selectedCaseId]);

  // Sync if preloadedAuthority arrives
  useEffect(() => {
    if (preloadedAuthority) {
      if (!selectedAuthorities.some((a) => a.citation === preloadedAuthority.citation)) {
        setSelectedAuthorities((prev) => [...prev, preloadedAuthority]);
      }
    }
  }, [preloadedAuthority]);

  // Parse [INFORMATION REQUIRED: ...] tags from draftContent
  useEffect(() => {
    if (!draftContent) {
      setMissingTags([]);
      return;
    }
    const regex = /\[INFORMATION REQUIRED:[^\]]+\]/gi;
    const matches = draftContent.match(regex);
    if (matches) {
      const uniqueTags = Array.from(new Set(matches));
      setMissingTags(uniqueTags);
    } else {
      setMissingTags([]);
    }
  }, [draftContent]);

  // AI Draft Generation Call
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setSaveSuccess(false);

    const activeCase = cases.find((c) => c.id === selectedCaseId);

    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...((localStorage.getItem('counselia_auth_token') || localStorage.getItem('lawshin_auth_token'))
            ? { Authorization: `Bearer ${localStorage.getItem('counselia_auth_token') || localStorage.getItem('lawshin_auth_token')}` }
            : {})
        },
        body: JSON.stringify({
          documentType,
          courtDetails,
          jurisdiction,
          caseId: selectedCaseId || undefined,
          caseTitle: activeCase?.title || draftTitle,
          clientName: clientName || activeCase?.clientName,
          opponentName: opponentName || activeCase?.opponentName,
          amount: amount || undefined,
          describeNeed: legalPurpose,
          facts: factualParticulars,
          relevantSections: statutorySections.split(',').map((s) => s.trim()).filter(Boolean),
          authorities: selectedAuthorities
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate legal draft');
      }

      const generatedText = data.draft;
      setDraftContent(generatedText);
      setDraftStatus('DRAFT');

      // Initialize version 1
      const initialVer: AdvocateDraftVersion = {
        id: `v_${Date.now()}_1`,
        versionNumber: 1,
        title: 'Initial Draft (AI Assisted)',
        content: generatedText,
        status: 'DRAFT',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'Advocate AI Assistant',
        changeSummary: 'Generated from statutory guidelines & case facts.'
      };
      setVersions([initialVer]);
      setActiveVersionView(1);

      // Auto-save to Advocate Drafts
      const savedRes = await api.createAdvocateDraft({
        caseId: selectedCaseId || undefined,
        documentType,
        title: draftTitle || `${documentType} - Draft`,
        content: generatedText,
        courtDetails,
        jurisdiction,
        relevantSections: statutorySections.split(',').map((s) => s.trim()).filter(Boolean),
        authorities: selectedAuthorities,
        status: 'DRAFT'
      });

      if (savedRes.draft) {
        setActiveDraftId(savedRes.draft.id);
        setSaveSuccess(true);
      }
    } catch (err: any) {
      console.error('Draft generation failure:', err);
      setGenerationError(err.message || 'Draft generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Manual Save / Version Update
  const handleSaveDraft = async () => {
    if (!draftContent) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (activeDraftId) {
        const updateRes = await api.updateAdvocateDraft(activeDraftId, {
          title: draftTitle,
          content: draftContent,
          status: draftStatus,
          courtDetails,
          jurisdiction,
          changeSummary: `Counsel edits saved. Status: ${draftStatus}.`
        });
        if (updateRes.draft) {
          setVersions(updateRes.draft.versions || []);
          setActiveVersionView(updateRes.draft.versions?.length || 1);
        }
      } else {
        const createRes = await api.createAdvocateDraft({
          caseId: selectedCaseId || undefined,
          documentType,
          title: draftTitle,
          content: draftContent,
          courtDetails,
          jurisdiction,
          relevantSections: statutorySections.split(',').map((s) => s.trim()).filter(Boolean),
          authorities: selectedAuthorities,
          status: draftStatus
        });
        if (createRes.draft) {
          setActiveDraftId(createRes.draft.id);
          setVersions(createRes.draft.versions || []);
          setActiveVersionView(1);
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save draft document');
    } finally {
      setIsSaving(false);
    }
  };

  // Share with Client Action
  const handleShareWithClient = async () => {
    if (!activeDraftId) {
      alert('Please save the draft before sharing with the client.');
      return;
    }
    if (!selectedCaseId) {
      alert('Please associate this draft with an active client case to share it into their Case Room.');
      return;
    }

    const confirmShare = window.confirm(
      'Are you sure you want to share this counsel-verified draft with the client? It will be published to their Case Documents vault and they will receive an immediate notification.'
    );
    if (!confirmShare) return;

    try {
      await api.shareDraftWithClient(activeDraftId);
      setDraftStatus('FINAL');
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to share draft with client');
    }
  };

  const getDraftPayload = (): AdvocateDraft => {
    const c = cases.find((item) => item.id === selectedCaseId);
    return {
      id: activeDraftId || `draft_tmp_${Date.now()}`,
      caseId: selectedCaseId || undefined,
      caseNumber: c?.caseNumber,
      caseTitle: c?.title,
      clientName: clientName || c?.clientName,
      opponentName: opponentName || c?.opponentName,
      lawyerId: '',
      lawyerName: '',
      documentType,
      title: draftTitle,
      content: draftContent,
      courtDetails,
      courtName: courtDetails,
      jurisdiction,
      relevantSections: statutorySections.split(',').map((s) => s.trim()).filter(Boolean),
      authorities: selectedAuthorities,
      status: draftStatus,
      isSharedWithClient: false,
      versions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Export to Word
  const handleExportWord = async () => {
    if (!draftContent) return;
    try {
      const draftObj = getDraftPayload();
      const blob = await exportDraftToDocx(draftObj);
      downloadDocxFile(blob, `${(draftTitle || 'Legal_Draft').replace(/[^a-zA-Z0-9_-]/g, '_')}.docx`);
    } catch (err: any) {
      alert('Failed to generate Word document: ' + (err.message || err));
    }
  };

  // Print / Save as PDF
  const handlePrintPdf = () => {
    if (!draftContent) return;
    const draftObj = getDraftPayload();
    printDraftAsPdf(draftObj);
  };

  // Replace a specific [INFORMATION REQUIRED] tag with advocate input
  const handleFillPlaceholder = (placeholder: string) => {
    const val = prompt(`Enter verified particulars for ${placeholder}:`);
    if (val && val.trim()) {
      setDraftContent((prev) => prev.split(placeholder).join(val.trim()));
    }
  };

  return (
    <div id="advocate-drafting-workspace-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              Counselia AI Drafting
            </span>
            <span className="text-xs text-slate-500 font-mono">/lawyer/drafting</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            Counselia AI Drafting
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            First-draft legal generator engineered exclusively for advocates. Prepares formal court cause titles, statutory grounds, and prayers with strict non-fabrication guarantees.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToResearch}
            leftIcon={<Scale className="w-3.5 h-3.5 text-amber-700" />}
          >
            Counselia Legal Research
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToDrafts}
            leftIcon={<FileText className="w-3.5 h-3.5 text-slate-700" />}
          >
            Counselia Drafts
          </Button>
        </div>
      </div>

      {/* Mandatory Bar Council Legal Safety Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1">
          <p className="font-bold text-amber-900">
            Mandatory Advocate Verification Protocol:
          </p>
          <p>
            Counselia provides AI-assisted legal research and first-draft generation designed exclusively for legal professionals. It does not provide legal advice, does not establish an attorney-client relationship, and does not replace the professional judgment of an advocate. All facts, legal provisions, citations and authorities must be independently verified by counsel before reliance, submission or filing.
          </p>
        </div>
      </div>

      {/* Grid: Left Column (Pleading Parameters) | Right Column (Drafting Studio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Configuration (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <Card variant="default" className="p-5 space-y-4 border-slate-200">
            <h2 className="text-sm font-bold font-serif text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <FileText className="w-4 h-4 text-amber-700" />
              Pleading Parameters
            </h2>

            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Document Type *
              </label>
              <select
                id="advocate-draft-doctype-select"
                value={documentType}
                onChange={(e) => {
                  setDocumentType(e.target.value);
                  setDraftTitle(`${e.target.value} - Drafting`);
                }}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white font-medium"
              >
                {DOCUMENT_TYPES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Case Docket Linking */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Link to Active Matter / Docket
              </label>
              <select
                id="advocate-draft-case-select"
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">-- Standalone Draft (No Matter Linked) --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} - {c.title} ({c.clientName})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Linking auto-populates client names, opposite parties, and court forums.
              </span>
            </div>

            {/* Court / Forum Details */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Court / Tribunal Forum
              </label>
              <input
                type="text"
                value={courtDetails}
                onChange={(e) => setCourtDetails(e.target.value)}
                placeholder="e.g., Tis Hazari Courts, Delhi High Court"
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300"
              />
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Petitioner / Client</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client Name"
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Respondent / Noticee</label>
                <input
                  type="text"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder="Opposite Party"
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Claim / Dispute Amount (Optional)
              </label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5,00,000"
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300"
              />
            </div>

            {/* Statutory Sections */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Governing Statutory Sections
              </label>
              <input
                type="text"
                value={statutorySections}
                onChange={(e) => setStatutorySections(e.target.value)}
                placeholder="e.g. Section 138 NI Act, Section 438 CrPC"
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300"
              />
            </div>

            {/* Incorporated Authorities */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                  Precedents to Cite ({selectedAuthorities.length})
                </span>
                <button
                  type="button"
                  onClick={onNavigateToResearch}
                  className="text-[11px] text-amber-800 hover:underline font-semibold"
                >
                  + Add Precedent
                </button>
              </div>

              {selectedAuthorities.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No precedents attached yet. Search from Legal Research to incorporate verified ratios.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedAuthorities.map((auth, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{auth.caseName || auth.title}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{auth.citation}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedAuthorities((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grounds & Facts */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Legal Grounds & Purpose *
              </label>
              <textarea
                value={legalPurpose}
                onChange={(e) => setLegalPurpose(e.target.value)}
                placeholder="Specify the prayer, grounds for urgency, or nature of default..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Client Facts & Chronology *
              </label>
              <textarea
                value={factualParticulars}
                onChange={(e) => setFactualParticulars(e.target.value)}
                placeholder="Enter client instructions, dates, transactions, or FIR particulars..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            {/* Generate Action Button */}
            <Button
              id="generate-draft-submit-btn"
              variant="primary"
              size="md"
              disabled={isGenerating}
              onClick={handleGenerateDraft}
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="w-full"
            >
              {isGenerating ? 'Drafting Indian Pleading...' : 'Generate Legal Draft'}
            </Button>

            {generationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                {generationError}
              </div>
            )}
          </Card>

          {/* Missing Information Assistant / Anti-Hallucination Guard */}
          {missingTags.length > 0 && (
            <Card variant="default" className="p-4 bg-amber-50/50 border-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Missing Particulars ({missingTags.length})
                </h3>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Strict Non-Fabrication
                </span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                The AI adhered to anti-hallucination rules and did not invent unverified facts. Click any tag below to insert verified counsel particulars:
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 pt-1">
                {missingTags.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFillPlaceholder(tag)}
                    className="w-full text-left p-2 rounded-lg bg-white border border-amber-300 hover:border-amber-500 text-xs font-mono text-slate-800 flex items-center justify-between group transition-colors"
                  >
                    <span className="truncate">{tag}</span>
                    <span className="text-[10px] text-amber-700 font-semibold shrink-0 group-hover:underline">
                      Fill in
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Pleading Editor Studio (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card variant="default" className="p-5 space-y-4 flex flex-col h-full border-slate-200">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div className="space-y-1 flex-1">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Draft Title"
                  className="font-serif font-bold text-lg text-slate-900 w-full focus:outline-none focus:border-b border-amber-500"
                />
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Status:</span>
                  <select
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as AdvocateDraftStatus)}
                    className="text-xs py-0.5 px-2 rounded border border-slate-300 bg-white font-semibold text-slate-800"
                  >
                    <option value="DRAFT">DRAFT (In Progress)</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="FINAL">FINAL (Counsel Approved)</option>
                  </select>
                  {versions.length > 0 && (
                    <span className="font-mono text-slate-400">
                      • Version {versions.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Toolbar Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={!draftContent || isSaving}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportWord}
                  disabled={!draftContent}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                  title="Export formatted Word document"
                >
                  Word (.docx)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintPdf}
                  disabled={!draftContent}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  title="Print / Save as PDF"
                >
                  Print / PDF
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleShareWithClient}
                  disabled={!draftContent || !selectedCaseId}
                  leftIcon={<Share2 className="w-3.5 h-3.5" />}
                  title="Share counsel-approved draft with client"
                >
                  Share with Client
                </Button>
              </div>
            </div>

            {/* Notifications */}
            {saveSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Pleading draft successfully saved to your Advocate Workspace docket!</span>
              </div>
            )}
            {shareSuccess && (
              <div className="p-2.5 bg-sky-50 border border-sky-300 rounded-lg text-xs text-sky-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span>Verified draft published to client's Case Documents vault. Client has been notified.</span>
              </div>
            )}

            {/* Editor Textarea */}
            <div className="flex-1 min-h-[520px] flex flex-col">
              {!draftContent && !isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-slate-800 text-base">
                    Advocate Drafting Canvas Empty
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md">
                    Configure your pleading parameters on the left panel, attach verified authorities, and click <strong>Generate Legal Draft</strong> to initiate counsel first-draft generation.
                  </p>
                </div>
              ) : isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                  <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-1">
                    <p className="font-serif font-bold text-slate-800 text-sm">
                      Synthesizing Indian Legal Pleading...
                    </p>
                    <p className="text-xs text-slate-500">
                      Structuring cause titles, memo of parties, grounds, and prayers with anti-hallucination protocols.
                    </p>
                  </div>
                </div>
              ) : (
                <textarea
                  id="advocate-draft-editor-textarea"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Legal draft will appear here..."
                  className="w-full flex-1 min-h-[520px] p-4 text-xs font-mono leading-relaxed bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 shadow-inner"
                />
              )}
            </div>

            {/* Version History Quick Strip */}
            {versions.length > 0 && (
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold">Version History:</span>
                  <div className="flex items-center gap-1.5">
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setDraftContent(v.content);
                          setActiveVersionView(v.versionNumber);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                          activeVersionView === v.versionNumber
                            ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        v{v.versionNumber}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-[11px] text-slate-400">
                  Last modified: {new Date(versions[versions.length - 1]?.modifiedAt || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
