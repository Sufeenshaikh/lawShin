import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, Star, MapPin, Users, Mail, Phone, Globe, ArrowRight, Search, Filter } from 'lucide-react';
import { LawFirm } from '../../types.js';
import { api } from '../../services/api.js';

interface FindLawFirmViewProps {
  onSubmitCaseClick: () => void;
  onSelectFirm?: (firmId: string) => void;
}

export const FindLawFirmView: React.FC<FindLawFirmViewProps> = ({ onSubmitCaseClick, onSelectFirm }) => {
  const [lawFirms, setLawFirms] = useState<LawFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    loadFirms();
  }, []);

  const loadFirms = async () => {
    try {
      const data = await api.getLawFirms();
      setLawFirms(data.lawFirms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFirms = lawFirms.filter((firm) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        firm.name.toLowerCase().includes(q) ||
        firm.description.toLowerCase().includes(q) ||
        firm.practiceAreas.some((a) => a.toLowerCase().includes(q)) ||
        firm.headquarters.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedArea && !firm.practiceAreas.some((a) => a.toLowerCase().includes(selectedArea.toLowerCase()))) {
      return false;
    }
    if (selectedCity && !firm.headquarters.toLowerCase().includes(selectedCity.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div id="find-law-firm-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          Institutional Chambers & Partnerships
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
          Find a Law Firm
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
          Browse verified Indian law firms handling multi-jurisdictional litigation, complex recovery disputes, corporate representation, and appellate matters before High Courts and the Supreme Court.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search law firm name, practice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Practice Areas</option>
              <option value="Commercial">Commercial Litigation</option>
              <option value="Insolvency">Insolvency & NCLT</option>
              <option value="Arbitration">Arbitration & Dispute Resolution</option>
              <option value="Real Estate">Real Estate & RERA</option>
              <option value="Banking">Banking & Financial Services</option>
              <option value="Corporate">Corporate Advisory</option>
            </select>
          </div>

          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All Locations</option>
              <option value="Delhi">New Delhi / NCR</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>
        </div>

        {(searchTerm || selectedArea || selectedCity) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Showing {filteredFirms.length} of {lawFirms.length} registered law firms
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedArea('');
                setSelectedCity('');
              }}
              className="text-amber-700 hover:text-amber-800 font-semibold cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading law firms directory...</div>
      ) : filteredFirms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-slate-700 font-semibold text-sm">No law firms match your filters.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedArea('');
              setSelectedCity('');
            }}
            className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFirms.map((firm) => (
            <div key={firm.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        onClick={() => onSelectFirm && onSelectFirm(firm.id)}
                        className={`font-bold text-slate-900 text-lg font-serif ${onSelectFirm ? 'cursor-pointer hover:text-amber-700 transition-colors' : ''}`}
                      >
                        {firm.name}
                      </h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                        Registered LLP
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Reg. No: {firm.registrationNumber} • Est. {firm.foundedYear}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center font-bold shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {firm.description}
                </p>

                <div className="space-y-2 mb-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Practice Areas</span>
                    <div className="flex flex-wrap gap-1.5">
                      {firm.practiceAreas.map((area, i) => (
                        <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 pt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{firm.headquarters}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{firm.attorneyCount} Advocates & Partners</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-900">{firm.rating}</span>
                  <span className="text-slate-500 text-[11px] hidden sm:inline">Peer Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  {onSelectFirm && (
                    <button
                      onClick={() => onSelectFirm(firm.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                    >
                      View Firm Profile
                    </button>
                  )}
                  <button
                    onClick={onSubmitCaseClick}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Submit Matter
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
