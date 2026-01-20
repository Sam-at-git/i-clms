interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  description,
}: StatCardProps) {
  const getChangeColor = (): string => {
    switch (changeType) {
      case 'increase':
        return '#16a34a';
      case 'decrease':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getChangeIcon = (): string => {
    switch (changeType) {
      case 'increase':
        return '↑';
      case 'decrease':
        return '↓';
      default:
        return '';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.icon}>{icon}</div>
        {change !== undefined && (
          <div style={{ ...styles.change, color: getChangeColor() }}>
            {getChangeIcon()} {Math.abs(change)}%
          </div>
        )}
      </div>
      <div style={styles.value}>{value}</div>
      <div style={styles.title}>{title}</div>
      {description && <div style={styles.description}>{description}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '24px',
  },
  change: {
    fontSize: '13px',
    fontWeight: 500,
  },
  value: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
  },
  title: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  description: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};

export default StatCard;
