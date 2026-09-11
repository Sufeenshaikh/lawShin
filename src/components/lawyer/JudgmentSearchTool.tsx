import React, { useState, useEffect } from 'react';
import {
  Search,
  Scale,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Building2,
  BookOpen,
  Filter,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../../services/api.js';

interface SearchFilters {
  keywords: string;
  court: string;
  jurisdiction: string;
  date: string;
  subject: string;
}

interface LegalJudgmentItem {
  id: string;
  caseName: string;
  citation: string;
  court: string;
  jurisdiction: string;
  date: string;
  relevantPassage: string;
  source: string;
  sourceUrl: string;
  subject: string;
  bench?: string;
  legalSections?: string[];
  isDemo: boolean;
}

const COURTS = [
  { value: '', label: 'All Courts' },
  { value: 'Supreme Court of India', label: 'Supreme Court of India' },
  { value: 'Delhi High Court', label: 'Delhi High Court' },
  { value: 'Bombay High Court', label: 'Bombay High Court' },
  { value: 'Karnataka High Court', label: 'Karnataka High Court' },
  { value: 'Calcutta High Court', label: 'Calcutta High Court' },
  { value: 'Madras High Court', label: 'Madras High Court' },
  { value: 'National Consumer Disputes Redressal Commission', label: 'NCDRC (Consumer Commission)' }
];

const JURISDICTIONS = [
  { value: '', label: 'All Jurisdictions' },
  { value: 'Constitutional', label: 'Constitutional Bench / Writs' },
  { value: 'Criminal', label: 'Criminal Appellate' },
  { value: 'Civil', label: 'Civil Appellate' },
  { value: 'Commercial', label: 'Commercial & Arbitration' },
  { value: 'Consumer', label: 'Consumer Law & Tort' }
];

const DATES = [
  { value: '', label: 'All Dates' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2020', label: '2020' },
  { value: '2017', label: '2017' },
  { value: '2015', label: '2015' },
  { value: '2014', label: '2014' },
  { value: '2011', label: '2011' },
  { value: '2005', label: '2005' },
  { value: '1997', label: '1997' },
  { value: '1987', label: '1987' }
];

const SUBJECTS = [
  { value: '', label: 'All Subjects' },
  { value: 'Banking & Cheque Bounce (Sec 138)', label: 'Banking & Cheque Bounce (Sec 138)' },
  { value: 'Constitutional Law & Fundamental Rights', label: 'Constitutional Law & Fundamental Rights' },
  { value: 'Criminal Procedure & Bail Jurisprudence', label: 'Criminal Procedure & Bail Jurisprudence' },
  { value: 'Evidence & Electronic Records', label: 'Evidence & Electronic Records' },
  { value: 'Consumer Protection & Medical Negligence', label: 'Consumer Protection & Medical Negligence' },
  { value: 'Arbitration & Commercial', label: 'Arbitration & Commercial' },
  { value: 'Freedom of Speech', label: 'Freedom of Speech & Cyber Law' }
];

const SAMPLE_QUERIES = [
  { label: 'Sec 138 Cheque Bounce', keywords: 'Section 138' },
  { label: 'Right to Privacy', keywords: 'Puttaswamy' },
  { label: 'Bail & Arrest Mandates', keywords: 'Antil' },
  { label: 'Electronic Records 65B', keywords: 'Khotkar' },
  { label: 'Medical Negligence', keywords: 'Jacob Mathew' },
  { label: 'Custodial Rights', keywords: 'D.K. Basu' }
];

export const JudgmentSearchTool: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    keywords: 'Section 138',
    court: '',
    jurisdiction: '',
    date: '',
    subject: ''
  });

  const [results, setResults] = useState<LegalJudgmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [providerName, setProviderName] = useState<string>('Verified Indian Law Report Repository (DEMO MODE)');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Initial search load with sample query
    executeSearch({
      keywords: 'Section 138',
      court: '',
      jurisdiction: '',
      date: '',
      subject: ''
    });
  }, []);

  const executeSearch = async (currentFilters: SearchFilters) => {
    setLoading(true);
    setHasSearched(true);

    try {
      const data = await api.searchJudgments({
        keywords: currentFilters.keywords,
        court: currentFilters.court,
        jurisdiction: currentFilters.jurisdiction,
        date: currentFilters.date,
        subject: currentFilters.subject
      });

      setResults(data.results || []);
      setIsDemoMode(data.isDemoMode !== undefined ? data.isDemoMode : true);
      if (data.providerName) {
        setProviderName(data.providerName);
      }
    } catch (err) {
      console.error('Legal database search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(filters);
  };

  const handleResetFilters = () => {
    const defaultFilters: SearchFilters = {
      keywords: '',
      court: '',
      jurisdiction: '',
      date: '',
      subject: ''
    };
    setFilters(defaultFilters);
    executeSearch(defaultFilters);
  };

  const handleCopyCitation = (citation: string, id: string) => {
    navigator.clipboard.writeText(citation);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="judgment-search-workspace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Route Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-700" />
              Verified Case Law Repository
            </span>
            <span className="text-xs text-slate-400 font-mono">/lawyer/judgments</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            Judgment & Law Search
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Authoritative judicial precedent research for Indian advocates. Queries are resolved strictly against verified Supreme Court and High Court law reports with authentic citations.
          </p>
        </div>

        {/* DEMO MODE INDICATOR BANNER */}
        {isDemoMode && (
          <div
            id="demo-mode-indicator-header"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-50 border-2 border-amber-400/80 text-amber-950 shadow-sm shrink-0"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-black tracking-wide uppercase text-amber-900">
                  DEMO MODE ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-amber-800 font-medium">
                Verified mock precedents loaded for development
              </p>
            </div>
          </div>
        )}
      </div>

      {/* DEMO MODE EXPLANATION ACCORDION / CARD */}
      {isDemoMode && (
        <div
          id="demo-mode-detailed-banner"
          className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-200/60 text-amber-800 shrink-0 mt-0.5">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-950 block text-sm">
                Development Environment Notice: Provider in DEMO MODE
              </span>
              <p className="text-amber-900/90 mt-0.5 leading-relaxed">
                Mock legal precedents are currently served from the indexed demo provider (
                <code className="font-mono font-semibold text-amber-950">{providerName}</code>
                ). Citations, courts, benches, and passages are authentically transcribed from official Supreme Court reports (SCR/SCC) for evaluation. No synthetic or AI-fabricated citations are ever presented as real judgments.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold bg-amber-200/80 text-amber-950 px-2.5 py-1 rounded border border-amber-400 whitespace-nowrap self-start sm:self-center">
            Provider: MockLegalSearchProvider
          </span>
        </div>
      )}

      {/* SEARCH INTERFACE & FILTERS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search Keywords Bar */}
          <div>
            <label htmlFor="search-keywords-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Search keywords:
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="search-keywords-input"
                  type="text"
                  value={filters.keywords}
                  onChange={(e) => setFilters({ ...filters, keywords: e.target.value })}
                  placeholder="e.g. Right to privacy, Section 138, Cheque bounce, Bail guidelines, Puttaswamy..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow"
                />
              </div>

              <button
                id="judgment-search-submit-btn"
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* FILTERS SECTION */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Filters:
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filter 1: Court */}
              <div>
                <label htmlFor="filter-court-select" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Court
                </label>
                <select
                  id="filter-court-select"
                  value={filters.court}
                  onChange={(e) => setFilters({ ...filters, court: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {COURTS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Jurisdiction */}
              <div>
                <label htmlFor="filter-jurisdiction-select" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Jurisdiction
                </label>
                <select
                  id="filter-jurisdiction-select"
                  value={filters.jurisdiction}
                  onChange={(e) => setFilters({ ...filters, jurisdiction: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {JURISDICTIONS.map((j) => (
                    <option key={j.value} value={j.value}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Date */}
              <div>
                <label htmlFor="filter-date-select" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Date
                </label>
                <select
                  id="filter-date-select"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {DATES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Subject */}
              <div>
                <label htmlFor="filter-subject-select" className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Subject
                </label>
                <select
                  id="filter-subject-select"
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Sample quick queries */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Quick Verified Precedents:
            </span>
            {SAMPLE_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const updated = { ...filters, keywords: sq.keywords };
                  setFilters(updated);
                  executeSearch(updated);
                }}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
              >
                {sq.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* RESULTS SECTION */}
      <div className="space-y-4">
        {/* Results Header Meta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-slate-600">
          <div>
            {loading ? (
              <span>Querying verified law report repository...</span>
            ) : (
              <span>
                Found <strong className="text-slate-900 font-semibold">{results.length}</strong> matching judicial precedent{results.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>Official Court Feed: SCR / SCC / main.sci.gov.in</span>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 border-3 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">
              Querying verified Indian legal database...
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Scanning authentic citations, bench compositions, and official judicial law reports.
            </p>
          </div>
        )}

        {/* EMPTY STATE: "No matching judgment found." (Mandated verbatim when no verified result exists) */}
        {!loading && results.length === 0 && hasSearched && (
          <div
            id="no-matching-judgment-container"
            className="p-12 text-center bg-white rounded-xl border-2 border-dashed border-slate-300 shadow-sm space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold font-serif text-slate-900">
                No matching judgment found.
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                In strict compliance with our Non-Fabrication Policy, Counselia never synthesizes fictitious court cases, imaginary citations, or hypothetical judgments.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 max-w-md mx-auto text-left space-y-1">
              <span className="font-semibold text-slate-800 block">Try adjusting your query:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Search by statutory act, e.g. "Section 138" or "CrPC"</li>
                <li>Search by landmark party name, e.g. "Puttaswamy", "Antil", or "D.K. Basu"</li>
                <li>Clear specific Court or Jurisdiction filters to broaden results</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* RESULT CARDS LIST */}
        {!loading && results.length > 0 && (
          <div className="space-y-5">
            {results.map((item) => (
              <div
                key={item.id}
                id={`judgment-card-${item.id}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4"
              >
                {/* Result Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1.5 flex-1">
                    {/* Citations and Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded shadow-xs">
                        {item.citation}
                      </span>

                      {item.isDemo && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded">
                          DEMO MODE DATA
                        </span>
                      )}

                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {item.court}
                      </span>

                      {item.jurisdiction && (
                        <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          {item.jurisdiction}
                        </span>
                      )}
                    </div>

                    {/* Case Name */}
                    <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
                      {item.caseName}
                    </h2>

                    {/* Bench / Coram if available */}
                    {item.bench && (
                      <p className="text-xs text-slate-500">
                        Bench: <strong className="text-slate-700 font-medium">{item.bench}</strong>
                      </p>
                    )}
                  </div>

                  {/* Top Actions: Copy Citation & View Source */}
                  <div className="flex items-center gap-2 shrink-0 self-start">
                    <button
                      type="button"
                      onClick={() => handleCopyCitation(item.citation, item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                      title="Copy Citation"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Citation</span>
                        </>
                      )}
                    </button>

                    <a
                      id={`view-source-btn-${item.id}`}
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                    >
                      <span>View Source</span>
                      <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    </a>
                  </div>
                </div>

                {/* Date & Court Metadata Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Date of Judgment</span>
                      <span className="font-semibold text-slate-900">{item.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Court</span>
                      <span className="font-semibold text-slate-900">{item.court}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Subject / Category</span>
                      <span className="font-semibold text-slate-900">{item.subject}</span>
                    </div>
                  </div>
                </div>

                {/* Statutory Sections Invoked */}
                {item.legalSections && item.legalSections.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                      Statutory Sections & Acts Invoked:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.legalSections.map((sec, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-xs bg-amber-50 text-amber-950 border border-amber-200 px-2 py-0.5 rounded font-mono font-medium"
                        >
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relevant Passage (Required Result Card Item) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Relevant Passage / Judicial Holding:
                  </span>
                  <div className="p-4 rounded-xl bg-amber-50/40 border-l-4 border-amber-600 text-slate-800 text-xs sm:text-sm font-serif leading-relaxed italic bg-gradient-to-r from-amber-50/50 to-transparent">
                    "{item.relevantPassage}"
                  </div>
                </div>

                {/* Source Verification Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="font-bold text-slate-700">Source:</span>
                    <span className="font-medium text-slate-800">{item.source}</span>
                    {item.isDemo && (
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Demo Record
                      </span>
                    )}
                  </div>

                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-800 hover:text-amber-900 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Independent Verification Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ARCHITECTURAL COMPLIANCE & LEGAL ACCURACY NOTE */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-300 text-xs border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider text-xs">
          <Scale className="w-4 h-4 text-amber-400" />
          Strict Legal Non-Fabrication Protocol & Provider Architecture
        </div>
        <p className="leading-relaxed text-slate-400">
          Counselia implements a pluggable provider abstraction (<code className="font-mono text-amber-300">ILegalSearchProvider</code>).
          The application never uses generative AI or model hallucination for case citations, judgment text, or court details.
          All displayed rulings are matched against configured verified legal sources so that advocates can independently verify records against the official court registry.
        </p>
      </div>
    </div>
  );
};
export default JudgmentSearchTool;
