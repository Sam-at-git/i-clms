import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { Line } from 'react-chartjs-2';

interface CustomerRiskAssessmentProps {
  customerId: string;
  customerName?: string;
}

const GET_CUSTOMER_RISK = gql`
  query GetCustomerRisk($customerId: ID!) {
    customerRiskAssessment(customerId: $customerId) {
      overallScore
      level
      factors {
        name
        score
        weight
        description
        trend
      }
      history {
        date
        score
        level
      }
      recommendations
    }
  }
`;

const RISK_LEVELS: Record<string, { label: string; color: string; icon: string }> = {
  LOW: { label: '低风险', color: '#10b981', icon: '✅' },
  MEDIUM: { label: '中风险', color: '#f59e0b', icon: '⚠️' },
  HIGH: { label: '高风险', color: '#ef4444', icon: '🔴' },
  CRITICAL: { label: '极高风险', color: '#7f1d1d', icon: '🚨' },
};

const RISK_FACTOR_ICONS: Record<string, string> = {
  payment_history: '💰',
  contract_disputes: '⚖️',
  credit_score: '📊',
  business_stability: '🏢',
  industry_risk: '🏭',
  communication_quality: '💬',
};

export function CustomerRiskAssessment({
  customerId,
  customerName,
}: CustomerRiskAssessmentProps) {
  const { data, loading } = useQuery(GET_CUSTOMER_RISK, {
    variables: { customerId },
    fetchPolicy: 'cache-and-network',
  });

  const risk = data?.customerRiskAssessment;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (!risk) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>暂无风险评估数据</div>
      </div>
    );
  }

  const levelInfo = RISK_LEVELS[risk.level] || RISK_LEVELS.MEDIUM;

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

      {/* Overall Score */}
      <div style={styles.scoreSection}>
        <div
          style={{
            ...styles.scoreCard,
            borderColor: levelInfo.color,
            backgroundColor: `${levelInfo.color}10`,
          }}
        >
          <div style={styles.scoreHeader}>
            <span style={styles.scoreIcon}>{levelInfo.icon}</span>
            <span style={styles.scoreLabel}>综合风险等级</span>
          </div>
          <div style={styles.scoreValue}>
            <span style={styles.scoreNumber}>{risk.overallScore}</span>
            <span style={styles.scoreMax}>/100</span>
          </div>
          <div
            style={{
              ...styles.scoreLevel,
              color: levelInfo.color,
            }}
          >
            {levelInfo.label}
          </div>
        </div>

        {/* History Chart */}
        {risk.history && risk.history.length > 0 && (
          <div style={styles.historyCard}>
            <h4 style={styles.historyTitle}>风险趋势</h4>
            <div style={styles.historyChart}>
              {/* Simplified chart representation */}
              <div style={styles.historyBars}>
                {risk.history.map((h: any, index: number) => (
                  <div key={index} style={styles.historyBarGroup}>
                    <div style={styles.historyBarDate}>
                      {new Date(h.date).toLocaleDateString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </div>
                    <div style={styles.historyBar}>
                      <div
                        style={{
                          ...styles.historyBarFill,
                          width: `${h.score}%`,
                          backgroundColor: RISK_LEVELS[h.level]?.color || '#f59e0b',
                        }}
                      />
                    </div>
                    <div style={styles.historyBarValue}>{h.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Risk Factors */}
      <div style={styles.factorsSection}>
        <h4 style={styles.sectionTitle}>风险因素分析</h4>
        <div style={styles.factorsList}>
          {risk.factors.map((factor: any, index: number) => (
            <div key={index} style={styles.factorCard}>
              <div style={styles.factorHeader}>
                <span style={styles.factorIcon}>
                  {RISK_FACTOR_ICONS[factor.name] || '📋'}
                </span>
                <span style={styles.factorName}>{factor.name}</span>
                <span style={styles.factorWeight}>权重: {factor.weight}%</span>
              </div>
              <div style={styles.factorScore}>
                <div style={styles.scoreBar}>
                  <div
                    style={{
                      ...styles.scoreBarFill,
                      width: `${factor.score}%`,
                      backgroundColor:
                        factor.score >= 70
                          ? '#ef4444'
                          : factor.score >= 40
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  />
                </div>
                <span style={styles.factorScoreValue}>{factor.score}/100</span>
              </div>
              {factor.description && (
                <div style={styles.factorDescription}>{factor.description}</div>
              )}
              {factor.trend && (
                <div style={styles.factorTrend}>
                  趋势:{' '}
                  <span
                    style={{
                      color: factor.trend === 'improving' ? '#10b981' : '#ef444',
                      fontWeight: 500,
                    }}
                  >
                    {factor.trend === 'improving' ? '改善 ↑' : '恶化 ↓'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {risk.recommendations && risk.recommendations.length > 0 && (
        <div style={styles.recommendationsSection}>
          <h4 style={styles.sectionTitle}>风险建议</h4>
          <div style={styles.recommendationsList}>
            {risk.recommendations.map((rec: string, index: number) => (
              <div key={index} style={styles.recommendationItem}>
                <span style={styles.recommendationIcon}>💡</span>
                <span style={styles.recommendationText}>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  error: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
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
  scoreSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  scoreCard: {
    padding: '20px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  scoreHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  scoreIcon: {
    fontSize: '32px',
  },
  scoreLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
  },
  scoreValue: {
    display: 'flex',
    alignItems: baseline',
    justifyContent: 'center',
    gap: '4px',
    marginBottom: '8px',
  },
  scoreNumber: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#111827',
  },
  scoreMax: {
    fontSize: '20px',
    color: '#9ca3af',
  },
  scoreLevel: {
    fontSize: '16px',
    fontWeight: 600,
  },
  historyCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  historyTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  historyChart: {
    width: '100%',
  },
  historyBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyBarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  historyBarDate: {
    fontSize: '11px',
    color: '#6b7280',
    width: '60px',
    textAlign: 'right',
  },
  historyBar: {
    flex: 1,
    height: '20px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  historyBarFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  historyBarValue: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 500,
    width: '30px',
    textAlign: 'right',
  },
  factorsSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  factorsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  factorCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  factorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  factorIcon: {
    fontSize: '18px',
  },
  factorName: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  factorWeight: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  factorScore: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  scoreBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  searchBarFill: {
    height: '100%',
    transition: 'width 0.3s',
  },
  factorScoreValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#111827',
    width: '40px',
    textAlign: 'right',
  },
  factorDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '4px',
    lineHeight: '1.4',
  },
  factorTrend: {
    fontSize: '12px',
    color: '#6b7280',
  },
  recommendationsSection: {
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '6px',
    border: '1px solid #dbeafe',
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  recommendationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '14px',
    color: '#1e40af',
  },
  recommendationIcon: {
    fontSize: '16px',
  },
  recommendationText: {
    flex: 1,
    lineHeight: '1.5',
  },
};

export default CustomerRiskAssessment;
