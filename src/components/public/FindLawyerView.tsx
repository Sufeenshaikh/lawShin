import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ShieldCheck,
  Star,
  Building,
  Scale,
  Calendar,
  Phone,
  Mail,
  MapPin,
  X,
  Clock,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { LawyerProfile, Review } from '../../types.js';
import { api } from '../../services/api.js';

interface FindLawyerViewProps {
  initialPracticeArea?: string;
  initialCity?: string;
  onSelectLawyerForCase: (lawyerId: string) => void;
  onBookAppointment: (lawyerId: string) => void;
  onViewProfile?: (lawyerId: string) => void;
}

export const FindLawyerView: React.FC<FindLawyerViewProps> = ({
  initialPracticeArea = '',
  initialCity = '',
  onSelectLawyerForCase,
  onBookAppointment,
  onViewProfile
}) => {
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState(initialPracticeArea);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerProfile | null>(null);
  const [lawyerReviews, setLawyerReviews] = useState<Review[]>([]);
  const [activeCasesCount, setActiveCasesCount] = useState<number>(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchLawyers();
  }, [selectedArea, selectedCity, verifiedOnly]);

  const fetchLawyers = async () => {
    setLoading(true);
    try {
      const data = await api.getLawyers({
        practiceArea: selectedArea || undefined,
        city: selectedCity || undefined,
        verifiedOnly: verifiedOnly || undefined
      });
      setLawyers(data.lawyers);
    } catch (err) {
      console.error('Failed to load lawyers', err);
    } finally {
      setLoading(false);
    }
  };

  const openLawyerDetails = async (lawyer: LawyerProfile) => {
    setSelectedLawyer(lawyer);
    setDetailModalOpen(true);
    try {
      const details = await api.getLawyerById(lawyer.id);
      setLawyerReviews(details.reviews || []);
      setActiveCasesCount(details.activeCasesCount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLawyers = lawyers.filter((l) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      l.fullName.toLowerCase().includes(s) ||
      l.barCouncilNumber.toLowerCase().includes(s) ||
      l.practiceAreas.some((p) => p.toLowerCase().includes(s)) ||
      l.courts.some((c) => c.toLowerCase().includes(s))
    );
  });

  return (
    <div id="find-lawyer-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          Bar Council Enrolled Practitioners
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
          Find a Verified Advocate
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
          Connect directly with enrolled advocates possessing verified Bar Council numbers across High Courts, District Courts, and Specialized Tribunals (NCLT, NCDRC, RERA).
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, bar number, or court..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
            >
              <option value="">All Practice Areas</option>
              <option value="Tenancy">Tenancy & Security Deposit</option>
              <option value="Cheque Bounce">Cheque Bounce (Sec 138 NI Act)</option>
              <option value="Consumer">Consumer Protection</option>
              <option value="Civil Litigation">Civil Litigation</option>
              <option value="Family">Family & Matrimonial</option>
              <option value="Employment">Employment Law</option>
              <option value="Cyber">Cyber Law</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
            >
              <option value="">All Jurisdictions</option>
              <option value="Delhi">New Delhi / NCR</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
              <option value="Bengaluru">Bengaluru</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
              />
              <span>Verified Only</span>
            </label>
          </div>
        </div>

        {(selectedArea || selectedCity || searchTerm || verifiedOnly) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">Active Filters:</span>
            {selectedArea && (
              <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                {selectedArea}
                <button onClick={() => setSelectedArea('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedCity && (
              <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                {selectedCity}
                <button onClick={() => setSelectedCity('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {verifiedOnly && (
              <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                Verified Only
                <button onClick={() => setVerifiedOnly(false)}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedArea('');
                setSelectedCity('');
                setSearchTerm('');
                setVerifiedOnly(false);
              }}
              className="text-amber-700 hover:underline font-semibold ml-2"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Lawyers List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading verified advocate directory...
        </div>
      ) : filteredLawyers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-slate-700 font-semibold text-sm">No advocates matched your search criteria.</p>
          <p className="text-slate-500 text-xs mt-1">Try broadening your practice area or city filters.</p>
          <button
            onClick={() => { setSelectedArea(''); setSelectedCity(''); setSearchTerm(''); setVerifiedOnly(false); }}
            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLawyers.map((lawyer) => (
            <div
              key={lawyer.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start gap-4 mb-3">
                  <img
                    src={lawyer.avatarUrl}
                    alt={lawyer.fullName}
                    className="w-16 h-16 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => onViewProfile && onViewProfile(lawyer.id)}
                        className={`font-bold text-slate-900 text-base ${onViewProfile ? 'cursor-pointer hover:text-amber-700 transition-colors' : ''}`}
                      >
                        {lawyer.fullName}
                      </h3>
                      {lawyer.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Bar Council Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                          Verification Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
                      Enrolment: {lawyer.barCouncilNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {lawyer.stateBarCouncil} • {lawyer.experienceYears} Years Exp.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                  {lawyer.bio}
                </p>

                <div className="space-y-2 mb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Practice Areas:</span>
                    <div className="flex flex-wrap gap-1">
                      {lawyer.practiceAreas.map((area, i) => (
                        <span key={i} className="text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-600 block mb-1">Key Courts:</span>
                    <p className="text-slate-600 text-xs line-clamp-1">
                      {lawyer.courts.join(' • ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">{lawyer.rating}</span>
                    <span className="text-slate-500 text-[11px]">({lawyer.reviewCount} reviews)</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 font-mono mt-0.5 block">
                    ₹{lawyer.consultationFee.toLocaleString('en-IN')}{' '}
                    <span className="text-[10px] font-normal text-slate-500">/ consult</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {onViewProfile && (
                    <button
                      onClick={() => onViewProfile(lawyer.id)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      Profile
                    </button>
                  )}
                  <button
                    onClick={() => openLawyerDetails(lawyer)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onSelectLawyerForCase(lawyer.id)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Assign Case
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lawyer Detail Modal */}
      {detailModalOpen && selectedLawyer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 relative">
            <button
              onClick={() => setDetailModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <img
                src={selectedLawyer.avatarUrl}
                alt={selectedLawyer.fullName}
                className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold font-serif text-slate-900">{selectedLawyer.fullName}</h2>
                  {selectedLawyer.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Advocate
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                  Enrolment No: {selectedLawyer.barCouncilNumber} ({selectedLawyer.stateBarCouncil})
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {selectedLawyer.education} • {selectedLawyer.experienceYears} Years Experience • {selectedLawyer.city}, {selectedLawyer.state}
                </p>
                {selectedLawyer.lawFirmName && (
                  <p className="text-xs font-medium text-amber-700 mt-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> Associated with {selectedLawyer.lawFirmName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 text-xs text-slate-700 border-t border-slate-100 pt-4">
              <div>
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 mb-1">Professional Bio</h4>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedLawyer.bio}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 mb-1">Practice Areas</h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {selectedLawyer.practiceAreas.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 mb-1">Courts of Practice</h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {selectedLawyer.courts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                    Verified Client Reviews ({lawyerReviews.length})
                  </h4>
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">{selectedLawyer.rating}</span>
                  </div>
                </div>

                {lawyerReviews.length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No client reviews submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {lawyerReviews.map((rev) => (
                      <div key={rev.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900">{rev.clientName}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">Verified Matter</span>
                            <span className="font-bold text-amber-700">★ {rev.rating}.0</span>
                          </div>
                        </div>
                        <p className="text-slate-600 italic">"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">Consultation Fee</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  ₹{selectedLawyer.consultationFee.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {onViewProfile && (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      onViewProfile(selectedLawyer.id);
                    }}
                    className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    View Full Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    onBookAppointment(selectedLawyer.id);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
                >
                  Book Consultation
                </button>
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    onSelectLawyerForCase(selectedLawyer.id);
                  }}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
                >
                  Submit Case to {selectedLawyer.fullName.split(' ')[1] || 'Advocate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
