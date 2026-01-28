import React, { useState } from 'react';
import { useGetCaseStudiesQuery, CaseStudyStatus } from '@i-clms/shared/generated/graphql';

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  GENERATED: '已生成',
  REVIEWED: '已审核',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: '#f3f4f6', text: '#6b7280' },
  GENERATED: { bg: '#fef3c7', text: '#d97706' },
  REVIEWED: { bg: '#dbeafe', text: '#2563eb' },
  PUBLISHED: { bg: '#dcfce7', text: '#16a34a' },
  ARCHIVED: { bg: '#f3f4f6', text: '#9ca3af' },
};

export const CaseList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<CaseStudyStatus | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, loading } = useGetCaseStudiesQuery({
    variables: {
      status: statusFilter,
      limit: 20,
    },
  });

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>AI生成案例库</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const caseStudies = data?.caseStudies?.items || [];
  const total = data?.caseStudies?.total || 0;

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#1a1a2e' }}>AI生成案例库</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>
          共 {total} 个案例
        </span>
      </div>

      {/* Status Filter */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setStatusFilter(undefined)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              background: !statusFilter ? '#8b5cf6' : '#f3f4f6',
              color: !statusFilter ? 'white' : '#666',
            }}
          >
            全部
          </button>
          {Object.entries(statusLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value as CaseStudyStatus)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                background: statusFilter === value ? '#8b5cf6' : '#f3f4f6',
                color: statusFilter === value ? 'white' : '#666',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Case Studies List */}
      {caseStudies.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无案例</div>
          <div style={{ fontSize: '14px', color: '#999' }}>
            在合同详情页点击"生成案例"按钮来创建第一个成功案例
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {caseStudies.map((caseItem) => {
            const isExpanded = expandedId === caseItem.id;
            const colors = statusColors[caseItem.status] || statusColors.DRAFT;

            return (
              <div
                key={caseItem.id}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onClick={() => setExpandedId(isExpanded ? null : caseItem.id)}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: '#1a1a2e', fontSize: '15px' }}>
                      {caseItem.title}
                    </span>
                    {caseItem.subtitle && (
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        {caseItem.subtitle}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: colors.bg,
                      color: colors.text,
                      fontWeight: 500,
                    }}
                  >
                    {statusLabels[caseItem.status] || caseItem.status}
                  </span>
                </div>

                {/* Meta Info */}
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {caseItem.displayCustomerName || '某企业'} | {caseItem.displayIndustry || '未分类'} | {caseItem.displayAmount || ''}
                </div>

                {/* Summary */}
                <div style={{ fontSize: '13px', color: '#444', marginBottom: '10px', lineHeight: 1.5 }}>
                  {isExpanded ? caseItem.summary : (caseItem.summary?.slice(0, 150) + (caseItem.summary && caseItem.summary.length > 150 ? '...' : ''))}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                    {caseItem.challenges && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 500, color: '#374151', marginBottom: '4px', fontSize: '13px' }}>客户挑战</div>
                        <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.6 }}>{caseItem.challenges}</div>
                      </div>
                    )}
                    {caseItem.solution && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 500, color: '#374151', marginBottom: '4px', fontSize: '13px' }}>解决方案</div>
                        <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.6 }}>{caseItem.solution}</div>
                      </div>
                    )}
                    {caseItem.results && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 500, color: '#374151', marginBottom: '4px', fontSize: '13px' }}>项目成果</div>
                        <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.6 }}>{caseItem.results}</div>
                      </div>
                    )}
                    {caseItem.testimonial && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 500, color: '#374151', marginBottom: '4px', fontSize: '13px' }}>客户评价</div>
                        <div style={{ fontSize: '13px', color: '#444', fontStyle: 'italic', lineHeight: 1.6 }}>"{caseItem.testimonial}"</div>
                      </div>
                    )}
                    {/* Source Contract */}
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
                      来源合同: {caseItem.contract?.name || caseItem.contract?.contractNo || '未知'}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {caseItem.tags && caseItem.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {caseItem.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '2px 8px',
                          background: '#f5f3ff',
                          color: '#7c3aed',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expand Indicator */}
                <div style={{ textAlign: 'center', marginTop: '8px', color: '#9ca3af', fontSize: '12px' }}>
                  {isExpanded ? '点击收起 ▲' : '点击展开详情 ▼'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
