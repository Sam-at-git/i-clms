import { ReactNode } from 'react';
import { useAuthStore } from '../../state/auth.state';
import { isAdmin, isDeptAdmin } from '../../lib/auth-helpers';
import ForbiddenPage from './ForbiddenPage';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: Array<'ADMIN' | 'DEPT_ADMIN' | 'USER'>;
  requireAdmin?: boolean;
  requireDeptAdmin?: boolean;
  fallback?: ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  requireAdmin = false,
  requireDeptAdmin = false,
  fallback,
}: RoleGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <ForbiddenPage />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin(user)) {
    if (fallback) return fallback;
    return <ForbiddenPage />;
  }

  // Check dept admin requirement
  if (requireDeptAdmin && !isAdmin(user) && !isDeptAdmin(user)) {
    if (fallback) return fallback;
    return <ForbiddenPage />;
  }

  // Check allowed roles
  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    if (fallback) return fallback;
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}

export default RoleGuard;
