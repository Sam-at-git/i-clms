import { useAuthStore } from '../../state/auth.state';

interface DepartmentBadgeProps {
  departmentName?: string;
  departmentCode?: string;
}

export function DepartmentBadge({
  departmentName,
  departmentCode,
}: DepartmentBadgeProps) {
  const currentUser = useAuthStore((state) => state.user);
  const deptName = departmentName || currentUser?.department?.name;
  const deptCode = departmentCode || currentUser?.department?.code;

  if (!deptName) {
    return null;
  }

  const getDeptColor = (code: string) => {
    const colors: Record<string, string> = {
      FINANCE: '#dcfce7',
      DELIVERY: '#dbeafe',
      SALES: '#fce7f3',
      MARKET: '#fef3c7',
      LEGAL: '#e0e7ff',
      EXECUTIVE: '#fecaca',
    };
    return colors[code] || '#f3f4f6';
  };

  const getDeptTextColor = (code: string) => {
    const colors: Record<string, string> = {
      FINANCE: '#166534',
      DELIVERY: '#1e40af',
      SALES: '#9d174d',
      MARKET: '#b45309',
      LEGAL: '#3730a3',
      EXECUTIVE: '#991b1b',
    };
    return colors[code] || '#4b5563';
  };

  const code = deptCode || currentUser?.department?.code || '';
  const backgroundColor = getDeptColor(code);
  const color = getDeptTextColor(code);

  return (
    <span
      style={{
        ...styles.badge,
        backgroundColor,
        color,
      }}
    >
      {deptName}
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
  },
};

export default DepartmentBadge;
