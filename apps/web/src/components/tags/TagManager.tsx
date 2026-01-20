import { useState, useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  isEnabled: boolean;
  usageCount?: number;
  category?: string;
  createdAt: string;
}

const GET_TAGS = gql`
  query GetTags($filter: TagFilterInput) {
    tags(filter: $filter) {
      items {
        id
        name
        color
        description
        isEnabled
        category
        createdAt
      }
      total
    }
  }
`;

const TOGGLE_TAG = gql`
  mutation ToggleTag($id: ID!, $isEnabled: Boolean!) {
    toggleTag(id: $id, isEnabled: $isEnabled) {
      id
      isEnabled
    }
  }
`;

const DELETE_TAG = gql`
  mutation DeleteTag($id: ID!) {
    deleteTag(id: $id) {
      id
    }
  }
`;

interface TagManagerProps {
  onTagClick?: (tag: Tag) => void;
  refetchTrigger?: number;
}

export function TagManager({ onTagClick, refetchTrigger }: TagManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showDisabled, setShowDisabled] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_TAGS, {
    variables: {
      filter: {
        search: searchTerm || undefined,
        category: filterCategory || undefined,
        isEnabled: showDisabled ? undefined : true,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const [toggleTagMutation] = useMutation(TOGGLE_TAG, {
    onCompleted: () => refetch(),
  });

  const [deleteTagMutation] = useMutation(DELETE_TAG, {
    onCompleted: () => refetch(),
  });

  const tags = useMemo(() => {
    return ((data as any)?.tags?.items || []) as Tag[];
  }, [data]);

  const categories = useMemo(() => {
    const cats = new Set(tags.map((t) => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tags]);

  const filteredTags = useMemo(() => {
    return tags.filter((tag) => {
      const matchesSearch =
        !searchTerm || tag.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || tag.category === filterCategory;
      const matchesEnabled = showDisabled || tag.isEnabled;
      return matchesSearch && matchesCategory && matchesEnabled;
    });
  }, [tags, searchTerm, filterCategory, showDisabled]);

  const handleToggleTag = async (tagId: string, isEnabled: boolean) => {
    try {
      await toggleTagMutation({
        variables: { id: tagId, isEnabled: !isEnabled },
      });
    } catch (err) {
      console.error('Failed to toggle tag:', err);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('确定要删除这个标签吗？')) return;
    try {
      await deleteTagMutation({ variables: { id: tagId } });
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  const handleBatchEnable = async () => {
    for (const tagId of selectedTags) {
      await toggleTagMutation({ variables: { id: tagId, isEnabled: true } });
    }
    setSelectedTags(new Set());
  };

  const handleBatchDisable = async () => {
    for (const tagId of selectedTags) {
      await toggleTagMutation({ variables: { id: tagId, isEnabled: false } });
    }
    setSelectedTags(new Set());
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedTags.size} 个标签吗？`)) return;
    for (const tagId of selectedTags) {
      await deleteTagMutation({ variables: { id: tagId } });
    }
    setSelectedTags(new Set());
  };

  const handleSelectAll = () => {
    if (selectedTags.size === filteredTags.length) {
      setSelectedTags(new Set());
    } else {
      setSelectedTags(new Set(filteredTags.map((t) => t.id)));
    }
  };

  const stats = useMemo(() => {
    return {
      total: tags.length,
      enabled: tags.filter((t) => t.isEnabled).length,
      disabled: tags.filter((t) => !t.isEnabled).length,
    };
  }, [tags]);

  if (error) {
    return (
      <div style={styles.error}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorMessage}>加载标签失败</div>
        <div style={styles.errorDetail}>{error.message}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>全部标签</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.enabled}</div>
          <div style={styles.statLabel}>已启用</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#9ca3af' }}>{stats.disabled}</div>
          <div style={styles.statLabel}>已禁用</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={styles.searchBar}>
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
        <label style={styles.showDisabledLabel}>
          <input
            type="checkbox"
            checked={showDisabled}
            onChange={(e) => setShowDisabled(e.target.checked)}
            style={styles.checkbox}
          />
          显示已禁用
        </label>
      </div>

      {/* Batch Operations */}
      {selectedTags.size > 0 && (
        <div style={styles.batchBar}>
          <span style={styles.batchCount}>已选择 {selectedTags.size} 项</span>
          <div style={styles.batchActions}>
            <button onClick={handleBatchEnable} style={styles.batchEnableButton}>
              批量启用
            </button>
            <button onClick={handleBatchDisable} style={styles.batchDisableButton}>
              批量禁用
            </button>
            <button onClick={handleBatchDelete} style={styles.batchDeleteButton}>
              批量删除
            </button>
          </div>
        </div>
      )}

      {/* Tags Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={selectedTags.size === filteredTags.length && filteredTags.length > 0}
                  onChange={handleSelectAll}
                  style={styles.checkbox}
                />
              </th>
              <th style={styles.tableHeaderCell}>标签名称</th>
              <th style={styles.tableHeaderCell}>颜色</th>
              <th style={styles.tableHeaderCell}>分类</th>
              <th style={styles.tableHeaderCell}>使用次数</th>
              <th style={styles.tableHeaderCell}>状态</th>
              <th style={styles.tableHeaderCell}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={styles.loadingCell}>
                  加载中...
                </td>
              </tr>
            ) : filteredTags.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyCell}>
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🏷️</div>
                    <div style={styles.emptyText}>
                      {searchTerm || filterCategory ? '没有找到匹配的标签' : '暂无标签'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTags.map((tag) => (
                <tr
                  key={tag.id}
                  style={{
                    ...styles.tableRow,
                    ...(selectedTags.has(tag.id) && styles.tableRowSelected),
                  }}
                >
                  <td style={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag.id)}
                      onChange={() => {
                        const newSelected = new Set(selectedTags);
                        if (newSelected.has(tag.id)) {
                          newSelected.delete(tag.id);
                        } else {
                          newSelected.add(tag.id);
                        }
                        setSelectedTags(newSelected);
                      }}
                      style={styles.checkbox}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <div
                      style={styles.tagName}
                      onClick={() => onTagClick?.(tag)}
                    >
                      {tag.name}
                    </div>
                    {tag.description && (
                      <div style={styles.tagDescription}>{tag.description}</div>
                    )}
                  </td>
                  <td style={styles.tableCell}>
                    <div
                      style={{
                        ...styles.colorPreview,
                        backgroundColor: tag.color,
                      }}
                    >
                      {tag.color}
                    </div>
                  </td>
                  <td style={styles.tableCell}>{tag.category || '-'}</td>
                  <td style={styles.tableCell}>{tag.usageCount || 0}</td>
                  <td style={styles.tableCell}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(tag.isEnabled ? styles.statusEnabled : styles.statusDisabled),
                      }}
                    >
                      {tag.isEnabled ? '已启用' : '已禁用'}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleToggleTag(tag.id, tag.isEnabled)}
                        style={styles.toggleButton}
                      >
                        {tag.isEnabled ? '禁用' : '启用'}
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        style={styles.deleteButton}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
  searchBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '16px',
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
  showDisabledLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
  },
  checkbox: {
    cursor: 'pointer',
  },
  batchBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  batchCount: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e40af',
  },
  batchActions: {
    display: 'flex',
    gap: '8px',
  },
  batchEnableButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  batchDisableButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#6b7280',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  batchDeleteButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tableContainer: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  checkboxCell: {
    padding: '12px 16px',
    width: '40px',
    textAlign: 'center' as const,
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    transition: 'background-color 0.2s',
  },
  tableRowSelected: {
    backgroundColor: '#eff6ff',
  },
  tableRowHover: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tagName: {
    fontWeight: 500,
    color: '#111827',
    cursor: 'pointer',
  },
  tagDescription: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  colorPreview: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: '12px',
    color: '#fff',
    borderRadius: '4px',
    textShadow: '0 1px 2px rgba(0,0,0,0.1)',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '4px',
  },
  statusEnabled: {
    color: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  statusDisabled: {
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
  },
  actionButtons: {
    display: 'flex',
    gap: '6px',
  },
  toggleButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '4px 8px',
    fontSize: '12px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  loadingCell: {
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  emptyCell: {
    padding: '0',
  },
  emptyState: {
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
  error: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorMessage: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ef4444',
    marginBottom: '8px',
  },
  errorDetail: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

export default TagManager;
