import { useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Tag } from './TagCloud';

const GET_TAGS = gql`
  query GetTagsForStats {
    tags {
      items {
        id
        name
        color
        category
        usageCount
      }
    }
  }
`;

interface TagStatsProps {
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
}

export function TagStats({ timeRange = 'month', limit = 10 }: TagStatsProps) {
  const { data, loading } = useQuery(GET_TAGS, {
    fetchPolicy: 'cache-and-network',
  });

  const stats = useMemo(() => {
    const tags = ((data as any)?.tags?.items || []) as Tag[];

    // Total tags
    const totalTags = tags.length;

    // Enabled tags
    const enabledTags = tags.filter((t) => t.usageCount && t.usageCount > 0).length;

    // Total usage
    const totalUsage = tags.reduce((sum, t) => sum + (t.usageCount || 0), 0);

    // Category breakdown
    const categoryBreakdown = tags.reduce((acc, tag) => {
      const cat = tag.category || '未分类';
      if (!acc[cat]) {
        acc[cat] = { count: 0, usage: 0 };
      }
      acc[cat].count += 1;
      acc[cat].usage += tag.usageCount || 0;
      return acc;
    }, {} as Record<string, { count: number; usage: number }>);

    // Top used tags
    const topUsedTags = [...tags]
      .filter((t) => t.usageCount && t.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);

    // Unused tags
    const unusedTags = tags.filter((t) => !t.usageCount || t.usageCount === 0);

    return {
      totalTags,
      enabledTags,
      totalUsage,
      categoryBreakdown,
      topUsedTags,
      unusedTags,
      averageUsage: totalTags > 0 ? totalUsage / totalTags : 0,
    };
  }, [data, limit]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <span>加载统计...</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Overview Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalTags}</div>
          <div style={styles.statLabel}>全部标签</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#10b981' }}>
            {stats.enabledTags}
          </div>
          <div style={styles.statLabel}>已使用</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#3b82f6' }}>
            {stats.totalUsage}
          </div>
          <div style={styles.statLabel}>总使用次数</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#8b5cf6' }}>
            {stats.averageUsage.toFixed(1)}
          </div>
          <div style={styles.statLabel}>平均使用</div>
        </div>
      </div>

      <div style={styles.content}>
        {/* Top Used Tags */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>最常用标签 (Top {limit})</h4>
          <div style={styles.tagList}>
            {stats.topUsedTags.length === 0 ? (
              <div style={styles.empty}>暂无数据</div>
            ) : (
              stats.topUsedTags.map((tag, index) => (
                <div key={tag.id} style={styles.tagItem}>
                  <div style={styles.tagRank}>#{index + 1}</div>
                  <div
                    style={{
                      ...styles.tagBadge,
                      backgroundColor: tag.color,
                    }}
                  >
                    {tag.name}
                  </div>
                  <div style={styles.tagUsage}>{tag.usageCount} 次</div>
                  <div style={styles.tagBar}>
                    <div
                      style={{
                        ...styles.tagBarFill,
                        width: `${(tag.usageCount! / stats.topUsedTags[0].usageCount!) * 100}%`,
                        backgroundColor: tag.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>分类统计</h4>
          <div style={styles.categoryList}>
            {Object.entries(stats.categoryBreakdown).map(([category, data]) => (
              <div key={category} style={styles.categoryItem}>
                <div style={styles.categoryName}>{category}</div>
                <div style={styles.categoryStats}>
                  <span style={styles.categoryCount}>{data.count} 个标签</span>
                  <span style={styles.categoryUsage}>{data.usage} 次使用</span>
                </div>
                <div style={styles.categoryBar}>
                  <div
                    style={{
                      ...styles.categoryBarFill,
                      width: `${(data.count / stats.totalTags) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unused Tags */}
        {stats.unusedTags.length > 0 && (
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              未使用标签 ({stats.unusedTags.length})
            </h4>
            <div style={styles.unusedList}>
              {stats.unusedTags.slice(0, 10).map((tag) => (
                <div
                  key={tag.id}
                  style={{
                    ...styles.unusedTag,
                    backgroundColor: `${tag.color}20`,
                    border: `1px solid ${tag.color}`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </div>
              ))}
              {stats.unusedTags.length > 10 && (
                <div style={styles.moreUnused}>
                  还有 {stats.unusedTags.length - 10} 个...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px',
    color: '#9ca3af',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  section: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  tagList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  empty: {
    fontSize: '13px',
    color: '#9ca3af',
    textAlign: 'center',
    padding: '16px',
  },
  tagItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#fff',
    borderRadius: '6px',
  },
  tagRank: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    minWidth: '30px',
  },
  tagBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
  },
  tagUsage: {
    fontSize: '12px',
    color: '#6b7280',
    minWidth: '50px',
    textAlign: 'right' as const,
  },
  tagBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  tagBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  categoryItem: {
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '6px',
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '4px',
  },
  categoryStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
  },
  categoryCount: {},
  categoryUsage: {},
  categoryBar: {
    height: '6px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  unusedList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  unusedTag: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
  },
  moreUnused: {
    padding: '4px 10px',
    fontSize: '13px',
    color: '#6b7280',
  },
};

export default TagStats;
