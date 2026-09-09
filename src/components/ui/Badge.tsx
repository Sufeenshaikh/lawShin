import React from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className = '',
  id,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    neutral: {
      container: 'bg-slate-100 text-slate-700 border-slate-200',
      dot: 'bg-slate-500',
    },
    primary: {
      container: 'bg-amber-50 text-amber-900 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    success: {
      container: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    warning: {
      container: 'bg-amber-100/70 text-amber-950 border-amber-300',
      dot: 'bg-amber-600',
    },
    danger: {
      container: 'bg-rose-50 text-rose-900 border-rose-200',
      dot: 'bg-rose-500',
    },
    info: {
      container: 'bg-sky-50 text-sky-900 border-sky-200',
      dot: 'bg-sky-500',
    },
    purple: {
      container: 'bg-purple-50 text-purple-900 border-purple-200',
      dot: 'bg-purple-500',
    },
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-[11px] font-medium px-2 py-0.5 rounded-md gap-1.5',
    md: 'text-xs font-semibold px-2.5 py-1 rounded-md gap-1.5',
  };

  return (
    <span
      id={id}
      className={`
        inline-flex items-center justify-center border font-sans whitespace-nowrap tracking-wide select-none
        ${variantStyles[variant].container}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${variantStyles[variant].dot}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
