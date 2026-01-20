import { useState } from 'react';
import { Link } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

// Note: This mutation needs to be implemented in the backend
// For now, it's a placeholder that will be implemented in SPEC-41
const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

interface ForgotPasswordResponse {
  forgotPassword: boolean;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotPassword] = useMutation<ForgotPasswordResponse>(
    FORGOT_PASSWORD_MUTATION,
    {
      onCompleted: () => {
        setSuccess(true);
        setLoading(false);
      },
      onError: (err) => {
        setError(err.message || '发送失败，请稍后重试');
        setLoading(false);
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);

    try {
      await forgotPassword({
        variables: { email },
      });
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>找回密码</h1>
          <p style={styles.subtitle}>输入您的邮箱地址，我们将发送密码重置链接</p>
        </div>

        {success ? (
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.successTitle}>邮件已发送</h2>
            <p style={styles.successText}>
              我们已向 <strong>{email}</strong> 发送了密码重置邮件。
            </p>
            <p style={styles.successText}>
              请检查您的邮箱并按照邮件中的说明重置密码。
            </p>
            <p style={styles.successNote}>
              如果您没有收到邮件，请检查垃圾邮件文件夹或稍后重试。
            </p>
            <Link to="/login" style={styles.backLink}>
              返回登录
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.error}>
                <span style={styles.errorIcon}>⚠️</span>
                {error}
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="请输入注册时使用的邮箱"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              disabled={loading}
            >
              {loading ? '发送中...' : '发送重置邮件'}
            </button>

            <div style={styles.footer}>
              <span style={styles.footerText}>记得密码了？</span>
              <Link to="/login" style={styles.link}>
                返回登录
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e3a5f',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#1e3a5f',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  footer: {
    textAlign: 'center',
    marginTop: '16px',
    padding: '12px 0',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '14px',
    color: '#6b7280',
    marginRight: '4px',
  },
  link: {
    fontSize: '14px',
    color: '#1e3a5f',
    textDecoration: 'none',
    fontWeight: 500,
  },
  error: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  successContainer: {
    textAlign: 'center',
    padding: '20px 0',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 20px',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e3a5f',
    margin: '0 0 16px 0',
  },
  successText: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: '1.6',
    margin: '8px 0',
  },
  successNote: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: '16px 0 24px',
    lineHeight: '1.5',
  },
  backLink: {
    display: 'inline-block',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#1e3a5f',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
};

export default ForgotPasswordPage;
