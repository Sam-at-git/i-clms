interface TimelineItem {
  title: string;
  description?: string;
  timestamp?: string;
  status?: 'completed' | 'pending' | 'error';
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div style={styles.container}>
      {items.map((item, index) => (
        <div key={index} style={styles.item}>
          <div style={styles.itemHeader}>
            <div
              style={{
                ...styles.dot,
                ...(item.status === 'completed' && styles.dotCompleted),
                ...(item.status === 'pending' && styles.dotPending),
                ...(item.status === 'error' && styles.dotError),
              }}
            />
            {index < items.length - 1 && <div style={styles.line} />}
          </div>
          <div style={styles.itemContent}>
            <div style={styles.title}>{item.title}</div>
            {item.description && (
              <div style={styles.description}>{item.description}</div>
            )}
            {item.timestamp && (
              <div style={styles.timestamp}>{item.timestamp}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  item: {
    display: 'flex',
    gap: '16px',
    position: 'relative',
    paddingBottom: '24px',
  },
  itemHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    flexShrink: 0,
  },
  dotCompleted: {
    backgroundColor: '#16a34a',
  },
  dotPending: {
    backgroundColor: '#f59e0b',
  },
  dotError: {
    backgroundColor: '#dc2626',
  },
  line: {
    position: 'absolute',
    top: '12px',
    left: '5px',
    width: '2px',
    height: 'calc(100% + 12px)',
    backgroundColor: '#e5e7eb',
  },
  itemContent: {
    flex: 1,
    paddingTop: '2px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '4px',
  },
  description: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};

export default Timeline;
