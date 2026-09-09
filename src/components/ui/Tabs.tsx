import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'line' | 'pills';
  className?: string;
  id?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'line',
  className = '',
  id,
}) => {
  return (
    <div id={id} className={`w-full overflow-x-auto no-scrollbar ${className}`}>
      <div
        role="tablist"
        className={`
          flex items-center gap-1 min-w-max
          ${variant === 'line' ? 'border-b border-slate-200' : 'bg-slate-100/90 p-1 rounded-xl border border-slate-200'}
        `}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          if (variant === 'pills') {
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                disabled={tab.disabled}
                onClick={() => onChange(tab.id)}
                className={`
                  flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer
                  disabled:opacity-40 disabled:cursor-not-allowed select-none
                  ${isActive ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'}
                `}
              >
                {tab.icon && <span className="shrink-0 text-slate-500">{tab.icon}</span>}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`
                      text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium
                      ${isActive ? 'bg-amber-100 text-amber-900' : 'bg-slate-200/80 text-slate-700'}
                    `}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          }

          // Line variant
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer
                disabled:opacity-40 disabled:cursor-not-allowed select-none
                ${isActive ? 'text-amber-800 font-bold' : 'text-slate-600 hover:text-slate-900'}
              `}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`
                    text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium
                    ${isActive ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}
                  `}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber-600 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
