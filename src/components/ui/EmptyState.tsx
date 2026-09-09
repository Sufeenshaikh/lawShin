import React from 'react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  id?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
  id,
}) => {
  return (
    <div
      id={id}
      className={`
        flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl
        border border-dashed border-slate-300 bg-slate-50/50 max-w-lg mx-auto
        ${className}
      `}
    >
      <div className="w-12 h-12 rounded-xl bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 mb-3.5">
        {icon}
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-700 max-w-sm leading-relaxed mb-5">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && onAction && (
            <Button size="sm" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button size="sm" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
