import React from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const CORE_KPIS = gql`
  query CoreKPIs($period: String) {
    coreKPIs(period: $period) {
      period
      categories {
        category
        metrics {
          name
          value
          unit
          target
          achievement
          trend
          previousValue
        }
      }
      highlights
    }
  }
`;

interface KPIMetric {
  name: string;
  value: number;
  unit: string;
  target: number | null;
  achievement: number | null;
  trend: string;
  previousValue: number | null;
}

interface KPICategory {
  category: string;
  metrics: KPIMetric[];
}

interface CoreKPIsData {
  coreKPIs: {
    period: string;
    categories: KPICategory[];
    highlights: string[];
  };
}

const trendIcons: Record<string, string> = {
  UP: '↑',
  DOWN: '↓',
  STABLE: '→',
};

const trendColors: Record<string, string> = {
  UP: '#10b981',
  DOWN: '#ef4444',
  STABLE: '#9ca3af',
};

const getAchievementColor = (achievement: number | null): string => {
  if (!achievement) return '#9ca3af';
  if (achievement >= 100) return '#10b981';
  if (achievement >= 70) return '#f59e0b';
  return '#ef4444';
};

export const KPIDashboard: React.FC = () => {
  const { data, loading } = useQuery<CoreKPIsData>(CORE_KPIS, {
    variables: { period: 'monthly' },
  });

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>核心KPI</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const kpis = data?.coreKPIs;

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: '#1a1a2e' }}>核心KPI</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>{kpis?.period}</span>
      </div>

      {/* Highlights */}
      {kpis?.highlights && kpis.highlights.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '12px 16px', background: '#f0f9ff', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 500, marginBottom: '8px' }}>
            重点提示
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {kpis.highlights.map((highlight, index) => (
              <span
                key={index}
                style={{
                  padding: '4px 10px',
                  background: 'white',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#0369a1',
                }}
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPI Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {kpis?.categories.map((category) => (
          <div key={category.category}>
            <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px', fontWeight: 600 }}>
              {category.category}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {category.metrics.map((metric) => (
                <div
                  key={metric.name}
                  style={{
                    padding: '16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>{metric.name}</span>
                    <span style={{ color: trendColors[metric.trend], fontSize: '14px' }}>
                      {trendIcons[metric.trend]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>
                      {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                    </span>
                    <span style={{ fontSize: '14px', color: '#666' }}>{metric.unit}</span>
                  </div>
                  {metric.target && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          目标: {metric.target}{metric.unit}
                        </span>
                        <span style={{ fontSize: '11px', color: getAchievementColor(metric.achievement), fontWeight: 500 }}>
                          {(metric.achievement || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, metric.achievement || 0)}%`,
                            background: getAchievementColor(metric.achievement),
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {metric.previousValue !== null && (
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                      上期: {metric.previousValue.toFixed(metric.unit === '%' ? 1 : 0)}{metric.unit}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
