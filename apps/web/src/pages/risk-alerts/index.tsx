import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { RiskAlertList } from '../../components/risks/RiskAlertList';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

const GET_RISK_ALERTS = gql`
  query GetRiskAlerts($limit: Int) {
    getRiskAlerts(limit: $limit) {
      id
      contractId
      alertType
      severity
      message
      createdAt
    }
  }
`;

interface RiskAlert {
  id: string;
  contractId: string;
  alertType: string;
  severity: string;
  message: string;
  createdAt: Date;
}

interface RiskAlertsData {
  getRiskAlerts: RiskAlert[];
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  EXPIRY_WARNING: '到期预警',
  HIGH_VALUE: '高价值预警',
  PAYMENT_DELAY: '付款延迟',
  COMPLIANCE: '合规风险',
  LEGAL: '法务风险',
};

const SEVERITY_LABELS: Record<string, string> = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
};

export default function RiskAlertsPage() {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set());

  const { loading, error, data, refetch } = useQuery<RiskAlertsData>(
    GET_RISK_ALERTS,
    {
      variables: { limit: 50 },
      fetchPolicy: 'cache-and-network',
    }
  );

  // Get unique alert types and severities from data
  const allAlerts = data?.getRiskAlerts || [];
  const alertTypes = Array.from(new Set(allAlerts.map((a) => a.alertType)));
  const severities = Array.from(new Set(allAlerts.map((a) => a.severity)));

  // Filter alerts
  const filteredAlerts = allAlerts.filter((alert) => {
    if (selectedTypes.size > 0 && !selectedTypes.has(alert.alertType)) {
      return false;
    }
    if (selectedSeverities.size > 0 && !selectedSeverities.has(alert.severity)) {
      return false;
    }
    return true;
  });

  const handleTypeToggle = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const handleSeverityToggle = (severity: string) => {
    const newSeverities = new Set(selectedSeverities);
    if (newSeverities.has(severity)) {
      newSeverities.delete(severity);
    } else {
      newSeverities.add(severity);
    }
    setSelectedSeverities(newSeverities);
  };

  const handleClearFilters = () => {
    setSelectedTypes(new Set());
    setSelectedSeverities(new Set());
  };

  const handleDismiss = (_alertId: string) => {
    // For now, just refetch - in future this would call a mutation
    refetch();
  };

  if (loading && !data) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>风险预警</h1>
        </div>
        <Skeleton variant="text" count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>风险预警</h1>
        </div>
        <div style={styles.error}>错误: {error.message}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>风险预警</h1>
        <div style={styles.stats}>
          共 {filteredAlerts.length} 条预警
          {filteredAlerts.length !== allAlerts.length && ` (总计 ${allAlerts.length} 条)`}
        </div>
      </div>

      {/* Filters */}
      {(alertTypes.length > 0 || severities.length > 0) && (
        <div style={styles.filtersContainer}>
          {/* Type Filters */}
          {alertTypes.length > 0 && (
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>预警类型:</span>
              <div style={styles.filterButtons}>
                {alertTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeToggle(type)}
                    style={{
                      ...styles.filterButton,
                      ...(selectedTypes.has(type) ? styles.filterButtonActive : {}),
                    }}
                    type="button"
                  >
                    {ALERT_TYPE_LABELS[type] || type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Severity Filters */}
          {severities.length > 0 && (
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>严重程度:</span>
              <div style={styles.filterButtons}>
                {severities.map((severity) => (
                  <button
                    key={severity}
                    onClick={() => handleSeverityToggle(severity)}
                    style={{
                      ...styles.filterButton,
                      ...(selectedSeverities.has(severity) ? styles.filterButtonActive : {}),
                    }}
                    type="button"
                  >
                    {SEVERITY_LABELS[severity] || severity}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {(selectedTypes.size > 0 || selectedSeverities.size > 0) && (
            <button onClick={handleClearFilters} style={styles.clearButton} type="button">
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon="🛡️"
          title="暂无风险预警"
          description={
            selectedTypes.size > 0 || selectedSeverities.size > 0
              ? '没有符合筛选条件的预警'
              : '系统未检测到风险预警'
          }
        />
      ) : (
        <RiskAlertList alerts={filteredAlerts} onDismiss={handleDismiss} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  stats: {
    fontSize: '14px',
    color: '#6b7280',
  },
  filtersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '24px',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  clearButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#dc2626',
    backgroundColor: '#fff',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#ef4444',
    fontSize: '14px',
  },
};
