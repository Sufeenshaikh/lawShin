import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  description?: string;
  variant?: 'spinner' | 'skeleton' | 'table';
  rows?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading verified legal records...',
  description = 'Connecting to LAWShin cryptographic case repository.',
  variant = 'spinner',
  rows = 3,
  className = '',
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={`w-full space-y-3.5 animate-pulse ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-16" />
            </div>
            <div className="h-3 bg-slate-100 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`w-full rounded-xl border border-slate-200 bg-white p-4 space-y-3 animate-pulse ${className}`}>
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b border-slate-100">
            <div className="h-3 bg-slate-200 rounded w-1/6" />
            <div className="h-3 bg-slate-100 rounded w-2/6" />
            <div className="h-3 bg-slate-100 rounded w-1/6" />
            <div className="h-3 bg-slate-100 rounded w-2/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{message}</p>
      {description && <p className="text-xs text-slate-700 mt-1 max-w-sm">{description}</p>}
    </div>
  );
};
