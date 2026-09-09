import React, { useState, useEffect } from 'react';
import { MessageSquareText, Shield, User, PlusCircle, CheckCircle2, CornerDownRight, Send, AlertTriangle, Search, Filter, HelpCircle } from 'lucide-react';
import { LegalQuery, User as UserType } from '../../types.js';
import { api } from '../../services/api.js';

interface AnonymousQueryViewProps {
  currentUser: UserType | null;
}

export const AnonymousQueryView: React.FC<AnonymousQueryViewProps> = ({ currentUser }) => {
  const [queries, setQueries] = useState<LegalQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyInput, setReplyInput] = useState<{ [key: string]: string }>({});

  // Filter state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Tenancy');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [acknowledgedDisclaimer, setAcknowledgedDisclaimer] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      const data = await api.getQueries();
      setQueries(data.queries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setSubmitting(true);
    try {
      await api.submitQuery({
        title,
        category,
        description,
        isAnonymous: true,
        authorName: 'Anonymous Citizen',
        city: city || 'New Delhi',
        state: 'Delhi'
      });
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      await loadQueries();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (queryId: string) => {
    const text = replyInput[queryId];
    if (!text) return;
    try {
      await api.replyQuery(queryId, text);
      setReplyInput({ ...replyInput, [queryId]: '' });
      await loadQueries();
    } catch (err) {
      console.error(err);
    }
  };

  const categories = ['All', 'Tenancy', 'Cheque Bounce', 'Consumer', 'Civil Litigation', 'Family', 'Cyber', 'Employment'];

  const filteredQueries = queries.filter((q) => {
    if (selectedCategoryFilter !== 'All' && q.category !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const match =
        q.title.toLowerCase().includes(term) ||
        q.description.toLowerCase().includes(term) ||
        q.category.toLowerCase().includes(term) ||
        q.replies.some((r) => r.content.toLowerCase().includes(term) || r.lawyerName.toLowerCase().includes(term));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div id="anonymous-queries-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Citizen Grievance Redressal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            Anonymous Legal Query & Awareness
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Submit general legal questions without providing your name. Receive preliminary statutory direction from verified advocates.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Ask Anonymous Question
        </button>
      </div>

      {/* Mandatory Statutory Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 mb-8 shadow-xs">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 space-y-1">
            <h3 className="font-bold font-serif text-amber-900 text-sm">
              Important Statutory Notice: General Legal Information Only
            </h3>
            <p className="leading-relaxed">
              Questions submitted and responses provided in this public forum are strictly for <strong>general legal awareness and educational purposes</strong> under Indian law. They <strong>do NOT constitute personalized legal advice</strong>, formal professional opinions, or establish an advocate-client relationship under the Advocates Act, 1961.
            </p>
            <p className="text-slate-600">
              No name or personal contact information is required to ask questions. For case-specific strategy, document vetting, or judicial representation, please engage an advocate directly in a confidential Case Room.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-8 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search questions by keyword, legal section, or remedy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCategoryFilter === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Query List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading legal questions...</div>
      ) : filteredQueries.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-700 font-semibold text-sm">No legal queries match your search.</p>
          <p className="text-slate-500 text-xs mt-1">Be the first to ask an anonymous legal question in this category.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
          >
            Ask a Question Now
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredQueries.map((q) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                    {q.category}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Posted by Anonymous Citizen • {q.city || 'India'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-600">
                  {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-2">{q.title}</h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                {q.description}
              </p>

              {/* Verified Lawyer Replies */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <CornerDownRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>Advocate Direction ({q.replies.length})</span>
                </div>

                {q.replies.length === 0 ? (
                  <p className="text-xs text-slate-600 italic pl-5">
                    Awaiting review by an enrolled advocate.
                  </p>
                ) : (
                  q.replies.map((reply) => (
                    <div key={reply.id} className="ml-4 p-3.5 rounded-lg bg-amber-50/60 border border-amber-200/80 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-950">{reply.lawyerName}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                            Enrolled Advocate
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-600">
                          {new Date(reply.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed">{reply.content}</p>
                      <div className="mt-2 text-[10px] text-slate-600 italic border-t border-amber-200/50 pt-1">
                        * Information only. Not formal legal representation.
                      </div>
                    </div>
                  ))
                )}

                {/* Lawyer response box if current user is lawyer */}
                {currentUser?.role === 'lawyer' && (
                  <div className="ml-4 mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      placeholder="Provide general legal information on statutory remedies..."
                      value={replyInput[q.id] || ''}
                      onChange={(e) => setReplyInput({ ...replyInput, [q.id]: e.target.value })}
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => handleReply(q.id)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      Post Answer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ask Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold font-serif text-slate-900 mb-1">
              Ask a General Legal Awareness Question
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              <strong>100% Anonymous.</strong> No name, phone number, or identification is collected or stored.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal Domain</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Tenancy">Tenancy & Security Deposit</option>
                  <option value="Cheque Bounce">Cheque Bounce (Sec 138 NI Act)</option>
                  <option value="Consumer">Consumer Protection</option>
                  <option value="Civil Litigation">Civil Debt Recovery</option>
                  <option value="Family">Family & Matrimonial</option>
                  <option value="Cyber">Cyber Crime / Online Fraud</option>
                  <option value="Employment">Employment & Wrongful Termination</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Summary / Title</label>
                <input
                  type="text"
                  placeholder="e.g., Landlord deducted ₹40,000 painting charges arbitrarily"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grievance Overview & Circumstances</label>
                <textarea
                  rows={4}
                  placeholder="Summarize the facts, relevant dates, amounts involved, or specific statutory clause you are asking about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">City / Region (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Bengaluru, Delhi, Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Explicit acknowledgement of disclaimer */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-snug">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledgedDisclaimer}
                    onChange={(e) => setAcknowledgedDisclaimer(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded mt-0.5"
                    required
                  />
                  <span>
                    I understand that all responses are <strong>general legal information</strong> and <strong>not personalized legal advice</strong>. No advocate-client privilege is created.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !acknowledgedDisclaimer}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Posting Anonymously...' : 'Submit Anonymous Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
