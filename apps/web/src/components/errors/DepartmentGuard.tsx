import { ReactNode } from 'react';
import { useAuthStore } from '../../state/auth.state';
import { canAccessDepartment, isAdmin } from '../../lib/auth-helpers';

interface DepartmentGuardProps {
  children: ReactNode;
  departmentId: string;
  fallback?: ReactNode;
}

export function DepartmentGuard({
  children,
  departmentId,
  fallback,
}: DepartmentGuardProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null; // Let ProtectedRoute handle unauthenticated users
  }

  // Admins can access all departments
  if (isAdmin(user)) {
    return <>{children}</>;
  }

  // Check if user can access the specific department
  if (!canAccessDepartment(user, departmentId)) {
    return fallback || (
      <div style={styles.message}>
        您无权访问此部门的数据
      </div>
    );
  }

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  message: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    fontSize: '14px',
  },
};

export default DepartmentGuard;
