import React from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const TAG_OVERVIEW = gql`
  query TagOverview {
    tagOverview {
      totalTags
      topTags {
        tagId
        tagName
        category
        color
        count
        totalValue
      }
      byCategory {
        category
        tags {
          tagId
          tagName
          count
          totalValue
        }
      }
    }
  }
`;

interface TagStats {
  tagId: string;
  tagName: string;
  category: string | null;
  color: string | null;
  count: number;
  totalValue: number;
}

interface CategoryTags {
  category: string;
  tags: TagStats[];
}

interface TagOverviewData {
  tagOverview: {
    totalTags: number;
    topTags: TagStats[];
    byCategory: CategoryTags[];
  };
}

const getTagSize = (count: number, maxCount: number): number => {
  const minSize = 12;
  const maxSize = 24;
  if (maxCount === 0) return minSize;
  return minSize + ((count / maxCount) * (maxSize - minSize));
};

const getTagColor = (color: string | null, index: number): string => {
  if (color) return color;
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444'];
  return colors[index % colors.length];
};

export const TagCloud: React.FC = () => {
  const { data, loading } = useQuery<TagOverviewData>(TAG_OVERVIEW);

  if (loading) {
    return (
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a2e' }}>智能标签云</h3>
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          加载中...
        </div>
      </div>
    );
  }

  const overview = data?.tagOverview;
  const maxCount = Math.max(...(overview?.topTags.map((t) => t.count) || [1]));

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#1a1a2e' }}>智能标签云</h3>
        <span style={{ fontSize: '14px', color: '#666' }}>
          共 {overview?.totalTags || 0} 个标签
        </span>
      </div>

      {/* Top Tags Cloud */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'center',
          padding: '16px 0',
          marginBottom: '24px',
          background: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        {overview?.topTags.map((tag, index) => (
          <span
            key={tag.tagId}
            style={{
              fontSize: `${getTagSize(tag.count, maxCount)}px`,
              color: getTagColor(tag.color, index),
              padding: '4px 8px',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            title={`${tag.count} 个合同, ¥${(tag.totalValue / 10000).toFixed(0)}万`}
          >
            {tag.tagName}
          </span>
        ))}
      </div>

      {/* By Category */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', color: '#444', fontSize: '14px' }}>
          按分类
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {overview?.byCategory.map((category) => (
            <div key={category.category}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {category.category}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {category.tags.slice(0, 8).map((tag) => (
                  <span
                    key={tag.tagId}
                    style={{
                      padding: '4px 10px',
                      background: '#e0e7ff',
                      color: '#4338ca',
                      borderRadius: '12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {tag.tagName}
                    <span style={{ marginLeft: '4px', opacity: 0.6 }}>
                      ({tag.count})
                    </span>
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
