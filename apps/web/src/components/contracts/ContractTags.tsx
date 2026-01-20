import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GetAvailableTagsDocument,
  AssignTagsToContractDocument,
  RemoveTagFromContractDocument,
  GetAvailableTagsQuery,
} from '@i-clms/shared/generated/graphql';

interface Tag {
  id: string;
  name: string;
  category: string;
  color: string;
  isActive: boolean;
  isSystem: boolean;
}

interface ContractTagsProps {
  contractId: string;
  tags?: Tag[];
  onUpdate?: () => void;
}

export function ContractTags({ contractId, tags = [], onUpdate }: ContractTagsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(tags.map((t) => t.id))
  );

  // Fetch available tags
  const { data: tagsData, loading: tagsLoading, refetch } = useQuery<GetAvailableTagsQuery>(
    GetAvailableTagsDocument,
    {
      variables: { contractId },
      skip: !contractId,
    }
  );

  const allTags = tagsData?.tags || [];
  const contractTags = tagsData?.contract?.tags || [];
  const availableTags = allTags.filter(
    (tag: Tag) => tag.isActive && !selectedTagIds.has(tag.id)
  );

  // Assign tags mutation
  const [assignTags, { loading: assigning }] = useMutation(AssignTagsToContractDocument, {
    onCompleted: () => {
      refetch();
      onUpdate?.();
    },
  });

  // Remove tag mutation
  const [removeTag, { loading: removing }] = useMutation(RemoveTagFromContractDocument, {
    onCompleted: () => {
      refetch();
      onUpdate?.();
    },
  });

  // Update selected tags when props change
  useEffect(() => {
    setSelectedTagIds(new Set(tags.map((t) => t.id)));
  }, [tags]);

  const handleAssignTag = async (tagId: string) => {
    await assignTags({
      variables: {
        contractId,
        tagIds: [...selectedTagIds, tagId],
      },
    });
    setSelectedTagIds(new Set([...selectedTagIds, tagId]));
    setShowDropdown(false);
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTag({
      variables: {
        contractId,
        tagId,
      },
    });
    const newSelected = new Set(selectedTagIds);
    newSelected.delete(tagId);
    setSelectedTagIds(newSelected);
  };

  // Group tags by category
  const groupedTags: Record<string, Tag[]> = {};
  for (const tag of tags) {
    if (!groupedTags[tag.category]) {
      groupedTags[tag.category] = [];
    }
    groupedTags[tag.category].push(tag);
  }

  const selectedTagsList = tags.filter((t) => selectedTagIds.has(t.id));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>标签</h3>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={styles.addButton}
          disabled={assigning || removing || tagsLoading}
        >
          + 添加标签
        </button>
      </div>

      {/* Tag Dropdown */}
      {showDropdown && (
        <div style={styles.dropdown}>
          {tagsLoading ? (
            <div style={styles.loading}>加载中...</div>
          ) : availableTags.length === 0 ? (
            <div style={styles.empty}>没有可用标签</div>
          ) : (
            <ul style={styles.tagList}>
              {availableTags.map((tag: Tag) => (
                <li
                  key={tag.id}
                  style={styles.tagItem}
                  onClick={() => handleAssignTag(tag.id)}
                >
                  <span
                    style={{
                      ...styles.tagColor,
                      backgroundColor: tag.color,
                    }}
                  />
                  <span style={styles.tagName}>{tag.name}</span>
                  <span style={styles.tagCategory}>{tag.category}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Assigned Tags */}
      {selectedTagsList.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>暂无标签</p>
          <p style={styles.emptyHint}>点击"添加标签"为合同添加分类标签</p>
        </div>
      ) : (
        <div style={styles.tagsContainer}>
          {Object.entries(groupedTags).map(([category, categoryTags]) => (
            <div key={category} style={styles.categoryGroup}>
              <span style={styles.categoryLabel}>{category}</span>
              <div style={styles.categoryTags}>
                {categoryTags.map((tag) => (
                  <span
                    key={tag.id}
                    style={{
                      ...styles.tag,
                      backgroundColor: tag.color,
                      color: getContrastColor(tag.color),
                    }}
                  >
                    {tag.name}
                    {!tag.isSystem && (
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        style={styles.removeButton}
                        disabled={removing}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to determine text color based on background
function getContrastColor(hexColor: string): string {
  // Remove hash if present
  const color = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  addButton: {
    padding: '4px 12px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  dropdown: {
    position: 'relative' as const,
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '12px',
    maxHeight: '200px',
    overflow: 'auto',
    zIndex: 10,
  },
  loading: {
    padding: '12px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  empty: {
    padding: '12px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
  },
  tagList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  tagItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  tagColor: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
  },
  tagName: {
    flex: 1,
    fontSize: '14px',
    color: '#374151',
  },
  tagCategory: {
    fontSize: '11px',
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  emptyState: {
    padding: '16px 0',
    textAlign: 'center',
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
  },
  emptyHint: {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#9ca3af',
  },
  tagsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  categoryGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  categoryLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase',
    minWidth: '60px',
  },
  categoryTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: 0,
    fontSize: '12px',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
};

export default ContractTags;
