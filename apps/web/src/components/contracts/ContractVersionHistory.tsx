interface ContractVersionHistoryProps {
  contractId: string;
}

// TODO: 合同版本历史功能待后端实现 - auditLogs和history字段不存在

export function ContractVersionHistory({ contractId }: ContractVersionHistoryProps) {
  // Unused for now but kept for future API integration
  void contractId;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>版本历史</h2>
      </div>

      {/* Placeholder - API not yet implemented */}
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📋</div>
        <div style={styles.emptyText}>版本历史功能开发中</div>
        <div style={styles.emptySubtext}>
          该功能将在后续版本中提供，敬请期待
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: 500,
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

export default ContractVersionHistory;
