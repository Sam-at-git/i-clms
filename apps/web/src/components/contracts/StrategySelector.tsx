import React, { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { apolloClient } from '../../lib/apollo/client';

/**
 * Props for StrategySelector component
 */
export interface StrategySelectorProps {
  className?: string;
  onStrategyChange?: (strategy: string) => void;
  selectedStrategy?: string;
}

/**
 * Parse Strategy Type enum
 */
enum ParseStrategyType {
  Rule = 'RULE',
  Llm = 'LLM',
  Docling = 'DOCLING',
  Rag = 'RAG',
  Multi = 'MULTI',
}

/**
 * Strategy Cost enum
 */
enum StrategyCost {
  Free = 'free',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

/**
 * GraphQL queries and mutations
 */
const GET_AVAILABLE_STRATEGIES = gql`
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
`;

const TEST_STRATEGY_AVAILABILITY = gql`
  mutation TestStrategyAvailability($strategy: ParseStrategyType!) {
    testStrategyAvailability(strategy: $strategy) {
      strategy
      available
      message
      latency
    }
  }
`;

const TEST_ALL_STRATEGIES = gql`
  query TestAllStrategies {
    testAllStrategies {
      strategy
      available
      message
      latency
    }
  }
`;

/**
 * GraphQL response types
 */
interface AvailableStrategiesResponse {
  availableStrategies: StrategyInfo[];
}

interface TestStrategyResponse {
  testStrategyAvailability: {
    strategy: string;
    available: boolean;
    message: string;
    latency?: number;
  };
}

interface TestAllStrategiesResponse {
  testAllStrategies: Array<{
    strategy: string;
    available: boolean;
    message: string;
    latency?: number;
  }>;
}

/**
 * Strategy info type
 */
interface StrategyInfo {
  type: string;
  name: string;
  description?: string;
  features: string[];
  pros: string[];
  cons: string[];
  available: boolean;
  averageTime?: number;
  accuracy?: number;
  cost: string;
  errorMessage?: string;
}

/**
 * Common styles
 */
const commonStyles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    padding: '8px',
    backgroundColor: '#dbeafe',
    borderRadius: '8px',
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  testButton: {
    padding: '6px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#2563eb',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'backgroundColor 0.2s',
  },
  recommendationBanner: {
    marginBottom: '24px',
    padding: '12px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flexStart',
    gap: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  footer: {
    marginTop: '24px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  footerText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid #e5e7eb',
    borderTopColor: '#2563eb',
    animation: 'spin 1s linear infinite',
  },
};

// Add spinner keyframes
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-spin]')) {
  styleElement.setAttribute('data-spin', 'true');
  document.head.appendChild(styleElement);
}

/**
 * Icons as SVG components with styles
 */
const CheckIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const InfoIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const ZapIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const ClockIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TargetIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const AlertIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ChevronDownIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronUpIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg style={style} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

/**
 * Strategy card component for individual strategy display
 */
