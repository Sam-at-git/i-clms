import { useState, useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

export type ReminderType = 'contract_expiry' | 'milestone_due' | 'payment_overdue' | 'renewal' | 'task';
export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';
export type ReminderMethod = 'email' | 'sms' | 'in_app' | 'webhook';

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  description: string;
  entity?: {
    type: string;
    id: string;
    name: string;
  };
  dueDate: string;
  frequency: ReminderFrequency;
  methods: ReminderMethod[];
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

const GET_REMINDERS = gql`
  query GetReminders($filter: ReminderFilterInput) {
    reminders(filter: $filter) {
      id
      type
      title
      description
      entity {
        type
        id
        name
      }
      dueDate
      frequency
      methods
      isActive
      isCompleted
      completedAt
      createdAt
    }
  }
`;

const CREATE_REMINDER = gql`
  mutation CreateReminder($input: CreateReminderInput!) {
    createReminder(input: $input) {
      id
    }
  }
`;

const UPDATE_REMINDER = gql`
  mutation UpdateReminder($id: ID!, $input: UpdateReminderInput!) {
    updateReminder(id: $id, input: $input) {
      id
    }
  }
`;

const COMPLETE_REMINDER = gql`
  mutation CompleteReminder($id: ID!) {
    completeReminder(id: $id) {
      id
      isCompleted
    }
  }
`;

const DELETE_REMINDER = gql`
  mutation DeleteReminder($id: ID!) {
    deleteReminder(id: $id) {
      id
    }
  }
`;

interface ReminderManagerProps {
  entityType?: string;
  entityId?: string;
}

interface GetRemindersResponse {
  reminders?: Reminder[];
}

export function ReminderManager({ entityType, entityId }: ReminderManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterType, setFilterType] = useState<ReminderType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');

  const { data, loading, refetch } = useQuery<GetRemindersResponse>(GET_REMINDERS, {
    variables: {
      filter: {
        entityType,
        entityId,
        type: filterType === 'all' ? undefined : filterType,
        isCompleted: filterStatus === 'all' ? undefined : filterStatus === 'completed',
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const [createReminderMutation] = useMutation(CREATE_REMINDER);

  const [completeReminderMutation] = useMutation(COMPLETE_REMINDER);

  const [deleteReminderMutation] = useMutation(DELETE_REMINDER);

  const reminders = useMemo(() => {
    return (data?.reminders || []) as Reminder[];
  }, [data]);

  const activeCount = reminders.filter((r) => r.isActive && !r.isCompleted).length;
  const overdueCount = reminders.filter(
    (r) => !r.isCompleted && new Date(r.dueDate) < new Date()
  ).length;

  const handleComplete = async (id: string) => {
    try {
      await completeReminderMutation({ variables: { id } });
      refetch();
    } catch (err) {
      console.error('Failed to complete reminder:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个提醒吗？')) return;
    try {
      await deleteReminderMutation({ variables: { id } });
      refetch();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const getTypeLabel = (type: ReminderType) => {
    const labels: Record<ReminderType, string> = {
      contract_expiry: '合同到期',
      milestone_due: '里程碑到期',
      payment_overdue: '逾期款项',
      renewal: '续约',
      task: '任务',
    };
    return labels[type];
  };

  const getTypeIcon = (type: ReminderType) => {
    const icons: Record<ReminderType, string> = {
      contract_expiry: '📄',
      milestone_due: '🎯',
      payment_overdue: '💰',
      renewal: '🔄',
      task: '✓',
    };
    return icons[type];
  };

  const getFrequencyLabel = (freq: ReminderFrequency) => {
    const labels: Record<ReminderFrequency, string> = {
      once: '一次性',
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
    };
    return labels[freq];
  };

  const getMethodLabel = (method: ReminderMethod) => {
    const labels: Record<ReminderMethod, string> = {
      email: '邮件',
      sms: '短信',
      in_app: '应用内',
      webhook: 'Webhook',
    };
    return labels[method];
  };

  return (
    <div style={styles.container}>
      {/* Stats Header */}
      <div style={styles.statsHeader}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{activeCount}</div>
          <div style={styles.statLabel}>进行中</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>{overdueCount}</div>
          <div style={styles.statLabel}>已逾期</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#10b981' }}>
            {reminders.filter((r) => r.isCompleted).length}
          </div>
          <div style={styles.statLabel}>已完成</div>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={styles.createButton}
        >
          + 新建提醒
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <ReminderCreateForm
          entityType={entityType}
          entityId={entityId}
          onSubmit={async (input) => {
            await createReminderMutation({ variables: { input } });
            refetch();
            setShowCreateForm(false);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>类型:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">全部类型</option>
            <option value="contract_expiry">合同到期</option>
            <option value="milestone_due">里程碑到期</option>
            <option value="payment_overdue">逾期款项</option>
            <option value="renewal">续约</option>
            <option value="task">任务</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>状态:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={styles.filterSelect}
          >
            <option value="all">全部状态</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="overdue">已逾期</option>
          </select>
        </div>
      </div>

      {/* Reminders List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : reminders.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>⏰</div>
            <div style={styles.emptyText}>暂无提醒</div>
          </div>
        ) : (
          reminders.map((reminder) => {
            const isOverdue = !reminder.isCompleted && new Date(reminder.dueDate) < new Date();
            return (
              <div
                key={reminder.id}
                style={{
                  ...styles.item,
                  ...(reminder.isCompleted && styles.itemCompleted),
                  ...(isOverdue && styles.itemOverdue),
                }}
              >
                <div
                  style={{
                    ...styles.itemIcon,
                    backgroundColor: `${reminder.isCompleted ? '#10b981' : isOverdue ? '#ef4444' : '#3b82f6'}20`,
                  }}
                >
                  {getTypeIcon(reminder.type)}
                </div>
                <div style={styles.itemContent}>
                  <div style={styles.itemHeader}>
                    <span style={styles.itemTitle}>{reminder.title}</span>
                    <span style={styles.itemType}>{getTypeLabel(reminder.type)}</span>
                  </div>
                  <div style={styles.itemDescription}>{reminder.description}</div>
                  <div style={styles.itemMeta}>
                    <span style={styles.itemDueDate}>
                      📅 {new Date(reminder.dueDate).toLocaleString('zh-CN')}
                    </span>
                    <span style={styles.itemFrequency}>{getFrequencyLabel(reminder.frequency)}</span>
                    <span style={styles.itemMethods}>
                      {reminder.methods.map((m) => getMethodLabel(m)).join(', ')}
                    </span>
                  </div>
                  {reminder.entity && (
                    <div style={styles.itemEntity}>
                      关联: {reminder.entity.type} - {reminder.entity.name}
                    </div>
                  )}
                </div>
                <div style={styles.itemActions}>
                  {!reminder.isCompleted && (
                    <button
                      onClick={() => handleComplete(reminder.id)}
                      style={styles.completeButton}
                    >
                      ✓ 完成
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(reminder.id)}
                    style={styles.deleteButton}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

interface ReminderCreateFormProps {
  entityType?: string;
  entityId?: string;
  onSubmit: (input: any) => Promise<void>;
  onCancel: () => void;
}

function ReminderCreateForm({ entityType, entityId, onSubmit, onCancel }: ReminderCreateFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ReminderType>('task');
  const [dueDate, setDueDate] = useState('');
  const [frequency, setFrequency] = useState<ReminderFrequency>('once');
  const [methods, setMethods] = useState<ReminderMethod[]>(['in_app']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      alert('请填写标题和截止时间');
      return;
    }

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      dueDate: new Date(dueDate).toISOString(),
      frequency,
      methods,
      entityType,
      entityId,
    });

    // Reset form
    setTitle('');
    setDescription('');
    setDueDate('');
  };

  const toggleMethod = (method: ReminderMethod) => {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h4 style={styles.formTitle}>新建提醒</h4>

      <div style={styles.formField}>
        <label style={styles.formLabel}>标题 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="提醒标题"
          style={styles.formInput}
          required
        />
      </div>

      <div style={styles.formField}>
        <label style={styles.formLabel}>类型</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ReminderType)}
          style={styles.formSelect}
        >
          <option value="contract_expiry">合同到期</option>
          <option value="milestone_due">里程碑到期</option>
          <option value="payment_overdue">逾期款项</option>
          <option value="renewal">续约</option>
          <option value="task">任务</option>
        </select>
      </div>

      <div style={styles.formField}>
        <label style={styles.formLabel}>描述</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="提醒描述"
          style={styles.formTextarea}
          rows={3}
        />
      </div>

      <div style={styles.formField}>
        <label style={styles.formLabel}>截止时间 *</label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={styles.formInput}
          required
        />
      </div>

      <div style={styles.formField}>
        <label style={styles.formLabel}>重复频率</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as ReminderFrequency)}
          style={styles.formSelect}
        >
          <option value="once">一次性</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
        </select>
      </div>

      <div style={styles.formField}>
        <label style={styles.formLabel}>提醒方式</label>
        <div style={styles.methodsGrid}>
          {([
            { value: 'in_app', label: '应用内' },
            { value: 'email', label: '邮件' },
            { value: 'sms', label: '短信' },
            { value: 'webhook', label: 'Webhook' },
          ] as const).map((method) => (
            <label key={method.value} style={styles.methodCheckbox}>
              <input
                type="checkbox"
                checked={methods.includes(method.value as ReminderMethod)}
                onChange={() => toggleMethod(method.value as ReminderMethod)}
                style={styles.checkbox}
              />
              {method.label}
            </label>
          ))}
        </div>
      </div>

      <div style={styles.formActions}>
        <button type="button" onClick={onCancel} style={styles.cancelButton}>
          取消
        </button>
        <button type="submit" style={styles.submitButton}>
          创建
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statsHeader: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    marginBottom: '20px',
  },
  statCard: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  createButton: {
    padding: '10px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  form: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  formField: {
    marginBottom: '16px',
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  formSelect: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  formTextarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  methodsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '8px',
  },
  methodCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px',
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
  submitButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  filterSelect: {
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  item: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  itemCompleted: {
    opacity: 0.6,
  },
  itemOverdue: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  itemIcon: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '18px',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  itemTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  itemType: {
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
  },
  itemDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  itemMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  itemDueDate: {},
  itemFrequency: {},
  itemMethods: {},
  itemEntity: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#6b7280',
  },
  itemActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  completeButton: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 10px',
    fontSize: '14px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
};

export default ReminderManager;
