import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApolloError } from '@apollo/client';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerStatus } from '@i-clms/shared/generated/graphql';

// Mock the GraphQL mutations
jest.mock('@i-clms/shared/generated/graphql', () => ({
  CustomerStatus: {
    Active: 'ACTIVE',
    Inactive: 'INACTIVE',
    Archived: 'ARCHIVED',
  },
  useCreateCustomerMutation: () => [
    jest.fn(),
    { loading: false, error: null },
  ],
  useUpdateCustomerMutation: () => [
    jest.fn(),
    { loading: false, error: null },
  ],
}));

describe('CustomerFormModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    customer: null,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<CustomerFormModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('新建客户')).not.toBeInTheDocument();
  });

  it('should render create form when no customer is provided', () => {
    render(<CustomerFormModal {...defaultProps} />);

    expect(screen.getByText('新建客户')).toBeInTheDocument();
    expect(screen.getByLabelText(/客户名称/)).toBeInTheDocument();
    expect(screen.getByLabelText(/简称/)).toBeInTheDocument();
    expect(screen.getByLabelText(/信用代码/)).toBeInTheDocument();
    expect(screen.getByLabelText(/所属行业/)).toBeInTheDocument();
    expect(screen.getByLabelText(/客户地址/)).toBeInTheDocument();
  });

  it('should render edit form when customer is provided', () => {
    const customer = {
      id: '123',
      name: 'Test Customer',
      shortName: 'TC',
      creditCode: '123456',
      industry: 'IT/互联网',
      address: 'Test Address',
      status: CustomerStatus.Active,
    };

    render(<CustomerFormModal {...defaultProps} customer={customer} />);

    expect(screen.getByText('编辑客户')).toBeInTheDocument();
    expect(screen.getByLabelText(/客户名称/)).toHaveValue('Test Customer');
    expect(screen.getByLabelText(/简称/)).toHaveValue('TC');
  });

  it('should show validation error when name is empty', () => {
    global.alert = jest.fn();

    render(<CustomerFormModal {...defaultProps} />);

    const submitButton = screen.getByText('创建');
    const nameInput = screen.getByLabelText(/客户名称/);

    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(submitButton);

    expect(global.alert).toHaveBeenCalledWith('请输入客户名称');
  });

  it('should populate form fields when customer data changes', () => {
    const customer = {
      id: '123',
      name: 'Updated Customer',
      shortName: 'UC',
      creditCode: '654321',
      industry: '金融',
      address: 'Updated Address',
      status: CustomerStatus.Active,
    };

    const { rerender } = render(<CustomerFormModal {...defaultProps} customer={null} />);
    rerender(<CustomerFormModal {...defaultProps} customer={customer} />);

    expect(screen.getByLabelText(/客户名称/)).toHaveValue('Updated Customer');
    expect(screen.getByLabelText(/简称/)).toHaveValue('UC');
  });

  it('should reset form when modal closes and reopens without customer', () => {
    const customer = {
      id: '123',
      name: 'Test Customer',
      shortName: 'TC',
      creditCode: '123456',
      industry: 'IT/互联网',
      address: 'Test Address',
      status: CustomerStatus.Active,
    };

    const { rerender } = render(<CustomerFormModal {...defaultProps} customer={customer} />);
    expect(screen.getByLabelText(/客户名称/)).toHaveValue('Test Customer');

    rerender(<CustomerFormModal {...defaultProps} isOpen={false} />);
    rerender(<CustomerFormModal {...defaultProps} isOpen={true} customer={null} />);

    expect(screen.getByLabelText(/客户名称/)).toHaveValue('');
  });

  it('should close modal when cancel button is clicked', () => {
    render(<CustomerFormModal {...defaultProps} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should show industry options correctly', () => {
    render(<CustomerFormModal {...defaultProps} />);

    const industrySelect = screen.getByLabelText(/所属行业/);
    expect(industrySelect).toBeInTheDocument();

    const options = industrySelect.querySelectorAll('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options[0]).toHaveValue('');
  });

  it('should show status field only when editing', () => {
    const customer = {
      id: '123',
      name: 'Test Customer',
      shortName: 'TC',
      creditCode: '123456',
      industry: 'IT/互联网',
      address: 'Test Address',
      status: CustomerStatus.Active,
    };

    // Create mode - no status field
    const { rerender } = render(<CustomerFormModal {...defaultProps} customer={null} />);
    expect(screen.queryByLabelText(/状态/)).not.toBeInTheDocument();

    // Edit mode - status field should be visible
    rerender(<CustomerFormModal {...defaultProps} customer={customer} />);
    expect(screen.getByLabelText(/状态/)).toBeInTheDocument();
  });
});
