import React from 'react';
import { HealthGauge, RiskHeatmapChart, KPIDashboard } from './components';

export const ExecutivePage: React.FC = () => {
  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#1a1a2e', fontSize: '28px' }}>
            管理层驾驶舱
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            公司整体运营状况与战略决策支持
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Health Gauge */}
          <div>
            <HealthGauge />
          </div>

          {/* Risk Heatmap */}
          <div>
            <RiskHeatmapChart />
          </div>

          {/* KPI Dashboard - Full Width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <KPIDashboard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutivePage;
