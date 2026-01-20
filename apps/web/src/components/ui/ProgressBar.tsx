interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  height?: number;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  color = '#1e3a5f',
  height = 8,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div style={styles.container}>
      {(label || showPercentage) && (
        <div style={styles.header}>
          {label && <span style={styles.label}>{label}</span>}
          {showPercentage && <span style={styles.percentage}>{percentage.toFixed(0)}%</span>}
        </div>
      )}
      <div style={{ ...styles.barContainer, height: `${height}px` }}>
        <div
          style={{
            ...styles.barFill,
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  percentage: {
    fontSize: '14px',
    color: '#6b7280',
  },
  barContainer: {
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
};

export default ProgressBar;
