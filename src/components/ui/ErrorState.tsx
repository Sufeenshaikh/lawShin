import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button.js';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
  id?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Records',
  message = 'An unexpected error occurred while retrieving case files or synchronizing with the registry.',
  code,
  onRetry,
  className = '',
  id,
}) => {
  return (
    <div
      id={id}
      className={`
        flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl
        border border-rose-200 bg-rose-50/40 max-w-lg mx-auto
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-xl bg-white shadow-2xs border border-rose-200 flex items-center justify-center text-rose-600 mb-3.5">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-600 max-w-sm leading-relaxed mb-2">
        {message}
      </p>
      {code && (
        <span className="inline-block font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 mb-4">
          Error Code: {code}
        </span>
      )}
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
