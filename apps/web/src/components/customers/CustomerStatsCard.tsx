import { ReactNode } from 'react';

interface CustomerStatsCardProps {
  title: string;
  value: string;
  icon: string;
}

export function CustomerStatsCard({ title, value, icon }: CustomerStatsCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.icon}>{icon}</div>
      <div style={styles.content}>
        <div style={styles.value}>{value}</div>
        <div style={styles.title}>{title}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  icon: {
    fontSize: '24px',
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
  },
  title: {
    fontSize: '13px',
    color: '#6b7280',
  },
};

export default CustomerStatsCard;
