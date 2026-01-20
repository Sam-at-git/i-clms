import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';
import { formatUserRole } from '../../lib/auth-helpers';

const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      role
      department {
        id
        name
        code
      }
      isActive
      lastLoginAt
      loginHistory {
        timestamp
        ip
        userAgent
      }
    }
  }
`;

interface MeResponse {
  me: {
    id: string;
    email: string;
    name: string;
    role: string;
    department: {
      id: string;
      name: string;
      code: string;
    };
    isActive: boolean;
    lastLoginAt: string | null;
    loginHistory: Array<{
      timestamp: string;
      ip: string;
      userAgent: string;
    }>;
  };
}

interface UpdateProfileResponse {
  updateProfile: {
    id: string;
    name: string;
  };
}

interface UpdateProfileInput {
  name?: string;
}

export function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: meData, loading: meLoading } = useQuery<MeResponse>(ME_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [updateProfile] = useMutation<UpdateProfileResponse>(UPDATE_PROFILE_MUTATION, {
    onCompleted: (data) => {
      setSuccess(true);
      setLoading(false);
      setIsEditing(false);

      // Update local auth state
      if (user) {
        const updatedUser = { ...user, name: data.updateProfile.name };
        setAuth(user.role === 'ADMIN' ? 'admin-token' : 'user-token', updatedUser);
      }

      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err) => {
      setError(err.message || '更新失败');
      setLoading(false);
    },
  });

  const me = meData?.me;

  const handleEdit = () => {
    setFormData({ name: me?.name || user?.name || '' });
    setIsEditing(true);
    setError('');
    setSuccess(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess(false);
  };

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    if (!formData.name.trim()) {
      setError('姓名不能为空');
      return;
    }

    if (formData.name.length > 50) {
      setError('姓名长度不能超过50个字符');
      return;
    }

    setLoading(true);

    try {
      await updateProfile({
        variables: {
          input: { name: formData.name.trim() },
        },
      });
    } catch (err) {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserAgent = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return '其他浏览器';
  };

  if (meLoading && !me) {
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
          <h1 style={styles.title}>个人设置</h1>
          <p style={styles.subtitle}>查看和编辑您的个人信息</p>
        </div>

        {success && (
          <div style={styles.success}>
            <span style={styles.successIcon}>✓</span>
            个人信息更新成功
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>基本信息</h2>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>姓名</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={styles.input}
                  placeholder="请输入姓名"
                  maxLength={50}
                />
              ) : (
                <span style={styles.infoValue}>{me?.name || user?.name}</span>
              )}
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>邮箱</span>
              <span style={styles.infoValue}>{me?.email || user?.email}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>部门</span>
              <span style={styles.infoValue}>{me?.department?.name || user?.department?.name}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>角色</span>
              <span style={styles.infoValue}>{formatUserRole(me?.role || user?.role || 'USER')}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>账号状态</span>
              <span
                style={{
                  ...styles.infoValue,
                  ...styles.badge,
                  ...(me?.isActive ? styles.badgeActive : styles.badgeInactive),
                }}
              >
                {me?.isActive ? '正常' : '已禁用'}
              </span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>最后登录</span>
              <span style={styles.infoValue}>{formatDate(me?.lastLoginAt || null)}</span>
            </div>
          </div>

          <div style={styles.actions}>
            {!isEditing ? (
              <button onClick={handleEdit} style={styles.editButton}>
                编辑信息
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  style={{ ...styles.saveButton, ...(loading ? styles.buttonDisabled : {}) }}
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
                <button onClick={handleCancel} style={styles.cancelButton}>
                  取消
                </button>
              </>
            )}
          </div>
        </div>

        {me?.loginHistory && me.loginHistory.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>登录历史</h2>
            <div style={styles.historyList}>
              {me.loginHistory.slice(0, 10).map((log, index) => (
                <div key={index} style={styles.historyItem}>
                  <div style={styles.historyTime}>{formatDate(log.timestamp)}</div>
                  <div style={styles.historyDetails}>
                    <span style={styles.historyDetail}>IP: {log.ip || '未知'}</span>
                    <span style={styles.historyDetail}>{getUserAgent(log.userAgent)}</span>
                  </div>
                </div>
              ))}
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
    display: 'flex',
    justifyContent: 'center',
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
    width: '100%',
    maxWidth: '800px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '32px',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successIcon: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  infoLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: '15px',
    color: '#111827',
    fontWeight: 500,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
    width: 'fit-content',
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgeInactive: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
  input: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    paddingTop: '16px',
    borderTop: '1px solid #f3f4f6',
  },
  editButton: {
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
  cancelButton: {
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyItem: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  historyTime: {
    fontSize: '14px',
    color: '#111827',
    fontWeight: 500,
  },
  historyDetails: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  historyDetail: {
    fontSize: '13px',
    color: '#6b7280',
  },
};

export default ProfilePage;