interface StrategyCardProps {
  strategy: StrategyInfo;
  isSelected: boolean;
  onSelect: () => void;
  onTest: () => void;
  isTesting: boolean;
  testResult?: { available: boolean; message: string; latency?: number };
  showDetails: boolean;
  onToggleDetails: () => void;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  isSelected,
  onSelect,
  onTest,
  isTesting,
  testResult,
  showDetails,
  onToggleDetails,
}) => {
  const getCostStyle = (cost: string): React.CSSProperties => {
    switch (cost) {
      case StrategyCost.Free:
        return { color: '#16a34a', backgroundColor: '#f0fdf4' };
      case StrategyCost.Low:
        return { color: '#ca8a04', backgroundColor: '#fefce8' };
      case StrategyCost.Medium:
        return { color: '#ea580c', backgroundColor: '#fff7ed' };
      case StrategyCost.High:
        return { color: '#dc2626', backgroundColor: '#fef2f2' };
      default:
        return { color: '#6b7280', backgroundColor: '#f9fafb' };
    }
  };

  const getCostLabel = (cost: string) => {
    switch (cost) {
      case StrategyCost.Free:
        return '免费';
      case StrategyCost.Low:
        return '低成本';
      case StrategyCost.Medium:
        return '中等成本';
      case StrategyCost.High:
        return '高成本';
      default:
        return '未知';
    }
  };

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid',
    borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
    backgroundColor: isSelected ? '#eff6ff' : '#fff',
    cursor: strategy.available ? 'pointer' : 'not-allowed',
    opacity: strategy.available ? 1 : 0.6,
    transition: 'all 0.2s',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flexStart',
    justifyContent: 'spaceBetween',
    marginBottom: '12px',
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const indicatorStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid',
    borderColor: isSelected ? '#3b82f6' : '#d1d5db',
    backgroundColor: isSelected ? '#3b82f6' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  };

  const badgesStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flexEnd',
  };

  const costBadgeStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    ...getCostStyle(strategy.cost),
  };

  const timeStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#6b7280',
  };

  const warningStyle: React.CSSProperties = {
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: '#fffbeb',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'flexStart',
    gap: '8px',
  };

  const warningTextStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#92400e',
    margin: 0,
  };

  const statsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
    fontSize: '14px',
  };

  const accuracyStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#6b7280',
  };

  const detailsButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#2563eb',
    background: 'none',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    padding: 0,
  };

  const detailsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '4px',
  };

  const featureTagStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '4px',
    fontSize: '12px',
    marginRight: '4px',
    marginBottom: '4px',
  };

  const listItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flexStart',
    gap: '4px',
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const testButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    cursor: isTesting ? 'not-allowed' : 'pointer',
    opacity: isTesting ? 0.6 : 1,
  };

  const resultStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: testResult?.available ? '#16a34a' : '#dc2626',
  };

  return (
    <div style={cardStyle} onClick={onSelect}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={leftSectionStyle}>
          {/* Selection indicator */}
          <div style={indicatorStyle}>
            {isSelected && <CheckIcon style={{ color: '#fff' }} />}
          </div>

          {/* Strategy name */}
          <div>
            <h3 style={nameStyle}>{strategy.name}</h3>
            {strategy.description && (
              <p style={descriptionStyle}>{strategy.description}</p>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div style={badgesStyle}>
          <div style={costBadgeStyle}>{getCostLabel(strategy.cost)}</div>
          {strategy.averageTime && (
            <div style={timeStyle}>
              <ClockIcon />
              ~{strategy.averageTime}秒
            </div>
          )}
        </div>
      </div>

      {/* Availability warning */}
      {!strategy.available && strategy.errorMessage && (
        <div style={warningStyle}>
          <AlertIcon style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
          <p style={warningTextStyle}>{strategy.errorMessage}</p>
        </div>
      )}

      {/* Quick stats */}
      {strategy.accuracy && (
        <div style={statsStyle}>
          <div style={accuracyStyle}>
            <TargetIcon />
            <span>准确率: {strategy.accuracy}%</span>
          </div>
          {strategy.features && strategy.features.length > 0 && (
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleDetails();
              }}
              style={detailsButtonStyle}
            >
              {showDetails ? <ChevronUpIcon /> : <ChevronDownIcon />}
              {showDetails ? '收起' : '详情'}
            </button>
          )}
        </div>
      )}

      {/* Expandable details */}
      {showDetails && (
        <div style={detailsStyle}>
          {/* Features */}
          {strategy.features && strategy.features.length > 0 && (
            <div>
              <h4 style={{ ...sectionTitleStyle, color: '#374151' }}>特性</h4>
              <div>
                {strategy.features.map((feature, i) => (
                  <span key={i} style={featureTagStyle}>{feature}</span>
                ))}
              </div>
            </div>
          )}

          {/* Pros */}
          {strategy.pros && strategy.pros.length > 0 && (
            <div>
              <h4 style={{ ...sectionTitleStyle, color: '#15803d' }}>优点</h4>
              {strategy.pros.map((pro, i) => (
                <div key={i} style={listItemStyle}>
                  <span style={{ color: '#16a34a' }}>+</span>
                  <span>{pro}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cons */}
          {strategy.cons && strategy.cons.length > 0 && (
            <div>
              <h4 style={{ ...sectionTitleStyle, color: '#b91c1c' }}>缺点</h4>
              {strategy.cons.map((con, i) => (
                <div key={i} style={listItemStyle}>
                  <span style={{ color: '#dc2626' }}>-</span>
                  <span>{con}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={actionsStyle}>
        <button
          onClick={e => {
            e.stopPropagation();
            onTest();
          }}
          disabled={isTesting}
          style={testButtonStyle}
        >
          {isTesting ? '测试中...' : '测试连接'}
        </button>

        {testResult && (
          <div style={resultStyle}>
            {testResult.available ? (
              <>
                <CheckIcon />
                <span>可用</span>
              </>
            ) : (
              <>
                <AlertIcon />
                <span>不可用</span>
              </>
            )}
            {testResult.latency !== undefined && (
              <span style={{ color: '#6b7280' }}>({testResult.latency}ms)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Strategy Selector Component
 *
 * Allows users to select a parsing strategy for contract parsing.
 * Supports single and multi-strategy selection modes.
 *
 * @see Spec 28 - Strategy Selector UI
 */
export const StrategySelector: React.FC<StrategySelectorProps> = ({
  className = '',
  onStrategyChange,
  selectedStrategy: externalSelectedStrategy,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>(
    externalSelectedStrategy || ParseStrategyType.Llm
  );
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { available: boolean; message: string; latency?: number }>>({});

  // Query for available strategies
  const { data, loading, error } = useQuery<AvailableStrategiesResponse>(GET_AVAILABLE_STRATEGIES, {
    pollInterval: 60000,
    fetchPolicy: 'cache-and-network',
  });

  // Mutation to test strategy
  const [testStrategy, { loading: testing }] = useMutation<TestStrategyResponse>(TEST_STRATEGY_AVAILABILITY);

  // Toggle details for a strategy
  const toggleDetails = (type: string) => {
    setShowDetails(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // Handle strategy selection
  const handleSelectStrategy = (strategy: StrategyInfo) => {
    if (!strategy.available) return;
    setSelectedStrategy(strategy.type);
    onStrategyChange?.(strategy.type);
  };

  // Handle testing a single strategy
  const handleTestStrategy = async (strategyType: string) => {
    try {
      const result = await testStrategy({ variables: { strategy: strategyType } });
      if (result.data?.testStrategyAvailability) {
        setTestResults(prev => ({
          ...prev,
          [strategyType]: result.data!.testStrategyAvailability!,
        }));
      }
    } catch (err) {
      console.error('Failed to test strategy:', err);
    }
  };

  // Handle testing all strategies
  const handleTestAll = async () => {
    try {
      const result = await apolloClient.query<TestAllStrategiesResponse>({
        query: TEST_ALL_STRATEGIES,
        fetchPolicy: 'network-only',
      });
      if (result.data?.testAllStrategies) {
        const results: Record<string, { available: boolean; message: string; latency?: number }> = {};
        for (const r of result.data.testAllStrategies) {
          results[r.strategy] = r;
        }
        setTestResults(results);
      }
    } catch (err) {
      console.error('Failed to test all strategies:', err);
    }
  };

  // Get recommended strategy based on availability
  const getRecommendedStrategy = (): StrategyInfo | null => {
    if (!data?.availableStrategies) return null;
    const priority = [ParseStrategyType.Multi, ParseStrategyType.Llm, ParseStrategyType.Rag, ParseStrategyType.Docling, ParseStrategyType.Rule];
    for (const type of priority) {
      const strategy = data.availableStrategies.find((s: StrategyInfo) => s.type === type && s.available);
      if (strategy) return strategy;
    }
    return data.availableStrategies.find((s: StrategyInfo) => s.available) || null;
  };

  const recommendedStrategy = getRecommendedStrategy();

  // Show error state if query fails
  if (error) {
    return (
      <div style={commonStyles.container}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ color: '#dc2626' }}>无法加载解析策略信息</p>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
            请确保API服务正在运行
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={commonStyles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
          <div style={commonStyles.spinner} />
        </div>
      </div>
    );
  }

  const useRecommendButtonStyle: React.CSSProperties = {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  };

  return (
    <div style={commonStyles.container}>
      {/* Header */}
      <div style={commonStyles.header}>
        <div style={commonStyles.headerLeft}>
          <div style={commonStyles.iconWrapper}>
            <ZapIcon style={{ color: '#2563eb' }} />
          </div>
          <div style={commonStyles.headerText}>
            <h2 style={commonStyles.title}>解析策略选择</h2>
            <p style={commonStyles.subtitle}>选择合同解析策略，平衡速度、准确率和成本</p>
          </div>
        </div>

        <button
          onClick={handleTestAll}
          style={commonStyles.testButton}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          测试全部
        </button>
      </div>

      {/* Recommendation banner */}
      {recommendedStrategy && (
        <div style={commonStyles.recommendationBanner}>
          <InfoIcon style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
              <span style={{ fontWeight: 500 }}>推荐策略:</span> {recommendedStrategy.name}
              {recommendedStrategy.accuracy && ` (${recommendedStrategy.accuracy}% 准确率)`}
            </p>
          </div>
          {selectedStrategy !== recommendedStrategy.type && (
            <button
              onClick={() => handleSelectStrategy(recommendedStrategy)}
              style={useRecommendButtonStyle}
            >
              使用推荐
            </button>
          )}
        </div>
      )}

      {/* Strategy cards grid */}
      <div style={commonStyles.grid}>
        {data?.availableStrategies?.map((strategy: StrategyInfo) => (
          <StrategyCard
            key={strategy.type}
            strategy={strategy}
            isSelected={selectedStrategy === strategy.type}
            onSelect={() => handleSelectStrategy(strategy)}
            onTest={() => handleTestStrategy(strategy.type)}
            isTesting={testing}
            testResult={testResults[strategy.type]}
            showDetails={showDetails[strategy.type] || false}
            onToggleDetails={() => toggleDetails(strategy.type)}
          />
        ))}
      </div>

      {/* Info footer */}
      <div style={commonStyles.footer}>
        <p style={commonStyles.footerText}>
          <InfoIcon style={{ width: '12px', height: '12px', verticalAlign: 'middle', marginRight: '4px' }} />
          解析策略决定了合同信息的提取方式。规则解析最快但准确率较低，LLM解析准确率高但需要配置AI服务，
          多策略交叉验证最准确但耗时最长。
        </p>
      </div>
    </div>
  );
};

export default StrategySelector;
