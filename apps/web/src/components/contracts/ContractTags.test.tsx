import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ContractTags } from './ContractTags';
import {
  GET_AVAILABLE_TAGS,
  ASSIGN_TAGS_TO_CONTRACT,
  REMOVE_TAG_FROM_CONTRACT,
} from '../../graphql/tags';

// Mock GraphQL responses
const mockTags = [
  { id: '1', name: '重要客户', category: '客户', color: '#ef4444', isActive: true, isSystem: false },
  { id: '2', name: '紧急', category: '优先级', color: '#f59e0b', isActive: true, isSystem: false },
  { id: '3', name: '长期合作', category: '关系', color: '#10b981', isActive: true, isSystem: false },
  { id: '4', name: '系统标签', category: '系统', color: '#6b7280', isActive: true, isSystem: true },
];

const mockContractTags = [mockTags[0], mockTags[2]];

const mocks = [
  {
    request: {
      query: GET_AVAILABLE_TAGS,
      variables: { contractId: 'contract-123' },
    },
    result: {
      data: {
        tags: mockTags,
        contract: {
          id: 'contract-123',
          tags: mockContractTags,
        },
      },
    },
  },
  {
    request: {
      query: ASSIGN_TAGS_TO_CONTRACT,
      variables: { contractId: 'contract-123', tagIds: ['1', '2'] },
    },
    result: {
      data: {
        assignTagsToContract: true,
      },
    },
  },
  {
    request: {
      query: REMOVE_TAG_FROM_CONTRACT,
      variables: { contractId: 'contract-123', tagId: '1' },
    },
    result: {
      data: {
        removeTagFromContract: true,
      },
    },
  },
];

describe('ContractTags', () => {
  it('should render tags section', () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={mockContractTags} />
      </MockedProvider>
    );

    expect(screen.getByText('标签')).toBeInTheDocument();
    expect(screen.getByText('+ 添加标签')).toBeInTheDocument();
  });

  it('should display assigned tags grouped by category', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={mockContractTags} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('重要客户')).toBeInTheDocument();
      expect(screen.getByText('长期合作')).toBeInTheDocument();
    });
  });

  it('should show empty state when no tags assigned', () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={[]} />
      </MockedProvider>
    );

    expect(screen.getByText('暂无标签')).toBeInTheDocument();
    expect(screen.getByText('点击"添加标签"为合同添加分类标签')).toBeInTheDocument();
  });

  it('should open dropdown when add button is clicked', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={mockContractTags} />
      </MockedProvider>
    );

    const addButton = screen.getByText('+ 添加标签');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('紧急')).toBeInTheDocument();
    });
  });

  it('should close dropdown when clicking add button again', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={mockContractTags} />
      </MockedProvider>
    );

    const addButton = screen.getByText('+ 添加标签');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('紧急')).toBeInTheDocument();
    });

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.queryByText('紧急')).not.toBeInTheDocument();
    });
  });

  it('should call assignTags mutation when tag is selected', async () => {
    const assignTagsMock = jest.fn(() => Promise.resolve());

    render(
      <MockedProvider mocks={[...mocks]}>
        <ContractTags contractId="contract-123" tags={mockContractTags} />
      </MockedProvider>
    );

    const addButton = screen.getByText('+ 添加标签');
    fireEvent.click(addButton);

    await waitFor(() => {
      const emergencyTag = screen.getAllByText('紧急')[1];
      fireEvent.click(emergencyTag);
    });
  });

  it('should not show system tags in available tags', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={[]} />
      </MockedProvider>
    );

    const addButton = screen.getByText('+ 添加标签');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.queryByText('系统标签')).not.toBeInTheDocument();
    });
  });

  it('should disable remove button for system tags', async () => {
    const systemTag = mockTags[3];
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={[systemTag]} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('系统标签')).toBeInTheDocument();
    });
  });

  it('should show category labels for grouped tags', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ContractTags contractId="contract-123" tags={mockContractTags} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('客户')).toBeInTheDocument();
      expect(screen.getByText('关系')).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    const loadingMocks = [
      {
        request: {
          query: GET_AVAILABLE_TAGS,
          variables: { contractId: 'contract-123' },
        },
        result: {
          data: {
            tags: mockTags,
            contract: {
              id: 'contract-123',
              tags: mockContractTags,
            },
          },
        },
        delay: 100,
      },
    ];

    render(
      <MockedProvider mocks={loadingMocks}>
        <ContractTags contractId="contract-123" tags={mockContractTags} />
      </MockedProvider>
    );

    const addButton = screen.getByText('+ 添加标签');
    fireEvent.click(addButton);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });
});
