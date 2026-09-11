import React from 'react';
import { Scale, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button, Card } from '../ui/index.js';

interface LegalDisclaimerViewProps {
  onBackToHome: () => void;
}

export const LegalDisclaimerView: React.FC<LegalDisclaimerViewProps> = ({ onBackToHome }) => {
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
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Statutory Compliance Notice
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900">
          Bar Council of India Mandatory Disclaimer
        </h1>
      </div>

      <Card variant="default" className="p-6 space-y-5 leading-relaxed bg-amber-50/30 border-amber-200">
        <p className="font-semibold text-slate-900 text-sm">
          As per the rules of the Bar Council of India (BCI), advocates are prohibited from soliciting work or advertising in any manner.
        </p>

        <p>
          By accessing this website, you acknowledge and confirm that you are seeking information relating to Counselia and its associated verified advocates of your own accord and that there has been no form of solicitation, advertisement, or inducement by Counselia or its members.
        </p>

        <p>
          The contents of this platform should not be construed as legal advice. The user should not act based solely on information provided herein and should consult an advocate directly in their jurisdiction for formal legal proceedings.
        </p>

        <p className="text-[11px] text-slate-500 pt-2 border-t border-amber-200">
          Rule 36, Bar Council of India Rules • Section 49(1)(c) of Advocates Act, 1961.
        </p>
      </Card>
    </div>
  );
};
