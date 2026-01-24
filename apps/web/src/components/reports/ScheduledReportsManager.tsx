import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client';

interface ScheduledReport {
  id: string;
  name: string;
  reportConfigId: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string; // HH:mm
  };
  recipients: string[];
  format: 'PDF' | 'EXCEL' | 'CSV';
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
}

interface ScheduledReportsManagerProps {
  onReportSelect?: (reportId: string) => void;
  currentUserId: string;
}

// Mock GraphQL operations
const GET_SCHEDULED_REPORTS = `
  query GetScheduledReports($userId: String!) {
    scheduledReports(userId: $userId) {
      id
      name
      reportConfigId
      schedule {
        frequency
        dayOfWeek
        dayOfMonth
        time
      }
      recipients
      format
      isActive
      lastRun
      nextRun
      createdAt
    }
  }
`;

const CREATE_SCHEDULED_REPORT = `
  mutation CreateScheduledReport($input: CreateScheduledReportInput!) {
    createScheduledReport(input: $input) {
      id
      name
      schedule {
        frequency
        time
      }
    }
  }
`;

const UPDATE_SCHEDULED_REPORT = `
  mutation UpdateScheduledReport($id: ID!, $input: UpdateScheduledReportInput!) {
    updateScheduledReport(id: $id, input: $input) {
      id
      name
      isActive
    }
  }
`;

const DELETE_SCHEDULED_REPORT = `
  mutation DeleteScheduledReport($id: ID!) {
    deleteScheduledReport(id: $id)
  }
`;

const RUN_SCHEDULED_REPORT = `
  mutation RunScheduledReport($id: ID!) {
    runScheduledReport(id: $id) {
      id
      lastRun
    }
  }
`;

const FREQUENCIES = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

const EXPORT_FORMATS = [
  { value: 'PDF', label: 'PDF' },
  { value: 'EXCEL', label: 'Excel' },
  { value: 'CSV', label: 'CSV' },
];

