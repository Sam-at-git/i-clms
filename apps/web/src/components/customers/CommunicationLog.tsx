import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

interface CommunicationLogProps {
  customerId: string;
  customerName?: string;
}

const ADD_COMMUNICATION = gql`
  mutation AddCommunication($input: CreateCommunicationInput!) {
    addCommunication(input: $input) {
      id
      type
      summary
      notes
      communicatedAt
      communicatedBy {
        id
        name
      }
      attachments {
        id
        fileName
        fileUrl
      }
    }
  }
`;

interface Communication {
  id: string;
  type: string;
  summary: string;
  notes: string;
  communicatedAt: Date;
  communicatedBy: {
    id: string;
    name: string;
  };
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
  }>;
}

const COMMUNICATION_TYPES = [
  { value: 'PHONE', label: '电话', icon: '📞' },
  { value: 'EMAIL', label: '邮件', icon: '✉️' },
  { value: 'MEETING', label: '会议', icon: '👥' },
  { value: 'VISIT', label: '拜访', icon: '🏢' },
  { value: 'OTHER', label: '其他', icon: '📝' },
];

export function CommunicationLog({
  customerId,
  customerName,
}: CommunicationLogProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [logs, setLogs] = useState<Communication[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    type: 'PHONE',
    summary: '',
    notes: '',
    communicatedAt: new Date().toISOString().slice(0, 16),
    attachments: [] as File[],
  });

  // Mutation
  const [addCommunication, { loading }] = useMutation(ADD_COMMUNICATION, {
    onCompleted: (data) => {
      setLogs([data.addCommunication, ...logs]);
      setShowAddModal(false);
      resetForm();
      alert('记录添加成功');
    },
    onError: (error) => {
      alert(`添加失败: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'PHONE',
      summary: '',
      notes: '',
      communicatedAt: new Date().toISOString().slice(0, 16),
      attachments: [],
    });
  };

  const handleSubmit = () => {
    if (!formData.summary.trim()) {
      alert('请输入沟通摘要');
      return;
    }

    addCommunication({
      variables: {
        input: {
          customerId,
          type: formData.type,
          summary: formData.summary,
          notes: formData.notes,
          communicatedAt: new Date(formData.communicatedAt).toISOString(),
        },
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        attachments: Array.from(e.target.files),
      });
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>沟通记录</h3>
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
          + 添加记录
        </button>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{logs.length}</span>
          <span style={styles.statLabel}>总记录数</span>
        </div>
        {logs.length > 0 && (
          <>
            <div style={styles.stat}>
              <span style={styles.statValue}>
                {logs.filter((l) => l.type === 'PHONE').length}
              </span>
              <span style={styles.statLabel}>电话沟通</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>
                {logs.filter((l) => l.type === 'MEETING').length}
              </span>
              <span style={styles.statLabel}>会议</span>
            </div>
          </>
        )}
      </div>

      {/* Empty State */}
      {logs.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>💬</div>
          <div style={styles.emptyText}>暂无沟通记录</div>
          <div style={styles.emptySubtext}>
            点击"添加记录"开始记录客户沟通
          </div>
        </div>
      )}

      {/* Communication List */}
      {logs.length > 0 && (
        <div style={styles.logList}>
          {logs.map((log) => {
            const typeInfo = COMMUNICATION_TYPES.find((t) => t.value === log.type);
            return (
              <div key={log.id} style={styles.logCard}>
                <div style={styles.logHeader}>
                  <div style={styles.logType}>
                    <span style={styles.logTypeIcon}>{typeInfo?.icon}</span>
                    <span style={styles.logTypeLabel}>{typeInfo?.label}</span>
                  </div>
                  <div style={styles.logMeta}>
                    <span style={styles.logDate}>
                      {new Date(log.communicatedAt).toLocaleDateString('zh-CN')}
                    </span>
                    <span style={styles.logTime}>
                      {new Date(log.communicatedAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div style={styles.logSummary}>{log.summary}</div>

                {log.notes && (
                  <div style={styles.logNotes}>
                    <div style={styles.notesLabel}>备注:</div>
                    <div style={styles.notesContent}>{log.notes}</div>
                  </div>
                )}

                {log.attachments && log.attachments.length > 0 && (
                  <div style={styles.attachments}>
                    <div style={styles.attachmentsLabel}>附件:</div>
                    <div style={styles.attachmentsList}>
                      {log.attachments.map((file) => (
                        <div key={file.id} style={styles.attachment}>
                          <span style={styles.attachmentIcon}>📎</span>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.attachmentLink}
                          >
                            {file.fileName}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {log.communicatedBy && (
                  <div style={styles.logFooter}>
                    <span style={styles.author}>记录人: {log.communicatedBy.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>添加沟通记录</h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  沟通类型 <span style={styles.required}>*</span>
                </label>
                <div style={styles.typeSelector}>
                  {COMMUNICATION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      style={{
                        ...styles.typeButton,
                        ...(formData.type === type.value && styles.typeButtonSelected),
                      }}
                    >
                      <span style={styles.typeIcon}>{type.icon}</span>
                      <span style={styles.typeLabel}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  沟通摘要 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  style={styles.input}
                  placeholder="简要描述沟通内容"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>详细备注</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={styles.textarea}
                  rows={4}
                  placeholder="详细记录沟通内容、结果、后续计划等"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>沟通时间</label>
                <input
                  type="datetime-local"
                  value={formData.communicatedAt}
                  onChange={(e) => setFormData({ ...formData, communicatedAt: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>附件</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  style={styles.fileInput}
                />
                {formData.attachments.length > 0 && (
                  <div style={styles.fileList}>
                    {formData.attachments.map((file, index) => (
                      <div key={index} style={styles.fileItem}>
                        <span style={styles.fileName}>{file.name}</span>
                        <span style={styles.fileSize}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          onClick={() => {
                            setFormData({
                              ...formData,
                              attachments: formData.attachments.filter((_, i) => i !== index),
                            });
                          }}
                          style={styles.removeFileButton}
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                onClick={handleSubmit}
                disabled={loading || !formData.summary.trim()}
                style={styles.confirmButton}
              >
                {loading ? '添加中...' : '添加'}
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
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
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
  stats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px',
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
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#fff',
    transition: 'box-shadow 0.2s',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  logType: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  logTypeIcon: {
    fontSize: '16px',
  },
  logTypeLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  logMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  logDate: {
    fontSize: '12px',
    color: '#6b7280',
  },
  logTime: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  logSummary: {
    fontSize: '14px',
    color: '#111827',
    marginBottom: '8px',
  },
  logNotes: {
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    fontSize: '13px',
    marginBottom: '8px',
  },
  notesLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 500,
    marginBottom: '4px',
  },
  notesContent: {
    color: '#374151',
    lineHeight: '1.5',
  },
  attachments: {
    marginBottom: '8px',
  },
  attachmentsLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 500,
    marginBottom: '4px',
  },
  attachmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  attachment: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  attachmentIcon: {
    fontSize: '12px',
  },
  attachmentLink: {
    color: '#3b82f6',
    textDecoration: 'none',
  },
  logFooter: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  author: {
    color: '#6b7280',
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
    minWidth: '500px',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflowY: 'auto',
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
  typeSelector: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  typeButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  typeButtonSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    color: '#1e40af',
  },
  typeIcon: {
    fontSize: '14px',
  },
  typeLabel: {
    fontWeight: 500,
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
  },
  textarea: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  fileInput: {
    fontSize: '13px',
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
    fontSize: '13px',
  },
  fileName: {
    flex: 1,
    color: '#374151',
  },
  fileSize: {
    color: '#9ca3af',
    fontSize: '12px',
  },
  removeFileButton: {
    padding: '2px 8px',
    fontSize: '11px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: 'none',
    borderRadius: '3px',
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
};

export default CommunicationLog;
