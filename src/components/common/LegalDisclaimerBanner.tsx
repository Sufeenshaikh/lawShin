import React, { useState } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';

export const LegalDisclaimerBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div id="statutory-legal-disclaimer-banner" className="bg-slate-900 text-slate-300 text-xs border-b border-slate-800 px-4 py-2 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-amber-300">Bar Council of India Compliance:</span>
          <span className="text-slate-300 line-clamp-1 md:line-clamp-none">
            This platform does not solicit clients or advertise legal services. It is solely an intermediary for grievance redressal and delivery of legal assistance.
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-[11px] shrink-0">
          <span>• Case outcomes cannot be guaranteed</span>
          <span>• End-to-end confidential vault</span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            title="Dismiss notice"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
