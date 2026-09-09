import React, { useState, useEffect } from 'react';
import {
  Search,
  Scale,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  BookOpen,
  FileCheck2,
  Calendar,
  Layers
} from 'lucide-react';
import { VerifiedJudgment } from '../../types.js';
import { api } from '../../services/api.js';

export const JudgmentSearchTool: React.FC = () => {
  const [query, setQuery] = useState('Sec 138');
  const [results, setResults] = useState<VerifiedJudgment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [disclaimer, setDisclaimer] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const sampleQueries = [
    { label: 'Cheque Bounce (Sec 138)', q: 'Sec 138' },
    { label: 'Privacy & Data Protection', q: 'Puttaswamy' },
    { label: 'Arrest & Custody Rights', q: 'D.K. Basu' },
    { label: 'Freedom of Speech (66A)', q: 'Shreya Singhal' },
    { label: 'Consumer Medical Negligence', q: 'Jacob Mathew' }
  ];

  useEffect(() => {
    handleSearch('Sec 138');
  }, []);

  const handleSearch = async (searchStr: string) => {
    if (!searchStr.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setErrorMessage('');
    try {
      const data = await api.searchJudgments(searchStr);
      setResults(data.results || []);
      setDisclaimer(data.disclaimer || '');
      if (data.results.length === 0) {
        setErrorMessage('No matching judgment found.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('No matching judgment found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="judgment-search-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            Indian Case Law Repository
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Strict Non-Fabrication Policy
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
          Verified Court Precedents & Judgments Search
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
          Authoritative legal research for Indian advocates. Queries are matched strictly against verified Supreme Court and High Court law reports.
        </p>
      </div>

      {/* STRICT MANDATE NOTICE */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs border border-slate-800 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-white font-bold block uppercase tracking-wide">
            Zero-Hallucination Legal Research Guarantee:
          </strong>
          <p className="text-slate-300 leading-relaxed">
            LAWShin strictly prohibits AI fabrication of legal citations. In strict accordance with our judicial integrity rules, every case listed below contains its verified official citation (SCR, SCC, AIR, Cri LJ), sitting bench, applicable statutory sections, and an official source record. If a query does not match an authentic precedent, the system reports <span className="text-amber-300 font-mono">"No matching judgment found"</span> rather than generating unverified approximations.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by case title (e.g. Puttaswamy), statutory section (e.g. Sec 138 NI Act), or subject..."
              className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            Search Precedents
          </button>
        </form>

        {/* Quick Sample Queries */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase text-slate-600">Sample Precedents:</span>
          {sampleQueries.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(sq.q);
                handleSearch(sq.q);
              }}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
            >
              {sq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Ledger */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Scanning verified Supreme Court and High Court database...
        </div>
      ) : results.length === 0 && hasSearched ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 font-serif">No matching judgment found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            LAWShin enforces a strict non-fabrication rule. We never generate fictitious citations or imaginary court rulings. Try searching for "Sec 138", "Puttaswamy", "D.K. Basu", or "Shreya Singhal".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing {results.length} verified judicial precedents</span>
            <span className="font-mono text-[11px]">Official Sources: main.sci.gov.in / eCourts</span>
          </div>

          <div className="space-y-4">
            {results.map((j) => (
              <div key={j.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="bg-slate-900 text-amber-400 font-mono font-bold text-[11px] px-2 py-0.5 rounded">
                        {j.citation}
                      </span>
                      <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded">
                        {j.court} ({j.year})
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                        Official Law Report Verified
                      </span>
                    </div>
                    <h2 className="text-lg font-bold font-serif text-slate-900 mt-1">{j.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Coram / Bench: <strong className="text-slate-700">{j.bench}</strong>
                    </p>
                  </div>

                  <a
                    href={j.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <span>View Official Record</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Applicable statutory sections */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Statutory Sections & Acts Invoked:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {j.applicableSections.map((sec, i) => (
                      <span key={i} className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded font-mono font-semibold">
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ratio Decidendi */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-amber-800">
                    Ratio Decidendi (Legal Principle Established):
                  </span>
                  <p className="text-slate-700 leading-relaxed font-serif italic text-[13px]">
                    "{j.ratioDecidendi}"
                  </p>
                </div>

                {/* Headnotes */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                    Judicial Headnotes:
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-slate-600 leading-relaxed">
                    {j.headnotes.map((hn, i) => (
                      <li key={i}>{hn}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
