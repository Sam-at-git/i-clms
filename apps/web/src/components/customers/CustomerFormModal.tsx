import { useState, useEffect } from 'react';
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  CustomerStatus,
} from '@i-clms/shared/generated/graphql';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customer?: {
    id: string;
    name: string;
    shortName?: string | null;
    creditCode?: string | null;
    industry?: string | null;
    address?: string | null;
    status: CustomerStatus;
  } | null;
}

const INDUSTRIES = [
  'IT/互联网',
  '金融',
  '制造业',
  '教育',
  '医疗',
  '政府',
  '房地产',
  '零售',
  '能源',
  '交通',
  '其他',
];

export function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    shortName: '',
    creditCode: '',
    industry: '',
    address: '',
    status: CustomerStatus.Active,
  });

  const [createCustomer, { loading: creating }] = useCreateCustomerMutation({
    onCompleted: (data) => {
      if (data?.createCustomer) {
        onSuccess?.();
        onClose();
      }
    },
    onError: (error) => {
      alert(`创建失败: ${error.message}`);
    },
  });

  const [updateCustomer, { loading: updating }] = useUpdateCustomerMutation({
    onCompleted: (data) => {
      if (data?.updateCustomer) {
        onSuccess?.();
        onClose();
      }
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        fullName: customer.name,
        shortName: customer.shortName || '',
        creditCode: customer.creditCode || '',
        industry: customer.industry || '',
        address: customer.address || '',
        status: customer.status,
      });
    } else {
      setFormData({
        fullName: '',
        shortName: '',
        creditCode: '',
        industry: '',
        address: '',
        status: CustomerStatus.Active,
      });
    }
  }, [customer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      alert('请输入客户名称');
      return;
    }

    try {
      if (customer) {
        await updateCustomer({
          variables: {
            id: customer.id,
            input: {
              fullName: formData.fullName,
              shortName: formData.shortName || undefined,
              industry: formData.industry || undefined,
              address: formData.address || undefined,
              status: formData.status,
            },
          },
        });
      } else {
        await createCustomer({
          variables: {
            input: {
              fullName: formData.fullName,
              shortName: formData.shortName || undefined,
              creditCode: formData.creditCode || undefined,
              industry: formData.industry || undefined,
              address: formData.address || undefined,
            },
          },
        });
      }
    } catch (err) {
      console.error('Form submission error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {customer ? '编辑客户' : '新建客户'}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              客户名称 <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder="请输入客户公司全称"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>简称</label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) =>
                  setFormData({ ...formData, shortName: e.target.value })
                }
                placeholder="客户简称"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>信用代码</label>
              <input
                type="text"
                value={formData.creditCode}
                onChange={(e) =>
                  setFormData({ ...formData, creditCode: e.target.value })
                }
                placeholder="统一社会信用代码"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>所属行业</label>
            <select
              value={formData.industry}
              onChange={(e) =>
                setFormData({ ...formData, industry: e.target.value })
              }
              style={styles.select}
            >
              <option value="">请选择行业</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>客户地址</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="请输入地址"
              style={styles.input}
            />
          </div>

          {customer && (
            <div style={styles.formGroup}>
              <label style={styles.label}>状态</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as CustomerStatus,
                  })
                }
                style={styles.select}
              >
                <option value={CustomerStatus.Active}>活跃</option>
                <option value={CustomerStatus.Inactive}>非活跃</option>
                <option value={CustomerStatus.Archived}>已归档</option>
              </select>
            </div>
          )}

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={creating || updating}
            >
              取消
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={creating || updating}
            >
              {creating || updating ? '保存中...' : customer ? '保存' : '创建'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: '24px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#fff',
  },
  footer: {
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
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
