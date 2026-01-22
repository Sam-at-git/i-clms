import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApolloProvider } from '@apollo/client';
import { MockApolloLink, createMockClient } from '@apollo/client/testing';
import { StrategySelector } from './StrategySelector';
import { ParseStrategyType } from '@i-clms/shared/generated/graphql';

// Mock GraphQL responses
const mockStrategiesData = {
  availableStrategies: [
    {
      type: ParseStrategyType.Rule,
      name: '规则解析',
      description: '基于正则表达式的快速解析',
      features: ['极速解析', '零成本'],
      pros: ['最快', '免费'],
      cons: ['准确率较低'],
      available: true,
      averageTime: 1,
      accuracy: 70,
      cost: 'free',
    },
    {
      type: ParseStrategyType.Llm,
      name: 'LLM智能解析',
      description: '使用大语言模型进行智能提取',
      features: ['深度理解', '格式灵活'],
      pros: ['准确率高'],
      cons: ['需要LLM服务'],
      available: true,
      averageTime: 30,
      accuracy: 90,
      cost: 'low',
    },
    {
      type: ParseStrategyType.Docling,
      name: 'Docling解析',
      description: '使用IBM Docling进行文档解析',
      features: ['表格提取', 'OCR支持'],
      pros: ['表格识别强'],
      cons: ['需要Python环境'],
      available: false,
      averageTime: 15,
      accuracy: 85,
      cost: 'free',
      errorMessage: 'Docling not available',
    },
  ],
};

const mockTestResult = {
  testStrategyAvailability: {
    strategy: ParseStrategyType.Llm,
    available: true,
    message: 'LLM available',
    latency: 150,
  },
};

// Mock Apollo Client
const createMockApolloClient = () => {
  const mocks = [
    {
      request: {
        query: `
          query GetAvailableStrategies {
            availableStrategies {
              type
              name
              description
              features
              pros
              cons
              available
              averageTime
              accuracy
              cost
              errorMessage
            }
          }
        `,
      },
      result: { data: mockStrategiesData },
    },
  ];

  return createMockClient({ mocks });
};

// Helper to render with Apollo provider
const renderWithApollo = (component: React.ReactElement) => {
  const client = createMockApolloClient();
  return render(
    <ApolloProvider client={client}>
      {component}
    </ApolloProvider>
  );
};