export function ScheduledReportsManager({
  onReportSelect,
  currentUserId,
}: ScheduledReportsManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    reportConfigId: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    time: '09:00',
    recipients: [] as string[],
    format: 'PDF' as 'PDF' | 'EXCEL' | 'CSV',
  });

  const [recipientInput, setRecipientInput] = useState('');

  // Query
  const { data, loading, refetch } = useQuery(GET_SCHEDULED_REPORTS, {
    variables: { userId: currentUserId },
    fetchPolicy: 'cache-and-network',
  });

  // Mutations
  const [createReport, { loading: creating }] = useMutation(CREATE_SCHEDULED_REPORT, {
    onCompleted: () => {
      alert('定时报表创建成功');
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      alert(`创建失败: ${error.message}`);
    },
  });

  const [updateReport, { loading: updating }] = useMutation(UPDATE_SCHEDULED_REPORT, {
    onCompleted: () => {
      alert('定时报表更新成功');
      setEditingReport(null);
      refetch();
    },
    onError: (error) => {
      alert(`更新失败: ${error.message}`);
    },
  });

  const [deleteReport] = useMutation(DELETE_SCHEDULED_REPORT, {
    onCompleted: () => {
      alert('定时报表已删除');
      refetch();
    },
    onError: (error) => {
      alert(`删除失败: ${error.message}`);
    },
  });

  const [runReport] = useMutation(RUN_SCHEDULED_REPORT, {
    onCompleted: () => {
      alert('报表已手动执行');
      refetch();
    },
    onError: (error) => {
      alert(`执行失败: ${error.message}`);
    },
  });

  const scheduledReports = data?.scheduledReports || [];

  const resetForm = () => {
    setFormData({
      name: '',
      reportConfigId: '',
      frequency: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      time: '09:00',
      recipients: [],
      format: 'PDF',
    });
    setRecipientInput('');
  };

  const handleCreate = useCallback(() => {
    if (!formData.name.trim()) {
      alert('请输入报表名称');
      return;
    }
    if (!formData.reportConfigId) {
      alert('请选择报表配置');
      return;
    }
    if (formData.recipients.length === 0) {
      alert('请至少添加一个收件人');
      return;
    }

    createReport({
      variables: {
        input: {
          name: formData.name,
          reportConfigId: formData.reportConfigId,
          schedule: {
            frequency: formData.frequency,
            ...(formData.frequency === 'weekly' && { dayOfWeek: formData.dayOfWeek }),
            ...(formData.frequency === 'monthly' && { dayOfMonth: formData.dayOfMonth }),
            time: formData.time,
          },
          recipients: formData.recipients,
          format: formData.format,
        },
      },
    });
  }, [formData, createReport]);

  const handleUpdate = useCallback(() => {
    if (!editingReport) return;

    updateReport({
      variables: {
        id: editingReport.id,
        input: {
          name: formData.name,
          schedule: {
            frequency: formData.frequency,
            ...(formData.frequency === 'weekly' && { dayOfWeek: formData.dayOfWeek }),
            ...(formData.frequency === 'monthly' && { dayOfMonth: formData.dayOfMonth }),
            time: formData.time,
          },
          recipients: formData.recipients,
          format: formData.format,
        },
      },
    });
  }, [editingReport, formData, updateReport]);

  const handleToggleActive = useCallback(
    (report: ScheduledReport) => {
      updateReport({
        variables: {
          id: report.id,
          input: { isActive: !report.isActive },
        },
      });
    },
    [updateReport]
  );

  const handleDelete = useCallback(
    (report: ScheduledReport) => {
      if (confirm(`确定要删除定时报表 "${report.name}" 吗？`)) {
        deleteReport({ variables: { id: report.id } });
      }
    },
    [deleteReport]
  );

  const handleRunNow = useCallback(
    (report: ScheduledReport) => {
      runReport({ variables: { id: report.id } });
    },
    [runReport]
  );

  const handleAddRecipient = useCallback(() => {
    const email = recipientInput.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('请输入有效的邮箱地址');
      return;
    }

    if (formData.recipients.includes(email)) {
      alert('该邮箱已存在');
      return;
    }

    setFormData({ ...formData, recipients: [...formData.recipients, email] });
    setRecipientInput('');
  }, [recipientInput, formData]);

  const handleRemoveRecipient = useCallback(
    (email: string) => {
      setFormData({
        ...formData,
        recipients: formData.recipients.filter((r) => r !== email),
      });
    },
    [formData]
  );

  const getScheduleText = (report: ScheduledReport) => {
    const { frequency, dayOfWeek, dayOfMonth, time } = report.schedule;
    const timeStr = time;

    if (frequency === 'daily') {
      return `每天 ${timeStr}`;
    } else if (frequency === 'weekly') {
      const day = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek);
      return `每周${day?.label} ${timeStr}`;
    } else if (frequency === 'monthly') {
      return `每月${dayOfMonth}日 ${timeStr}`;
    }
    return timeStr;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>定时报表</h3>
          <span style={styles.subtitle}>{scheduledReports.length} 个定时报表</span>
        </div>
        <button onClick={() => setShowCreateDialog(true)} style={styles.addButton}>
          + 创建定时报表
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>加载中...</div>
      )}

      {/* Empty State */}
      {!loading && scheduledReports.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📅</div>
          <div style={styles.emptyText}>暂无定时报表</div>
          <div style={styles.emptySubtext}>
            创建定时报表，自动生成并发送到邮箱
          </div>
        </div>
      )}

      {/* Report List */}
      {!loading && scheduledReports.length > 0 && (
        <div style={styles.reportList}>
          {scheduledReports.map((report: ScheduledReport) => (
            <div
              key={report.id}
              style={{
                ...styles.reportCard,
                ...(report.isActive ? styles.reportCardActive : styles.reportCardInactive),
              }}
            >
              {/* Report Header */}
              <div style={styles.reportHeader}>
                <div style={styles.reportTitleRow}>
                  <h4 style={styles.reportName}>{report.name}</h4>
                  <span
                    style={{
                      ...styles.statusBadge,
                      ...(report.isActive ? styles.statusActive : styles.statusInactive),
                    }}
                  >
                    {report.isActive ? '运行中' : '已暂停'}
                  </span>
                </div>

                <div style={styles.reportSchedule}>
                  <span style={styles.scheduleIcon}>⏰</span>
                  <span style={styles.scheduleText}>{getScheduleText(report)}</span>
                </div>

                <div style={styles.reportMeta}>
                  <span style={styles.metaItem}>格式: {report.format}</span>
                  <span style={styles.metaItem}>
                    收件人: {report.recipients.length} 人
                  </span>
                </div>

                {(report.lastRun || report.nextRun) && (
                  <div style={styles.runInfo}>
                    {report.lastRun && (
                      <span style={styles.runInfoItem}>
                        上次运行: {new Date(report.lastRun).toLocaleString('zh-CN')}
                      </span>
                    )}
                    {report.nextRun && (
                      <span style={styles.runInfoItem}>
                        下次运行: {new Date(report.nextRun).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Report Actions */}
              <div style={styles.reportActions}>
                <button
                  onClick={() => handleToggleActive(report)}
                  style={{
                    ...styles.actionButton,
                    ...(report.isActive ? styles.pauseButton : styles.resumeButton),
                  }}
                >
                  {report.isActive ? '⏸ 暂停' : '▶️ 启用'}
                </button>
                <button
                  onClick={() => handleRunNow(report)}
                  style={styles.actionButton}
                >
                  ▶️ 立即执行
                </button>
                <button
                  onClick={() => {
                    setEditingReport(report);
                    setFormData({
                      name: report.name,
                      reportConfigId: report.reportConfigId,
                      frequency: report.schedule.frequency,
                      dayOfWeek: report.schedule.dayOfWeek || 1,
                      dayOfMonth: report.schedule.dayOfMonth || 1,
                      time: report.schedule.time,
                      recipients: report.recipients,
                      format: report.format,
                    });
                  }}
                  style={styles.actionButton}
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={() => handleDelete(report)}
                  style={styles.deleteButton}
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingReport) && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setShowCreateDialog(false);
            setEditingReport(null);
            resetForm();
          }}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              {editingReport ? '编辑定时报表' : '创建定时报表'}
            </h3>

            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  报表名称 <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="例如：周度销售报表"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  报表配置 <span style={styles.required}>*</span>
                </label>
                <select
                  value={formData.reportConfigId}
                  onChange={(e) => setFormData({ ...formData, reportConfigId: e.target.value })}
                  style={styles.select}
                >
                  <option value="">选择报表配置</option>
                  <option value="report-1">月度销售报表</option>
                  <option value="report-2">合同状态报表</option>
                  <option value="report-3">客户分析报表</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  执行频率 <span style={styles.required}>*</span>
                </label>
                <div style={styles.frequencyOptions}>
                  {FREQUENCIES.map((freq) => (
                    <button
                      key={freq.value}
                      onClick={() => setFormData({ ...formData, frequency: freq.value as any })}
                      style={{
                        ...styles.frequencyButton,
                        ...(formData.frequency === freq.value && styles.frequencyButtonSelected),
                      }}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.frequency === 'weekly' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>星期</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                    style={styles.select}
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>日期</label>
                  <select
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                    style={styles.select}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}日
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  执行时间 <span style={styles.required}>*</span>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  导出格式 <span style={styles.required}>*</span>
                </label>
                <div style={styles.formatOptions}>
                  {EXPORT_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setFormData({ ...formData, format: format.value as any })}
                      style={{
                        ...styles.formatButton,
                        ...(formData.format === format.value && styles.formatButtonSelected),
                      }}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  收件人邮箱 <span style={styles.required}>*</span>
                </label>
                <div style={styles.recipientInput}>
                  <input
                    type="email"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                    style={styles.input}
                    placeholder="输入邮箱地址"
                  />
                  <button
                    onClick={handleAddRecipient}
                    type="button"
                    style={styles.addRecipientButton}
                  >
                    添加
                  </button>
                </div>

                {formData.recipients.length > 0 && (
                  <div style={styles.recipientsList}>
                    {formData.recipients.map((email, index) => (
                      <div key={index} style={styles.recipientChip}>
                        <span style={styles.recipientEmail}>{email}</span>
                        <button
                          onClick={() => handleRemoveRecipient(email)}
                          style={styles.removeRecipientButton}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingReport(null);
                  resetForm();
                }}
                style={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={editingReport ? handleUpdate : handleCreate}
                disabled={creating || updating}
                style={styles.confirmButton}
              >
                {creating || updating ? '保存中...' : editingReport ? '更新' : '创建'}
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
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  addButton: {
    padding: '8px 16px',
    fontSize: '14px',
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
  reportList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '16px',
  },
  reportCard: {
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid',
    backgroundColor: '#fff',
  },
  reportCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  reportCardInactive: {
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  reportHeader: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  reportTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  reportName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  statusBadge: {
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '3px',
    fontWeight: 500,
  },
  statusActive: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  statusInactive: {
    backgroundColor: '#9ca3af',
    color: '#fff',
  },
  reportSchedule: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
  },
  scheduleIcon: {
    fontSize: '14px',
  },
  scheduleText: {
    fontSize: '13px',
    color: '#374151',
    fontWeight: 500,
  },
  reportMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
  },
  runInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  runInfoItem: {},
  reportActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionButton: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  pauseButton: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  resumeButton: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  deleteButton: {
    padding: '6px 10px',
    fontSize: '12px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
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
    margin: '0 0 20px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
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
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },
  frequencyOptions: {
    display: 'flex',
    gap: '8px',
  },
  frequencyButton: {
    flex: 1,
    padding: '8px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  frequencyButtonSelected: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  formatOptions: {
    display: 'flex',
    gap: '8px',
  },
  formatButton: {
    flex: 1,
    padding: '8px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  formatButtonSelected: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  recipientInput: {
    display: 'flex',
    gap: '8px',
  },
  addRecipientButton: {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  recipientsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  recipientChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    fontSize: '13px',
  },
  recipientEmail: {
    color: '#1e40af',
  },
  removeRecipientButton: {
    padding: '2px 4px',
    fontSize: '10px',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
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

export default ScheduledReportsManager;
