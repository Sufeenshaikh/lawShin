import React from 'react';
import { User, UserRole } from '../../types.js';
import { UnauthorizedView } from './UnauthorizedView.js';
import { ForbiddenView } from './ForbiddenView.js';

interface ProtectedRouteProps {
  currentUser: User | null;
  allowedRoles: UserRole[];
  attemptedPath: string;
  onOpenAuth: () => void;
  onNavigateHome: () => void;
  onSwitchAccountClick: () => void;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  currentUser,
  allowedRoles,
  attemptedPath,
  onOpenAuth,
  onNavigateHome,
  onSwitchAccountClick,
  children,
}) => {
  // 1. Unauthenticated check (HTTP 401 equivalent)
  if (!currentUser) {
    return (
      <UnauthorizedView
        attemptedRoute={attemptedPath}
        onLoginClick={onOpenAuth}
        onNavigateHome={onNavigateHome}
      />
    );
  }

  // 2. Role authorization check (HTTP 403 equivalent)
  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <ForbiddenView
        currentRole={currentUser.role}
        requiredRole={allowedRoles.join(' or ')}
        onNavigateHome={onNavigateHome}
        onSwitchAccountClick={onSwitchAccountClick}
        reason={`This route (${attemptedPath}) is restricted to verified ${allowedRoles.join(' or ')} accounts.`}
      />
    );
  }

  // 3. Authorized
  return <>{children}</>;
};
