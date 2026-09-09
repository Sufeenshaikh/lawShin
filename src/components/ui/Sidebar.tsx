import React from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'neutral' | 'primary' | 'warning' | 'danger';
  onClick: () => void;
  active: boolean;
}

export interface SidebarProps {
  title: string;
  subtitle?: string;
  roleBadge?: React.ReactNode;
  items: SidebarItem[];
  footerAction?: React.ReactNode;
  className?: string;
  id?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  title,
  subtitle,
  roleBadge,
  items,
  footerAction,
  className = '',
  id,
}) => {
  return (
    <aside
      id={id}
      className={`
        w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full
        ${className}
      `}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </span>
          {roleBadge}
        </div>
        <h2 className="text-sm font-bold text-slate-900 truncate tracking-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-slate-700 truncate">{subtitle}</p>}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          return (
            <button
              key={item.id}
              id={`sidebar-item-${item.id}`}
              onClick={item.onClick}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-100 cursor-pointer text-left
                ${
                  item.active
                    ? 'bg-amber-50 text-amber-950 font-semibold border border-amber-200/80 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }
              `}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={`shrink-0 ${item.active ? 'text-amber-700' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`
                    text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold
                    ${item.active ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-100 text-slate-600'}
                  `}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      {footerAction && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/60">
          {footerAction}
        </div>
      )}
    </aside>
  );
};
