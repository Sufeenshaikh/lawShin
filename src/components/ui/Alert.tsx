import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  id?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
  id,
}) => {
  const configs = {
    info: {
      bg: 'bg-sky-50/80 border-sky-200 text-sky-950',
      icon: <Info className="w-5 h-5 text-sky-600 shrink-0" />,
      titleColor: 'text-sky-900',
    },
    success: {
      bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      titleColor: 'text-emerald-900',
    },
    warning: {
      bg: 'bg-amber-50/80 border-amber-300 text-amber-950',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
      titleColor: 'text-amber-900',
    },
    danger: {
      bg: 'bg-rose-50/80 border-rose-200 text-rose-950',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
      titleColor: 'text-rose-900',
    },
  };

  const config = configs[variant];

  return (
    <div
      id={id}
      role="alert"
      className={`
        flex items-start gap-3.5 p-4 rounded-xl border text-sm leading-relaxed
        ${config.bg}
        ${className}
      `}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h4 className={`font-semibold text-xs mb-1 ${config.titleColor}`}>{title}</h4>}
        <div className="text-xs space-y-1">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
