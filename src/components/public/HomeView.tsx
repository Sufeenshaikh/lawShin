import React, { useState } from 'react';
import {
  Scale,
  ShieldCheck,
  Lock,
  ArrowRight,
  FileCheck,
  Users,
  Search,
  MessageSquare,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  Check,
  CreditCard,
  FileText
} from 'lucide-react';
import { LawyerProfile } from '../../types.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge
} from '../ui/index.js';

interface HomeViewProps {
  onNavigate: (view: string, params?: any) => void;
  onSubmitCaseClick: () => void;
  featuredLawyers: LawyerProfile[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSubmitCaseClick,
  featuredLawyers,
}) => {
  const [searchCategory, setSearchCategory] = useState('');
  const [searchCity, setSearchCity] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('find-lawyer', { practiceArea: searchCategory, city: searchCity });
  };

  const practiceAreas = [
    {
      name: 'Tenancy & Security Deposit',
      desc: 'Withheld security deposits, illegal eviction, lease agreement breaches, and Rent Authority claims.',
      icon: Building,
      casesCount: '240+ cases',
    },
    {
      name: 'Cheque Bounce (Sec 138 NI Act)',
      desc: 'Statutory 30-day demand notices, bank return memo enforcement, and summary magistrate trial filing.',
      icon: Scale,
      casesCount: '310+ cases',
    },
    {
      name: 'Consumer Protection',
      desc: 'Defective products, builder delays under RERA, insurance claim rejections, and e-commerce frauds.',
      icon: ShieldCheck,
      casesCount: '190+ cases',
    },
    {
      name: 'Family & Matrimonial',
      desc: 'Mutual consent divorce (Sec 13B HMA), maintenance petitions, settlement deeds, and custody mediation.',
      icon: Users,
      casesCount: '150+ cases',
    },
    {
      name: 'Civil Debt Recovery (Order 37 CPC)',
      desc: 'Summary suits for unpaid invoices, commercial dues recovery, and contract breach claims.',
      icon: FileCheck,
      casesCount: '280+ cases',
    },
    {
      name: 'Employment & Labor Disputes',
      desc: 'Wrongful termination, unpaid full & final settlements, gratuity claims, and non-compete scrutiny.',
      icon: Award,
      casesCount: '120+ cases',
    },
  ];

  return (
    <div id="home-view" className="space-y-16 pb-16">
      {/* 1. HERO SECTION: PREMIUM, TRUSTWORTHY, APPROACHABLE */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-amber-300 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Bar Council of India Verified Advocates • 256-Bit Encrypted Case Vault</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight font-serif text-slate-100 max-w-4xl mx-auto leading-tight">
            Legal Redressal & Advocate Representation,{' '}
            <span className="text-amber-400 italic font-serif">Made Transparent.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Describe your grievance, securely upload evidence, connect with verified advocates enrolled with State Bar Councils, and track every hearing date in a private case room.
          </p>

          {/* Quick Search Widget */}
          <div className="max-w-3xl mx-auto mt-8 p-3 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-2xl text-left">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-5 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Practice Area
                </label>
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Practice Areas</option>
                  <option value="Tenancy">Tenancy & Rental Security Deposit</option>
                  <option value="Cheque Bounce">Cheque Bounce (Sec 138 NI Act)</option>
                  <option value="Consumer">Consumer Court Grievances</option>
                  <option value="Family">Family & Matrimonial Matters</option>
                  <option value="Civil">Civil Litigation & Debt Recovery</option>
                  <option value="Employment">Employment & Wrongful Termination</option>
                  <option value="Cyber">Cyber Crime & Online Fraud</option>
                </select>
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  City / Jurisdiction
                </label>
                <select
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs rounded-lg px-3 py-2.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Indian Jurisdictions</option>
                  <option value="Delhi">New Delhi / NCR</option>
                  <option value="Mumbai">Mumbai / MMR</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Kolkata">Kolkata</option>
                  <option value="Pune">Pune</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<Search className="w-3.5 h-3.5" />}
                >
                  Find Advocate
                </Button>
              </div>
            </form>
          </div>

          {/* Trust Highlights & Direct CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              id="hero-submit-case-btn"
              variant="primary"
              size="lg"
              onClick={onSubmitCaseClick}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Submit Your Case for Review
            </Button>
            <Button
              id="hero-ask-query-btn"
              variant="outline"
              size="lg"
              className="bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
              onClick={() => onNavigate('queries')}
              leftIcon={<MessageSquare className="w-4 h-4 text-amber-400" />}
            >
              Ask Free Anonymous Legal Question
            </Button>
          </div>
        </div>
      </section>

      {/* 2. FOUR-STEP PATHWAY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="warning" size="md">
            How LAWShin Operates
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            Structured Grievance Redressal Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            A transparent pathway from your first grievance submission to final court decree.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card variant="default" className="p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs font-serif">
              01
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Describe Grievance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fill out a structured case intake detailing opposing parties, transaction timelines, and monetary relief sought.
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs font-serif">
              02
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Evidence Vault</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload lease agreements, bounced cheque memos, WhatsApp notices, bank slips, or voice recordings into encrypted storage.
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs font-serif">
              03
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Advocate Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connect with verified advocates enrolled with State Bar Councils specializing in your jurisdictional district court.
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs font-serif">
              04
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Private Case Room</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Collaborate securely, exchange legal notices, track court hearing cause lists, and settle milestones in escrow.
            </p>
          </Card>
        </div>
      </section>

      {/* 3. PRACTICE AREAS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Legal Practice Areas</span>
            <h2 className="text-2xl font-bold font-serif text-slate-900 mt-1">Specialized Legal Redressal</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('find-lawyer')}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Explore All Practice Areas
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {practiceAreas.map((area, idx) => {
            const Icon = area.icon;
            return (
              <Card
                key={idx}
                variant="default"
                hoverEffect
                className="p-5 cursor-pointer group flex flex-col justify-between"
                onClick={() => onNavigate('find-lawyer', { practiceArea: area.name })}
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                      {area.name}
                    </h3>
                    <Badge variant="neutral" size="sm">
                      {area.casesCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {area.desc}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center text-xs font-semibold text-amber-700 group-hover:text-amber-800">
                  <span>View Verified Advocates</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. FEATURED VERIFIED ADVOCATES */}
      <section className="bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
            <div>
              <Badge variant="primary" size="sm">
                Verified Advocates
              </Badge>
              <h2 className="text-2xl font-bold font-serif text-slate-900 mt-2">
                Consult with Enrolled Legal Practitioners
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Every advocate profile is verified against State Bar Council directories.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 sm:mt-0"
              onClick={() => onNavigate('find-lawyer')}
            >
              Browse Full Directory
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {featuredLawyers.slice(0, 3).map((lawyer) => (
              <Card key={lawyer.id} variant="default" className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-3.5 mb-3">
                    <img
                      src={lawyer.avatarUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=160'}
                      alt={lawyer.fullName}
                      className="w-13 h-13 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm truncate">{lawyer.fullName}</h3>
                        {lawyer.isVerified && (
                          <Badge variant="success" size="sm">
                            <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">
                        {lawyer.barCouncilNumber} • {lawyer.stateBarCouncil}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lawyer.experienceYears} Years Standing • {lawyer.city}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                    {lawyer.bio}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {lawyer.practiceAreas.slice(0, 3).map((area, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Consultation Fee</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      ₹{lawyer.consultationFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate('find-lawyer', { lawyerId: lawyer.id })}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onSubmitCaseClick}
                    >
                      Submit Case
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRIVILEGED DIGITAL CASE ROOM HIGHLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card variant="bordered" className="bg-slate-950 text-white border-slate-800 p-8 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <Badge variant="warning" size="sm">
                Privileged Digital Case Room & Audit Trail
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
                Track Every Case from Legal Notice to Decreed Order
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Unlike informal messaging apps, LAWShin standardizes every matter into an auditable statutory pipeline:
                <strong className="text-amber-300"> Notice Sent</strong>,{' '}
                <strong className="text-amber-300">Reply Received</strong>,{' '}
                <strong className="text-amber-300">In Court</strong>, and{' '}
                <strong className="text-amber-300">Decreed / Closed</strong>.
                Advocates exchange legal pleadings, speed-post tracking slips, and court hearing orders in 256-bit encrypted vaults.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>256-Bit Encrypted Vault</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Next Hearing Cause Lists</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>GST Tax Invoices</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={onSubmitCaseClick}
                >
                  Submit Case & Enter Room
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
                  onClick={() => onNavigate('queries')}
                >
                  Browse Public Questions
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 font-mono">CASE ROOM AUDIT</span>
                <Badge variant="success" size="sm">
                  Stage: Notice Sent
                </Badge>
              </div>
              <div className="text-xs space-y-2">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Case Identifier</span>
                  <span className="font-mono font-bold text-slate-200">LS-2025-0142 (Tenancy & Recovery)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Next Hearing</span>
                    <span className="font-semibold text-amber-300">24 March 2025 (Admission)</span>
                  </div>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Vault Evidence Indexed</span>
                  <span className="text-slate-300 text-[11px]">Registered_Lease_Deed_Delhi.pdf (SHA-256 Validated)</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
