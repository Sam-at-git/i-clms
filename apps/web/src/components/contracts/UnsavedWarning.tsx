import { useEffect, useState } from 'react';

interface UnsavedWarningProps {
  hasUnsavedChanges: boolean;
  onBeforeUnload?: (e: BeforeUnloadEvent) => void;
}

export function useUnsavedWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}

interface UnsavedWarningDialogProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnsavedWarningDialog({ show, onConfirm, onCancel }: UnsavedWarningDialogProps) {
  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <h3 style={styles.title}>未保存的更改</h3>
        </div>
        <div style={styles.content}>
          <p style={styles.message}>
            您有未保存的更改。如果要离开此页面，这些更改将丢失。
          </p>
          <p style={styles.question}>您确定要离开吗？</p>
        </div>
        <div style={styles.footer}>
          <button onClick={onCancel} style={styles.cancelButton}>
            留在此页面
          </button>
          <button onClick={onConfirm} style={styles.confirmButton}>
            离开
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  content: {
    marginBottom: '24px',
  },
  message: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 12px 0',
  },
  question: {
    fontSize: '15px',
    color: '#111827',
    fontWeight: 500,
    margin: 0,
  },
  footer: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default UnsavedWarningDialog;
