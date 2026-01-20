import { useAuthStore } from '../../state/auth.state';
import { formatUserRole } from '../../lib/auth-helpers';

interface RoleBadgeProps {
  userId?: string;
  role?: string;
}

export function RoleBadge({ userId, role }: RoleBadgeProps) {
  const currentUser = useAuthStore((state) => state.user);
  const userRole = role || currentUser?.role;

  if (!userRole) {
    return null;
  }

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          backgroundColor: '#fef3c7',
          color: '#d97706',
        };
      case 'DEPT_ADMIN':
        return {
          backgroundColor: '#dbeafe',
          color: '#2563eb',
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#4b5563',
        };
    }
  };

  const style = getRoleStyle(userRole);

  return (
    <span style={{ ...styles.badge, ...style }}>
      {formatUserRole(userRole)}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'none',
  },
};

export default RoleBadge;
