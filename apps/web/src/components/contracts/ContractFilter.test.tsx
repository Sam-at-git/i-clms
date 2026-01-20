import { render, screen, fireEvent } from '@testing-library/react';
import { ContractFilter } from './ContractFilter';

// Mock the filter hooks
const mockUpdateFilter = jest.fn();
const mockClearFilters = jest.fn();
const mockHasActiveFilters = jest.fn(() => false);
const mockGetFilterCount = jest.fn(() => 0);

jest.mock('../../lib/filter-hooks', () => ({
  useContractFilters: () => ({
    filters: {
      types: [],
      statuses: [],
      customerId: undefined,
      departmentId: undefined,
      signedAfter: undefined,
      signedBefore: undefined,
      minAmount: undefined,
      maxAmount: undefined,
      search: undefined,
    },
    updateFilter: mockUpdateFilter,
    clearFilters: mockClearFilters,
    hasActiveFilters: mockHasActiveFilters,
    getFilterCount: mockGetFilterCount,
  }),
}));

// Mock Apollo useQuery
jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(() => ({
    data: {
      customers: {
        items: [
          { id: '1', name: 'Customer A', shortName: 'CustA' },
          { id: '2', name: 'Customer B', shortName: 'CustB' },
        ],
      },
      departments: [
        { id: '1', name: '销售部门', code: 'SALES' },
        { id: '2', name: '交付部门', code: 'DELIVERY' },
      ],
    },
    loading: false,
  })),
}));

jest.mock('@apollo/client', () => ({
  gql: jest.fn(() => ({})),
}));

