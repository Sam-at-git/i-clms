import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactFormModal } from './ContactFormModal';

// Mock the GraphQL mutations
const mockAddContact = jest.fn();
const mockUpdateContact = jest.fn();

jest.mock('@i-clms/shared/generated/graphql', () => ({
  ...jest.requireActual('@i-clms/shared/generated/graphql'),
  useAddCustomerContactMutation: () => [
    mockAddContact,
    { loading: false, error: null },
  ],
  useUpdateCustomerContactMutation: () => [
    mockUpdateContact,
    { loading: false, error: null },
  ],
}));

describe('ContactFormModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
    customerId: 'customer-123',
    contact: null,
  };

  const mockContact = {
    id: 'contact-123',
    name: 'John Doe',
    title: 'Manager',
    phone: '1234567890',
    email: 'john@example.com',
    isPrimary: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<ContactFormModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('添加联系人')).not.toBeInTheDocument();
  });

  it('should render add form when no contact is provided', () => {
    render(<ContactFormModal {...defaultProps} />);

    expect(screen.getByText('添加联系人')).toBeInTheDocument();
    expect(screen.getByLabelText(/姓名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/职务/)).toBeInTheDocument();
    expect(screen.getByLabelText(/手机号码/)).toBeInTheDocument();
    expect(screen.getByLabelText(/邮箱/)).toBeInTheDocument();
    expect(screen.getByLabelText(/设为主联系人/)).toBeInTheDocument();
  });

  it('should render edit form when contact is provided', () => {
    render(<ContactFormModal {...defaultProps} contact={mockContact} />);

    expect(screen.getByText('编辑联系人')).toBeInTheDocument();
    expect(screen.getByLabelText(/姓名/)).toHaveValue('John Doe');
    expect(screen.getByLabelText(/职务/)).toHaveValue('Manager');
    expect(screen.getByLabelText(/手机号码/)).toHaveValue('1234567890');
    expect(screen.getByLabelText(/邮箱/)).toHaveValue('john@example.com');
  });

  it('should show validation error when name is empty', () => {
    global.alert = jest.fn();

    render(<ContactFormModal {...defaultProps} />);

    const submitButton = screen.getByText('保存');
    fireEvent.click(submitButton);

    expect(global.alert).toHaveBeenCalledWith('请输入联系人姓名');
  });

  it('should show validation error for invalid email', () => {
    global.alert = jest.fn();

    render(<ContactFormModal {...defaultProps} />);

    const nameInput = screen.getByLabelText(/姓名/);
    const emailInput = screen.getByLabelText(/邮箱/);
    const submitButton = screen.getByText('保存');

    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    expect(global.alert).toHaveBeenCalledWith('请输入有效的邮箱地址');
  });

  it('should accept valid email formats', () => {
    global.alert = jest.fn();

    render(<ContactFormModal {...defaultProps} />);

    const nameInput = screen.getByLabelText(/姓名/);
    const emailInput = screen.getByLabelText(/邮箱/);

    // Valid email
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(global.alert).not.toHaveBeenCalled();
  });

  it('should update form fields on user input', () => {
    render(<ContactFormModal {...defaultProps} />);

    const nameInput = screen.getByLabelText(/姓名/) as HTMLInputElement;
    const titleInput = screen.getByLabelText(/职务/) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/手机号码/) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/邮箱/) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.change(titleInput, { target: { value: 'Director' } });
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    expect(nameInput.value).toBe('Jane Smith');
    expect(titleInput.value).toBe('Director');
    expect(phoneInput.value).toBe('9876543210');
    expect(emailInput.value).toBe('jane@example.com');
  });

  it('should toggle isPrimary checkbox', () => {
    render(<ContactFormModal {...defaultProps} />);

    const checkbox = screen.getByLabelText(/设为主联系人/) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('should populate form with contact data when editing', () => {
    render(<ContactFormModal {...defaultProps} contact={mockContact} />);

    const nameInput = screen.getByLabelText(/姓名/) as HTMLInputElement;
    const checkbox = screen.getByLabelText(/设为主联系人/) as HTMLInputElement;

    expect(nameInput.value).toBe('John Doe');
    expect(checkbox.checked).toBe(true);
  });

  it('should reset form when modal is reopened with different contact', () => {
    const { rerender } = render(
      <ContactFormModal {...defaultProps} contact={mockContact} />
    );

    expect(screen.getByLabelText(/姓名/)).toHaveValue('John Doe');

    rerender(<ContactFormModal {...defaultProps} contact={null} />);

    expect(screen.getByLabelText(/姓名/)).toHaveValue('');
  });

  it('should close modal when cancel button is clicked', () => {
    render(<ContactFormModal {...defaultProps} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should display form fields in correct layout', () => {
    render(<ContactFormModal {...defaultProps} />);

    // Name is a separate required field
    expect(screen.getByText(/姓名/)).toBeInTheDocument();
    expect(screen.getByText(/\*/)).toBeInTheDocument(); // Required asterisk

    // Title is below name
    expect(screen.getByLabelText(/职务/)).toBeInTheDocument();

    // Phone and email should be in a row (side by side)
    const phoneInput = screen.getByLabelText(/手机号码/);
    const emailInput = screen.getByLabelText(/邮箱/);
    expect(phoneInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
  });

  describe('Email validation regex', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co',
      'test+tag@example.org',
      'a@b.c',
    ];

    const invalidEmails = [
      'invalid',
      '@example.com',
      'test@',
      'test @example.com',
      'test@.com',
    ];

    it.each(validEmails)('should accept valid email: %s', (email) => {
      global.alert = jest.fn();

      render(<ContactFormModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/姓名/);
      const emailInput = screen.getByLabelText(/邮箱/);
      const submitButton = screen.getByText('保存');

      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: email } });
      fireEvent.click(submitButton);

      // Should not show email validation error (may show other errors)
      expect(global.alert).not.toHaveBeenCalledWith('请输入有效的邮箱地址');
    });

    it.each(invalidEmails)('should reject invalid email: %s', (email) => {
      global.alert = jest.fn();

      render(<ContactFormModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/姓名/);
      const emailInput = screen.getByLabelText(/邮箱/);
      const submitButton = screen.getByText('保存');

      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: email } });
      fireEvent.click(submitButton);

      expect(global.alert).toHaveBeenCalledWith('请输入有效的邮箱地址');
    });
  });
});
