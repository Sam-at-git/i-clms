import { useAccessibility, type AccessibilitySettings } from '../../lib/hooks/useAccessibility';

interface AccessibilityControlsProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function AccessibilityControls({ position = 'top-right' }: AccessibilityControlsProps) {
  const { settings, updateSettings } = useAccessibility();

  const handleFontSizeChange = (direction: 'up' | 'down') => {
    const sizes: AccessibilitySettings['fontSize'][] = ['small', 'medium', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(settings.fontSize);
    const newIndex = Math.max(0, Math.min(sizes.length - 1, currentIndex + (direction === 'up' ? 1 : -1)));
    updateSettings({ fontSize: sizes[newIndex] });
  };

  const getFontSizeLabel = (size: AccessibilitySettings['fontSize']) => {
    const labels = {
      small: '小',
      medium: '中',
      large: '大',
      'extra-large': '特大',
    };
    return labels[size];
  };

  return (
    <div
      style={{
        ...styles.container,
        ...(position === 'top-right' && styles.topRight),
        ...(position === 'top-left' && styles.topLeft),
        ...(position === 'bottom-right' && styles.bottomRight),
        ...(position === 'bottom-left' && styles.bottomLeft),
      }}
    >
      <button
        onClick={() => handleFontSizeChange('down')}
        style={styles.iconButton}
        title="减小字体"
        aria-label="减小字体大小"
      >
        A-
      </button>
      <button
        onClick={() => handleFontSizeChange('up')}
        style={styles.iconButton}
        title="增大字体"
        aria-label="增大字体大小"
      >
        A+
      </button>
      <div style={styles.separator} />
      <span style={styles.currentSize}>{getFontSizeLabel(settings.fontSize)}</span>
      <div style={styles.separator} />
      <button
        onClick={() => updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
        style={styles.iconButton}
        title={settings.theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
        aria-label={`切换到${settings.theme === 'light' ? '深色' : '浅色'}模式`}
      >
        {settings.theme === 'light' ? '🌙' : '☀️'}
      </button>
      <button
        onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
        style={{
          ...styles.iconButton,
          ...(settings.reducedMotion && styles.iconButtonActive),
        }}
        title="减少动画"
        aria-label={settings.reducedMotion ? '启用动画' : '减少动画'}
      >
        🎬
      </button>
      <button
        onClick={() => updateSettings({ theme: settings.theme === 'high-contrast' ? 'light' : 'high-contrast' })}
        style={{
          ...styles.iconButton,
          ...(settings.theme === 'high-contrast' && styles.iconButtonActive),
        }}
        title="高对比度"
        aria-label={settings.theme === 'high-contrast' ? '关闭高对比度' : '开启高对比度'}
      >
        👁️
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed' as const,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  topRight: {
    top: '16px',
    right: '16px',
  },
  topLeft: {
    top: '16px',
    left: '16px',
  },
  bottomRight: {
    bottom: '16px',
    right: '16px',
  },
  bottomLeft: {
    bottom: '16px',
    left: '16px',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  iconButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  separator: {
    width: '1px',
    height: '24px',
    backgroundColor: '#e5e7eb',
  },
  currentSize: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    minWidth: '30px',
    textAlign: 'center',
  },
};

export default AccessibilityControls;
