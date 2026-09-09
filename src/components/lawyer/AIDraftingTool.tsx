import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Send,
  Loader2,
  BookmarkPlus,
  Scale,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api.js';
import { LegalCase } from '../../types.js';

interface AIDraftingToolProps {
  cases?: LegalCase[];
  onAttachToCase?: (caseId: string, draftContent: string) => void;
}

export const AIDraftingTool: React.FC<AIDraftingToolProps> = ({ cases = [], onAttachToCase }) => {
  const [draftType, setDraftType] = useState('Legal Notice - Tenancy Deposit Recovery');
  const [clientName, setClientName] = useState('Rohan Deshmukh');
  const [opponentName, setOpponentName] = useState('Mr. Vikramaditya Malhotra (Landlord)');
  const [amount, setAmount] = useState('140000');
  const [facts, setFacts] = useState(
    'Tenancy commenced on 1st March 2024 at Flat 402, Green Glen Layout, Bellandur, Bengaluru. Monthly rent was ₹35,000 paid punctually. Security deposit of ₹1,40,000 paid via NEFT. Vacated premises on 28th February 2025 after 1 month advance notice. Landlord acknowledged handover key but failed to return deposit, giving vague excuses of painting charges with no bills.'
  );
  const [customPrompt, setCustomPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<string>('');
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0]?.id || '');
  const [attachSuccess, setAttachSuccess] = useState(false);

  const presets = [
    {
      label: 'Tenancy Security Deposit Notice',
      type: 'Legal Notice - Tenancy Deposit Recovery',
      client: 'Rohan Deshmukh',
      opponent: 'Mr. Vikramaditya Malhotra (Landlord)',
      amt: '140000',
      facts: 'Tenancy at Flat 402 ended 28 Feb 2025. Landlord withheld ₹1,40,000 security deposit illegally without rental arrears or itemized damage assessment. Demanding refund with 18% p.a. interest within 15 days.'
    },
    {
      label: 'Section 138 NI Act Cheque Bounce',
      type: 'Statutory Notice under Section 138 of Negotiable Instruments Act',
      client: 'Arunav Singhal (Sole Proprietor)',
      opponent: 'Devendra Kumar (Managing Director, Alpha Logistix Pvt Ltd)',
      amt: '450000',
      facts: 'Cheque No. 492011 dated 15 Jan 2025 drawn on HDFC Bank Connaught Place returned dishonoured with bank memo Funds Insufficient on 20 Jan 2025. Statutory 30-day demand notice.'
    },
    {
      label: 'Consumer Protection Notice',
      type: 'Notice under Consumer Protection Act 2019 for Defective Goods',
      client: 'Meera Iyer',
      opponent: 'Apex Electronics Pvt Ltd & Authorized Service Center',
      amt: '85000',
      facts: 'Purchased 4K Smart Television on 10 Oct 2024. Screen panel developed display distortion within 30 days. Manufacturer refused replacement despite manufacturer 2-year warranty.'
    },
    {
      label: 'Civil Summary Suit Demand (Order 37 CPC)',
      type: 'Formal Demand Notice Prior to Summary Suit under Order 37 CPC',
      client: 'Starlight Media Solutions',
      opponent: 'Zenith Retail Brands LLP',
      amt: '320000',
      facts: 'Invoices for marketing services rendered between Aug - Nov 2024 unpaid despite written acknowledgement of receipt and email assurances.'
    }
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setDraftType(p.type);
    setClientName(p.client);
    setOpponentName(p.opponent);
    setAmount(p.amt);
    setFacts(p.facts);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setAttachSuccess(false);
    try {
      const res = await api.generateAiDraft({
        draftType,
        clientName,
        opponentName,
        amount,
        facts,
        prompt: customPrompt
      });
      setDraftResult(res.draft);
      setDisclaimer(res.disclaimer);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAttach = async () => {
    if (!selectedCaseId || !draftResult) return;
    try {
      await api.uploadCaseDocument(selectedCaseId, {
        title: `${draftType} (AI Initial Draft - Lawyer Reviewed)`,
        fileName: `${draftType.replace(/[^a-zA-Z0-9]/g, '_')}_Draft.txt`,
        fileType: 'doc',
        fileSize: '4.2 KB',
        fileUrl: '#',
        category: 'notice'
      });
      setAttachSuccess(true);
      if (onAttachToCase) onAttachToCase(selectedCaseId, draftResult);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="ai-drafting-tool-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Advocate AI Assistant
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">Gemini 2.5 Legal Drafting Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            AI Legal Notice & Pleadings Drafting Tool
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Accelerate the creation of statutory demand notices, Section 138 notices, consumer complaints, and legal rejoinders.
          </p>
        </div>
      </div>

      {/* MANDATORY STATUTORY DISCLAIMER BANNER (MUST BE PROMINENT) */}
      <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 leading-relaxed">
          <strong className="font-bold text-amber-900 block uppercase tracking-wider mb-0.5">
            Mandatory Legal Disclaimer for AI-Generated Drafts:
          </strong>
          Every AI-generated legal draft is provided solely as a preliminary drafting template. It is an automated starting draft and <strong>MUST be thoroughly reviewed, verified, and formally approved by an enrolled advocate</strong> before being dispatched to opponents, filed in court, or relied upon for legal advice.
        </div>
      </div>

      {/* Preset Quick Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
          Quick Case Presets (Indian Legal Practice):
        </span>
        <div className="flex flex-wrap gap-2">
          {presets.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                draftType === p.type
                  ? 'bg-amber-100 text-amber-950 border-amber-400 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drafting Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake Parameters */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-sm font-serif border-b border-slate-100 pb-2">
            Drafting Parameters
          </h2>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
            <input
              type="text"
              value={draftType}
              onChange={(e) => setDraftType(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client Name / Party</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opposite Party</label>
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Monetary Claim / Cheque Amount (₹)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 140000"
              className="w-full p-2 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Chronological Facts & Demand Details</label>
            <textarea
              rows={6}
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg leading-relaxed font-sans"
              placeholder="Enter dates, terms violated, notice period, interest rate demanded..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Custom Legal Instructions (Optional)</label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Include specific warning regarding Section 406 & 420 IPC"
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !facts}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Legal Draft via Gemini...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Advocate Draft
              </>
            )}
          </button>
        </div>

        {/* Right Column: Generated Draft Output */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm font-serif">Generated Legal Draft</h3>
                <span className="text-[11px] text-slate-600">
                  {draftResult ? `${draftResult.split(' ').length} words • Editable` : 'Awaiting generation...'}
                </span>
              </div>

              {draftResult && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Text'}
                  </button>
                </div>
              )}
            </div>

            {/* Editor / Output Area */}
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center text-center space-y-3 p-8">
                <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
                <p className="font-bold text-slate-800 text-xs">Synthesizing Statutory Pleading Template</p>
                <p className="text-slate-500 text-[11px] max-w-sm">
                  Formatting legal recitals, statutory time limits, interest calculations, and prayer clauses...
                </p>
              </div>
            ) : draftResult ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Mandatory Notice:</strong> {disclaimer}
                  </span>
                </div>

                <textarea
                  rows={18}
                  value={draftResult}
                  onChange={(e) => setDraftResult(e.target.value)}
                  className="w-full p-4 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 leading-relaxed bg-slate-50/50 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Ready to Generate Draft</p>
                  <p className="text-slate-500 text-xs mt-1 max-w-md">
                    Choose one of the quick presets on top or customize the facts on the left, then click "Generate Advocate Draft".
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action bar to attach to active case */}
          {draftResult && cases.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-slate-600 font-semibold shrink-0">Attach to Case:</span>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white flex-1 sm:flex-none"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} - {c.title.substring(0, 28)}...
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAttach}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <BookmarkPlus className="w-4 h-4 text-amber-400" />
                {attachSuccess ? 'Attached to Case Vault!' : 'Save to Case Document Vault'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
