import React from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const RISK_OVERVIEW = gql`
  query RiskOverview {
    riskOverview {
      totalContracts
      avgRiskScore
      byRiskLevel {
        level
        count
        percentage
      }
      highRiskContracts {
        contractId
        contractNo
        contractName
        customerName
        overallScore
        riskLevel
        trend
        factors {
          factor
          weight
          score
          description
        }
      }
    }
  }
`;

interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

interface RiskLevelStats {
  level: string;
  count: number;
  percentage: number;
}

interface HighRiskContract {
  contractId: string;
  contractNo: string;
  contractName: string;
  customerName: string;
  overallScore: number;
  riskLevel: string;
  trend: string | null;
  factors: RiskFactor[];
}

interface RiskOverviewData {
  riskOverview: {
    totalContracts: number;
    avgRiskScore: number;
    byRiskLevel: RiskLevelStats[];
    highRiskContracts: HighRiskContract[];
  };
}

const riskLevelColors: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

const riskLevelLabels: Record<string, string> = {
  LOW: '低风险',
  MEDIUM: '中风险',
  HIGH: '高风险',
  CRITICAL: '严重',
};

const factorLabels: Record<string, string> = {
  AMOUNT: '金额',
  DURATION: '期限',
  CUSTOMER: '客户',
  CLAUSE: '条款',
  OVERDUE: '逾期',
};

const trendIcons: Record<string, string> = {
  UP: '↑',
  DOWN: '↓',
  STABLE: '→',
};

export const RiskMatrix: React.FC = () => {
  const { data, loading } = useQuery<RiskOverviewData>(RISK_OVERVIEW);

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>风险矩阵</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const overview = data?.riskOverview;

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#1a1a2e' }}>风险矩阵</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>
          平均风险分: {(overview?.avgRiskScore || 0).toFixed(0)}
        </span>
      </div>

      {/* Risk Level Distribution */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {overview?.byRiskLevel.map((stat) => (
          <div
            key={stat.level}
            style={{
              flex: stat.count,
              height: '32px',
              background: riskLevelColors[stat.level] || '#ccc',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
              fontWeight: 500,
              minWidth: stat.count > 0 ? '60px' : '0',
            }}
          >
            {stat.count > 0 && `${riskLevelLabels[stat.level]} ${stat.count}`}
          </div>
        ))}
      </div>

      {/* Risk Level Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', justifyContent: 'center' }}>
        {overview?.byRiskLevel.map((stat) => (
          <div key={stat.level} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                background: riskLevelColors[stat.level] || '#ccc',
              }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              {riskLevelLabels[stat.level]}: {stat.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* High Risk Contracts */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px' }}>
          高风险合同
        </h4>
        {overview?.highRiskContracts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#10b981' }}>
            暂无高风险合同
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {overview?.highRiskContracts.slice(0, 5).map((contract) => (
              <div
                key={contract.contractId}
                style={{
                  padding: '16px',
                  border: `2px solid ${riskLevelColors[contract.riskLevel]}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500, color: '#1a1a2e' }}>
                    {contract.contractName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: riskLevelColors[contract.riskLevel], fontWeight: 600 }}>
                      {contract.overallScore.toFixed(0)}
                    </span>
                    {contract.trend && (
                      <span style={{ color: contract.trend === 'DOWN' ? '#10b981' : '#ef4444' }}>
                        {trendIcons[contract.trend]}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                  {contract.contractNo} | {contract.customerName}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {contract.factors.map((factor) => (
                    <div
                      key={factor.factor}
                      style={{
                        padding: '4px 8px',
                        background: factor.score > 50 ? '#fef2f2' : '#f0fdf4',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: factor.score > 50 ? '#ef4444' : '#10b981',
                      }}
                    >
                      {factorLabels[factor.factor]}: {factor.score.toFixed(0)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
