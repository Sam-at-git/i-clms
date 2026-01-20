import { Link } from 'react-router-dom';

export function ForgotPasswordLink() {
  return (
    <div style={styles.container}>
      <Link to="/forgot-password" style={styles.link}>
        忘记密码？
      </Link>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  link: {
    fontSize: '13px',
    color: '#1e3a5f',
    textDecoration: 'none',
    fontWeight: 500,
  },
};

export default ForgotPasswordLink;
