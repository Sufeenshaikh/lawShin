import React from 'react';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button, Card } from '../ui/index.js';

interface PrivacyPolicyViewProps {
  onBackToHome: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBackToHome }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 text-xs text-slate-700">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBackToHome}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        className="text-slate-600"
      >
        Back to Home
      </Button>

      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
          Data Protection & DPDP Act 2023
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
          Privacy Policy & Vault Security Architecture
        </h1>
        <p className="text-slate-500">Last Revised: January 2025</p>
      </div>

      <Card variant="default" className="p-6 space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">1. Digital Personal Data Protection</h3>
          <p>
            Counselia processes digital personal data in strict compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act). Client personal identity and dispute particulars are collected exclusively for legal representation and dispute analysis.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">2. 256-Bit Cryptographic Vault Encryption</h3>
          <p>
            All uploaded pleadings, evidence contracts, financial bank statements, and audio records are encrypted at rest using AES-256 and in transit via TLS 1.3. Cryptographic integrity is verified via SHA-256 hashes to guarantee Section 65B electronic evidence admissibility.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">3. Attorney-Client Privilege Protection</h3>
          <p>
            Neither Counselia staff nor unassigned third parties have access to private Case Room discussions. Access is granted strictly to the authenticated client and verified counsel.
          </p>
        </section>
      </Card>
    </div>
  );
};
