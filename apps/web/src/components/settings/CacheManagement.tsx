import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

interface CacheStats {
  level1: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  level2: {
    count: number;
  };
  level3: {
    count: number;
    expiredCount: number;
  };
}

interface CacheStatsResponse {
  cacheStats: CacheStats;
}

const GET_CACHE_STATS = gql`
  query GetCacheStats {
    cacheStats {
      level1 {
        size
        hits
        misses
        hitRate
      }
      level2 {
        count
      }
      level3 {
        count
        expiredCount
      }
    }
  }
`;

const CLEAR_ALL_CACHE = gql`
  mutation ClearAllCache {
    clearAllCache
  }
`;

const CLEAN_EXPIRED_CACHE = gql`
  mutation CleanExpiredCache {
    cleanExpiredCache
  }
`;

export function CacheManagement() {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery<CacheStatsResponse>(GET_CACHE_STATS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 10000, // Auto-refresh every 10 seconds
  });

  const [clearAllCache] = useMutation<{ clearAllCache: boolean }>(CLEAR_ALL_CACHE, {
    onCompleted: () => {
      setSuccess('所有缓存已清空');
      setTimeout(() => setSuccess(''), 3000);
      refetch();
    },
    onError: (err) => {
      setError(err.message || '清空缓存失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const [cleanExpiredCache] = useMutation<{ cleanExpiredCache: string }>(CLEAN_EXPIRED_CACHE, {
    onCompleted: (data) => {
      setSuccess(data.cleanExpiredCache);
      setTimeout(() => setSuccess(''), 5000);
      refetch();
    },
    onError: (err) => {
      setError(err.message || '清理失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleClearAll = async () => {
    if (window.confirm('确定要清空所有缓存吗？这将清除所有内存缓存。')) {
      setError('');
      setSuccess('');
      await clearAllCache();
    }
  };

  const handleCleanExpired = async () => {
    setError('');
    setSuccess('');
    await cleanExpiredCache();
  };

  const stats = data?.cacheStats;
  const l1HitRate = stats ? ((stats.level1.hits / (stats.level1.hits + stats.level1.misses)) * 100).toFixed(2) : '0.00';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>缓存管理</h2>
        <button
          onClick={handleRefresh}
          style={{ ...styles.refreshButton, ...(refreshing ? styles.refreshButtonDisabled : {}) }}
          disabled={refreshing}
        >
          {refreshing ? '刷新中...' : '刷新'}
        </button>
      </div>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.cacheGrid}>
        {/* L1 Cache - Memory */}
        <div style={styles.cacheCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>L1 内存缓存</h3>
            <span style={styles.cardBadge}>快速</span>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>缓存条目</span>
              <span style={styles.statValue}>{stats?.level1.size || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>命中次数</span>
              <span style={styles.statValue}>{stats?.level1.hits || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>未命中次数</span>
              <span style={styles.statValue}>{stats?.level1.misses || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>命中率</span>
              <span style={{
                ...styles.statValue,
                ...styles.hitRate,
                color: parseFloat(l1HitRate) > 70 ? '#166534' : parseFloat(l1HitRate) > 40 ? '#ca8a04' : '#dc2626',
              }}>
                {l1HitRate}%
              </span>
            </div>
          </div>
          <div style={styles.cardFooter}>
            <div style={styles.description}>
              文档指纹缓存，存储在内存中，速度最快但容量有限
            </div>
          </div>
        </div>

        {/* L2 Cache - Embedding */}
        <div style={styles.cacheCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>L2 向量缓存</h3>
            <span style={styles.cardBadge}>持久化</span>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>缓存条目</span>
              <span style={styles.statValue}>{stats?.level2.count || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>存储位置</span>
              <span style={styles.statValue}>PostgreSQL</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>用途</span>
              <span style={styles.statValue}>Embedding向量</span>
            </div>
          </div>
          <div style={styles.cardFooter}>
            <div style={styles.description}>
              嵌入向量缓存，存储在数据库中，持久化保存
            </div>
          </div>
        </div>

        {/* L3 Cache - LLM Results */}
        <div style={styles.cacheCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>L3 LLM结果缓存</h3>
            <span style={styles.cardBadge}>持久化</span>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>缓存条目</span>
              <span style={styles.statValue}>{stats?.level3.count || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>过期条目</span>
              <span style={styles.statValue}>{stats?.level3.expiredCount || 0}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>存储位置</span>
              <span style={styles.statValue}>PostgreSQL</span>
            </div>
          </div>
          <div style={styles.cardFooter}>
            <div style={styles.description}>
              LLM解析结果缓存，避免重复解析相同文档
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleCleanExpired}
          style={styles.primaryButton}
        >
          清理过期缓存
        </button>
        <button
          onClick={handleClearAll}
          style={styles.dangerButton}
        >
          清空所有缓存
        </button>
      </div>

      {/* Help */}
      <div style={styles.helpBox}>
        <h4 style={styles.helpTitle}>缓存说明</h4>
        <ul style={styles.helpList}>
          <li><strong>L1 内存缓存</strong>: 最快的缓存层，存储在应用内存中，重启后清空</li>
          <li><strong>L2 向量缓存</strong>: 存储嵌入向量，避免重复计算相同文档的向量</li>
          <li><strong>L3 LLM结果缓存</strong>: 缓存LLM解析结果，相同文档无需重复调用LLM</li>
          <li><strong>清理过期缓存</strong>: 清除已过期的缓存条目，释放数据库空间</li>
          <li><strong>清空所有缓存</strong>: 清除所有内存缓存（不会清除数据库中的持久化缓存）</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  refreshButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  cacheGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  cacheCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  cardBadge: {
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  cardBody: {
    padding: '20px',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  statValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  hitRate: {
    fontSize: '16px',
  },
  cardFooter: {
    padding: '16px 20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  description: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  primaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  dangerButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #dc2626',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#dc2626',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  helpBox: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  helpTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 12px 0',
  },
  helpList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.8',
  },
};

export default CacheManagement;
