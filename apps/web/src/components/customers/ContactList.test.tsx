import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactList } from './ContactList';

// Mock the GraphQL mutation
const mockRemoveContact = jest.fn();

jest.mock('@i-clms/shared/generated/graphql', () => ({
  ...jest.requireActual('@i-clms/shared/generated/graphql'),
  useRemoveCustomerContactMutation: () => [
    mockRemoveContact,
    { loading: false, error: null },
  ],
}));

// Mock ContactFormModal
jest.mock('./ContactFormModal', () => ({
  ContactFormModal: ({ isOpen, onClose, onSuccess }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="contact-form-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Success Modal</button>
      </div>
    );
  },
}));

describe('ContactList', () => {
  const defaultProps = {
    customerId: 'customer-123',
    contacts: [],
    onUpdate: jest.fn(),
  };

  const mockContacts = [
    {
      id: 'contact-1',
      name: 'John Doe',
      title: 'Manager',
      phone: '1234567890',
      email: 'john@example.com',
      isPrimary: true,
    },
    {
      id: 'contact-2',
      name: 'Jane Smith',
      title: 'Director',
      phone: '9876543210',
      email: 'jane@example.com',
      isPrimary: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state when no contacts', () => {
    render(<ContactList {...defaultProps} />);

    expect(screen.getByText('暂无联系人')).toBeInTheDocument();
    expect(screen.getByText('+ 添加联系人')).toBeInTheDocument();
  });

  it('should render list of contacts', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Director')).toBeInTheDocument();
  });

  it('should display primary badge for primary contact', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const primaryBadge = screen.getAllByText('主要');
    expect(primaryBadge).toHaveLength(1);
  });

  it('should display contact details', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    expect(screen.getByText('职位：Manager')).toBeInTheDocument();
    expect(screen.getByText('电话：1234567890')).toBeInTheDocument();
    expect(screen.getByText('邮箱：john@example.com')).toBeInTheDocument();
  });

  it('should open modal when add button is clicked', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const addButton = screen.getByText('+ 添加联系人');
    fireEvent.click(addButton);

    expect(screen.getByTestId('contact-form-modal')).toBeInTheDocument();
  });

  it('should open modal when edit button is clicked', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const editButtons = screen.getAllByText('编辑');
    fireEvent.click(editButtons[0]);

    expect(screen.getByTestId('contact-form-modal')).toBeInTheDocument();
  });

  it('should show confirmation dialog when delete button is clicked', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    expect(global.confirm).toHaveBeenCalledWith('确定要删除这个联系人吗？');
  });

  it('should not call removeContact when delete is cancelled', () => {
    global.confirm = jest.fn(() => false);

    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    expect(mockRemoveContact).not.toHaveBeenCalled();
  });

  it('should call removeContact when delete is confirmed', async () => {
    mockRemoveContact.mockResolvedValue({ data: { removeCustomerContact: { id: 'contact-1' } } });

    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const deleteButtons = screen.getAllByText('删除');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockRemoveContact).toHaveBeenCalledWith({
        variables: { contactId: 'contact-1' },
      });
    });
  });

  it('should call onUpdate when modal succeeds', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const addButton = screen.getByText('+ 添加联系人');
    fireEvent.click(addButton);

    const successButton = screen.getByText('Success Modal');
    fireEvent.click(successButton);

    expect(defaultProps.onUpdate).toHaveBeenCalled();
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalContact = [
      {
        id: 'contact-3',
        name: 'Bob Wilson',
        title: null,
        phone: null,
        email: null,
        isPrimary: false,
      },
    ];

    render(<ContactList {...defaultProps} contacts={minimalContact} />);

    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    // Only name should be visible for minimal contact
    expect(screen.queryByText('职位：')).not.toBeInTheDocument();
  });

  it('should display multiple contacts correctly', () => {
    render(<ContactList {...defaultProps} contacts={mockContacts} />);

    const editButtons = screen.getAllByText('编辑');
    const deleteButtons = screen.getAllByText('删除');

    expect(editButtons).toHaveLength(2);
    expect(deleteButtons).toHaveLength(2);
  });
});
