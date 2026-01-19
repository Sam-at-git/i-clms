import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useAuthStore } from '../../state/auth.state';

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      success
      message
    }
  }
`;

interface ChangePasswordResult {
  changePassword: {
    success: boolean;
    message: string;
  };
}

export function PasswordPage() {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [changePassword] = useMutation<ChangePasswordResult>(CHANGE_PASSWORD);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('请填写所有字段');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('新密码长度至少为6位');
      return;
    }

    if (formData.newPassword === formData.currentPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword({
        variables: {
          input: {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          },
        },
      });

      if (result.data?.changePassword.success) {
        setSuccess(true);
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError(result.data?.changePassword.message || '修改密码失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>修改密码</h1>
        <p style={styles.subtitle}>
          当前账号：{user?.email}
        </p>

        {error && <div style={styles.error}>{error}</div>}
        {success && (
          <div style={styles.success}>
            密码修改成功！下次登录请使用新密码。
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>当前密码</label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              style={styles.input}
              placeholder="请输入当前密码"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>新密码</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              style={styles.input}
              placeholder="请输入新密码（至少6位）"
              required
              minLength={6}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>确认新密码</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              style={styles.input}
              placeholder="请再次输入新密码"
              required
            />
          </div>

          <div style={styles.actions}>
            <button type="submit" style={styles.submitButton} disabled={loading}>
              {loading ? '保存中...' : '修改密码'}
            </button>
          </div>
        </form>

        <div style={styles.tips}>
          <h3 style={styles.tipsTitle}>密码安全提示</h3>
          <ul style={styles.tipsList}>
            <li>密码长度至少为6位</li>
            <li>建议包含字母、数字和特殊字符</li>
            <li>请勿使用与其他平台相同的密码</li>
            <li>定期更换密码以保障账号安全</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: 'calc(100vh - 56px)',
    backgroundColor: '#f3f4f6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
    margin: '0 0 24px 0',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  success: {
    padding: '12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  form: {},
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
    padding: '12px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  actions: {
    marginTop: '24px',
  },
  submitButton: {
    width: '100%',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  tips: {
    marginTop: '32px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  tipsTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.8,
  },
};

export default PasswordPage;
