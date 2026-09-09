import React from 'react';
import { Lock, ShieldAlert, ArrowRight, UserCheck, LogIn, ArrowLeft } from 'lucide-react';
import { Card, Button, Badge } from '../ui/index.js';

interface UnauthorizedViewProps {
  onLoginClick: () => void;
  onNavigateHome: () => void;
  attemptedRoute?: string;
}

export const UnauthorizedView: React.FC<UnauthorizedViewProps> = ({
  onLoginClick,
  onNavigateHome,
  attemptedRoute = '/client/dashboard'
}) => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <Card variant="default" className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-slate-200">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
          <Lock className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <span>HTTP 401 • Unauthorized</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-slate-900">
            Authentication Required
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            The requested legal resource or dashboard{' '}
            <code className="text-amber-800 font-mono text-xs bg-amber-50 px-1 py-0.5 rounded">
              {attemptedRoute}
            </code>{' '}
            is confidential and protected under statutory confidentiality laws.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Secure Access Verification</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Please log in with your verified Citizen mobile number or Bar Council Advocate credentials to view this file.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            onClick={onNavigateHome}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Public Home
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={onLoginClick}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Sign In / Register
          </Button>
        </div>
      </Card>
    </div>
  );
};
