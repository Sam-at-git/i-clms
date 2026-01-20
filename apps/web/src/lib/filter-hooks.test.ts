import { renderHook, act, waitFor } from '@testing-library/react';
import { useContractFilters, ContractFilters } from './filter-hooks';

// Mock useSearchParams
const mockSetSearchParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [
    new URLSearchParams(),
    mockSetSearchParams,
  ],
}));

describe('useContractFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty filters', () => {
    const { result } = renderHook(() => useContractFilters());

    expect(result.current.filters).toEqual({});
  });

  it('should initialize filters from URL params', () => {
    (require('react-router-dom').useSearchParams as jest.Mock).mockReturnValue([
      new URLSearchParams({
        types: 'STAFF_AUGMENTATION,PROJECT_OUTSOURCING',
        statuses: 'ACTIVE',
        customerId: 'customer-123',
        minAmount: '100000',
      }),
      mockSetSearchParams,
    ]);

    const { result } = renderHook(() => useContractFilters());

    expect(result.current.filters.types).toEqual(['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING']);
    expect(result.current.filters.statuses).toEqual(['ACTIVE']);
    expect(result.current.filters.customerId).toBe('customer-123');
    expect(result.current.filters.minAmount).toBe(100000);
  });

  it('should update a single filter', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('types', ['STAFF_AUGMENTATION']);
    });

    expect(result.current.filters.types).toEqual(['STAFF_AUGMENTATION']);
  });

  it('should update customerId filter', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('customerId', 'customer-123');
    });

    expect(result.current.filters.customerId).toBe('customer-123');
  });

  it('should update date range filters', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('signedAfter', '2024-01-01');
      result.current.updateFilter('signedBefore', '2024-12-31');
    });

    expect(result.current.filters.signedAfter).toBe('2024-01-01');
    expect(result.current.filters.signedBefore).toBe('2024-12-31');
  });

  it('should update amount range filters', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('minAmount', 100000);
      result.current.updateFilter('maxAmount', 500000);
    });

    expect(result.current.filters.minAmount).toBe(100000);
    expect(result.current.filters.maxAmount).toBe(500000);
  });

  it('should clear all filters', () => {
    const { result } = renderHook(() => useContractFilters());

    // Set some filters
    act(() => {
      result.current.updateFilter('types', ['STAFF_AUGMENTATION']);
      result.current.updateFilter('customerId', 'customer-123');
    });

    expect(result.current.filters.types).toBeDefined();
    expect(result.current.filters.customerId).toBeDefined();

    // Clear filters
    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
  });

  it('should correctly identify active filters', () => {
    const { result } = renderHook(() => useContractFilters());

    expect(result.current.hasActiveFilters()).toBe(false);

    act(() => {
      result.current.updateFilter('types', ['STAFF_AUGMENTATION']);
    });

    expect(result.current.hasActiveFilters()).toBe(true);
  });

  it('should return 0 filter count when no filters', () => {
    const { result } = renderHook(() => useContractFilters());

    expect(result.current.getFilterCount()).toBe(0);
  });

  it('should count active filters correctly', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('types', ['STAFF_AUGMENTATION']);
      result.current.updateFilter('statuses', ['ACTIVE']);
      result.current.updateFilter('customerId', 'customer-123');
    });

    expect(result.current.getFilterCount()).toBe(3);
  });

  it('should count array filter as one even with multiple values', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('types', ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING']);
    });

    expect(result.current.getFilterCount()).toBe(1);
  });

  it('should sync filters to URL', async () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('types', ['STAFF_AUGMENTATION']);
      result.current.updateFilter('statuses', ['ACTIVE']);
    });

    await waitFor(() => {
      expect(mockSetSearchParams).toHaveBeenCalledWith({
        types: 'STAFF_AUGMENTATION',
        statuses: 'ACTIVE',
      });
    });
  });

  it('should handle undefined values correctly', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('customerId', undefined);
      result.current.updateFilter('minAmount', undefined);
    });

    expect(result.current.hasActiveFilters()).toBe(false);
  });

  it('should handle empty arrays correctly', () => {
    const { result } = renderHook(() => useContractFilters());

    act(() => {
      result.current.updateFilter('types', []);
    });

    // Empty arrays should not count as active
    expect(result.current.hasActiveFilters()).toBe(false);
  });

  describe('URL parameter encoding', () => {
    it('should encode array filters as comma-separated values', async () => {
      const { result } = renderHook(() => useContractFilters());

      act(() => {
        result.current.updateFilter('types', ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING']);
      });

      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(
          expect.objectContaining({
            types: 'STAFF_AUGMENTATION,PROJECT_OUTSOURCING',
          })
        );
      });
    });

    it('should encode numbers as strings', async () => {
      const { result } = renderHook(() => useContractFilters());

      act(() => {
        result.current.updateFilter('minAmount', 100000);
      });

      await waitFor(() => {
        expect(mockSetSearchParams).toHaveBeenCalledWith(
          expect.objectContaining({
            minAmount: '100000',
          })
        );
      });
    });
  });

  describe('Search filter', () => {
    it('should handle search keyword', () => {
      const { result } = renderHook(() => useContractFilters());

      act(() => {
        result.current.updateFilter('search', 'test keyword');
      });

      expect(result.current.filters.search).toBe('test keyword');
      expect(result.current.hasActiveFilters()).toBe(true);
    });
  });
});
