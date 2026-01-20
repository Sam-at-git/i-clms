import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContractSearch, highlightMatch } from './ContractSearch';

// Mock useContractFilters
const mockUpdateFilter = jest.fn();
const mockOnSearchChange = jest.fn();

jest.mock('../../lib/filter-hooks', () => ({
  useContractFilters: () => ({
    filters: { search: undefined },
    updateFilter: mockUpdateFilter,
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('ContractSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should render search input', () => {
    render(<ContractSearch />);

    expect(screen.getByPlaceholderText('搜索合同号、名称、客户...')).toBeInTheDocument();
  });

  it('should render with custom placeholder', () => {
    render(<ContractSearch placeholder="自定义搜索提示" />);

    expect(screen.getByPlaceholderText('自定义搜索提示')).toBeInTheDocument();
  });

  it('should update input value on change', () => {
    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '测试搜索' } });

    expect(input.value).toBe('测试搜索');
  });

  it('should call updateFilter after debounce', async () => {
    jest.useFakeTimers();

    render(<ContractSearch onSearchChange={mockOnSearchChange} />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.change(input, { target: { value: '测试搜索' } });

    // Fast-forward until all timers have been executed
    jest.advanceTimersByTime(300);

    expect(mockUpdateFilter).toHaveBeenCalledWith('测试搜索');
    expect(mockOnSearchChange).toHaveBeenCalledWith('测试搜索');

    jest.useRealTimers();
  });

  it('should show clear button when input has value', () => {
    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...') as HTMLInputElement;

    expect(screen.queryByTitle('清除搜索')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '测试' } });

    expect(screen.getByTitle('清除搜索')).toBeInTheDocument();
  });

  it('should clear input when clear button is clicked', () => {
    render(<ContractSearch onSearchChange={mockOnSearchChange} />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '测试' } });

    const clearButton = screen.getByTitle('清除搜索');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
    expect(mockUpdateFilter).toHaveBeenCalledWith(undefined);
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it('should save search to history', async () => {
    jest.useFakeTimers();

    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.change(input, { target: { value: '历史搜索项' } });

    jest.advanceTimersByTime(300);

    const stored = localStorageMock.getItem('contract_search_history');
    expect(stored).toBeDefined();

    const history = JSON.parse(stored!);
    expect(history).toHaveLength(1);
    expect(history[0].term).toBe('历史搜索项');

    jest.useRealTimers();
  });

  it('should load search history from localStorage', () => {
    const mockHistory = [
      { term: '搜索1', timestamp: Date.now() - 1000 },
      { term: '搜索2', timestamp: Date.now() - 2000 },
    ];
    localStorageMock.setItem('contract_search_history', JSON.stringify(mockHistory));

    render(<ContractSearch />);

    // Focus input to show history
    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.focus(input);

    expect(screen.getByText('搜索历史')).toBeInTheDocument();
    expect(screen.getByText('搜索1')).toBeInTheDocument();
    expect(screen.getByText('搜索2')).toBeInTheDocument();
  });

  it('should select history item', () => {
    const mockHistory = [
      { term: '历史项', timestamp: Date.now() },
    ];
    localStorageMock.setItem('contract_search_history', JSON.stringify(mockHistory));

    render(<ContractSearch onSearchChange={mockOnSearchChange} />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.focus(input);

    const historyItem = screen.getByText('历史项');
    fireEvent.click(historyItem);

    expect(mockUpdateFilter).toHaveBeenCalledWith('历史项');
    expect(mockOnSearchChange).toHaveBeenCalledWith('历史项');
  });

  it('should clear search history', () => {
    const mockHistory = [
      { term: '搜索1', timestamp: Date.now() },
      { term: '搜索2', timestamp: Date.now() },
    ];
    localStorageMock.setItem('contract_search_history', JSON.stringify(mockHistory));

    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.focus(input);

    const clearButton = screen.getByText('清除');
    fireEvent.click(clearButton);

    expect(screen.queryByText('搜索历史')).not.toBeInTheDocument();
    expect(localStorageMock.getItem('contract_search_history')).toBeNull();
  });

  it('should close history dropdown when clicking outside', () => {
    const mockHistory = [
      { term: '搜索项', timestamp: Date.now() },
    ];
    localStorageMock.setItem('contract_search_history', JSON.stringify(mockHistory));

    render(
      <div>
        <ContractSearch />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.focus(input);

    expect(screen.getByText('搜索历史')).toBeInTheDocument();

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    waitFor(() => {
      expect(screen.queryByText('搜索历史')).not.toBeInTheDocument();
    });
  });

  it('should handle Enter key', () => {
    jest.useFakeTimers();

    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.change(input, { target: { value: '测试' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    jest.advanceTimersByTime(300);

    expect(mockUpdateFilter).toHaveBeenCalledWith('测试');

    jest.useRealTimers();
  });

  it('should handle Escape key', () => {
    const mockHistory = [
      { term: '搜索项', timestamp: Date.now() },
    ];
    localStorageMock.setItem('contract_search_history', JSON.stringify(mockHistory));

    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');
    fireEvent.focus(input);

    expect(screen.getByText('搜索历史')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByText('搜索历史')).not.toBeInTheDocument();
  });

  it('should limit history to 10 items', async () => {
    jest.useFakeTimers();

    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');

    // Add 11 search items
    for (let i = 1; i <= 11; i++) {
      fireEvent.change(input, { target: { value: `搜索${i}` } });
      jest.advanceTimersByTime(300);
    }

    const stored = localStorageMock.getItem('contract_search_history');
    const history = JSON.parse(stored!);

    expect(history).toHaveLength(10);
    // First item should be the most recent search
    expect(history[0].term).toBe('搜索11');

    jest.useRealTimers();
  });

  it('should move repeated search to top of history', async () => {
    jest.useFakeTimers();

    const mockHistory = [
      { term: '旧搜索', timestamp: Date.now() - 10000 },
      { term: '重复搜索', timestamp: Date.now() - 5000 },
    ];
    localStorageMock.setItem('contract_search_history', JSON.stringify(mockHistory));

    render(<ContractSearch />);

    const input = screen.getByPlaceholderText('搜索合同号、名称、客户...');

    // Search for the same term that's already in history
    fireEvent.change(input, { target: { value: '重复搜索' } });
    jest.advanceTimersByTime(300);

    const stored = localStorageMock.getItem('contract_search_history');
    const history = JSON.parse(stored!);

    expect(history[0].term).toBe('重复搜索');
    expect(history).toHaveLength(2);

    jest.useRealTimers();
  });

  describe('highlightMatch', () => {
    it('should return original text when no query', () => {
      const result = highlightMatch('测试文本', '');
      expect(result).toBe('测试文本');
    });

    it('should return empty string when text is null', () => {
      const result = highlightMatch(null, '查询');
      expect(result).toBe('');
    });

    it('should return empty string when text is undefined', () => {
      const result = highlightMatch(undefined, '查询');
      expect(result).toBe('');
    });

    it('should highlight matching text', () => {
      const result = highlightMatch('测试合同文本', '合同');
      expect(result).toContain('<mark');
      expect(result).toContain('合同');
    });

    it('should be case insensitive', () => {
      const result = highlightMatch('TEST Contract', 'contract');
      expect(result).toContain('<mark');
      expect(result).toContain('Contract');
    });

    it('should highlight multiple matches', () => {
      const result = highlightMatch('合同A和合同B', '合同');
      const matches = (result.match(/<mark/g) || []).length;
      expect(matches).toBe(2);
    });

    it('should escape special regex characters', () => {
      const result = highlightMatch('测试(1)和[2]', '(1)');
      expect(result).toContain('<mark');
      expect(result).toContain('(1)');
    });

    it('should include proper highlight styling', () => {
      const result = highlightMatch('测试合同', '合同');
      expect(result).toContain('background-color: #fef08a');
      expect(result).toContain('padding: 0 2px');
      expect(result).toContain('border-radius: 2px');
    });
  });
});
