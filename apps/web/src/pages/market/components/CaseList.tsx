import React from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const CASE_OVERVIEW = gql`
  query CaseOverview {
    caseOverview {
      totalCases
      byIndustry {
        industry
        count
        totalValue
      }
      featured {
        id
        contractNo
        name
        customerName
        industry
        type
        amount
        signedAt
        description
        highlights
        tags
      }
    }
  }
`;

interface CaseStudy {
  id: string;
  contractNo: string;
  name: string;
  customerName: string;
  industry: string | null;
  type: string;
  amount: number;
  signedAt: string | null;
  description: string | null;
  highlights: string[];
  tags: string[];
}

interface IndustryCases {
  industry: string;
  count: number;
  totalValue: number;
}

interface CaseOverviewData {
  caseOverview: {
    totalCases: number;
    byIndustry: IndustryCases[];
    featured: CaseStudy[];
  };
}

const typeLabels: Record<string, string> = {
  STAFF_AUGMENTATION: '人力框架',
  PROJECT_OUTSOURCING: '项目外包',
  PRODUCT_SALES: '产品购销',
};

export const CaseList: React.FC = () => {
  const { data, loading } = useQuery<CaseOverviewData>(CASE_OVERVIEW);

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>成功案例库</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const overview = data?.caseOverview;

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#1a1a2e' }}>成功案例库</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>
          共 {overview?.totalCases || 0} 个案例
        </span>
      </div>

      {/* Industry Distribution */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px' }}>
          行业分布
        </h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {overview?.byIndustry.slice(0, 6).map((industry) => (
            <div
              key={industry.industry}
              style={{
                padding: '12px 16px',
                background: '#f0f9ff',
                borderRadius: '8px',
                minWidth: '120px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#0369a1' }}>
                {industry.industry}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {industry.count} 案例 | ¥{(industry.totalValue / 10000).toFixed(0)}万
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Cases */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px' }}>
          精选案例
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {overview?.featured.slice(0, 5).map((caseItem) => (
            <div
              key={caseItem.id}
              style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 500, color: '#1a1a2e' }}>
                  {caseItem.name}
                </span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>
                  ¥{(caseItem.amount / 10000).toFixed(1)}万
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {caseItem.customerName} | {caseItem.industry || '未分类'} | {typeLabels[caseItem.type] || caseItem.type}
              </div>
              {caseItem.description && (
                <div style={{ fontSize: '13px', color: '#444', marginBottom: '8px' }}>
                  {caseItem.description}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {caseItem.highlights.map((highlight, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '2px 8px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  >
                    {highlight}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {caseItem.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '2px 8px',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
