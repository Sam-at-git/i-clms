import { useState, useEffect } from 'react';
import { useContractFilters } from '../../lib/filter-hooks';
import { debounce } from '../../lib/url-helpers';

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

  useEffect(() => {
    setInputValue(filters.search || '');
  }, [filters.search]);

  // Debounced search handler
  const debouncedSearch = debounce((searchTerm: string) => {
    updateFilter('search', searchTerm || undefined);
    onSearchChange?.(searchTerm);
  }, 300);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setInputValue('');
    updateFilter('search', undefined);
    onSearchChange?.('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          style={styles.searchInput}
        />
        {inputValue && (
          <button onClick={handleClear} style={styles.clearButton} title="清除搜索">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
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
};

export default ContractSearch;
