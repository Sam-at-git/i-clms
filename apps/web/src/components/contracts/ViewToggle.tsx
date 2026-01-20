import { useState } from 'react';

export type ViewMode = 'list' | 'card';

interface ViewToggleProps {
  defaultView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
}

export function ViewToggle({ defaultView = 'list', onViewChange }: ViewToggleProps) {
  const [view, setView] = useState<ViewMode>(defaultView);

  const handleViewChange = (newView: ViewMode) => {
    setView(newView);
    onViewChange?.(newView);
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => handleViewChange('list')}
        style={{
          ...styles.button,
          ...(view === 'list' ? styles.buttonActive : {}),
        }}
        title="列表视图"
      >
        <span style={styles.icon}>☰</span>
        <span style={styles.label}>列表</span>
      </button>
      <button
        onClick={() => handleViewChange('card')}
        style={{
          ...styles.button,
          ...(view === 'card' ? styles.buttonActive : {}),
        }}
        title="卡片视图"
      >
        <span style={styles.icon}>⊞</span>
        <span style={styles.label}>卡片</span>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonActive: {
    color: '#3b82f6',
    backgroundColor: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  icon: {
    fontSize: '16px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
  },
};

export default ViewToggle;
