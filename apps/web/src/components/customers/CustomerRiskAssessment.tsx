interface CustomerRiskAssessmentProps {
  customerId: string;
  customerName?: string;
}

// TODO: 客户风险评估功能待后端实现 - customerRiskAssessment查询不存在

export function CustomerRiskAssessment({
  customerId,
  customerName,
}: CustomerRiskAssessmentProps) {
  // Unused for now but kept for future API integration
  void customerId;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h3 style={styles.title}>风险评估</h3>
          {customerName && (
            <span style={styles.customerName}>{customerName}</span>
          )}
        </div>
      </div>

      {/* Placeholder - API not yet implemented */}
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <div style={styles.emptyText}>风险评估功能开发中</div>
        <div style={styles.emptySubtext}>
          该功能将在后续版本中提供，敬请期待
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  customerName: {
    fontSize: '14px',
    color: '#6b7280',
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

export default CustomerRiskAssessment;
