import { useEffect } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: 'left' | 'right' | 'top' | 'bottom';
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  children,
  title,
  position = 'right',
  width = '400px',
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getPositionStyle = (): React.CSSProperties => {
    switch (position) {
      case 'left':
        return {
          left: 0,
          top: 0,
          bottom: 0,
          width,
        };
      case 'right':
        return {
          right: 0,
          top: 0,
          bottom: 0,
          width,
        };
      case 'top':
        return {
          top: 0,
          left: 0,
          right: 0,
          height: 'auto',
        };
      case 'bottom':
        return {
          bottom: 0,
          left: 0,
          right: 0,
          height: 'auto',
        };
      default:
        return {};
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={{ ...styles.drawer, ...getPositionStyle() }}>
        {title && (
          <div style={styles.header}>
            <h3 style={styles.title}>{title}</h3>
            <button onClick={onClose} style={styles.closeButton}>
              ✕
            </button>
          </div>
        )}
        <div style={styles.content}>{children}</div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'fixed',
    backgroundColor: '#fff',
    boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto' as const,
  },
};

export default Drawer;
