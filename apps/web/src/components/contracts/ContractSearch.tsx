import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useContractFilters } from '../../lib/filter-hooks';
import { debounce } from '../../lib/url-helpers';

const SEARCH_HISTORY_KEY = 'contract_search_history';
const MAX_HISTORY_ITEMS = 10;

interface SearchHistoryItem {
  term: string;
  timestamp: number;
}

interface ContractSearchProps {
  onSearchChange?: (search: string) => void;
  placeholder?: string;
}

export function ContractSearch({
  onSearchChange,
  placeholder = '搜索合同号、名称、客户...',
}: ContractSearchProps) {
  const { filters, updateFilter } = useContractFilters();
  const [inputValue, setInputValue] = useState(filters.search || '');
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const history: SearchHistoryItem[] = JSON.parse(stored);
        setSearchHistory(history);
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }, []);

  // Sync input with filter changes from outside
  useEffect(() => {
    setInputValue(filters.search || '');
  }, [filters.search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search handler
  const debouncedSearch = debounce((searchTerm: string) => {
    updateFilter('search', searchTerm || undefined);
    onSearchChange?.(searchTerm);

    // Add to search history if not empty and different from last search
    if (searchTerm && searchTerm.trim()) {
      addToSearchHistory(searchTerm.trim());
    }
  }, 300);

  const addToSearchHistory = (term: string) => {
    setSearchHistory((prev) => {
      // Remove if already exists
      const filtered = prev.filter((item) => item.term !== term);

      // Add new item at the beginning
      const newItem: SearchHistoryItem = {
        term,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        // Ignore localStorage errors
      }

      return updated;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setInputValue('');
    updateFilter('search', undefined);
    onSearchChange?.('');
    setShowHistory(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Trigger search immediately on Enter
      debouncedSearch(inputValue);
      setShowHistory(false);
    } else if (e.key === 'Escape') {
      setShowHistory(false);
    }
  };

  const handleFocus = () => {
    if (searchHistory.length > 0 && !inputValue) {
      setShowHistory(true);
    }
  };

  const selectHistoryItem = (term: string) => {
    setInputValue(term);
    updateFilter('search', term);
    onSearchChange?.(term);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      // Ignore localStorage errors
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          style={styles.searchInput}
          autoComplete="off"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            style={styles.clearButton}
            title="清除搜索"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search History Dropdown */}
      {showHistory && searchHistory.length > 0 && !inputValue && (
        <div style={styles.historyDropdown}>
          <div style={styles.historyHeader}>
            <span style={styles.historyTitle}>搜索历史</span>
            <button
              onClick={clearHistory}
              style={styles.clearHistoryButton}
              type="button"
            >
              清除
            </button>
          </div>
          <ul style={styles.historyList}>
            {searchHistory.map((item) => (
              <li
                key={`${item.term}-${item.timestamp}`}
                style={styles.historyItem}
                onClick={() => selectHistoryItem(item.term)}
              >
                <span style={styles.historyIcon}>🕐</span>
                <span style={styles.historyTerm}>{item.term}</span>
                <span style={styles.historyTime}>
                  {formatTimestamp(item.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
    position: 'relative' as const,
  },
  searchWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    fontSize: '16px',
    color: '#9ca3af',
    pointerEvents: 'none' as const,
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    padding: '10px 40px 10px 40px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  clearButton: {
    position: 'absolute' as const,
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    padding: 0,
    fontSize: '14px',
    color: '#9ca3af',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  historyDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 100,
    maxHeight: '300px',
    overflow: 'auto',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
  },
  historyTitle: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
  },
  clearHistoryButton: {
    padding: '2px 8px',
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  historyList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  historyIcon: {
    fontSize: '14px',
    color: '#9ca3af',
  },
  historyTerm: {
    flex: 1,
    fontSize: '14px',
    color: '#374151',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  historyTime: {
    fontSize: '11px',
    color: '#9ca3af',
    flexShrink: 0,
  },
};

/**
 * Highlight matching text in a string
 * @param text The text to highlight
 * @param query The search query to highlight
 * @returns HTML string with highlighted matches
 */
export function highlightMatch(text: string | null | undefined, query: string): string {
  if (!text || !query) return text || '';

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark style="background-color: #fef08a; padding: 0 2px; border-radius: 2px;">$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default ContractSearch;
