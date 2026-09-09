import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'bordered';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hoverEffect = false,
  children,
  className = '',
  id,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-slate-200/90 shadow-xs',
    elevated: 'bg-white border border-slate-200 shadow-md',
    subtle: 'bg-slate-50/70 border border-slate-200/80',
    bordered: 'bg-white border-2 border-slate-200',
  };

  return (
    <div
      id={id}
      className={`
        rounded-xl overflow-hidden transition-all duration-150
        ${variantStyles[variant]}
        ${hoverEffect ? 'hover:border-slate-300 hover:shadow-md cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 pb-3 border-b border-slate-100 flex flex-col gap-1 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-base font-semibold text-slate-900 tracking-tight flex items-center justify-between ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs text-slate-700 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 text-xs ${className}`} {...props}>
    {children}
  </div>
);
