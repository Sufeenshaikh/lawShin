import React from 'react';
import { ShieldAlert, ArrowLeft, RefreshCw, Scale } from 'lucide-react';
import { Card, Button, Badge } from '../ui/index.js';
import { UserRole } from '../../types.js';

interface ForbiddenViewProps {
  currentRole?: UserRole;
  requiredRole?: string;
  onNavigateHome: () => void;
  onSwitchAccountClick?: () => void;
  reason?: string;
}

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({
  currentRole = 'client',
  requiredRole,
  onNavigateHome,
  onSwitchAccountClick,
  reason
}) => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <Card variant="default" className="max-w-lg w-full p-8 text-center space-y-6 shadow-xl border-rose-200">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-xs font-semibold">
            <span>HTTP 403 • Forbidden Access</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-slate-900">
            Privileged Access Restricted
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {reason ||
              'You do not have statutory authorization or necessary permissions to view or edit this legal matter.'}
          </p>
        </div>

        {/* Legal Privilege Notice */}
        <div className="p-4 rounded-xl bg-slate-900 text-white text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 border-b border-slate-800 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              SECTION 126 PRIVILEGE
            </span>
            <span>INDIAN EVIDENCE ACT</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Case files, pleadings, and communication records are strictly confidential to the assigned advocate and their enrolled client. Unrelated advocates and third-party citizens are prohibited from accessing this case room.
          </p>
          <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
            <span>Active Role: <strong className="text-amber-300 uppercase">{currentRole}</strong></span>
            {requiredRole && <span>• Required Role: <strong className="text-emerald-300 uppercase">{requiredRole}</strong></span>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            onClick={onNavigateHome}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to Safety
          </Button>
          {onSwitchAccountClick && (
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={onSwitchAccountClick}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Switch Role / Account
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
