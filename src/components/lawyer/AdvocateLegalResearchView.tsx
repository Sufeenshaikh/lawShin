import React, { useState, useEffect } from 'react';
import {
  Scale,
  Search,
  BookOpen,
  Sparkles,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  FileText,
  Filter,
  RotateCcw,
  Building2,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Plus,
  Info,
  Layers,
  FileCode
} from 'lucide-react';
import { LegalCase, AdvocateSavedAuthority } from '../../types.js';
import { api } from '../../services/api.js';
import { Card, Button, Badge, Modal, Input, Select, Textarea, EmptyState } from '../ui/index.js';

interface AdvocateLegalResearchViewProps {
  cases: LegalCase[];
  onNavigateToDrafting: (preloadedAuthority?: any, caseId?: string) => void;
  onNavigate: (view: string, params?: Record<string, any>) => void;
}

const COURTS = [
  { value: '', label: 'All Courts' },
  { value: 'Supreme Court of India', label: 'Supreme Court of India' },
  { value: 'Delhi High Court', label: 'Delhi High Court' },
  { value: 'Bombay High Court', label: 'Bombay High Court' },
  { value: 'Karnataka High Court', label: 'Karnataka High Court' },
  { value: 'Calcutta High Court', label: 'Calcutta High Court' },
  { value: 'Madras High Court', label: 'Madras High Court' },
  { value: 'Allahabad High Court', label: 'Allahabad High Court' },
  { value: 'Punjab and Haryana High Court', label: 'Punjab & Haryana High Court' },
  { value: 'National Consumer Disputes Redressal Commission', label: 'NCDRC (Consumer Commission)' }
];

const ACTS = [
  { value: '', label: 'All Acts & Statutes' },
  { value: 'Negotiable Instruments Act, 1881', label: 'Negotiable Instruments Act, 1881 (Sec 138/141)' },
  { value: 'Code of Criminal Procedure, 1973', label: 'CrPC 1973 (Sec 438, 439, 482)' },
  { value: 'Bharatiya Nagarik Suraksha Sanhita, 2023', label: 'BNSS 2023 (Bail & Procedure)' },
  { value: 'Code of Civil Procedure, 1908', label: 'CPC 1908 (Pleadings, Injunctions)' },
  { value: 'Consumer Protection Act, 2019', label: 'Consumer Protection Act, 2019' },
  { value: 'Indian Contract Act, 1872', label: 'Indian Contract Act, 1872 (Specific Performance)' },
  { value: 'Narcotic Drugs and Psychotropic Substances Act, 1985', label: 'NDPS Act, 1985 (Sec 37 Bail)' },
  { value: 'Hindu Minority and Guardianship Act, 1956', label: 'Hindu Minority & Guardianship Act (Custody)' },
  { value: 'Arbitration and Conciliation Act, 1996', label: 'Arbitration & Conciliation Act (Sec 9, 34)' }
];

const PRESET_QUERIES = [
  { label: 'Bail in NDPS cases (Sec 37)', query: 'bail in NDPS cases Section 37 twin conditions' },
  { label: 'Anticipatory bail under Sec 438 CrPC', query: 'anticipatory bail under Section 438 CrPC arrest guidelines' },
  { label: 'Quashing FIR under Sec 482', query: 'quashing under Section 482 civil dispute given criminal cloak' },
  { label: 'Dishonour of cheque Sec 138 NI Act', query: 'dishonour of cheque Section 138 NI Act statutory presumption' },
  { label: 'Custody under Hindu Minority Act', query: 'custody under Hindu Minority and Guardianship Act welfare of minor' },
  { label: 'Specific performance of contract', query: 'specific performance of contract readiness and willingness' }
];

