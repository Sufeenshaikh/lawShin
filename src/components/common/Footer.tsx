import React from 'react';
import { Scale, ShieldCheck, Lock, FileText, HelpCircle, Phone, Mail, MapPin } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer id="counselia-main-footer" className="bg-slate-950 text-slate-300 border-t border-slate-800">
      {/* Statutory Disclaimers Section */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-serif">
              Mandatory Legal Disclaimers & Bar Council Compliance
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-slate-400 leading-relaxed">
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <p className="font-semibold text-slate-200 mb-1">Non-Solicitation Policy</p>
              <p>
                "This app does not solicit clients. It is only a platform for grievance redressal and legal service delivery."
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <p className="font-semibold text-slate-200 mb-1">No Guarantee of Outcome</p>
              <p>
                "Case outcomes cannot be guaranteed. Services are provided as per applicable law."
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <p className="font-semibold text-slate-200 mb-1">Data & Evidence Confidentiality</p>
              <p>
                "All personal data and case evidence are kept confidential and protected."
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <p className="font-semibold text-slate-200 mb-1">Refunds & Fee Transparency</p>
              <p>
                "Refunds and cancellations follow the policy mentioned in the Terms & Conditions."
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-4 leading-normal">
            * Compliance Note: In accordance with Rule 36 of the Bar Council of India Rules, advocates enrolled with State Bar Councils are prohibited from advertising or soliciting work. Counselia serves strictly as a technology facilitator for citizens seeking access to justice and redressal of legal grievances.
          </p>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded bg-amber-600 flex items-center justify-center text-slate-950">
                <Scale className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-serif">Counsel<span className="text-amber-500">ia</span></span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              India's premier grievance redressal and verified legal consultation platform. Bridging the gap between aggrieved citizens and verified advocates with bank-grade confidential case rooms.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit SSL Encrypted Vault</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> State Bar Council Verified</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Platform</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><button onClick={() => onNavigate('home')} className="hover:text-white transition-colors cursor-pointer">Home</button></li>
              <li><button onClick={() => onNavigate('find-lawyer')} className="hover:text-white transition-colors cursor-pointer">Find a Lawyer</button></li>
              <li><button onClick={() => onNavigate('find-firm')} className="hover:text-white transition-colors cursor-pointer">Law Firms Directory</button></li>
              <li><button onClick={() => onNavigate('queries')} className="hover:text-white transition-colors cursor-pointer">Free Anonymous Q&A</button></li>
              <li><button onClick={() => onNavigate('reviews')} className="hover:text-white transition-colors cursor-pointer">Reviews & Ratings</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-white transition-colors cursor-pointer">About Counselia</button></li>
            </ul>
          </div>

          {/* Practice Areas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Practice Areas</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><span>Tenancy & Deposit Recovery</span></li>
              <li><span>Cheque Bounce (Sec 138 NI Act)</span></li>
              <li><span>Consumer Commission Complaints</span></li>
              <li><span>Matrimonial & Mutual Consent</span></li>
              <li><span>Civil Debt Recovery (Order 37 CPC)</span></li>
              <li><span>Employment & Labor Grievances</span></li>
            </ul>
          </div>

          {/* Contact & Grievance Cell */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Grievance Cell</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>Barakhamba Road, Connaught Place, New Delhi - 110001</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>+91 11 4050 9999 (Mon - Sat)</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>grievances@counselia.in</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} Counselia Technologies India Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={() => onNavigate('terms')} className="hover:text-slate-300 cursor-pointer">Terms & Conditions</button>
            <button onClick={() => onNavigate('privacy')} className="hover:text-slate-300 cursor-pointer">Privacy Policy</button>
            <button onClick={() => onNavigate('disclaimer')} className="hover:text-slate-300 cursor-pointer">Legal Disclaimer</button>
            <button onClick={() => onNavigate('reviews')} className="hover:text-slate-300 cursor-pointer">Client Reviews</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
