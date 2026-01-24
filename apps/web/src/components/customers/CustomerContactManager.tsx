import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { GET_CUSTOMERS } from '../../graphql/customers';
import {
  ADD_CUSTOMER_CONTACT,
  UPDATE_CUSTOMER_CONTACT,
  REMOVE_CUSTOMER_CONTACT,
} from '../../graphql/customers';

interface CustomerContactManagerProps {
  customerId: string;
  customerName?: string;
}

export function CustomerContactManager({
  customerId,
  customerName,
}: CustomerContactManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    phone: '',
    email: '',
    isPrimary: false,
  });

  // Query customer with contacts
  const { data, loading, refetch } = useQuery(GET_CUSTOMERS, {
    variables: {
      filter: {
        id: customerId,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [addContact, { loading: adding }] = useMutation(ADD_CUSTOMER_CONTACT, {
    onCompleted: () => {
      setShowAddModal(false);
      resetForm();
      refetch();
      alert('联系人添加成功');
    },
    onError: (error) => {
      alert(`添加失败: ${error.message}`);
    },
  });

  const [updateContact, { loading: updating }] = useMutation(UPDATE_CUSTOMER_CONTACT, {
    onCompleted: () => {
      setShowEditModal(false);
      setEditingContact(null);
      resetForm();
      refetch();
      alert('联系人更新成功');
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  const [removeContact, { loading: removing }] = useMutation(REMOVE_CUSTOMER_CONTACT, {
    onCompleted: () => {
      setShowDeleteConfirm(false);
      setEditingContact(null);
      refetch();
      alert('联系人删除成功');
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  const customer = data?.customers?.items?.[0];
  const contacts = customer?.contacts || [];

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      phone: '',
      email: '',
      isPrimary: false,
    });
  };

  const handleAdd = () => {
    addContact({
      variables: {
        customerId,
        input: formData,
      },
    });
  };

  const handleUpdate = () => {
    if (!editingContact) return;

    updateContact({
      variables: {
        contactId: editingContact.id,
        input: formData,
      },
    });
  };

  const handleDelete = () => {
    if (!editingContact) return;

    removeContact({
      variables: {
        contactId: editingContact.id,
      },
    });
  };

  const openEditModal = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      title: contact.title || '',
      phone: contact.phone || '',
      email: contact.email || '',
      isPrimary: contact.isPrimary,
    });
    setShowEditModal(true);
  };

  const handleSetPrimary = (contact: any) => {
    if (contact.isPrimary) return;

    updateContact({
      variables: {
        contactId: contact.id,
        input: {
          ...contact,
          isPrimary: true,
        },
      },
      onCompleted: () => {
        // Unset other primary contacts
        contacts
          .filter((c: any) => c.id !== contact.id && c.isPrimary)
          .forEach((c: any) => {
            updateContact({
              variables: {
                contactId: c.id,
                input: {
                  ...c,
                  isPrimary: false,
                },
              },
            });
          });
      },
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>联系人管理</h3>
          {customerName && (
            <span style={styles.customerName}>{customerName}</span>
          )}
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          style={styles.addButton}
        >
          + 添加联系人
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Contact List */}
      {!loading && contacts.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👤</div>
          <div style={styles.emptyText}>暂无联系人</div>
          <div style={styles.emptySubtext}>
            点击"添加联系人"添加第一个联系人
          </div>
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <div style={styles.contactList}>
          {contacts.map((contact: any) => (
            <div key={contact.id} style={styles.contactCard}>
              <div style={styles.contactHeader}>
                <div style={styles.contactInfo}>
                  <div style={styles.contactName}>
                    {contact.name}
                    {contact.isPrimary && (
                      <span style={styles.primaryBadge}>主要</span>
                    )}
                  </div>
                  {contact.title && (
                    <div style={styles.contactTitle}>{contact.title}</div>
                  )}
                </div>
                <div style={styles.contactActions}>
                  {!contact.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(contact)}
                      disabled={updating}
                      style={styles.primaryButton}
                      title="设为主要联系人"
                    >
                      ⭐ 设为主要
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(contact)}
                    disabled={updating}
                    style={styles.editButton}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => {
                      setEditingContact(contact);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={removing}
                    style={styles.deleteButton}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div style={styles.contactDetails}>
                {contact.phone && (
                  <div style={styles.contactDetail}>
                    <span style={styles.detailIcon}>📞</span>
                    <a href={`tel:${contact.phone}`} style={styles.detailLink}>
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div style={styles.contactDetail}>
                    <span style={styles.detailIcon}>✉️</span>
                    <a href={`mailto:${contact.email}`} style={styles.detailLink}>
                      {contact.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>添加联系人</h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  姓名 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="联系人姓名"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>职务</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={styles.input}
                  placeholder="例如: 采购经理"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={styles.input}
                  placeholder="联系电话"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                  placeholder="电子邮箱"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                    style={styles.checkbox}
                  />
                  设为主要联系人
                </label>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowAddModal(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !formData.name.trim()}
                style={styles.confirmButton}
              >
                {adding ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>编辑联系人</h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  姓名 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>职务</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>电话</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>邮箱</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                    style={styles.checkbox}
                  />
                  设为主要联系人
                </label>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowEditModal(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating || !formData.name.trim()}
                style={styles.confirmButton}
              >
                {updating ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && editingContact && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认删除</h3>
            <p style={styles.confirmMessage}>
              确定要删除联系人 "{editingContact.name}" 吗？此操作不可撤销。
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={removing}
                style={styles.deleteConfirmButton}
              >
                {removing ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  customerName: {
    fontSize: '14px',
    color: '#6b7280',
  },
  addButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: 500,
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
  },
  contactList: {
    padding: '20px',
  },
  contactCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    marginBottom: '12px',
    backgroundColor: '#fff',
    transition: 'box-shadow 0.2s',
  },
  contactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  primaryBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    color: '#fff',
    backgroundColor: '#10b981',
    borderRadius: '12px',
    fontWeight: 500,
  },
  contactTitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  contactActions: {
    display: 'flex',
    gap: '6px',
  },
  primaryButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#f59e0b',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  editButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  contactDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  detailIcon: {
    fontSize: '14px',
  },
  detailLink: {
    color: '#374151',
    textDecoration: 'none',
  },
  modalOverlay: {
    position: 'fixed' as const,
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
    borderRadius: '8px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
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
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    minWidth: '400px',
    maxWidth: '500px',
  },
  confirmMessage: {
    margin: '0 0 20px 0',
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
  deleteConfirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default CustomerContactManager;
