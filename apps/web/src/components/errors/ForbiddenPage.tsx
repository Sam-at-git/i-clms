import { Link } from 'react-router-dom';
import { useAuthStore } from '../../state/auth.state';
import { formatUserRole } from '../../lib/auth-helpers';

export function ForbiddenPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🔒</div>
        <h1 style={styles.title}>访问被拒绝</h1>
        <p style={styles.message}>
          抱歉，您没有权限访问此页面。
        </p>

        {user && (
          <div style={styles.userInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>当前账号：</span>
              <span style={styles.infoValue}>{user.email}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>角色：</span>
              <span style={styles.infoValue}>{formatUserRole(user.role)}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>部门：</span>
              <span style={styles.infoValue}>{user.department.name}</span>
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <Link to="/contracts" style={styles.primaryButton}>
            返回首页
          </Link>
          <Link to="/settings/profile" style={styles.secondaryButton}>
            查看个人设置
          </Link>
        </div>

        <div style={styles.help}>
          <p style={styles.helpText}>
            如果您认为这是一个错误，请联系系统管理员。
          </p>
        </div>
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
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  message: {
    fontSize: '15px',
    color: '#6b7280',
    margin: '0 0 32px 0',
    lineHeight: '1.6',
  },
  userInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  infoLabel: {
    color: '#6b7280',
    fontWeight: 500,
  },
  infoValue: {
    color: '#111827',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#1e3a5f',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  help: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '20px',
  },
  helpText: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
  },
};

export default ForbiddenPage;
