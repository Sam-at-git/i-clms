import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';

const DELETE_CONTRACT = gql`
  mutation DeleteContract($id: ID!) {
    deleteContract(id: $id)
  }
`;

interface ContractDeleteProps {
  contractId: string;
  contractNo: string;
  contractName: string;
  onClose: () => void;
}

export function ContractDelete({
  contractId,
  contractNo,
  contractName,
  onClose,
}: ContractDeleteProps) {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [deleteContract, { loading }] = useMutation(DELETE_CONTRACT, {
    onCompleted: () => {
      navigate('/contracts');
    },
    onError: (err) => {
      setError(err.message || '删除失败');
    },
  });

  const handleDelete = () => {
    setError('');
    deleteContract({
      variables: { id: contractId },
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>确认删除</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.warning}>
            <span style={styles.warningIcon}>⚠️</span>
            <p style={styles.warningText}>
              您确定要删除以下合同吗？此操作不可恢复。
            </p>
          </div>

          <div style={styles.contractInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>合同编号：</span>
              <span style={styles.infoValue}>{contractNo}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>合同名称：</span>
              <span style={styles.infoValue}>{contractName}</span>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelButton} disabled={loading}>
            取消
          </button>
          <button
            onClick={handleDelete}
            style={styles.deleteButton}
            disabled={loading}
          >
            {loading ? '删除中...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '450px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    color: '#dc2626',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  content: {
    padding: '24px',
  },
  error: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  warning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '20px',
  },
  warningIcon: {
    fontSize: '24px',
  },
  warningText: {
    margin: 0,
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.5,
  },
  contractInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  infoRow: {
    display: 'flex',
    marginBottom: '8px',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    width: '80px',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: '14px',
    color: '#111827',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#dc2626',
    color: '#fff',
    cursor: 'pointer',
  },
};

export default ContractDelete;
