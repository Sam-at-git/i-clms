import React from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const COMPANY_HEALTH = gql`
  query CompanyHealth {
    companyHealth {
      overallScore
      dimensions {
        dimension
        score
        trend
        description
      }
      alerts {
        level
        message
        dimension
        value
      }
      trend {
        month
        score
      }
    }
  }
`;

interface HealthDimension {
  dimension: string;
  score: number;
  trend: string;
  description: string;
}

interface HealthAlert {
  level: string;
  message: string;
  dimension: string;
  value: number;
}

interface MonthlyScore {
  month: string;
  score: number;
}

interface CompanyHealthData {
  companyHealth: {
    overallScore: number;
    dimensions: HealthDimension[];
    alerts: HealthAlert[];
    trend: MonthlyScore[];
  };
}

const dimensionLabels: Record<string, string> = {
  FINANCE: '财务健康',
  DELIVERY: '交付质量',
  CUSTOMER: '客户满意',
  RISK: '风险控制',
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

const trendIcons: Record<string, string> = {
  UP: '↑',
  DOWN: '↓',
  STABLE: '→',
};

export const HealthGauge: React.FC = () => {
  const { data, loading } = useQuery<CompanyHealthData>(COMPANY_HEALTH);

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>公司健康度</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const health = data?.companyHealth;
  const scoreColor = getScoreColor(health?.overallScore || 0);

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <h3 style={{ margin: '0 0 24px 0', color: '#1a1a2e' }}>公司健康度</h3>

      {/* Overall Score Gauge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '24px' }}>
        <div
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: `conic-gradient(${scoreColor} ${(health?.overallScore || 0) * 3.6}deg, #e5e7eb 0deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <div style={{ fontSize: '36px', fontWeight: 700, color: scoreColor }}>
              {(health?.overallScore || 0).toFixed(0)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>综合得分</div>
          </div>
        </div>

        {/* Dimension Bars */}
        <div style={{ flex: 1 }}>
          {health?.dimensions.map((dim) => (
            <div key={dim.dimension} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: '#444' }}>
                  {dimensionLabels[dim.dimension] || dim.dimension}
                </span>
                <span style={{ fontSize: '13px', color: getScoreColor(dim.score), fontWeight: 500 }}>
                  {dim.score.toFixed(0)}
                  <span style={{ marginLeft: '4px', color: dim.trend === 'UP' ? '#10b981' : dim.trend === 'DOWN' ? '#ef4444' : '#9ca3af' }}>
                    {trendIcons[dim.trend]}
                  </span>
                </span>
              </div>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${dim.score}%`,
                    background: getScoreColor(dim.score),
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                {dim.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {health?.alerts && health.alerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px' }}>预警信息</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {health.alerts.map((alert, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  background: alert.level === 'CRITICAL' ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${alert.level === 'CRITICAL' ? '#fecaca' : '#fde68a'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: alert.level === 'CRITICAL' ? '#dc2626' : '#d97706',
                }}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px' }}>健康趋势</h4>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
          {health?.trend.map((item) => (
            <div key={item.month} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: `${item.score * 0.8}px`,
                  background: getScoreColor(item.score),
                  borderRadius: '4px 4px 0 0',
                  marginBottom: '4px',
                }}
              />
              <div style={{ fontSize: '10px', color: '#999' }}>{item.month}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
