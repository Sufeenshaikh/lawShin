import React from 'react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className = '',
  id,
  ...props
}) => (
  <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
    <table id={id} className={`w-full text-left text-xs border-collapse ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <thead className={`bg-slate-50/90 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px] ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tbody className={`divide-y divide-slate-100 ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { isHoverable?: boolean }> = ({
  children,
  className = '',
  isHoverable = true,
  ...props
}) => (
  <tr
    className={`transition-colors duration-100 ${isHoverable ? 'hover:bg-slate-50/80' : ''} ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <th className={`py-3 px-4 text-slate-700 font-semibold text-left select-none ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <td className={`py-3.5 px-4 text-slate-800 align-middle ${className}`} {...props}>
    {children}
  </td>
);
