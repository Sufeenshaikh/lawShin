import React from 'react';
import { Scale, ArrowLeft, ShieldCheck, CheckCircle } from 'lucide-react';
import { Button, Card } from '../ui/index.js';

interface TermsConditionsViewProps {
  onBackToHome: () => void;
}

export const TermsConditionsView: React.FC<TermsConditionsViewProps> = ({ onBackToHome }) => {
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
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
          Legal Policy Framework
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
          Terms & Conditions of Service
        </h1>
        <p className="text-slate-500">Effective Date: January 1, 2025 • Governed under Indian Law</p>
      </div>

      <Card variant="default" className="p-6 space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">1. Nature of the Platform</h3>
          <p>
            Counselia is a legal management workflow software platform. Counselia is not a law firm and does not provide direct legal advice. Any advocate engaged via Counselia acts in an independent professional capacity subject to the Advocates Act, 1961 and Bar Council of India Rules.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">2. No Solicitation or Touting</h3>
          <p>
            In compliance with Rule 36 of the Bar Council of India Rules, nothing on this platform shall be construed as advertising or solicitation of legal work. Users voluntarily seek information and establish advocate-client relationships.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">3. Case Room Confidentiality & Privileged Communication</h3>
          <p>
            Communications, documents, and records deposited in the Counselia Case Room are encrypted using 256-bit AES standards and intended solely for privileged communication under Section 126 of the Indian Evidence Act, 1872 and Bharatiya Sakshya Adhiniyam, 2023.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900">4. Payments & Escrow Mechanism</h3>
          <p>
            Milestone fees deposited by clients are held in compliance with banking regulations until delivery of agreed statutory milestones (e.g. Notice Sent, Reply Drafted, Court Listing). Official GST invoices under SAC code 998211 are generated for all settled payments.
          </p>
        </section>
      </Card>
    </div>
  );
};
