import { useState } from 'react';

export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface Schedule {
  id?: string;
  name: string;
  reportTemplateId: string;
  frequency: ScheduleFrequency;
  recipients: string[];
  parameters?: Record<string, any>;
  nextRun?: string;
  lastRun?: string;
  isActive: boolean;
}

interface ReportSchedulerProps {
  schedule?: Schedule;
  onSave?: (schedule: Schedule) => void;
  onCancel?: () => void;
}

export function ReportScheduler({ schedule, onSave, onCancel }: ReportSchedulerProps) {
  const [name, setName] = useState(schedule?.name || '');
  const [frequency, setFrequency] = useState<ScheduleFrequency>(schedule?.frequency || 'once');
  const [recipients, setRecipients] = useState(schedule?.recipients || []);
  const [newRecipient, setNewRecipient] = useState('');
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);

  const handleAddRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入调度名称');
      return;
    }

    if (recipients.length === 0) {
      alert('请至少添加一个收件人');
      return;
    }

    onSave?.({
      id: schedule?.id,
      name: name.trim(),
      reportTemplateId: schedule?.reportTemplateId || '',
      frequency,
      recipients,
      isActive,
    });
  };

  const getFrequencyLabel = (freq: ScheduleFrequency) => {
    const labels: Record<ScheduleFrequency, string> = {
      once: '一次性',
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
      quarterly: '每季度',
    };
    return labels[freq];
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          {schedule?.id ? '编辑报表调度' : '创建报表调度'}
        </h3>
        <div style={styles.subtitle}>配置自动生成和发送报表</div>
      </div>

      {/* Form */}
      <div style={styles.form}>
        {/* Name */}
        <div style={styles.field}>
          <label style={styles.label}>调度名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：月度财务报表"
            style={styles.input}
          />
        </div>

        {/* Frequency */}
        <div style={styles.field}>
          <label style={styles.label}>执行频率</label>
          <div style={styles.frequencyOptions}>
            {(['once', 'daily', 'weekly', 'monthly', 'quarterly'] as ScheduleFrequency[]).map(
              (freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  style={{
                    ...styles.frequencyButton,
                    ...(frequency === freq && styles.frequencyButtonSelected),
                  }}
                >
                  {getFrequencyLabel(freq)}
                </button>
              )
            )}
          </div>
        </div>

        {/* Recipients */}
        <div style={styles.field}>
          <label style={styles.label}>收件人邮箱</label>
          <div style={styles.recipientSection}>
            <div style={styles.recipientInput}>
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                placeholder="输入邮箱地址"
                style={styles.input}
              />
              <button onClick={handleAddRecipient} style={styles.addButton}>
                添加
              </button>
            </div>
            <div style={styles.recipientList}>
              {recipients.length === 0 ? (
                <div style={styles.emptyRecipients}>暂无收件人</div>
              ) : (
                recipients.map((email) => (
                  <div key={email} style={styles.recipientItem}>
                    <span style={styles.recipientEmail}>{email}</span>
                    <button
                      onClick={() => handleRemoveRecipient(email)}
                      style={styles.removeButton}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={styles.field}>
          <label style={styles.switchLabel}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={styles.switch}
            />
            <span>启用此调度</span>
          </label>
        </div>

        {/* Preview */}
        {schedule && (
          <div style={styles.field}>
            <label style={styles.label}>调度信息</label>
            <div style={styles.infoBox}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>上次运行:</span>
                <span style={styles.infoValue}>
                  {schedule.lastRun ? new Date(schedule.lastRun).toLocaleString('zh-CN') : '未运行'}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>下次运行:</span>
                <span style={styles.infoValue}>
                  {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString('zh-CN') : '待定'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button onClick={onCancel} style={styles.cancelButton}>
          取消
        </button>
        <button onClick={handleSave} style={styles.saveButton}>
          保存
        </button>
      </div>
    </div>
  );
}

interface ReportScheduleListProps {
  schedules: Schedule[];
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
}

export function ReportScheduleList({
  schedules,
  onEdit,
  onDelete,
  onToggleActive,
}: ReportScheduleListProps) {
  if (schedules.length === 0) {
    return (
      <div style={styles.emptyList}>
        <div style={styles.emptyIcon}>📅</div>
        <div style={styles.emptyText}>暂无报表调度</div>
        <div style={styles.emptyHint}>创建调度后，报表将自动生成并发送给收件人</div>
      </div>
    );
  }

  const getFrequencyLabel = (freq: ScheduleFrequency) => {
    const labels: Record<ScheduleFrequency, string> = {
      once: '一次性',
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
      quarterly: '每季度',
    };
    return labels[freq];
  };

  return (
    <div style={styles.listContainer}>
      <div style={styles.listHeader}>
        <h4 style={styles.listTitle}>报表调度 ({schedules.length})</h4>
      </div>
      <div style={styles.listItems}>
        {schedules.map((schedule) => (
          <div key={schedule.id} style={styles.listItem}>
            <div style={styles.itemHeader}>
              <div style={styles.itemInfo}>
                <div style={styles.itemName}>{schedule.name}</div>
                <div style={styles.itemMeta}>
                  <span style={styles.itemFrequency}>{getFrequencyLabel(schedule.frequency)}</span>
                  <span style={styles.itemSeparator}>•</span>
                  <span style={styles.itemRecipients}>{schedule.recipients.length} 收件人</span>
                </div>
              </div>
              <label style={styles.toggle}>
                <input
                  type="checkbox"
                  checked={schedule.isActive}
                  onChange={(e) => onToggleActive?.(schedule.id!, e.target.checked)}
                  style={styles.toggleCheckbox}
                />
              </label>
            </div>
            <div style={styles.itemActions}>
              <button
                onClick={() => onEdit?.(schedule)}
                style={styles.editButton}
              >
                编辑
              </button>
              <button
                onClick={() => {
                  if (confirm('确定要删除这个调度吗？')) {
                    onDelete?.(schedule.id!);
                  }
                }}
                style={styles.deleteButton}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  frequencyOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '8px',
  },
  frequencyButton: {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  frequencyButtonSelected: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  recipientSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recipientInput: {
    display: 'flex',
    gap: '8px',
  },
  addButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  recipientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minHeight: '60px',
    padding: '8px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  emptyRecipients: {
    fontSize: '13px',
    color: '#9ca3af',
    textAlign: 'center',
    padding: '16px',
  },
  recipientItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
  },
  recipientEmail: {
    fontSize: '13px',
    color: '#374151',
  },
  removeButton: {
    padding: '2px 6px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  switchLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  switch: {
    cursor: 'pointer',
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  infoItem: {
    display: 'flex',
    fontSize: '13px',
    marginBottom: '6px',
  },
  infoLabel: {
    color: '#6b7280',
    minWidth: '80px',
  },
  infoValue: {
    color: '#111827',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
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
  saveButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  listHeader: {
    marginBottom: '16px',
  },
  listTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  listItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#6b7280',
  },
  itemFrequency: {},
  itemSeparator: {},
  itemRecipients: {},
  toggle: {
    cursor: 'pointer',
  },
  toggleCheckbox: {
    cursor: 'pointer',
  },
  itemActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  emptyList: {
    padding: '48px 24px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    border: '1px dashed #d1d5db',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '4px',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#9ca3af',
  },
};

export default ReportScheduler;
