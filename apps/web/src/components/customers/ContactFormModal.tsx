import { useState, useEffect } from 'react';
import {
  useAddCustomerContactMutation,
  useUpdateCustomerContactMutation,
} from '@i-clms/shared/generated/graphql';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customerId: string;
  contact?: {
    id: string;
    name: string;
    title?: string | null;
    phone?: string | null;
    email?: string | null;
    isPrimary: boolean;
  } | null;
}

export function ContactFormModal({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  contact,
}: ContactFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    phone: '',
    email: '',
    isPrimary: false,
  });

  const [addContact, { loading: adding }] = useAddCustomerContactMutation({
    onCompleted: (data) => {
      if (data?.addCustomerContact) {
        onSuccess?.();
        onClose();
      }
    },
    onError: (error) => {
      alert(`添加失败: ${error.message}`);
    },
  });

  const [updateContact, { loading: updating }] = useUpdateCustomerContactMutation({
    onCompleted: (data) => {
      if (data?.updateCustomerContact) {
        onSuccess?.();
        onClose();
      }
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        title: contact.title || '',
        phone: contact.phone || '',
        email: contact.email || '',
        isPrimary: contact.isPrimary,
      });
    } else {
      setFormData({
        name: '',
        title: '',
        phone: '',
        email: '',
        isPrimary: false,
      });
    }
  }, [contact, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('请输入联系人姓名');
      return;
    }

    // Email validation
    if (formData.email && !EMAIL_REGEX.test(formData.email)) {
      alert('请输入有效的邮箱地址');
      return;
    }

    try {
      if (contact) {
        await updateContact({
          variables: {
            contactId: contact.id,
            input: {
              name: formData.name,
              title: formData.title || undefined,
              phone: formData.phone || undefined,
              email: formData.email || undefined,
              isPrimary: formData.isPrimary,
            },
          },
        });
      } else {
        await addContact({
          variables: {
            customerId,
            input: {
              name: formData.name,
              title: formData.title || undefined,
              phone: formData.phone || undefined,
              email: formData.email || undefined,
              isPrimary: formData.isPrimary,
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
            {contact ? '编辑联系人' : '添加联系人'}
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              姓名 <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="请输入姓名"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>职务</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="请输入职务"
              style={styles.input}
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>手机号码</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="手机号码"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="邮箱地址"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isPrimary}
                onChange={(e) =>
                  setFormData({ ...formData, isPrimary: e.target.checked })
                }
                style={styles.checkbox}
              />
              <span>设为主联系人</span>
            </label>
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={adding || updating}
            >
              取消
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={adding || updating}
            >
              {adding || updating ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    maxWidth: '450px',
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
  checkboxGroup: {
    marginBottom: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
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
