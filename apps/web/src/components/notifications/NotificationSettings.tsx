import { useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client/react';

export interface NotificationPreference {
  category: string;
  enabled: boolean;
  methods: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const GET_PREFERENCES = gql`
  query GetNotificationPreferences {
    notificationPreferences {
      category
      enabled
      methods {
        inApp
        email
        sms
      }
      quietHours {
        enabled
        start
        end
      }
    }
  }
`;

const UPDATE_PREFERENCES = gql`
  mutation UpdateNotificationPreferences($input: UpdateNotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      category
      enabled
    }
  }
`;

interface NotificationSettingsProps {
  onSave?: () => void;
}

const CATEGORIES = [
  { key: 'system', label: '系统通知', icon: '⚙️' },
  { key: 'contract', label: '合同通知', icon: '📄' },
  { key: 'finance', label: '财务通知', icon: '💰' },
  { key: 'delivery', label: '交付通知', icon: '🚀' },
  { key: 'customer', label: '客户通知', icon: '👥' },
  { key: 'task', label: '任务提醒', icon: '✓' },
];

export function NotificationSettings({ onSave }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00',
  });
  const [saving, setSaving] = useState(false);

  const { data, loading } = useQuery(GET_PREFERENCES, {
    onCompleted: (data) => {
      const prefs: Record<string, NotificationPreference> = {};
      (data.notificationPreferences || []).forEach((pref: NotificationPreference) => {
        prefs[pref.category] = pref;
        if (pref.quietHours) {
          setQuietHours(pref.quietHours);
        }
      });
      setPreferences(prefs);
    },
  });

  const [updatePreferences] = useMutation(UPDATE_PREFERENCES, {
    onCompleted: () => {
      setSaving(false);
      onSave?.();
    },
    onError: () => {
      setSaving(false);
    },
  });

  const handleToggleCategory = (category: string) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        enabled: !prev[category]?.enabled,
      },
    }));
  };

  const handleToggleMethod = (category: string, method: 'inApp' | 'email' | 'sms') => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        methods: {
          ...prev[category]?.methods,
          [method]: !prev[category]?.methods?.[method],
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        variables: {
          input: {
            preferences: Object.values(preferences).map((pref) => ({
              ...pref,
              quietHours,
            })),
          },
        },
      });
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>通知设置</h3>
        <p style={styles.subtitle}>自定义通知偏好和接收方式</p>
      </div>

      {loading ? (
        <div style={styles.loading}>加载中...</div>
      ) : (
        <>
          {/* Category Preferences */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>通知类型</h4>
            <div style={styles.categoryList}>
              {CATEGORIES.map((category) => {
                const pref = preferences[category.key];
                return (
                  <div key={category.key} style={styles.categoryItem}>
                    <div style={styles.categoryHeader}>
                      <span style={styles.categoryIcon}>{category.icon}</span>
                      <span style={styles.categoryLabel}>{category.label}</span>
                      <label style={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={pref?.enabled ?? false}
                          onChange={() => handleToggleCategory(category.key)}
                          style={styles.toggleCheckbox}
                        />
                      </label>
                    </div>
                    {pref?.enabled && (
                      <div style={styles.methodList}>
                        <label style={styles.methodItem}>
                          <input
                            type="checkbox"
                            checked={pref.methods?.inApp ?? false}
                            onChange={() => handleToggleMethod(category.key, 'inApp')}
                            style={styles.methodCheckbox}
                          />
                          <span style={styles.methodLabel}>应用内通知</span>
                        </label>
                        <label style={styles.methodItem}>
                          <input
                            type="checkbox"
                            checked={pref.methods?.email ?? false}
                            onChange={() => handleToggleMethod(category.key, 'email')}
                            style={styles.methodCheckbox}
                          />
                          <span style={styles.methodLabel}>邮件</span>
                        </label>
                        <label style={styles.methodItem}>
                          <input
                            type="checkbox"
                            checked={pref.methods?.sms ?? false}
                            onChange={() => handleToggleMethod(category.key, 'sms')}
                            style={styles.methodCheckbox}
                          />
                          <span style={styles.methodLabel}>短信</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quiet Hours */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>免打扰时段</h4>
            <div style={styles.quietHoursBox}>
              <label style={styles.quietHoursToggle}>
                <input
                  type="checkbox"
                  checked={quietHours.enabled}
                  onChange={(e) =>
                    setQuietHours((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  style={styles.checkbox}
                />
                <span>启用免打扰时段</span>
              </label>
              {quietHours.enabled && (
                <div style={styles.timeInputs}>
                  <div style={styles.timeField}>
                    <label style={styles.timeLabel}>开始时间</label>
                    <input
                      type="time"
                      value={quietHours.start}
                      onChange={(e) =>
                        setQuietHours((prev) => ({ ...prev, start: e.target.value }))
                      }
                      style={styles.timeInput}
                    />
                  </div>
                  <div style={styles.timeField}>
                    <label style={styles.timeLabel}>结束时间</label>
                    <input
                      type="time"
                      value={quietHours.end}
                      onChange={(e) =>
                        setQuietHours((prev) => ({ ...prev, end: e.target.value }))
                      }
                      style={styles.timeInput}
                    />
                  </div>
                </div>
              )}
              <p style={styles.quietHoursHint}>
                在免打扰时段内，仅应用内通知会显示，不会发送邮件或短信
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div style={styles.actions}>
            <button onClick={handleSave} disabled={saving} style={styles.saveButton}>
              {saving ? '保存中...' : '保存设置'}
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
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  categoryItem: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  categoryIcon: {
    fontSize: '20px',
  },
  categoryLabel: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 500,
    color: '#111827',
  },
  toggle: {
    cursor: 'pointer',
  },
  toggleCheckbox: {
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  methodList: {
    display: 'flex',
    gap: '16px',
    paddingLeft: '32px',
  },
  methodItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  methodCheckbox: {
    cursor: 'pointer',
  },
  methodLabel: {},
  quietHoursBox: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  quietHoursToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  checkbox: {
    cursor: 'pointer',
  },
  timeInputs: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  timeField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  timeLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },
  timeInput: {
    padding: '6px 10px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
  quietHoursHint: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveButton: {
    padding: '10px 24px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
};

export default NotificationSettings;
