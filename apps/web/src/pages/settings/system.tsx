import { useState, useEffect } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';
import { formatUserRole } from '../../lib/auth-helpers';

const GET_SYSTEM_CONFIG = gql`
  query GetSystemConfig {
    systemConfig {
      smtpEnabled
      smtpHost
      smtpPort
      smtpUser
      smtpSecure
      minioEndpoint
      minioPort
      minioBucket
    }
  }
`;

const GET_SYSTEM_HEALTH = gql`
  query GetSystemHealth {
    systemHealth {
      api
      database
      storage
      uptime
      version
      timestamp
      databaseStatus
      storageStatus
    }
  }
`;

const UPDATE_SYSTEM_CONFIG = gql`
  mutation UpdateSystemConfig($config: UpdateSystemConfigInput!) {
    updateSystemConfig(config: $config) {
      smtpEnabled
      smtpHost
      smtpPort
      smtpSecure
      minioEndpoint
      minioPort
      minioBucket
    }
  }
`;

const TEST_SMTP_CONNECTION = gql`
  mutation TestSmtpConnection {
    testSmtpConnection
  }
`;

const SEND_NOTIFICATION = gql`
  mutation SendNotification($input: SendNotificationInput!) {
    sendNotification(input: $input) {
      success
      message
      messageId
    }
  }
`;

// Placeholder types for when the backend is implemented
interface SystemConfigResponse {
  systemConfig: {
    smtpEnabled: boolean;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpSecure: boolean | null;
    minioEndpoint: string | null;
    minioPort: number | null;
    minioBucket: string | null;
  };
}

interface SystemHealthResponse {
  systemHealth: {
    api: boolean;
    database: boolean;
    storage: boolean;
    uptime: number;
    version: string;
    timestamp: string;
    databaseStatus: string | null;
    storageStatus: string | null;
  };
}

interface UpdateSystemConfigResponse {
  updateSystemConfig: {
    smtpEnabled: boolean;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpSecure: boolean | null;
    minioEndpoint: string | null;
    minioPort: number | null;
    minioBucket: string | null;
  };
}

interface SendNotificationResponse {
  sendNotification: {
    success: boolean;
    message: string | null;
    messageId: string | null;
  };
}

interface SystemConfigResponse {
  systemConfig: {
    smtpEnabled: boolean;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpSecure: boolean | null;
    minioEndpoint: string | null;
    minioPort: number | null;
    minioBucket: string | null;
  };
}

interface SystemHealthResponse {
  systemHealth: {
    api: boolean;
    database: boolean;
    storage: boolean;
    uptime: number;
    version: string;
    timestamp: string;
    databaseStatus: string | null;
    storageStatus: string | null;
  };
}

