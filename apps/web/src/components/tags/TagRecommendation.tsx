import { useState, useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import type { Tag } from './TagCloud';

interface RecommendedTag extends Tag {
  confidence: number;
  reason?: string;
}

const GET_RECOMMENDED_TAGS = gql`
  query GetRecommendedTags($contractId: ID!) {
    getRecommendedTags(contractId: $contractId) {
      id
      name
      color
      category
      confidence
      reason
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

interface TagRecommendationProps {
  contractId: string;
  selectedTagIds?: Set<string>;
  onAddTag?: (tag: Tag) => void;
  confidenceThreshold?: number;
  maxRecommendations?: number;
  showReason?: boolean;
}

export function TagRecommendation({
  contractId,
  selectedTagIds = new Set(),
  onAddTag,
  confidenceThreshold = 0.5,
  maxRecommendations = 10,
  showReason = true,
}: TagRecommendationProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_RECOMMENDED_TAGS, {
    variables: { contractId },
    fetchPolicy: 'cache-and-network',
    skip: !contractId,
  });

  const [addTagMutation] = useMutation(ADD_TAG_TO_CONTRACT, {
    onCompleted: (data: any) => {
      onAddTag?.(data.addTagToContract.tags[0]);
    },
  });

  const recommendations = useMemo(() => {
    const allRecs = ((data as any)?.getRecommendedTags || []) as RecommendedTag[];

    // Filter out already selected and dismissed tags
    const filtered = allRecs.filter(
      (rec) =>
        !selectedTagIds.has(rec.id) &&
        !dismissed.has(rec.id) &&
        rec.confidence >= confidenceThreshold
    );

    // Sort by confidence (highest first)
    filtered.sort((a, b) => b.confidence - a.confidence);

    // Limit to max recommendations
    return showAll ? filtered : filtered.slice(0, maxRecommendations);
  }, [data, selectedTagIds, dismissed, confidenceThreshold, showAll, maxRecommendations]);

  const handleAddTag = async (tagId: string) => {
    try {
      await addTagMutation({ variables: { contractId, tagId } });
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleDismiss = (tagId: string) => {
    setDismissed((prev) => new Set(prev).add(tagId));
  };

  const handleDismissAll = () => {
    setDismissed((prev) => {
      const newSet = new Set(prev);
      recommendations.forEach((rec) => newSet.add(rec.id));
      return newSet;
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10b981'; // green
    if (confidence >= 0.6) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return '高';
    if (confidence >= 0.6) return '中';
    return '低';
  };

  if (error) {
    return (
      <div style={styles.error}>
        <span style={styles.errorIcon}>⚠️</span>
        无法加载推荐标签
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <span>分析中...</span>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>💡</div>
        <div style={styles.emptyText}>暂无推荐标签</div>
      </div>
    );
  }

  const hasMore = (data as any)?.getRecommendedTags?.length > recommendations.length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>✨</span>
          <h3 style={styles.headerTitle}>智能推荐标签</h3>
          <span style={styles.headerCount}>({recommendations.length})</span>
        </div>
        <button
          onClick={handleDismissAll}
          style={styles.dismissAllButton}
          title="全部忽略"
        >
          忽略全部
        </button>
      </div>

      {/* Recommendations */}
      <div style={styles.list}>
        {recommendations.map((rec) => (
          <div key={rec.id} style={styles.item}>
            {/* Tag Badge */}
            <div
              style={{
                ...styles.tagBadge,
                backgroundColor: rec.color,
              }}
            >
              <span style={styles.tagName}>{rec.name}</span>
            </div>

            {/* Confidence */}
            <div style={styles.confidenceSection}>
              <div style={styles.confidenceLabel}>置信度:</div>
              <div
                style={{
                  ...styles.confidenceBar,
                  backgroundColor: `${getConfidenceColor(rec.confidence)}20`,
                }}
              >
                <div
                  style={{
                    ...styles.confidenceFill,
                    width: `${rec.confidence * 100}%`,
                    backgroundColor: getConfidenceColor(rec.confidence),
                  }}
                />
              </div>
              <div
                style={{
                  ...styles.confidenceValue,
                  color: getConfidenceColor(rec.confidence),
                }}
              >
                {getConfidenceLabel(rec.confidence)} ({(rec.confidence * 100).toFixed(0)}%)
              </div>
            </div>

            {/* Reason */}
            {showReason && rec.reason && (
              <div style={styles.reason}>
                <span style={styles.reasonIcon}>💭</span>
                <span style={styles.reasonText}>{rec.reason}</span>
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button
                onClick={() => handleAddTag(rec.id)}
                style={styles.addButton}
              >
                添加
              </button>
              <button
                onClick={() => handleDismiss(rec.id)}
                style={styles.dismissButton}
              >
                忽略
              </button>
            </div>
          </div>
        ))}

        {/* Show More */}
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            style={styles.showMoreButton}
          >
            显示更多 ({(data as any)?.getRecommendedTags?.length - recommendations.length})
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerIcon: {
    fontSize: '18px',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  headerCount: {
    fontSize: '14px',
    color: '#6b7280',
  },
  dismissAllButton: {
    padding: '4px 10px',
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  item: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
  },
  tagBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    marginBottom: '8px',
  },
  tagName: {},
  confidenceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  confidenceLabel: {
    fontSize: '12px',
    color: '#6b7280',
    minWidth: '60px',
  },
  confidenceBar: {
    flex: 1,
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  confidenceValue: {
    fontSize: '12px',
    fontWeight: 600,
    minWidth: '80px',
    textAlign: 'right' as const,
  },
  reason: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  reasonIcon: {
    flexShrink: 0,
  },
  reasonText: {
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  addButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
  },
  dismissButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  showMoreButton: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    border: '1px dashed #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '32px',
    color: '#9ca3af',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
  },
  empty: {
    padding: '32px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  error: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
  },
  errorIcon: {
    marginRight: '6px',
  },
};

export default TagRecommendation;
