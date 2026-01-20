import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link } from 'react-router-dom';
import { gql } from '@apollo/client';

const SEMANTIC_SEARCH_QUERY = gql`
  query SemanticSearch($query: String!, $limit: Int) {
    semanticSearch(query: $query, limit: $limit) {
      contractId
      contractNo
      name
      similarity
      highlights
    }
  }
`;

interface SemanticSearchResult {
  contractId: string;
  contractNo: string;
  name: string;
  similarity: number;
  highlights: string[];
}

interface SemanticSearchData {
  semanticSearch: SemanticSearchResult[];
}

interface SemanticSearchProps {
  placeholder?: string;
  onResultClick?: () => void;
}

export function SemanticSearch({
  placeholder = '描述你想找的合同内容，例如："包含保密条款的外包合同"',
  onResultClick,
}: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const { loading, error, data } = useQuery<SemanticSearchData>(
    SEMANTIC_SEARCH_QUERY,
    {
      variables: { query: searchTerm, limit: 10 },
      skip: !searchTerm,
      fetchPolicy: 'network-only',
    }
  );

  const results = data?.semanticSearch || [];

  const handleSearch = () => {
    if (query.trim()) {
      setSearchTerm(query);
      setHasSearched(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    setSearchTerm('');
    setHasSearched(false);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return '#10b981'; // green
    if (similarity >= 0.6) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.8) return '高度匹配';
    if (similarity >= 0.6) return '中度匹配';
    return '低度匹配';
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchBox}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          style={styles.input}
        />
        {query && (
          <button onClick={handleClear} style={styles.clearButton} type="button">
            ✕
          </button>
        )}
        <button onClick={handleSearch} style={styles.searchButton} type="button" disabled={!query.trim()}>
          搜索
        </button>
      </div>

      {/* Search tips */}
      {!hasSearched && (
        <div style={styles.tips}>
          <div style={styles.tipsTitle}>搜索提示：</div>
          <ul style={styles.tipsList}>
            <li style={styles.tipItem}>描述合同类型，如"软件开发外包合同"</li>
            <li style={styles.tipItem}>描述关键条款，如"包含保密条款"</li>
            <li style={styles.tipItem}>描述合同特征，如"长期框架协议"</li>
            <li style={styles.tipItem}>组合多个条件，如"服务类合同 + 可续签"</li>
          </ul>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span>正在智能搜索...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.error}>
          <span>⚠️ 搜索出错: {error.message}</span>
        </div>
      )}

      {/* Results */}
      {hasSearched && !loading && (
        <div style={styles.results}>
          <div style={styles.resultsHeader}>
            <span style={styles.resultsCount}>
              {results.length > 0
                ? `找到 ${results.length} 个相关合同`
                : '未找到相关合同'}
            </span>
          </div>

          {results.length === 0 ? (
            <div style={styles.empty}>
              <div style={styles.emptyIcon}>🔍</div>
              <div style={styles.emptyTitle}>未找到相关合同</div>
              <div style={styles.emptyText}>
                请尝试更换描述词汇或减少筛选条件
              </div>
            </div>
          ) : (
            <div style={styles.resultsList}>
              {results.map((result) => (
                <Link
                  key={result.contractId}
                  to={`/contracts/${result.contractId}`}
                  onClick={onResultClick}
                  style={styles.resultItem}
                >
                  <div style={styles.resultHeader}>
                    <div style={styles.resultInfo}>
                      <span style={styles.contractNo}>{result.contractNo}</span>
                      <span style={styles.contractName}>{result.name}</span>
                    </div>
                    <div
                      style={{
                        ...styles.similarityBadge,
                        backgroundColor: getSimilarityColor(result.similarity),
                      }}
                    >
                      <span style={styles.similarityValue}>
                        {(result.similarity * 100).toFixed(0)}%
                      </span>
                      <span style={styles.similarityLabel}>
                        {getSimilarityLabel(result.similarity)}
                      </span>
                    </div>
                  </div>

                  {/* Match highlights */}
                  {result.highlights && result.highlights.length > 0 && (
                    <div style={styles.highlights}>
                      <span style={styles.highlightsLabel}>匹配内容:</span>
                      {result.highlights.slice(0, 3).map((highlight, index) => (
                        <span key={index} style={styles.highlightBadge}>
                          {highlight}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    fontSize: '16px',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  searchButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  tips: {
    padding: '16px',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '8px',
  },
  tipsTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e40af',
    marginBottom: '8px',
  },
  tipsList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tipItem: {
    fontSize: '13px',
    color: '#1e3a8a',
    paddingLeft: '16px',
    position: 'relative' as const,
    '&:before': {
      content: '"•"',
      position: 'absolute' as const,
      left: 0,
      color: '#3b82f6',
    },
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 20px',
    color: '#6b7280',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    '@keyframes spin': {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
  },
  resultsCount: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '4px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  resultItem: {
    display: 'block',
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  resultInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contractNo: {
    fontSize: '12px',
    color: '#6b7280',
  },
  contractName: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#111827',
  },
  similarityBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    flexShrink: 0,
  },
  similarityValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
  },
  similarityLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  highlights: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '6px',
  },
  highlightsLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginRight: '4px',
  },
  highlightBadge: {
    padding: '2px 8px',
    fontSize: '12px',
    color: '#0369a1',
    backgroundColor: '#dbeafe',
    borderRadius: '4px',
  },
};

export default SemanticSearch;
