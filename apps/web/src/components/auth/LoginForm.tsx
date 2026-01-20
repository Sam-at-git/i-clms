import { useState, useEffect } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, User } from '../../state';
import { PasswordStrengthIndicator, RememberMeCheckbox, ForgotPasswordLink } from './index';
import { parseLoginError } from '../../lib/auth-helpers';

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        name
        role
        department {
          id
          name
          code
        }
      }
    }
  }
`;

interface LoginResponse {
  login: {
    accessToken: string;
    user: User;
  };
}

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const setRememberEmail = useAuthStore((state) => state.setRememberEmail);
  const rememberEmail = useAuthStore((state) => state.rememberEmail);
  const navigate = useNavigate();

  // Load remembered email on mount
  useEffect(() => {
    if (rememberEmail) {
      setEmail(rememberEmail);
      setRememberMe(true);
    }
  }, [rememberEmail]);

  const [login, { loading }] = useMutation<LoginResponse>(LOGIN_MUTATION, {
    onCompleted: (data) => {
      const { accessToken, user } = data.login;

      // Save or remove remembered email
      if (rememberMe) {
        setRememberEmail(email);
      } else {
        setRememberEmail('');
      }

      setAuth(accessToken, user);

      // Check if user must change password
      if ((user as any).mustChangePassword) {
        navigate('/settings/password', {
          state: { forceChange: true },
        });
      } else {
        navigate('/contracts');
      }
    },
    onError: (err) => {
      setError(parseLoginError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    login({
      variables: {
        input: { email, password },
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e as any);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>i-CLMS</h1>
          <p style={styles.subtitle}>智能合同全生命周期管理系统</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              <span style={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="请输入邮箱"
              disabled={loading}
              autoComplete="email"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="请输入密码"
              disabled={loading}
              autoComplete="current-password"
              onKeyDown={handleKeyDown}
            />
            <PasswordStrengthIndicator password={password} />
          </div>

          <div style={styles.options}>
            <RememberMeCheckbox checked={rememberMe} onChange={setRememberMe} />
            <ForgotPasswordLink />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.buttonContent}>
                <span style={styles.spinner}>⟳</span>
                登录中...
              </span>
            ) : (
              '登录'
            )}
          </button>
        </form>
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
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e3a5f',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
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
  inputFocus: {
    borderColor: '#1e3a5f',
    boxShadow: '0 0 0 3px rgba(30, 58, 95, 0.1)',
  },
  options: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
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
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
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
};

// Add keyframes for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-auth-form]')) {
  styleSheet.setAttribute('data-auth-form', 'true');
  document.head.appendChild(styleSheet);
}

export default LoginForm;
