import { useState, useEffect } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const UPDATE_CONTRACT = gql`
  mutation UpdateContract($id: ID!, $input: UpdateContractInput!) {
    updateContract(id: $id, input: $input) {
      id
      contractNo
      name
      type
      status
      ourEntity
      amountWithTax
      signedAt
    }
  }
`;

interface Contract {
  id: string;
  contractNo: string;
  name: string;
  type: string;
  status: string;
  ourEntity: string;
  amountWithTax: string;
  currency: string;
  signedAt: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  industry: string | null;
  salesPerson: string | null;
}

interface ContractEditProps {
  contract: Contract;
  onClose: () => void;
  onSuccess: () => void;
}

const CONTRACT_TYPES = [
  { value: 'STAFF_AUGMENTATION', label: '人力框架' },
  { value: 'PROJECT_OUTSOURCING', label: '项目外包' },
  { value: 'PRODUCT_SALES', label: '产品购销' },
];

const CONTRACT_STATUSES = [
  { value: 'DRAFT', label: '草拟' },
  { value: 'PENDING_APPROVAL', label: '审批中' },
  { value: 'ACTIVE', label: '已生效' },
  { value: 'EXECUTING', label: '执行中' },
  { value: 'COMPLETED', label: '已完结' },
  { value: 'TERMINATED', label: '已终止' },
  { value: 'EXPIRED', label: '已过期' },
];

export function ContractEdit({ contract, onClose, onSuccess }: ContractEditProps) {
  const [formData, setFormData] = useState({
    contractNo: contract.contractNo,
    name: contract.name,
    type: contract.type,
    status: contract.status,
    ourEntity: contract.ourEntity || '',
    amountWithTax: contract.amountWithTax || '',
    signedAt: contract.signedAt?.split('T')[0] || '',
    effectiveAt: contract.effectiveAt?.split('T')[0] || '',
    expiresAt: contract.expiresAt?.split('T')[0] || '',
    paymentMethod: contract.paymentMethod || '',
    paymentTerms: contract.paymentTerms || '',
    industry: contract.industry || '',
    salesPerson: contract.salesPerson || '',
  });
  const [error, setError] = useState('');

  const [updateContract, { loading }] = useMutation(UPDATE_CONTRACT, {
    onCompleted: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || '更新失败');
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.contractNo || !formData.name) {
      setError('合同编号和名称为必填项');
      return;
    }

    updateContract({
      variables: {
        id: contract.id,
        input: {
          contractNo: formData.contractNo,
          name: formData.name,
          type: formData.type,
          status: formData.status,
          ourEntity: formData.ourEntity || null,
          amountWithTax: formData.amountWithTax || null,
          signedAt: formData.signedAt || null,
          effectiveAt: formData.effectiveAt || null,
          expiresAt: formData.expiresAt || null,
          paymentMethod: formData.paymentMethod || null,
          paymentTerms: formData.paymentTerms || null,
          industry: formData.industry || null,
          salesPerson: formData.salesPerson || null,
        },
      },
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>编辑合同</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>合同编号 *</label>
              <input
                type="text"
                value={formData.contractNo}
                onChange={(e) => handleChange('contractNo', e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>合同名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>合同类型</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                style={styles.input}
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>合同状态</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                style={styles.input}
              >
                {CONTRACT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>我方主体</label>
              <input
                type="text"
                value={formData.ourEntity}
                onChange={(e) => handleChange('ourEntity', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>合同金额</label>
              <input
                type="number"
                value={formData.amountWithTax}
                onChange={(e) => handleChange('amountWithTax', e.target.value)}
                style={styles.input}
                step="0.01"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>签订日期</label>
              <input
                type="date"
                value={formData.signedAt}
                onChange={(e) => handleChange('signedAt', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>生效日期</label>
              <input
                type="date"
                value={formData.effectiveAt}
                onChange={(e) => handleChange('effectiveAt', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>终止日期</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => handleChange('expiresAt', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>付款方式</label>
              <input
                type="text"
                value={formData.paymentMethod}
                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>付款条件</label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => handleChange('paymentTerms', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>所属行业</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>销售负责人</label>
              <input
                type="text"
                value={formData.salesPerson}
                onChange={(e) => handleChange('salesPerson', e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              取消
            </button>
            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
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
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
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
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  error: {
    margin: '16px 24px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  },
  form: {
    padding: '24px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
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
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
};

export default ContractEdit;