export function SystemSettingsPage() {
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'smtp' | 'storage' | 'health'>('smtp');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // System config state
  const [smtpConfig, setSmtpConfig] = useState({
    smtpEnabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
  });
  const [storageConfig, setStorageConfig] = useState({
    minioEndpoint: 'localhost',
    minioPort: 9000,
    minioBucket: 'contracts',
  });

  // Test notification state
  const [testNotification, setTestNotification] = useState({
    to: '',
    subject: '测试邮件',
    content: '这是一封测试邮件，用于验证SMTP配置是否正确。',
  });

  const { data: configData, loading: configLoading, refetch: refetchConfig } = useQuery<SystemConfigResponse>(
    GET_SYSTEM_CONFIG,
    {
      fetchPolicy: 'cache-and-network',
    }
  );

  // Update config when data is loaded
  useEffect(() => {
    if (configData?.systemConfig) {
      setSmtpConfig((prev) => ({
        ...prev,
        smtpEnabled: configData.systemConfig.smtpEnabled,
        smtpHost: configData.systemConfig.smtpHost || '',
        smtpPort: configData.systemConfig.smtpPort || 587,
        smtpUser: configData.systemConfig.smtpUser || '',
        smtpSecure: configData.systemConfig.smtpSecure ?? true,
      }));
      setStorageConfig({
        minioEndpoint: configData.systemConfig.minioEndpoint || 'localhost',
        minioPort: configData.systemConfig.minioPort || 9000,
        minioBucket: configData.systemConfig.minioBucket || 'contracts',
      });
    }
  }, [configData]);

  const { data: healthData, refetch: refetchHealth } = useQuery<SystemHealthResponse>(
    GET_SYSTEM_HEALTH,
    {
      fetchPolicy: 'cache-and-network',
      pollInterval: 30000, // Refresh every 30 seconds
    }
  );

  const [updateSystemConfig] = useMutation<UpdateSystemConfigResponse>(UPDATE_SYSTEM_CONFIG, {
    onCompleted: () => {
      setSuccess('配置保存成功');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: { message?: string }) => {
      setError(err.message || '保存配置失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const [testSmtpConnection] = useMutation<{ testSmtpConnection: boolean }>(TEST_SMTP_CONNECTION, {
    onCompleted: (data) => {
      if (data.testSmtpConnection) {
        setSuccess('SMTP连接测试成功');
      } else {
        setError('SMTP连接测试失败');
      }
      setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => setError(''), 5000);
    },
    onError: (err: { message?: string }) => {
      setError(err.message || 'SMTP连接测试失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const [sendNotification] = useMutation<SendNotificationResponse>(SEND_NOTIFICATION, {
    onCompleted: (data: SendNotificationResponse) => {
      if (data.sendNotification.success) {
        setSuccess('测试邮件发送成功');
        setTestNotification((prev) => ({ ...prev, to: '' }));
      } else {
        setError(data.sendNotification.message || '发送失败');
      }
      setTimeout(() => setSuccess(''), 3000);
      setTimeout(() => setError(''), 5000);
    },
    onError: (err: { message?: string }) => {
      setError(err.message || '发送测试邮件失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleSaveSmtpConfig = async () => {
    setError('');
    setSuccess('');
    const { smtpPassword, ...restConfig } = smtpConfig;
    await updateSystemConfig({
      variables: {
        config: smtpPassword ? { ...restConfig, smtpPassword } : restConfig,
      },
    });
  };

  const handleSaveStorageConfig = async () => {
    setError('');
    setSuccess('');
    await updateSystemConfig({
      variables: {
        config: storageConfig,
      },
    });
  };

  const handleTestSmtp = async () => {
    setError('');
    setSuccess('');
    await testSmtpConnection();
  };

  const handleSendTestEmail = async () => {
    setError('');
    setSuccess('');

    if (!testNotification.to) {
      setError('请输入收件人邮箱');
      return;
    }

    await sendNotification({
      variables: {
        input: testNotification,
      },
    });
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      return `${days}天 ${remainingHours}小时`;
    }
    return `${hours}小时`;
  };

  const health = healthData?.systemHealth;

  if (configLoading && !configData) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>系统设置</h1>
          <p style={styles.subtitle}>
            {user?.name} ({formatUserRole(user?.role || 'USER')})
          </p>
        </div>

        {success && <div style={styles.success}>{success}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'smtp' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('smtp')}
          >
            邮件设置
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'storage' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('storage')}
          >
            存储设置
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'health' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('health')}
          >
            系统状态
          </button>
        </div>

        {activeTab === 'smtp' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>邮件服务器设置</h2>
            <p style={styles.sectionDescription}>
              配置SMTP服务器用于发送密码重置邮件和系统通知
            </p>

            <div style={styles.fieldGroup}>
              <div style={styles.field}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={smtpConfig.smtpEnabled}
                    onChange={(e) =>
                      setSmtpConfig({ ...smtpConfig, smtpEnabled: e.target.checked })
                    }
                    style={styles.checkbox}
                  />
                  <span>启用邮件服务</span>
                </label>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>SMTP服务器</label>
                <input
                  type="text"
                  style={styles.input}
                  value={smtpConfig.smtpHost}
                  onChange={(e) =>
                    setSmtpConfig({ ...smtpConfig, smtpHost: e.target.value })
                  }
                  placeholder="smtp.example.com"
                  disabled={!smtpConfig.smtpEnabled}
                />
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>端口</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={smtpConfig.smtpPort}
                    onChange={(e) =>
                      setSmtpConfig({ ...smtpConfig, smtpPort: parseInt(e.target.value) || 587 })
                    }
                    disabled={!smtpConfig.smtpEnabled}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={smtpConfig.smtpSecure}
                      onChange={(e) =>
                        setSmtpConfig({ ...smtpConfig, smtpSecure: e.target.checked })
                      }
                      style={styles.checkbox}
                      disabled={!smtpConfig.smtpEnabled}
                    />
                    <span>使用SSL/TLS</span>
                  </label>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>用户名</label>
                <input
                  type="text"
                  style={styles.input}
                  value={smtpConfig.smtpUser}
                  onChange={(e) =>
                    setSmtpConfig({ ...smtpConfig, smtpUser: e.target.value })
                  }
                  placeholder="user@example.com"
                  disabled={!smtpConfig.smtpEnabled}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>密码</label>
                <input
                  type="password"
                  style={styles.input}
                  value={smtpConfig.smtpPassword}
                  onChange={(e) =>
                    setSmtpConfig({ ...smtpConfig, smtpPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  disabled={!smtpConfig.smtpEnabled}
                />
                <div style={styles.help}>留空表示不修改现有密码</div>
              </div>
            </div>

            <div style={styles.actions}>
              <button
                onClick={handleTestSmtp}
                style={styles.testButton}
                disabled={!smtpConfig.smtpEnabled}
              >
                测试连接
              </button>
              <button
                onClick={handleSaveSmtpConfig}
                style={styles.saveButton}
                disabled={!smtpConfig.smtpEnabled}
              >
                保存SMTP配置
              </button>
            </div>

            {smtpConfig.smtpEnabled && (
              <div style={styles.subsection}>
                <h3 style={styles.subsectionTitle}>发送测试邮件</h3>
                <div style={styles.field}>
                  <label style={styles.label}>收件人</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={testNotification.to}
                    onChange={(e) =>
                      setTestNotification({ ...testNotification, to: e.target.value })
                    }
                    placeholder="test@example.com"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>主题</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={testNotification.subject}
                    onChange={(e) =>
                      setTestNotification({ ...testNotification, subject: e.target.value })
                    }
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>内容</label>
                  <textarea
                    style={styles.textarea}
                    value={testNotification.content}
                    onChange={(e) =>
                      setTestNotification({ ...testNotification, content: e.target.value })
                    }
                    rows={4}
                  />
                </div>
                <div style={styles.actions}>
                  <button
                    onClick={handleSendTestEmail}
                    style={styles.sendButton}
                    disabled={!smtpConfig.smtpEnabled}
                  >
                    发送测试邮件
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'storage' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>对象存储设置</h2>
            <p style={styles.sectionDescription}>
              配置MinIO对象存储用于合同文件上传和管理
            </p>

            <div style={styles.field}>
              <label style={styles.label}>MinIO端点</label>
              <input
                type="text"
                style={styles.input}
                value={storageConfig.minioEndpoint}
                onChange={(e) =>
                  setStorageConfig({ ...storageConfig, minioEndpoint: e.target.value })
                }
                placeholder="localhost 或 minio.example.com"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>端口</label>
              <input
                type="number"
                style={styles.input}
                value={storageConfig.minioPort}
                onChange={(e) =>
                  setStorageConfig({
                    ...storageConfig,
                    minioPort: parseInt(e.target.value) || 9000,
                  })
                }
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>存储桶名称</label>
              <input
                type="text"
                style={styles.input}
                value={storageConfig.minioBucket}
                onChange={(e) =>
                  setStorageConfig({ ...storageConfig, minioBucket: e.target.value })
                }
                placeholder="contracts"
              />
            </div>

            <div style={styles.help}>
              注意: 修改存储配置后可能需要重启服务才能生效
            </div>

            <div style={styles.actions}>
              <button onClick={handleSaveStorageConfig} style={styles.saveButton}>
                保存存储配置
              </button>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>系统健康状态</h2>

            <button
              onClick={() => {
                refetchHealth();
                refetchConfig();
              }}
              style={styles.refreshButton}
            >
              刷新状态
            </button>

            <div style={styles.healthGrid}>
              <div style={styles.healthCard}>
                <div style={styles.healthLabel}>API服务</div>
                <div
                  style={{
                    ...styles.healthStatus,
                    ...(health?.api ? styles.healthOk : styles.healthError),
                  }}
                >
                  {health?.api ? '正常' : '异常'}
                </div>
              </div>

              <div style={styles.healthCard}>
                <div style={styles.healthLabel}>数据库</div>
                <div
                  style={{
                    ...styles.healthStatus,
                    ...(health?.database ? styles.healthOk : styles.healthError),
                  }}
                >
                  {health?.database ? '正常' : '异常'}
                </div>
                {health?.databaseStatus && (
                  <div style={styles.healthDetail}>{health.databaseStatus}</div>
                )}
              </div>

              <div style={styles.healthCard}>
                <div style={styles.healthLabel}>对象存储</div>
                <div
                  style={{
                    ...styles.healthStatus,
                    ...(health?.storage ? styles.healthOk : styles.healthError),
                  }}
                >
                  {health?.storage ? '正常' : '异常'}
                </div>
                {health?.storageStatus && (
                  <div style={styles.healthDetail}>{health.storageStatus}</div>
                )}
              </div>

              <div style={styles.healthCard}>
                <div style={styles.healthLabel}>运行时间</div>
                <div style={styles.healthValue}>{formatUptime(health?.uptime || 0)}</div>
              </div>

              <div style={styles.healthCard}>
                <div style={styles.healthLabel}>系统版本</div>
                <div style={styles.healthValue}>{health?.version || '1.0.0'}</div>
              </div>

              <div style={styles.healthCard}>
                <div style={styles.healthLabel}>检查时间</div>
                <div style={styles.healthValue}>
                  {health?.timestamp
                    ? new Date(health.timestamp).toLocaleString('zh-CN')
                    : '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    minHeight: 'calc(100vh - 56px)',
    backgroundColor: '#f3f4f6',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '900px',
    margin: '0 auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#1e3a5f',
    borderBottomColor: '#1e3a5f',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
  },
  subsection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  fieldGroup: {
    marginBottom: '24px',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    gap: '20px',
  },
  help: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '6px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    flexWrap: 'wrap',
  },
  saveButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  testButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  sendButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  refreshButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#374151',
    cursor: 'pointer',
    marginBottom: '20px',
  },
  healthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  healthCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  healthLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  healthStatus: {
    fontSize: '16px',
    fontWeight: 600,
    textAlign: 'center',
    padding: '8px',
    borderRadius: '6px',
  },
  healthOk: {
    color: '#166534',
    backgroundColor: '#dcfce7',
  },
  healthError: {
    color: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  healthValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    textAlign: 'center',
  },
  healthDetail: {
    fontSize: '11px',
    color: '#6b7280',
    textAlign: 'center',
  },
};

export default SystemSettingsPage;
