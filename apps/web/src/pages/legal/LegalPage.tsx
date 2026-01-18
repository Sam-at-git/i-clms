import React from 'react';
import { ComplianceScanner, RiskMatrix, EvidenceTimeline } from './components';

export const LegalPage: React.FC = () => {
  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#1a1a2e', fontSize: '28px' }}>
            法务部门
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            合同合规与风险管理
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Compliance Scanner */}
          <div>
            <ComplianceScanner />
          </div>

          {/* Risk Matrix */}
          <div>
            <RiskMatrix />
          </div>

          {/* Evidence Timeline - Full Width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <EvidenceTimeline />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
