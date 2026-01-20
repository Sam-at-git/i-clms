import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

const ADD_TAG = gql`
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

const REMOVE_TAG = gql`
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

const GET_AVAILABLE_TAGS = gql`
  query GetAvailableTags {
    tags {
      id
      name
      color
      enabled
    }
  }
`;

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContractTagsProps {
  contractId: string;
  tags: Tag[];
  onUpdate?: () => void;
}

export function ContractTags({ contractId, tags, onUpdate }: ContractTagsProps) {
  const [showAddTag, setShowAddTag] = useState(false);
  const [addTag] = useMutation(ADD_TAG);
  const [removeTag] = useMutation(REMOVE_TAG);

  const handleAddTag = async (tagId: string) => {
    try {
      await addTag({
        variables: { contractId, tagId },
        refetchQueries: ['GetContract'],
      });
      setShowAddTag(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTag({
        variables: { contractId, tagId },
        refetchQueries: ['GetContract'],
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>标签</h3>
        <button
          onClick={() => setShowAddTag(!showAddTag)}
          style={styles.addButton}
        >
          + 添加标签
        </button>
      </div>

      <div style={styles.tagsList}>
        {tags.length === 0 ? (
          <div style={styles.empty}>暂无标签</div>
        ) : (
          tags.map((tag) => (
            <span
              key={tag.id}
              style={{
                ...styles.tag,
                backgroundColor: tag.color || '#3b82f6',
              }}
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                style={styles.removeButton}
                title="移除标签"
              >
                ✕
              </button>
            </span>
          ))
        )}
      </div>

      {showAddTag && (
        <AddTagForm
          contractId={contractId}
          currentTagIds={tags.map((t) => t.id)}
          onAdd={handleAddTag}
          onClose={() => setShowAddTag(false)}
        />
      )}
    </div>
  );
}

interface AddTagFormProps {
  contractId: string;
  currentTagIds: string[];
  onAdd: (tagId: string) => void;
  onClose: () => void;
}

function AddTagForm({ contractId, currentTagIds, onAdd, onClose }: AddTagFormProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // This would normally use the GET_AVAILABLE_TAGS query
  // For now, we'll mock it
  useState(() => {
    setLoading(true);
    // TODO: Fetch available tags
    setLoading(false);
  });

  const availableTagsFiltered = availableTags.filter(
    (tag) => !currentTagIds.includes(tag.id)
  );

  return (
    <div style={formStyles.container}>
      <div style={formStyles.header}>
        <h4 style={formStyles.title}>选择标签</h4>
        <button onClick={onClose} style={formStyles.closeButton}>
          ✕
        </button>
      </div>

      {loading ? (
        <div style={formStyles.loading}>加载中...</div>
      ) : availableTagsFiltered.length === 0 ? (
        <div style={formStyles.empty}>没有可用的标签</div>
      ) : (
        <div style={formStyles.tagList}>
          {availableTagsFiltered.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onAdd(tag.id)}
              style={{
                ...formStyles.tagButton,
                backgroundColor: tag.color || '#3b82f6',
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
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
    color: '#374151',
    margin: 0,
  },
  addButton: {
    padding: '4px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tagsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    fontSize: '13px',
    color: '#fff',
    borderRadius: '4px',
  },
  removeButton: {
    padding: 0,
    fontSize: '12px',
    color: '#fff',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  },
  empty: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
};

const formStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '8px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
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
    color: '#374151',
    margin: 0,
  },
  closeButton: {
    padding: '4px',
    fontSize: '16px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  loading: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
  },
  empty: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '13px',
    color: '#9ca3af',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tagButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'transform 0.1s',
  },
};

export default ContractTags;
