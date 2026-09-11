import React, { useState } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Copy,
  Check,
  RotateCw,
  FolderDown,
  FileText,
  AlertCircle,
  Scale,
  Building,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../../services/api.js';
import { LegalCase } from '../../types.js';
import { Button, Badge, Card, Textarea, Select, LoadingState, Alert } from '../ui/index.js';

export type DocumentTypeOption =
  | 'Legal Notice'
  | 'Reply to Notice'
  | 'Consumer Complaint'
  | 'Settlement Letter'
  | 'Affidavit'
  | 'Other';

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  'Legal Notice',
  'Reply to Notice',
  'Consumer Complaint',
  'Settlement Letter',
  'Affidavit',
  'Other'
];

interface AIDraftingToolProps {
  cases?: LegalCase[];
  onAttachToCase?: (caseId: string, draftContent: string) => void;
  onNavigateToCaseRoom?: (caseId: string, tab?: string) => void;
}

export const AIDraftingTool: React.FC<AIDraftingToolProps> = ({
  cases = [],
  onAttachToCase,
  onNavigateToCaseRoom
}) => {
  // Input states
  const [documentType, setDocumentType] = useState<DocumentTypeOption>('Legal Notice');
  const [otherDocumentType, setOtherDocumentType] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [describeNeed, setDescribeNeed] = useState('');
  const [additionalFacts, setAdditionalFacts] = useState('');

  // Generation & Result states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [isEdited, setIsEdited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Save to Case Document Vault states
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedDocTitle, setSavedDocTitle] = useState('');

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  // Handle case selection change
  const handleCaseChange = (caseId: string) => {
    setSelectedCaseId(caseId);
    setSavedSuccess(false);

    if (caseId) {
      const found = cases.find((c) => c.id === caseId);
      if (found && !describeNeed && !additionalFacts) {
        // Helpful initial context from the selected case
        setDescribeNeed(`Draft formal ${documentType} for ${found.title} concerning ${found.category} matter.`);
        setAdditionalFacts(
          `Case Number: ${found.caseNumber}\nClient: ${found.clientName}\nOpponent: ${found.opponentName || 'Opposite Party'}\nFacts Overview: ${found.description || 'Details of dispute'}`
        );
      }
    }
  };

  // Quick Preset Helper for Advocate convenience
  const handleLoadSample = (type: DocumentTypeOption) => {
    setDocumentType(type);
    setErrorMessage(null);
    setSavedSuccess(false);

    if (type === 'Legal Notice') {
      setDescribeNeed('Demand refund of withheld tenancy security deposit of ₹1,40,000 within 15 statutory days with 18% per annum interest, failing which civil suit and criminal proceedings for breach of trust will be initiated.');
      setAdditionalFacts('Tenancy agreement dated 1 March 2024 for Flat 402, Bellandur. Monthly rent ₹35,000 punctually paid. Vacated on 28 February 2025 after 1 month advance notice. Handover acknowledged in writing. Landlord withheld ₹1,40,000 without bills or legitimate deductions.');
    } else if (type === 'Reply to Notice') {
      setDescribeNeed('Comprehensive formal reply refuting allegations in statutory demand notice dated 15 Jan 2025, denying any outstanding liability and reserving counter-claims.');
      setAdditionalFacts('Opponent falsely claimed non-delivery of goods. Goods were duly delivered via Waybill #49102 on 12 Nov 2024 and acknowledged by opponent warehouse supervisor. Demanding withdrawal of frivolous notice within 7 days.');
    } else if (type === 'Consumer Complaint') {
      setDescribeNeed('Draft formal Consumer Complaint under Section 35 of Consumer Protection Act 2019 for deficiency in service and unfair trade practice against authorized electronics manufacturer and retailer.');
      setAdditionalFacts('Purchased 55-inch Smart TV on 10 Oct 2024 for ₹64,990 with 2-year warranty. Display panel ceased functioning on 20 Nov 2024. Manufacturer rejected warranty claim citing fabricated physical damage without inspection.');
    } else if (type === 'Settlement Letter') {
      setDescribeNeed('Without prejudice proposal for amicable settlement of commercial dispute under Order 23 Rule 3 CPC prior to trial listing.');
      setAdditionalFacts('Pending commercial claim of ₹5,20,000. Client offers to accept ₹4,50,000 in two equal tranches within 30 days in full and final satisfaction, subject to mutual release and disposal of proceedings.');
    } else if (type === 'Affidavit') {
      setDescribeNeed('Affidavit in support of application for condonation of delay under Section 5 of Limitation Act in filing written statement.');
      setAdditionalFacts('Notice received on 5 Dec 2024. Advocate counsel suffered viral illness and hospitalization between 15 Dec - 10 Jan 2025 as per attached medical certificate. Delay of 18 days is bona fide and non-deliberate.');
    } else {
      setDescribeNeed('Formal legal document draft outlining rights, liabilities, and statutory remedies.');
      setAdditionalFacts('Provide relevant transaction dates, agreement numbers, obligations discharged, and specific legal remedies desired.');
    }
  };

  const handleGenerate = async () => {
    const effectiveDocType = documentType === 'Other' ? otherDocumentType || 'Legal Document' : documentType;

    if (!describeNeed.trim() && !additionalFacts.trim()) {
      setErrorMessage('Please describe what you need or provide facts before generating a draft.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setSavedSuccess(false);

    try {
      const res = await api.generateAiDraft({
        documentType: effectiveDocType,
        describeNeed: describeNeed.trim(),
        additionalFacts: additionalFacts.trim(),
        caseId: selectedCaseId || undefined,
        caseTitle: activeCase?.title,
        clientName: activeCase?.clientName,
        opponentName: activeCase?.opponentName
      });

      if (res.draft) {
        setGeneratedDraft(res.draft);
        setIsEdited(false);
      } else {
        setErrorMessage('The draft could not be generated. The server did not return draft content. AI Studio will not invent synthetic content.');
      }
    } catch (err: any) {
      console.error('Draft generation error:', err);
      // Explicit error explanation instead of inventing content
      setErrorMessage(
        err?.message ||
          'The draft could not be generated due to a service error. In accordance with legal safety compliance, synthetic content has not been substituted. Please verify server configuration and retry.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedDraft) return;
    try {
      await navigator.clipboard.writeText(generatedDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const handleSaveToCase = async () => {
    if (!generatedDraft) return;

    if (!selectedCaseId) {
      setErrorMessage('Please select a Case from the dropdown above to save this draft to its Case Documents Vault.');
      return;
    }

    const effectiveDocType = documentType === 'Other' ? otherDocumentType || 'Legal Document' : documentType;
    const title = `${effectiveDocType} - Initial AI Draft (${new Date().toLocaleDateString('en-IN')})`;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await api.uploadCaseDocument(selectedCaseId, {
        title,
        fileName: `${effectiveDocType.replace(/[^a-zA-Z0-9]/g, '_')}_Draft_${Date.now()}.txt`,
        fileType: 'doc',
        fileSize: `${(generatedDraft.length / 1024).toFixed(1)} KB`,
        fileUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(generatedDraft)}`,
        category: 'notice',
        description: `AI-generated first draft of ${effectiveDocType} saved by advocate for case review.`
      });

      setSavedDocTitle(title);
      setSavedSuccess(true);
      if (onAttachToCase) {
        onAttachToCase(selectedCaseId, generatedDraft);
      }
    } catch (err: any) {
      console.error('Failed to save to case documents:', err);
      setErrorMessage(err?.message || 'Failed to save document to case vault. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="lawyer-drafting-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              Advocate AI Legal Drafting Tool
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-600 font-mono">Powered by Gemini AI (Server-Side)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-1.5">
            AI Legal Drafting Tool
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Accelerate the creation of structured first drafts for legal notices, rejoinders, complaints, and pleadings.
          </p>
        </div>
      </div>

      {/* MANDATORY STATUTORY & LEGAL SAFETY NOTICE (PROMINENT) */}
      <div
        id="mandatory-legal-safety-banner"
        className="p-4 sm:p-5 rounded-xl bg-amber-50/90 border-2 border-amber-300 shadow-xs flex items-start gap-3.5"
      >
        <div className="p-2 rounded-lg bg-amber-200/70 text-amber-900 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5 text-amber-800" />
        </div>
        <div className="space-y-1 text-xs text-amber-950 leading-relaxed">
          <h3 className="font-bold text-amber-950 text-sm tracking-tight flex items-center gap-2">
            MANDATORY LEGAL SAFETY & FIRST DRAFT PROTOCOL
          </h3>
          <p className="font-semibold text-amber-900">
            "AI-generated content is a starting draft and must be reviewed and approved by a qualified lawyer before being sent, filed, or relied upon."
          </p>
          <p className="text-slate-700 text-[11px] pt-1 border-t border-amber-200/60">
            <strong>Statutory Notice:</strong> This software produces a preliminary working draft only. It does not provide guaranteed legal correctness, does not guarantee any legal or judicial outcome, and does not constitute formal legal advice. Qualified advocates must verify all facts, statutory references, and court precedents before finalizing.
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Intake & Generation Configuration */}
        <Card variant="default" className="lg:col-span-5 p-5 sm:p-6 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold font-serif text-slate-900">Drafting Inputs</h2>
            <p className="text-xs text-slate-500">Configure the document parameters and case facts</p>
          </div>

          {/* 1. Document Type */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Document Type <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Select standard format</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DOCUMENT_TYPES.map((type) => {
                const isSelected = documentType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    id={`doc-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => {
                      setDocumentType(type);
                      setSavedSuccess(false);
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold shadow-xs ring-1 ring-amber-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>

            {documentType === 'Other' && (
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Specify Custom Document Title:
                </label>
                <input
                  type="text"
                  value={otherDocumentType}
                  onChange={(e) => setOtherDocumentType(e.target.value)}
                  placeholder="e.g. Mutual Non-Disclosure Agreement, Bail Application..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* 2. Select Case */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Case <span className="text-slate-400 font-normal">(Optional linking)</span>
              </label>
              {cases.length > 0 && (
                <span className="text-[11px] text-emerald-700 font-semibold">
                  {cases.length} Active {cases.length === 1 ? 'Matter' : 'Matters'}
                </span>
              )}
            </div>

            <select
              id="select-case-dropdown"
              value={selectedCaseId}
              onChange={(e) => handleCaseChange(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- No Linked Case (General / Standalone Draft) --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.title.substring(0, 36)}... (Client: {c.clientName})
                </option>
              ))}
            </select>

            {activeCase && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block">{activeCase.title}</span>
                  <span>Client: {activeCase.clientName} • Stage: {activeCase.stage || 'Notice Sent'}</span>
                </div>
                {onNavigateToCaseRoom && (
                  <button
                    type="button"
                    onClick={() => onNavigateToCaseRoom(activeCase.id)}
                    className="text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-0.5 shrink-0"
                  >
                    Case Room <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. Describe what you need */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Describe what you need <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleLoadSample(documentType)}
                className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
              >
                Load Sample Prompt
              </button>
            </div>
            <textarea
              id="describe-need-textarea"
              rows={4}
              value={describeNeed}
              onChange={(e) => {
                setDescribeNeed(e.target.value);
                setSavedSuccess(false);
              }}
              placeholder="Explain the specific objective of this document, the statutory grounds, demands, prayer clauses, or relief to incorporate..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg leading-relaxed focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          {/* 4. Additional facts */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Additional facts
            </label>
            <textarea
              id="additional-facts-textarea"
              rows={5}
              value={additionalFacts}
              onChange={(e) => {
                setAdditionalFacts(e.target.value);
                setSavedSuccess(false);
              }}
              placeholder="Chronological dates, agreement clauses, payment transactions, notices sent/received, breaches, names of parties, and addresses..."
              className="w-full text-xs p-3 border border-slate-300 rounded-lg leading-relaxed focus:outline-none focus:border-amber-500 bg-white"
            />
          </div>

          {/* Error Message if generation or validation fails */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Draft Could Not Be Generated
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">{errorMessage}</p>
            </div>
          )}

          {/* Generate Draft Button */}
          <Button
            id="btn-generate-draft"
            variant="primary"
            size="md"
            className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold"
            disabled={isGenerating || (!describeNeed.trim() && !additionalFacts.trim())}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4 text-amber-300" />}
            onClick={handleGenerate}
          >
            {isGenerating ? 'Drafting via Gemini AI...' : 'Generate Draft'}
          </Button>
        </Card>

        {/* Right Output: Generated Draft & Editor */}
        <Card variant="default" className="lg:col-span-7 p-5 sm:p-6 space-y-4 flex flex-col justify-between min-h-[580px]">
          <div>
            {/* Action Toolbar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold font-serif text-slate-900">
                    Draft Workspace
                  </h2>
                  {generatedDraft && (
                    <Badge variant={isEdited ? 'warning' : 'neutral'} size="sm">
                      {isEdited ? 'Edited by Lawyer' : 'First Draft'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {generatedDraft
                    ? `${generatedDraft.split(/\s+/).filter(Boolean).length} words • Editable`
                    : 'Awaiting generation parameters...'}
                </p>
              </div>

              {generatedDraft && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    id="btn-copy-draft"
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>

                  <Button
                    id="btn-regenerate-draft"
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    onClick={handleGenerate}
                    leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />}
                  >
                    Regenerate
                  </Button>
                </div>
              )}
            </div>

            {/* Content Area */}
            {isGenerating ? (
              <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                <LoadingState message="Generating structured first draft with Gemini AI..." />
                <p className="text-slate-500 text-xs max-w-md">
                  Formatting statutory provisions, Indian advocate phrasing, chronological recitals, and demand timelines...
                </p>
              </div>
            ) : generatedDraft ? (
              <div className="space-y-3 pt-2">
                {/* Secondary In-Workspace Legal Notice */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Notice:</strong> This is a preliminary working draft. You can directly edit the text below. Make all necessary factual amendments and statutory adjustments before finalizing.
                  </p>
                </div>

                {/* Editable Draft Textarea */}
                <div className="relative">
                  <textarea
                    id="draft-content-editor"
                    rows={20}
                    value={generatedDraft}
                    onChange={(e) => {
                      setGeneratedDraft(e.target.value);
                      setIsEdited(true);
                      setSavedSuccess(false);
                    }}
                    className="w-full p-4 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 leading-relaxed bg-slate-50/40 focus:bg-white focus:outline-none focus:border-amber-500 shadow-inner"
                    placeholder="Generated draft will appear here..."
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/60 my-auto">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm font-serif">No Draft Generated Yet</h3>
                  <p className="text-slate-500 text-xs max-w-sm">
                    Select a document type, provide your requirements and facts, then click <strong>"Generate Draft"</strong> to produce an editable first draft.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions: Save to Case Documents Vault */}
          {generatedDraft && (
            <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  {selectedCaseId && activeCase ? (
                    <span>
                      Target Vault: <strong className="text-slate-900">{activeCase.caseNumber}</strong> ({activeCase.title.substring(0, 24)}...)
                    </span>
                  ) : (
                    <span className="text-amber-800">
                      Select a case on the left to save directly into its case vault.
                    </span>
                  )}
                </div>

                <Button
                  id="btn-save-case-document"
                  variant="primary"
                  size="sm"
                  disabled={isSaving || !selectedCaseId}
                  isLoading={isSaving}
                  onClick={handleSaveToCase}
                  leftIcon={<FolderDown className="w-3.5 h-3.5" />}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  {isSaving ? 'Saving to Vault...' : 'Save to Case Documents'}
                </Button>
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Draft successfully saved to case documents vault as <strong>"{savedDocTitle}"</strong>.
                    </span>
                  </div>
                  {onNavigateToCaseRoom && selectedCaseId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-800 hover:text-emerald-900 underline text-xs p-0"
                      onClick={() => onNavigateToCaseRoom(selectedCaseId, 'documents')}
                    >
                      View in Case Room
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
