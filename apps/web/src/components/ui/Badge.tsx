interface BadgeProps {
  children: React.ReactNode;
  count?: number;
  showZero?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
}

export function Badge({ children, count, showZero = false, color = 'red' }: BadgeProps) {
  const getColor = (): string => {
    const colors = {
      blue: '#3b82f6',
      green: '#16a34a',
      red: '#dc2626',
      yellow: '#ca8a04',
      gray: '#6b7280',
    };
    return colors[color];
  };

  return (
    <div style={styles.container}>
      {children}
      {count !== undefined && (count > 0 || showZero) && (
        <span style={{ ...styles.badge, backgroundColor: getColor() }}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-flex',
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    minWidth: '20px',
    height: '20px',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    transform: 'translate(50%, -50%)',
  },
};

export default Badge;
