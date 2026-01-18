import React from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const COMPLIANCE_OVERVIEW = gql`
  query ComplianceOverview {
    complianceOverview {
      totalScanned
      avgScore
      byLevel {
        level
        count
        percentage
      }
      lowScoreContracts {
        contractId
        contractNo
        contractName
        overallScore
        missingClauses
        riskyClauses
      }
    }
  }
`;

interface ComplianceStats {
  level: string;
  count: number;
  percentage: number;
}

interface LowScoreContract {
  contractId: string;
  contractNo: string;
  contractName: string;
  overallScore: number;
  missingClauses: string[];
  riskyClauses: string[];
}

interface ComplianceOverviewData {
  complianceOverview: {
    totalScanned: number;
    avgScore: number;
    byLevel: ComplianceStats[];
    lowScoreContracts: LowScoreContract[];
  };
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

export const ComplianceScanner: React.FC = () => {
  const { data, loading } = useQuery<ComplianceOverviewData>(COMPLIANCE_OVERVIEW);

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>合规扫描</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const overview = data?.complianceOverview;

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#1a1a2e' }}>合规扫描</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>
          已扫描 {overview?.totalScanned || 0} 份合同
        </span>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: getScoreColor(overview?.avgScore || 0) }}>
            {(overview?.avgScore || 0).toFixed(0)}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>平均合规分</div>
        </div>
        {overview?.byLevel.map((stat) => (
          <div key={stat.level} style={{ textAlign: 'center', padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>
              {stat.count}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>{stat.level}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{stat.percentage.toFixed(1)}%</div>
          </div>
        ))}
      </div>

      {/* Low Score Contracts */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px' }}>
          需关注的合同（合规分&lt;60）
        </h4>
        {overview?.lowScoreContracts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#10b981' }}>
            所有合同合规性良好
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {overview?.lowScoreContracts.map((contract) => (
              <div
                key={contract.contractId}
                style={{
                  padding: '16px',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  background: '#fef2f2',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 500, color: '#1a1a2e' }}>
                    {contract.contractName}
                  </span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>
                    {contract.overallScore.toFixed(0)}分
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {contract.contractNo}
                </div>
                {contract.missingClauses.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '4px' }}>
                    缺失条款: {contract.missingClauses.join(', ')}
                  </div>
                )}
                {contract.riskyClauses.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                    风险条款: {contract.riskyClauses.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
