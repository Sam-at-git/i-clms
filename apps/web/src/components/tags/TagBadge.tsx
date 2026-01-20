import type { Tag } from './TagCloud';

interface TagBadgeProps {
  tag: Tag;
  size?: 'small' | 'medium' | 'large';
  clickable?: boolean;
  onRemove?: () => void;
  showCount?: boolean;
  showConfidence?: boolean;
  style?: React.CSSProperties;
}

export function TagBadge({
  tag,
  size = 'medium',
  clickable = false,
  onRemove,
  showCount = false,
  showConfidence = false,
  style: customStyle,
}: TagBadgeProps) {
  const sizes = {
    small: {
      padding: '2px 6px',
      fontSize: '11px',
      gap: '4px',
    },
    medium: {
      padding: '4px 10px',
      fontSize: '13px',
      gap: '6px',
    },
    large: {
      padding: '6px 14px',
      fontSize: '14px',
      gap: '8px',
    },
  };

  const sizeStyle = sizes[size];

  return (
    <div
      style={{
        ...styles.badge,
        ...sizeStyle,
        backgroundColor: tag.color,
        ...(clickable && styles.clickable),
        ...customStyle,
      }}
      title={
        showConfidence && tag.confidence
          ? `${tag.name} (置信度: ${(tag.confidence * 100).toFixed(0)}%)`
          : tag.name
      }
    >
      <span style={styles.name}>{tag.name}</span>

      {showCount && tag.usageCount !== undefined && (
        <span style={styles.count}>{tag.usageCount}</span>
      )}

      {showConfidence && tag.confidence && (
        <span style={styles.confidence}>{(tag.confidence * 100).toFixed(0)}%</span>
      )}

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={styles.remove}
        >
          ✕
        </button>
      )}
    </div>
  );
}

interface TagBadgeListProps {
  tags: Tag[];
  size?: 'small' | 'medium' | 'large';
  maxTags?: number;
  removable?: boolean;
  onRemove?: (tagId: string) => void;
  showCount?: boolean;
  showConfidence?: boolean;
  layout?: 'horizontal' | 'wrap';
}

export function TagBadgeList({
  tags,
  size = 'medium',
  maxTags,
  removable = false,
  onRemove,
  showCount = false,
  showConfidence = false,
  layout = 'wrap',
}: TagBadgeListProps) {
  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
  const remainingCount = maxTags && tags.length > maxTags ? tags.length - maxTags : 0;

  return (
    <div
      style={{
        ...styles.list,
        ...(layout === 'horizontal' && styles.horizontal),
      }}
    >
      {displayTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          onRemove={removable ? () => onRemove?.(tag.id) : undefined}
          showCount={showCount}
          showConfidence={showConfidence}
        />
      ))}

      {remainingCount > 0 && (
        <div style={styles.more}>+{remainingCount} 更多</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '4px',
    color: '#fff',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  },
  clickable: {
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  name: {},
  count: {
    fontSize: '0.85em',
    opacity: 0.8,
  },
  confidence: {
    fontSize: '0.8em',
    opacity: 0.9,
    fontStyle: 'italic' as const,
  },
  remove: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '1em',
    padding: 0,
    marginLeft: '2px',
    opacity: 0.8,
  },
  list: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  horizontal: {
    flexWrap: 'nowrap',
    overflowX: 'auto' as const,
  },
  more: {
    padding: '4px 10px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
  },
};

export default TagBadge;
