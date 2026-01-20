interface DraftIndicatorProps {
  lastSaved?: Date;
  hasUnsavedChanges: boolean;
}

export function DraftIndicator({ lastSaved, hasUnsavedChanges }: DraftIndicatorProps) {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}小时前`;
    return date.toLocaleString('zh-CN');
  };

  return (
    <div style={styles.container}>
      <div style={styles.status}>
        <span
          style={{
            ...styles.dot,
            ...(hasUnsavedChanges && styles.dotUnsaved),
          }}
        />
        <span style={styles.statusText}>
          {hasUnsavedChanges ? '有未保存的更改' : '已保存'}
        </span>
      </div>
      {lastSaved && (
        <div style={styles.lastSaved}>
          上次保存：{formatLastSaved(lastSaved)}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  dotUnsaved: {
    backgroundColor: '#f59e0b',
  },
  statusText: {
    fontSize: '13px',
    color: '#6b7280',
  },
  lastSaved: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};

export default DraftIndicator;
