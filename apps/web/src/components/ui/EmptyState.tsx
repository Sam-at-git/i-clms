import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = '📭',
  title = '暂无数据',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div style={styles.container}>
      {icon && <div style={styles.icon}>{icon}</div>}
      <h3 style={styles.title}>{title}</h3>
      {description && <p style={styles.description}>{description}</p>}
      {action && <div style={styles.action}>{action}</div>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    maxWidth: '400px',
  },
  action: {
    marginTop: '8px',
  },
};

export default EmptyState;