describe('ContractFilter', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filter toggle button', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('筛选')).toBeInTheDocument();
  });

  it('should expand filters when toggle button is clicked', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    const toggleButton = screen.getByText('筛选');
    fireEvent.click(toggleButton);

    expect(screen.getByText('合同类型')).toBeInTheDocument();
    expect(screen.getByText('合同状态')).toBeInTheDocument();
  });

  it('should render all contract type options', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByText('筛选'));

    expect(screen.getByText('人力框架')).toBeInTheDocument();
    expect(screen.getByText('项目外包')).toBeInTheDocument();
    expect(screen.getByText('产品购销')).toBeInTheDocument();
  });

  it('should render all contract status options', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByText('筛选'));

    expect(screen.getByText('草拟')).toBeInTheDocument();
    expect(screen.getByText('审批中')).toBeInTheDocument();
    expect(screen.getByText('已生效')).toBeInTheDocument();
    expect(screen.getByText('执行中')).toBeInTheDocument();
    expect(screen.getByText('已完结')).toBeInTheDocument();
    expect(screen.getByText('已终止')).toBeInTheDocument();
    expect(screen.getByText('已过期')).toBeInTheDocument();
  });

  it('should render customer dropdown', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByText('筛选'));

    expect(screen.getByText('客户')).toBeInTheDocument();
    expect(screen.getByText('全部客户')).toBeInTheDocument();
  });

  it('should render department dropdown', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByText('筛选'));

    expect(screen.getByText('部门')).toBeInTheDocument();
    expect(screen.getByText('全部部门')).toBeInTheDocument();
  });

  it('should render date range inputs', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByText('筛选'));

    expect(screen.getByText('签订日期')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('开始日期')).toHaveLength(1);
    expect(screen.getAllByPlaceholderText('结束日期')).toHaveLength(1);
  });

  it('should render amount range inputs', () => {
    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    fireEvent.click(screen.getByText('筛选'));

    expect(screen.getByText('金额范围 (¥)')).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('最小金额')).toHaveLength(1);
    expect(screen.getAllByPlaceholderText('最大金额')).toHaveLength(1);
  });

  it('should show filter count when filters are active', () => {
    mockGetFilterCount.mockReturnValue(3);
    mockHasActiveFilters.mockReturnValue(true);

    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show clear button when filters are active', () => {
    mockHasActiveFilters.mockReturnValue(true);

    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    expect(screen.getByText('清除筛选')).toBeInTheDocument();
  });

  it('should call clearFilters when clear button is clicked', () => {
    mockHasActiveFilters.mockReturnValue(true);

    render(<ContractFilter onFilterChange={mockOnFilterChange} />);

    const clearButton = screen.getByText('清除筛选');
    fireEvent.click(clearButton);

    expect(mockClearFilters).toHaveBeenCalled();
  });

  describe('Type filtering', () => {
    it('should handle type checkbox changes', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const typeCheckbox = screen.getAllByRole('checkbox').find(
        (cb) => cb.parentElement?.textContent === '人力框架'
      );

      if (typeCheckbox) {
        fireEvent.click(typeCheckbox);
        expect(mockUpdateFilter).toHaveBeenCalledWith('types', ['STAFF_AUGMENTATION']);
      }
    });

    it('should toggle type selection', () => {
      // Mock that STAFF_AUGMENTATION is already selected
      (require('../../lib/filter-hooks').useContractFilters as jest.Mock).mockReturnValue({
        filters: {
          types: ['STAFF_AUGMENTATION'],
          statuses: [],
          customerId: undefined,
          departmentId: undefined,
          signedAfter: undefined,
          signedBefore: undefined,
          minAmount: undefined,
          maxAmount: undefined,
          search: undefined,
        },
        updateFilter: mockUpdateFilter,
        clearFilters: mockClearFilters,
        hasActiveFilters: mockHasActiveFilters,
        getFilterCount: mockGetFilterCount,
      });

      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const typeCheckbox = screen.getAllByRole('checkbox').find(
        (cb) => cb.parentElement?.textContent === '人力框架'
      );

      if (typeCheckbox) {
        fireEvent.click(typeCheckbox);
        expect(mockUpdateFilter).toHaveBeenCalledWith('types', undefined);
      }
    });
  });

  describe('Status filtering', () => {
    it('should handle status checkbox changes', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const statusCheckbox = screen.getAllByRole('checkbox').find(
        (cb) => cb.parentElement?.textContent === '草拟'
      );

      if (statusCheckbox) {
        fireEvent.click(statusCheckbox);
        expect(mockUpdateFilter).toHaveBeenCalledWith('statuses', ['DRAFT']);
      }
    });
  });

  describe('Customer filtering', () => {
    it('should handle customer selection', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const customerSelect = screen.getByDisplayValue('全部客户') as HTMLSelectElement;

      fireEvent.change(customerSelect, { target: { value: '1' } });

      expect(mockUpdateFilter).toHaveBeenCalledWith('customerId', '1');
    });
  });

  describe('Department filtering', () => {
    it('should handle department selection', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const deptSelect = screen.getByDisplayValue('全部部门') as HTMLSelectElement;

      fireEvent.change(deptSelect, { target: { value: '1' } });

      expect(mockUpdateFilter).toHaveBeenCalledWith('departmentId', '1');
    });
  });

  describe('Date range filtering', () => {
    it('should handle signedAfter date change', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const dateInput = screen.getAllByPlaceholderText('开始日期')[0];
      fireEvent.change(dateInput, { target: { value: '2024-01-01' } });

      expect(mockUpdateFilter).toHaveBeenCalledWith('signedAfter', '2024-01-01');
    });

    it('should handle signedBefore date change', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const dateInput = screen.getAllByPlaceholderText('结束日期')[0];
      fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

      expect(mockUpdateFilter).toHaveBeenCalledWith('signedBefore', '2024-12-31');
    });
  });

  describe('Amount range filtering', () => {
    it('should handle minAmount change', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const amountInput = screen.getAllByPlaceholderText('最小金额')[0];
      fireEvent.change(amountInput, { target: { value: '100000' } });

      expect(mockUpdateFilter).toHaveBeenCalledWith('minAmount', 100000);
    });

    it('should handle maxAmount change', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const amountInput = screen.getAllByPlaceholderText('最大金额')[0];
      fireEvent.change(amountInput, { target: { value: '500000' } });

      expect(mockUpdateFilter).toHaveBeenCalledWith('maxAmount', 500000);
    });

    it('should handle clearing amount input', () => {
      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByText('筛选'));

      const amountInput = screen.getAllByPlaceholderText('最小金额')[0];
      fireEvent.change(amountInput, { target: { value: '' } });

      expect(mockUpdateFilter).toHaveBeenCalledWith('minAmount', undefined);
    });
  });

  describe('Filter combinations', () => {
    it('should handle multiple active filters', () => {
      (require('../../lib/filter-hooks').useContractFilters as jest.Mock).mockReturnValue({
        filters: {
          types: ['STAFF_AUGMENTATION'],
          statuses: ['ACTIVE'],
          customerId: '1',
          departmentId: undefined,
          signedAfter: '2024-01-01',
          signedBefore: undefined,
          minAmount: 100000,
          maxAmount: undefined,
          search: undefined,
        },
        updateFilter: mockUpdateFilter,
        clearFilters: mockClearFilters,
        hasActiveFilters: () => true,
        getFilterCount: () => 4,
      });

      render(<ContractFilter onFilterChange={mockOnFilterChange} />);

      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});
