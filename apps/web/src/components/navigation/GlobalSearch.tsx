import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface GlobalSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function GlobalSearch({
  placeholder = '搜索合同、客户...',
  onSearch,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const searchResults = [
    { label: '合同管理', path: '/contracts', type: '页面' },
    { label: '客户管理', path: '/customers', type: '页面' },
    { label: '财务仪表盘', path: '/finance', type: '页面' },
    { label: '交付管理', path: '/delivery', type: '页面' },
    { label: '销售管理', path: '/sales', type: '页面' },
    { label: '市场知识库', path: '/market', type: '页面' },
    { label: '法务合规', path: '/legal', type: '页面' },
    { label: '管理驾驶舱', path: '/executive', type: '页面' },
  ];

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (onSearch) {
        onSearch(searchQuery);
      } else {
        // Default search behavior: navigate to contracts with search query
        if (searchQuery.trim()) {
          navigate(`/contracts?search=${encodeURIComponent(searchQuery)}`);
        }
      }
      setIsOpen(false);
      setQuery('');
    },
    [navigate, onSearch]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const filteredResults = query.trim()
    ? searchResults.filter((result) =>
        result.label.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div style={styles.container}>
      <div style={styles.searchBox}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={styles.input}
          aria-label="全局搜索"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            style={styles.clearButton}
            aria-label="清除搜索"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (query.trim() || !query) && (
        <div style={styles.dropdown}>
          {query.trim() ? (
            filteredResults.length > 0 ? (
              filteredResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleSearch(result.label)}
                  style={styles.resultItem}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span style={styles.resultLabel}>{result.label}</span>
                  <span style={styles.resultType}>{result.type}</span>
                </div>
              ))
            ) : (
              <div style={styles.noResults}>未找到相关结果</div>
            )
          ) : (
            <div style={styles.suggestions}>
              <div style={styles.suggestionHeader}>快捷导航</div>
              {searchResults.slice(0, 5).map((result, index) => (
                <div
                  key={index}
                  onClick={() => navigate(result.path)}
                  style={styles.resultItem}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span style={styles.resultLabel}>{result.label}</span>
                  <span style={styles.resultType}>{result.type}</span>
                </div>
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
    position: 'relative',
    width: '300px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 12px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  searchIcon: {
    fontSize: '16px',
    marginRight: '8px',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#111827',
  },
  clearButton: {
    backgroundColor: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#9ca3af',
    padding: '0 4px',
    marginLeft: '4px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 1000,
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  resultLabel: {
    fontSize: '14px',
    color: '#111827',
  },
  resultType: {
    fontSize: '12px',
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  noResults: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#9ca3af',
  },
  suggestions: {
    padding: '4px 0',
  },
  suggestionHeader: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
};

export default GlobalSearch;
