import { useState, useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
}

const GET_TAGS = gql`
  query GetTagsForSelector {
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

const ADD_TAG_TO_CONTRACT = gql`
  mutation AddTagToContract($contractId: ID!, $tagId: ID!) {
    addTagToContract(contractId: $contractId, tagId: $tagId) {
      id
      tags {
        id
        name
        color
      }
    }
  }
`;

const REMOVE_TAG_FROM_CONTRACT = gql`
  mutation RemoveTagFromContract($contractId: ID!, $tagId: ID!) {
    removeTagFromContract(contractId: $contractId, tagId: $tagId) {
      id
      tags {
        id
        name
        color
      }
    }
  }
`;

const CREATE_TAG = gql`
  mutation CreateTag($input: CreateTagInput!) {
    createTag(input: $input) {
      id
      name
      color
      category
    }
  }
`;

interface TagSelectorProps {
  contractId: string;
  selectedTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
  readOnly?: boolean;
  showQuickCreate?: boolean;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function TagSelector({
  contractId,
  selectedTags,
  onTagsChange,
  readOnly = false,
  showQuickCreate = true,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [newTagCategory, setNewTagCategory] = useState('');

  const { data, loading, refetch } = useQuery(GET_TAGS, {
    fetchPolicy: 'cache-and-network',
  });

  const [addTagMutation] = useMutation(ADD_TAG_TO_CONTRACT, {
    onCompleted: (data: any) => {
      onTagsChange?.(data.addTagToContract.tags);
    },
  });

  const [removeTagMutation] = useMutation(REMOVE_TAG_FROM_CONTRACT, {
    onCompleted: (data: any) => {
      onTagsChange?.(data.removeTagFromContract.tags);
    },
  });

  const [createTagMutation] = useMutation(CREATE_TAG, {
    onCompleted: async (data: any) => {
      const newTag = data.createTag;
      await addTagMutation({
        variables: { contractId, tagId: newTag.id },
      });
      await refetch();
      setShowCreateForm(false);
      setNewTagName('');
      setNewTagCategory('');
    },
  });

  const availableTags = useMemo(() => {
    const allTags = ((data as any)?.tags?.items || []) as Tag[];
    const selectedIds = new Set(selectedTags.map((t) => t.id));
    return allTags.filter((t) => !selectedIds.has(t.id));
  }, [data, selectedTags]);

  const filteredTags = useMemo(() => {
    return availableTags.filter((t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableTags, searchTerm]);

  const categories = useMemo(() => {
    const cats = new Set(filteredTags.map((t) => t.category).filter(Boolean));
    return Array.from(cats);
  }, [filteredTags]);

  const handleAddTag = async (tagId: string) => {
    try {
      await addTagMutation({ variables: { contractId, tagId } });
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagMutation({ variables: { contractId, tagId } });
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      await createTagMutation({
        variables: {
          input: {
            name: newTagName.trim(),
            color: newTagColor,
            category: newTagCategory || undefined,
          },
        },
      });
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
  };

  const handleQuickCreate = async (name: string) => {
    if (!name.trim()) return;
    try {
      await createTagMutation({
        variables: {
          input: {
            name: name.trim(),
            color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
          },
        },
      });
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
  };

  const groupedTags = useMemo(() => {
    const groups: Record<string, Tag[]> = {};
    filteredTags.forEach((tag) => {
      const cat = tag.category || '未分类';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tag);
    });
    return groups;
  }, [filteredTags]);

  return (
    <div style={styles.container}>
      {/* Selected Tags */}
      <div style={styles.selectedTags}>
        {selectedTags.length === 0 ? (
          <div style={styles.noTags}>暂无标签</div>
        ) : (
          selectedTags.map((tag) => (
            <div
              key={tag.id}
              style={{
                ...styles.tag,
                backgroundColor: tag.color,
              }}
            >
              <span style={styles.tagName}>{tag.name}</span>
              {!readOnly && (
                <button
                  onClick={() => handleRemoveTag(tag.id)}
                  style={styles.tagRemove}
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
        {!readOnly && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={styles.addButton}
          >
            + 添加标签
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !readOnly && (
        <div style={styles.dropdown}>
          {/* Search */}
          <div style={styles.searchSection}>
            <input
              type="text"
              placeholder="搜索标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
              autoFocus
            />
            {showQuickCreate && searchTerm && !filteredTags.length && (
              <button
                onClick={() => handleQuickCreate(searchTerm)}
                style={styles.quickCreateButton}
              >
                创建 "{searchTerm}"
              </button>
            )}
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div style={styles.createForm}>
              <form onSubmit={handleCreateTag}>
                <input
                  type="text"
                  placeholder="新标签名称"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  style={styles.newTagInput}
                />
                <select
                  value={newTagCategory}
                  onChange={(e) => setNewTagCategory(e.target.value)}
                  style={styles.categoryInput}
                >
                  <option value="">选择分类（可选）</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div style={styles.colorPicker}>
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      style={{
                        ...styles.colorOption,
                        ...(newTagColor === color && styles.colorOptionSelected),
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </div>
                <div style={styles.formActions}>
                  <button
                    type="submit"
                    style={styles.submitButton}
                    disabled={!newTagName.trim()}
                  >
                    创建
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    style={styles.cancelButton}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tag List */}
          <div style={styles.tagList}>
            {loading ? (
              <div style={styles.loading}>加载中...</div>
            ) : filteredTags.length === 0 ? (
              <div style={styles.empty}>
                {searchTerm ? '没有找到匹配的标签' : '没有可用的标签'}
              </div>
            ) : (
              Object.entries(groupedTags).map(([category, tags]) => (
                <div key={category} style={styles.categoryGroup}>
                  <div style={styles.categoryHeader}>{category}</div>
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      onClick={() => handleAddTag(tag.id)}
                      style={styles.tagOption}
                    >
                      <div
                        style={{
                          ...styles.tagOptionColor,
                          backgroundColor: tag.color,
                        }}
                      />
                      <span style={styles.tagOptionName}>{tag.name}</span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div style={styles.footer}>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={styles.createButton}
            >
              新建标签
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={styles.closeButton}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative' as const,
  },
  selectedTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    padding: '8px',
    minHeight: '40px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    backgroundColor: '#fff',
  },
  noTags: {
    fontSize: '13px',
    color: '#9ca3af',
    padding: '4px 0',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
  },
  tagName: {},
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    opacity: 0.8,
  },
  addButton: {
    padding: '4px 10px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px dashed #3b82f6',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    zIndex: 1000,
    maxHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  searchSection: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  quickCreateButton: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  createForm: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  newTagInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  categoryInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginBottom: '12px',
    backgroundColor: '#fff',
  },
  colorPicker: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  colorOption: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  colorOptionSelected: {
    borderColor: '#111827',
    transform: 'scale(1.1)',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
  },
  submitButton: {
    flex: 1,
    padding: '8px 16px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  tagList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#9ca3af',
  },
  categoryGroup: {
    marginBottom: '8px',
  },
  categoryHeader: {
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tagOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  tagOptionColor: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
  },
  tagOptionName: {
    fontSize: '14px',
    color: '#374151',
  },
  footer: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    borderTop: '1px solid #e5e7eb',
    justifyContent: 'flex-end',
  },
  createButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  closeButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default TagSelector;
