import { useState } from 'react';
import { useGetNotificationPreferencesQuery, useUpdateNotificationPreferencesMutation } from '@i-clms/shared/generated/graphql';

interface NotificationPreferencesProps {
  userId: string;
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const { data, loading } = useGetNotificationPreferencesQuery({
    fetchPolicy: 'cache-and-network',
  });

  const [updatePreferences] = useUpdateNotificationPreferencesMutation({
    onCompleted: () => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  const preferences = data?.notificationPreferences;

  const [localPreferences, setLocalPreferences] = useState(preferences || {
    enableInApp: true,
    enableEmail: false,
    enableSms: false,
    contractExpiry: true,
    paymentOverdue: true,
    contractApproval: true,
    milestoneDue: true,
    riskAlert: true,
    systemAnnouncement: true,
    mention: true,
    taskAssigned: true,
    documentShared: true,
    quietHoursStart: '',
    quietHoursEnd: '',
  });

  // Update local preferences when data loads
  if (preferences && JSON.stringify(localPreferences) !== JSON.stringify(preferences)) {
    setLocalPreferences(preferences);
  }

  const handleToggle = (field: keyof typeof localPreferences) => {
    setLocalPreferences({
      ...localPreferences,
      [field]: !localPreferences[field],
    });
  };

  const handleTimeChange = (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    setLocalPreferences({
      ...localPreferences,
      [field]: value,
    });
  };

  const handleSave = () => {
    setSaveStatus('saving');
    updatePreferences({
      variables: {
        input: {
          ...localPreferences,
        },
      },
    });
  };

  const hasChanges = preferences && JSON.stringify(localPreferences) !== JSON.stringify(preferences);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>通知设置</h3>
          <span style={styles.subtitle}>管理通知偏好和免打扰时段</span>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>加载中...</div>
      ) : (
        <>
          {/* Global Settings */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>全局设置</h4>
            <div style={styles.settingGrid}>
              <label style={styles.switchRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.enableInApp}
                  onChange={() => handleToggle('enableInApp')}
                  style={styles.checkbox}
                />
                <span style={styles.switchLabel}>应用内通知</span>
                <span style={styles.switchDescription}>在系统内显示通知</span>
              </label>

              <label style={styles.switchRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.enableEmail}
                  onChange={() => handleToggle('enableEmail')}
                  style={styles.checkbox}
                />
                <span style={styles.switchLabel}>邮件通知</span>
                <span style={styles.switchDescription}>发送邮件到注册邮箱</span>
              </label>

              <label style={styles.switchRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.enableSms}
                  onChange={() => handleToggle('enableSms')}
                  style={styles.checkbox}
                />
                <span style={styles.switchLabel}>短信通知</span>
                <span style={styles.switchDescription}>发送短信到注册手机</span>
              </label>
            </div>
          </div>

          {/* Notification Type Settings */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>通知类型</h4>
            <div style={styles.typeGrid}>
              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.contractExpiry}
                  onChange={() => handleToggle('contractExpiry')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>📅</span>
                  <span style={styles.typeLabel}>合同到期提醒</span>
                  <span style={styles.typeDescription}>合同即将到期前通知</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.paymentOverdue}
                  onChange={() => handleToggle('paymentOverdue')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>💰</span>
                  <span style={styles.typeLabel}>付款逾期提醒</span>
                  <span style={styles.typeDescription}>付款逾期时通知</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.contractApproval}
                  onChange={() => handleToggle('contractApproval')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>✍️</span>
                  <span style={styles.typeLabel}>合同审批通知</span>
                  <span style={styles.typeDescription}>待审批合同通知</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.milestoneDue}
                  onChange={() => handleToggle('milestoneDue')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>🎯</span>
                  <span style={styles.typeLabel}>里程碑到期</span>
                  <span style={styles.typeDescription}>里程碑即将到期</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.riskAlert}
                  onChange={() => handleToggle('riskAlert')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>⚠️</span>
                  <span style={styles.typeLabel}>风险告警</span>
                  <span style={styles.typeDescription}>合同风险评估异常</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.systemAnnouncement}
                  onChange={() => handleToggle('systemAnnouncement')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>📢</span>
                  <span style={styles.typeLabel}>系统公告</span>
                  <span style={styles.typeDescription}>系统重要公告通知</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.mention}
                  onChange={() => handleToggle('mention')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>🔔</span>
                  <span style={styles.typeLabel}>@提及</span>
                  <span style={styles.typeDescription}>有人在内容中提及您</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.taskAssigned}
                  onChange={() => handleToggle('taskAssigned')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>📋</span>
                  <span style={styles.typeLabel}>任务分配</span>
                  <span style={styles.typeDescription}>新任务分配给您</span>
                </div>
              </label>

              <label style={styles.typeRow}>
                <input
                  type="checkbox"
                  checked={localPreferences.documentShared}
                  onChange={() => handleToggle('documentShared')}
                  style={styles.checkbox}
                />
                <div style={styles.typeInfo}>
                  <span style={styles.typeIcon}>📄</span>
                  <span style={styles.typeLabel}>文档共享</span>
                  <span style={styles.typeDescription}>有人与您共享文档</span>
                </div>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>免打扰时段</h4>
            <p style={styles.sectionDescription}>
              在此时间段内将不发送通知
            </p>
            <div style={styles.timeInputs}>
              <div style={styles.timeInput}>
                <label style={styles.timeLabel}>开始时间</label>
                <input
                  type="time"
                  value={localPreferences.quietHoursStart || ''}
                  onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                  style={styles.timeField}
                />
              </div>
              <div style={styles.timeInput}>
                <label style={styles.timeLabel}>结束时间</label>
                <input
                  type="time"
                  value={localPreferences.quietHoursEnd || ''}
                  onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                  style={styles.timeField}
                />
              </div>
            </div>
            <p style={styles.timeHelp}>
              💡 留空表示不启用免打扰
            </p>
          </div>

          {/* Save Button */}
          <div style={styles.actions}>
            {saveStatus === 'saved' && (
              <span style={styles.savedMessage}>✓ 已保存</span>
            )}
            {saveStatus === 'error' && (
              <span style={styles.errorMessage}>✕ 保存失败</span>
            )}
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving' || !hasChanges}
              style={{
                ...styles.saveButton,
                ...((saveStatus === 'saving' || !hasChanges) && styles.saveButtonDisabled),
              }}
            >
              {saveStatus === 'saving' ? '保存中...' : '保存设置'}
            </button>
          </div>
        </>
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
    maxWidth: '700px',
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
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
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  sectionDescription: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  settingGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  switchLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    flexShrink: 0,
  },
  switchDescription: {
    fontSize: '13px',
    color: '#6b7280',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
  },
  typeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  typeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  typeIcon: {
    fontSize: '20px',
  },
  typeLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  typeDescription: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  timeInputs: {
    display: 'flex',
    gap: '16px',
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  timeField: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  timeHelp: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
  },
  savedMessage: {
    fontSize: '14px',
    color: '#10b981',
    fontWeight: 500,
  },
  errorMessage: {
    fontSize: '14px',
    color: '#ef4444',
    fontWeight: 500,
  },
  saveButton: {
    padding: '10px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
};

export default NotificationPreferences;
