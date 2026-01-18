import React from 'react';
import { ContractSearch, TagCloud, CaseList } from './components';

export const MarketPage: React.FC = () => {
  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', color: '#1a1a2e', fontSize: '28px' }}>
            市场部门
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            合同知识库与案例管理
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Contract Search - Full Width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <ContractSearch />
          </div>

          {/* Tag Cloud */}
          <div>
            <TagCloud />
          </div>

          {/* Case List */}
          <div>
            <CaseList />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