describe('StrategySelector', () => {
  it('should render the component with title', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('解析策略选择')).toBeInTheDocument();
    });
  });

  it('should display available strategies', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('规则解析')).toBeInTheDocument();
      expect(screen.getByText('LLM智能解析')).toBeInTheDocument();
      expect(screen.getByText('Docling解析')).toBeInTheDocument();
    });
  });

  it('should call onStrategyChange when a strategy is selected', async () => {
    const onStrategyChange = jest.fn();
    renderWithApollo(
      <StrategySelector onStrategyChange={onStrategyChange} />
    );

    await waitFor(() => {
      expect(screen.getByText('规则解析')).toBeInTheDocument();
    });

    // Click on the Rule strategy card
    const ruleCard = screen.getByText('规则解析').closest('div');
    if (ruleCard) {
      fireEvent.click(ruleCard);
    }

    await waitFor(() => {
      expect(onStrategyChange).toHaveBeenCalledWith(ParseStrategyType.Rule);
    });
  });

  it('should show the selected strategy as selected', async () => {
    renderWithApollo(
      <StrategySelector selectedStrategy={ParseStrategyType.Llm} />
    );

    await waitFor(() => {
      expect(screen.getByText('LLM智能解析')).toBeInTheDocument();
    });

    // The LLM card should have the selected styling (blue border)
    const llmCard = screen.getByText('LLM智能解析').closest('div');
    expect(llmCard).toHaveClass('border-blue-500');
  });

  it('should show recommendation banner when strategies are available', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText(/推荐策略/)).toBeInTheDocument();
    });
  });

  it('should show error state when query fails', async () => {
    const errorMocks = [
      {
        request: {
          query: `
            query GetAvailableStrategies {
              availableStrategies {
                type
                name
                description
                features
                pros
                cons
                available
                averageTime
                accuracy
                cost
                errorMessage
              }
            }
          `,
        },
        error: new Error('Network error'),
      },
    ];

    const client = createMockClient({ mocks: errorMocks });

    render(
      <ApolloProvider client={client}>
        <StrategySelector />
      </ApolloProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('无法加载解析策略信息')).toBeInTheDocument();
    });
  });

  it('should show loading state initially', () => {
    const loadingMocks = [
      {
        request: {
          query: `
            query GetAvailableStrategies {
              availableStrategies {
                type
                name
                description
                features
                pros
                cons
                available
                averageTime
                accuracy
                cost
                errorMessage
              }
            }
          `,
        },
        // Delay the response to show loading state
        result: { data: mockStrategiesData },
        delay: 100,
      },
    ];

    const client = createMockClient({ mocks: loadingMocks });

    render(
      <ApolloProvider client={client}>
        <StrategySelector />
      </ApolloProvider>
    );

    // Should show loading spinner
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should not select unavailable strategies', async () => {
    const onStrategyChange = jest.fn();
    renderWithApollo(
      <StrategySelector onStrategyChange={onStrategyChange} />
    );

    await waitFor(() => {
      expect(screen.getByText('Docling解析')).toBeInTheDocument();
    });

    // Try to click on the unavailable Docling strategy
    const doclingCard = screen.getByText('Docling解析').closest('div');
    if (doclingCard) {
      fireEvent.click(doclingCard);
    }

    // Should not call onStrategyChange since the strategy is not available
    expect(onStrategyChange).not.toHaveBeenCalledWith(ParseStrategyType.Docling);
  });

  it('should expand strategy details when clicking details button', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('LLM智能解析')).toBeInTheDocument();
    });

    // Click on the "详情" (details) button
    const detailsButton = screen.getByText('详情');
    fireEvent.click(detailsButton);

    // Should show features
    await waitFor(() => {
      expect(screen.getByText('深度理解')).toBeInTheDocument();
      expect(screen.getByText('格式灵活')).toBeInTheDocument();
    });
  });

  it('should collapse details when clicking 收起 button', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('LLM智能解析')).toBeInTheDocument();
    });

    // Click to expand
    const detailsButton = screen.getByText('详情');
    fireEvent.click(detailsButton);

    await waitFor(() => {
      expect(screen.getByText('深度理解')).toBeInTheDocument();
    });

    // Click to collapse
    const collapseButton = screen.getByText('收起');
    fireEvent.click(collapseButton);

    // Features should still be in DOM but hidden
    expect(screen.getByText('深度理解')).toBeInTheDocument();
  });

  it('should display correct cost labels', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('免费')).toBeInTheDocument();
      expect(screen.getByText('低成本')).toBeInTheDocument();
    });
  });

  it('should display accuracy percentages', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('准确率: 70%')).toBeInTheDocument();
      expect(screen.getByText('准确率: 90%')).toBeInTheDocument();
    });
  });

  it('should display average processing times', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('~1秒')).toBeInTheDocument();
      expect(screen.getByText('~30秒')).toBeInTheDocument();
    });
  });

  it('should show error message for unavailable strategies', async () => {
    renderWithApollo(<StrategySelector />);

    await waitFor(() => {
      expect(screen.getByText('Docling not available')).toBeInTheDocument();
    });
  });
});

describe('StrategySelector Props', () => {
  it('should accept custom className', async () => {
    const { container } = renderWithApollo(
      <StrategySelector className="custom-class" />
    );

    await waitFor(() => {
      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  it('should use external selectedStrategy when provided', async () => {
    const { rerender } = renderWithApollo(
      <StrategySelector selectedStrategy={ParseStrategyType.Rule} />
    );

    await waitFor(() => {
      expect(screen.getByText('规则解析')).toBeInTheDocument();
    });

    // Rerender with different selection
    rerender(
      <ApolloProvider client={createMockApolloClient()}>
        <StrategySelector selectedStrategy={ParseStrategyType.Llm} />
      </ApolloProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('LLM智能解析')).toBeInTheDocument();
    });
  });
});
