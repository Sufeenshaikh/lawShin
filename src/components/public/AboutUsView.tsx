import React from 'react';
import { Scale, ShieldCheck, Lock, Award, HeartHandshake, CheckCircle } from 'lucide-react';

export const AboutUsView: React.FC = () => {
  return (
    <div id="about-us-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Vision Header */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          About Counselia Legal-Tech
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-slate-900">
          Democratizing Access to Justice Across India
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Counselia was founded to bring structure, transparency, and dignity to everyday citizen legal grievances through bank-grade technology and verified legal practice.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">Ethics & BCI Compliance</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Counselia operates in strict accordance with the Advocates Act, 1961 and Bar Council of India Rules. We are not an advertising agency and do not tout or solicit cases.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">Encrypted Vaults</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Personal evidence, lease agreements, bank statements, and voice notes are stored with 256-bit AES encryption. Only you and your assigned advocate have access.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center mb-4">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-base mb-2">Transparent Milestones</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Legal fees are broken into structured stages (Intake, Legal Notice, Reply Scrutiny, Trial Representation) with GST-compliant tax invoices and refund policies.
          </p>
        </div>
      </div>

      {/* Regulatory Notice Box */}
      <div className="p-6 rounded-xl bg-slate-900 text-slate-300 text-xs border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold font-serif text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>Statutory Statement under Rule 36, Bar Council of India Rules</span>
        </div>
        <p className="leading-relaxed">
          As per the rules of the Bar Council of India, lawyers and advocates are prohibited from soliciting work or advertising in any manner. By using Counselia, the user acknowledges that there has been no advertisement, personal communication, solicitation, invitation, or inducement of any sort whatsoever from us or any advocate on this platform to solicit any work through this website.
        </p>
        <p className="leading-relaxed text-slate-400">
          The purpose of this platform is purely informational and to facilitate structured communication, grievance documentation, and legal assistance between citizens and enrolled legal professionals.
        </p>
      </div>
    </div>
  );
};
