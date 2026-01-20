import { useState, useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  usageCount?: number;
  confidence?: number;
}

const GET_TAGS = gql`
  query GetTagsForCloud {
    tags(filter: { isEnabled: true }) {
      items {
        id
        name
        color
        category
      }
    }
  }
`;

interface TagCloudProps {
  onTagClick?: (tag: Tag) => void;
  selectedTags?: Set<string>;
  multiSelect?: boolean;
  maxTags?: number;
  sortBy?: 'name' | 'usage' | 'category';
  showConfidence?: boolean;
}

export function TagCloud({
  onTagClick,
  selectedTags = new Set(),
  multiSelect = false,
  maxTags,
  sortBy = 'name',
  showConfidence = false,
}: TagCloudProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [currentSortBy, setSortBy] = useState(sortBy);

  const { data, loading } = useQuery(GET_TAGS, {
    fetchPolicy: 'cache-and-network',
  });

  const tags = useMemo(() => {
    let allTags = ((data as any)?.tags?.items || []) as Tag[];

    // Apply search filter
    if (searchTerm) {
      allTags = allTags.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (filterCategory) {
      allTags = allTags.filter((t) => t.category === filterCategory);
    }

    // Apply max limit
    if (maxTags && maxTags > 0) {
      allTags = allTags.slice(0, maxTags);
    }

    // Sort
    allTags = [...allTags].sort((a, b) => {
      switch (currentSortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'zh-CN');
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'category':
          return (a.category || '').localeCompare(b.category || '', 'zh-CN');
        default:
          return 0;
      }
    });

    return allTags;
  }, [data, searchTerm, filterCategory, maxTags, currentSortBy]);

  const categories = useMemo(() => {
    const cats = new Set(tags.map((t) => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tags]);

  const handleTagClick = (tag: Tag) => {
    if (multiSelect) {
      const newSelected = new Set(selectedTags);
      if (newSelected.has(tag.id)) {
        newSelected.delete(tag.id);
      } else {
        newSelected.add(tag.id);
      }
      onTagClick?.({ ...tag, selectedTags: newSelected } as any);
    } else {
      onTagClick?.(tag);
    }
  };

  const getTagSize = (tag: Tag) => {
    if (!tag.usageCount) return 'medium';
    const count = tag.usageCount;
    if (count >= 20) return 'xlarge';
    if (count >= 10) return 'large';
    if (count >= 5) return 'medium';
    return 'small';
  };

  const tagSizes = {
    small: { fontSize: '12px', padding: '4px 8px' },
    medium: { fontSize: '14px', padding: '6px 12px' },
    large: { fontSize: '16px', padding: '8px 14px' },
    xlarge: { fontSize: '18px', padding: '10px 16px' },
  };

  const groupedTags = useMemo(() => {
    const groups: Record<string, Tag[]> = {};
    tags.forEach((tag) => {
      const cat = tag.category || '未分类';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tag);
    });
    return groups;
  }, [tags]);

  return (
    <div style={styles.container}>
      {/* Controls */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="搜索标签..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={styles.categorySelect}
        >
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={currentSortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={styles.sortSelect}
        >
          <option value="name">按名称排序</option>
          <option value="usage">按使用次数</option>
          <option value="category">按分类排序</option>
        </select>
      </div>

      {/* Tag Cloud */}
      <div style={styles.cloud}>
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : tags.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🏷️</div>
            <div style={styles.emptyText}>
              {searchTerm || filterCategory ? '没有找到匹配的标签' : '暂无标签'}
            </div>
          </div>
        ) : filterCategory || sortBy === 'category' ? (
          // Grouped view
          Object.entries(groupedTags).map(([category, categoryTags]) => (
            <div key={category} style={styles.categoryGroup}>
              <div style={styles.categoryHeader}>{category}</div>
              <div style={styles.categoryTags}>
                {categoryTags.map((tag) => {
                  const size = getTagSize(tag);
                  const isSelected = selectedTags.has(tag.id);
                  return (
                    <div
                      key={tag.id}
                      onClick={() => handleTagClick(tag)}
                      style={{
                        ...styles.tag,
                        ...(tagSizes[size as keyof typeof tagSizes]),
                        backgroundColor: isSelected ? tag.color : `${tag.color}20`,
                        color: isSelected ? '#fff' : tag.color,
                        border: `1px solid ${tag.color}`,
                        ...(isSelected && styles.tagSelected),
                      }}
                      title={
                        showConfidence && tag.confidence
                          ? `${tag.name} (置信度: ${(tag.confidence * 100).toFixed(0)}%)`
                          : tag.name
                      }
                    >
                      <span style={styles.tagName}>{tag.name}</span>
                      {tag.usageCount !== undefined && (
                        <span style={styles.tagCount}>{tag.usageCount}</span>
                      )}
                      {showConfidence && tag.confidence && (
                        <span style={styles.tagConfidence}>
                          {(tag.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          // Flat view
          tags.map((tag) => {
            const size = getTagSize(tag);
            const isSelected = selectedTags.has(tag.id);
            return (
              <div
                key={tag.id}
                onClick={() => handleTagClick(tag)}
                style={{
                  ...styles.tag,
                  ...(tagSizes[size as keyof typeof tagSizes]),
                  backgroundColor: isSelected ? tag.color : `${tag.color}20`,
                  color: isSelected ? '#fff' : tag.color,
                  border: `1px solid ${tag.color}`,
                  ...(isSelected && styles.tagSelected),
                }}
                title={
                  showConfidence && tag.confidence
                    ? `${tag.name} (置信度: ${(tag.confidence * 100).toFixed(0)}%)`
                    : tag.name
                }
              >
                <span style={styles.tagName}>{tag.name}</span>
                {tag.usageCount !== undefined && (
                  <span style={styles.tagCount}>{tag.usageCount}</span>
                )}
                {showConfidence && tag.confidence && (
                  <span style={styles.tagConfidence}>
                    {(tag.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            );
          })
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
  controls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  categorySelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  sortSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  cloud: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    minHeight: '100px',
  },
  loading: {
    width: '100%',
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  empty: {
    width: '100%',
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  categoryGroup: {
    width: '100%',
    marginBottom: '16px',
  },
  categoryHeader: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  categoryTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  tagSelected: {
    transform: 'scale(1.05)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  tagName: {
    fontWeight: 500,
  },
  tagCount: {
    fontSize: '11px',
    opacity: 0.7,
  },
  tagConfidence: {
    fontSize: '10px',
    opacity: 0.8,
    fontStyle: 'italic' as const,
  },
};

export default TagCloud;
