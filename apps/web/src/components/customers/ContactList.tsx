import { useState } from 'react';
import { useRemoveCustomerContactMutation } from '@i-clms/shared/generated/graphql';
import { ContactFormModal } from './ContactFormModal';

interface Contact {
  id: string;
  name: string;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
}

interface ContactListProps {
  customerId: string;
  contacts: Contact[];
  onUpdate?: () => void;
}

export function ContactList({ customerId, contacts, onUpdate }: ContactListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  const [removeContact] = useRemoveCustomerContactMutation({
    onCompleted: () => {
      onUpdate?.();
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
      setDeletingContactId(null);
    },
  });

  const handleAddClick = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (contactId: string) => {
    if (!confirm('确定要删除这个联系人吗？')) {
      return;
    }
    setDeletingContactId(contactId);
    await removeContact({ variables: { contactId } });
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingContact(null);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    onUpdate?.();
  };

  if (contacts.length === 0) {
    return (
      <>
        <div style={styles.empty}>
          <div style={styles.emptyText}>暂无联系人</div>
          <button onClick={handleAddClick} style={styles.addButton}>
            + 添加联系人
          </button>
        </div>
        <ContactFormModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          customerId={customerId}
          contact={editingContact}
        />
      </>
    );
  }

  return (
    <>
      <div style={styles.container}>
        <div style={styles.list}>
          {contacts.map((contact) => (
            <div key={contact.id} style={styles.contactCard}>
              <div style={styles.contactHeader}>
                <div style={styles.contactName}>
                  {contact.name}
                  {contact.isPrimary && (
                    <span style={styles.primaryBadge}>主要</span>
                  )}
                </div>
                <div style={styles.contactActions}>
                  <button
                    onClick={() => handleEditClick(contact)}
                    style={styles.actionButton}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDeleteClick(contact.id)}
                    style={{
                      ...styles.actionButton,
                      ...(deletingContactId === contact.id ? styles.deletingButton : {}),
                    }}
                    disabled={deletingContactId === contact.id}
                  >
                    {deletingContactId === contact.id ? '删除中...' : '删除'}
                  </button>
                </div>
              </div>
              {contact.title && (
                <div style={styles.contactField}>
                  <span style={styles.fieldLabel}>职位：</span>
                  <span style={styles.fieldValue}>{contact.title}</span>
                </div>
              )}
              {contact.phone && (
                <div style={styles.contactField}>
                  <span style={styles.fieldLabel}>电话：</span>
                  <span style={styles.fieldValue}>{contact.phone}</span>
                </div>
              )}
              {contact.email && (
                <div style={styles.contactField}>
                  <span style={styles.fieldLabel}>邮箱：</span>
                  <span style={styles.fieldValue}>{contact.email}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={handleAddClick} style={styles.addButton}>
          + 添加联系人
        </button>
      </div>
      <ContactFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        customerId={customerId}
        contact={editingContact}
      />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactCard: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  contactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  contactName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  primaryBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    fontSize: '11px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
  },
  contactActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deletingButton: {
    color: '#9ca3af',
    border: '1px solid #e5e7eb',
    cursor: 'not-allowed',
  },
  contactField: {
    fontSize: '13px',
    color: '#4b5563',
    marginBottom: '4px',
  },
  fieldLabel: {
    color: '#6b7280',
  },
  fieldValue: {
    color: '#111827',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '12px',
  },
  addButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default ContactList;
