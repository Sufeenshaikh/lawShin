import React from 'react';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  badge?: number | string;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  id?: string;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  items,
  id = 'mobile-bottom-navigation',
  className = '',
}) => {
  return (
    <nav
      id={id}
      className={`
        md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md
        border-t border-slate-200 px-2 py-1 shadow-lg pb-[env(safe-area-inset-bottom,4px)]
        ${className}
      `}
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            onClick={item.onClick}
            className={`
              relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] rounded-lg transition-colors cursor-pointer select-none
              ${item.active ? 'text-amber-800 font-bold' : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <div className="relative">
              <span className={`shrink-0 ${item.active ? 'text-amber-700 stroke-[2.4]' : 'text-slate-400'}`}>
                {item.icon}
              </span>
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[68px]">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