export const AdvocateLegalResearchView: React.FC<AdvocateLegalResearchViewProps> = ({
  cases,
  onNavigateToDrafting,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('dishonour of cheque Section 138 NI Act statutory presumption');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedAct, setSelectedAct] = useState('');
  const [sectionOfLaw, setSectionOfLaw] = useState('');
  const [caseNameFilter, setCaseNameFilter] = useState('');
  const [citationFilter, setCitationFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Save to Case modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [selectedAuthorityForSave, setSelectedAuthorityForSave] = useState<any | null>(null);
  const [targetCaseId, setTargetCaseId] = useState<string>(cases[0]?.id || '');
  const [advocateNotes, setAdvocateNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Initial search execution
    executeSearch();
  }, []);

  const executeSearch = async (overrideQuery?: string) => {
    setLoading(true);
    setHasSearched(true);
    setSaveSuccessMsg(null);

    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;

    try {
      const data = await api.searchAdvocateResearch({
        keywords: q,
        court: selectedCourt,
        act: selectedAct,
        section: sectionOfLaw,
        caseName: caseNameFilter,
        citation: citationFilter,
        year: yearFilter
      });

      setResults(data.results || []);
      setIsDemoMode(data.isDemoMode !== undefined ? data.isDemoMode : true);
    } catch (err) {
      console.error('Advocate legal research query failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (presetQuery: string) => {
    setSearchQuery(presetQuery);
    executeSearch(presetQuery);
  };

  const handleCopyCitation = (citation: string, id: string) => {
    navigator.clipboard.writeText(citation);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenSaveModal = (authority: any) => {
    setSelectedAuthorityForSave(authority);
    setAdvocateNotes('');
    setSaveSuccessMsg(null);
    if (cases.length > 0 && !targetCaseId) {
      setTargetCaseId(cases[0].id);
    }
    setSaveModalOpen(true);
  };

  const handleConfirmSaveToCase = async () => {
    if (!targetCaseId || !selectedAuthorityForSave) return;
    setSaveLoading(true);
    try {
      await api.saveAuthorityToCase(targetCaseId, selectedAuthorityForSave, advocateNotes);
      setSaveSuccessMsg('Authority successfully saved to matter docket!');
      setTimeout(() => {
        setSaveModalOpen(false);
        setSaveSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to save authority to case');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUseInDraft = (authority: any) => {
    onNavigateToDrafting(authority, targetCaseId || undefined);
  };

  return (
    <div id="advocate-legal-research-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Route Metadata */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-700" />
              Counselia Legal Research
            </span>
            <span className="text-xs text-slate-500 font-mono">/lawyer/legal-research</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            Counselia Legal Research
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Authoritative judicial search for Indian advocates. Search statutory sections, case names, and verified High Court / Supreme Court ratios without synthetic hallucinations.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigateToDrafting()}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Counselia AI Drafting
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('lawyer-drafts')}
            leftIcon={<FileText className="w-3.5 h-3.5 text-slate-700" />}
          >
            Counselia Drafts
          </Button>
        </div>
      </div>

      {/* Mandatory Bar Council & Research Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Bar Council of India Research Compliance:</span> Counselia Precedent Research is strictly restricted to enrolled advocates. Precedents retrieved must be independently examined against official law reports (e.g., SCR, AIR, SCC, DLT) prior to citation before any judicial or quasi-judicial forum.
        </div>
      </div>

      {/* Search Console Card */}
      <Card variant="default" className="p-5 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
          className="space-y-4"
        >
          {/* Main Query Bar */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              id="advocate-search-query-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search legal issue, case name, statutory grounds (e.g., anticipatory bail under Section 438 CrPC)..."
              className="w-full pl-11 pr-28 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm shadow-sm"
            />
            <button
              id="advocate-search-submit-btn"
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search Precedents'}
            </button>
          </div>

          {/* Preset Queries / Frequent Issues */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quick Practice Searches:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUERIES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetClick(p.query)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    searchQuery === p.query
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Granular Filters Grid */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Forum / Court</label>
              <select
                value={selectedCourt}
                onChange={(e) => setSelectedCourt(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-amber-500"
              >
                {COURTS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Act / Statute</label>
              <select
                value={selectedAct}
                onChange={(e) => setSelectedAct(e.target.value)}
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-amber-500"
              >
                {ACTS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Section of Law</label>
              <input
                type="text"
                value={sectionOfLaw}
                onChange={(e) => setSectionOfLaw(e.target.value)}
                placeholder="e.g., Sec 138, Sec 438, Sec 482"
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Decision Year</label>
              <input
                type="text"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                placeholder="e.g., 2024, 2022, 2017"
                className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCourt('');
                setSelectedAct('');
                setSectionOfLaw('');
                setCaseNameFilter('');
                setCitationFilter('');
                setYearFilter('');
                executeSearch('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset all filters
            </button>

            <span className="text-xs text-slate-500 font-medium">
              Showing <strong>{results.length}</strong> verified judicial precedent{results.length === 1 ? '' : 's'}
            </span>
          </div>
        </form>
      </Card>

      {/* Results Section */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Querying authoritative law reports...</p>
            <p className="text-xs text-slate-500">Checking verified Supreme Court and High Court repositories</p>
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            title="No Matching Judicial Precedents Found"
            description="No judgments matched your exact query filters. Try broadening your keywords or clearing specific sections."
            actionLabel="Reset Search Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCourt('');
              setSelectedAct('');
              setSectionOfLaw('');
              executeSearch('');
            }}
          />
        ) : (
          results.map((item) => (
            <Card key={item.id} variant="default" className="p-5 space-y-3.5 border-slate-200 hover:border-slate-300 transition-all">
              {/* Header: Title, Court, Citation & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900 hover:text-amber-800 transition-colors">
                      {item.caseName || item.title}
                    </h2>
                    <Badge variant="primary" size="sm">
                      {item.subject || 'Statutory Precedent'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      {item.court}
                    </span>
                    {item.bench && (
                      <span>• Bench: {item.bench}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.date || item.decisionDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      {item.citation}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCitation(item.citation, item.id)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white"
                      title="Copy citation for draft"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Advocate Actions */}
                <div className="flex items-center gap-2 shrink-0 self-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSaveModal(item)}
                    leftIcon={<Bookmark className="w-3.5 h-3.5 text-amber-700" />}
                  >
                    Save to Case
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleUseInDraft(item)}
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  >
                    Use in Draft
                  </Button>
                </div>
              </div>

              {/* Ratio Decidendi & Relevant Passage */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  Ratio Decidendi / Judicial Principle:
                </span>
                <p className="text-xs leading-relaxed text-slate-800 font-serif italic">
                  "{item.relevantPassage || item.ratioDecidendi || item.summary}"
                </p>
              </div>

              {/* Sections of Law & Official Source */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 font-semibold">Sections:</span>
                  {item.legalSections && item.legalSections.length > 0 ? (
                    item.legalSections.map((sec: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px] border border-slate-200"
                      >
                        {sec}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">General Principles</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-500 text-xs">
                  <span>
                    Source: <strong>{item.source || 'Supreme Court Reports (SCR)'}</strong>
                  </span>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 underline underline-offset-2"
                    >
                      View Report
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Save to Case Modal */}
      <Modal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save Authority to Active Matter"
        size="md"
      >
        <div className="space-y-4">
          {saveSuccessMsg ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-1">
              <Check className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">{saveSuccessMsg}</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-950">
                <span className="font-bold">Authority:</span> {selectedAuthorityForSave?.caseName || selectedAuthorityForSave?.title}
                <div className="font-mono text-[11px] text-amber-900 mt-0.5">
                  {selectedAuthorityForSave?.citation}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Select Active Matter / Case Docket *
                </label>
                {cases.length === 0 ? (
                  <p className="text-xs text-rose-600">No active cases in your docket yet.</p>
                ) : (
                  <select
                    value={targetCaseId}
                    onChange={(e) => setTargetCaseId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNumber} - {c.title} (Client: {c.clientName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Advocate Internal Research Notes (Optional)
                </label>
                <textarea
                  value={advocateNotes}
                  onChange={(e) => setAdvocateNotes(e.target.value)}
                  placeholder="Notes on how this ratio applies to this specific client pleading or hearing arguments..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!targetCaseId || saveLoading}
                  onClick={handleConfirmSaveToCase}
                  leftIcon={<Bookmark className="w-3.5 h-3.5" />}
                >
                  {saveLoading ? 'Saving...' : 'Save to Matter Docket'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};
