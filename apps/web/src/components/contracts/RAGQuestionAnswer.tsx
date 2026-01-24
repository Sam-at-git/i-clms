import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRagQuestionAnswerQuery } from '@i-clms/shared/generated/graphql';

// 示例问题
const EXAMPLE_QUESTIONS = [
  '哪些合同包含保密条款？',
  '合同金额超过100万的合同有哪些？',
  '甲方是某某公司的合同有哪些条款？',
  '合同期限为1年的合同有哪些？',
];

interface RAGResult {
  contractId: string;
  contractNo: string;
  contractName: string;
  customerName: string;
  chunkContent: string;
  similarity: number;
  chunkMetadata: {
    title?: string;
    articleNumber?: string;
    chunkType?: string;
  };
}

interface RAGQuestionAnswerProps {
  onResultClick?: (contractId: string) => void;
}

export function RAGQuestionAnswer({ onResultClick }: RAGQuestionAnswerProps) {
  const [question, setQuestion] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [limit] = useState(10);
  const [threshold] = useState(0.5);

  const [searchQuestion, setSearchQuestion] = useState('');

  const { loading, error, data } = useRagQuestionAnswerQuery({
    variables: { question: searchQuestion, limit, threshold },
    skip: !searchQuestion,
    fetchPolicy: 'network-only',
  });

  const handleSearch = () => {
    if (question.trim()) {
      setHasSearched(true);
      setSearchQuestion(question);
    }
  };

  const handleExampleClick = (exampleQuestion: string) => {
    setQuestion(exampleQuestion);
    setHasSearched(true);
    setSearchQuestion(exampleQuestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const formatSimilarity = (score: number) => {
    return `${(score * 100).toFixed(1)}%`;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>RAG 问答</h3>
      <p style={styles.description}>
        用自然语言提问，从已向量化的合同中查找相关信息
      </p>

      {/* 问题输入框 */}
      <div style={styles.inputContainer}>
        <textarea
          style={styles.textarea}
          placeholder="请输入您的问题，例如：哪些合同包含保密条款？"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyPress}
          rows={3}
        />
        <button
          onClick={handleSearch}
          disabled={!question.trim() || loading}
          style={{
            ...styles.searchButton,
            ...(loading || !question.trim() ? styles.searchButtonDisabled : {}),
          }}
        >
          {loading ? '搜索中...' : '提问'}
        </button>
      </div>

      {/* 示例问题 */}
      {!hasSearched && (
        <div style={styles.examplesContainer}>
          <p style={styles.examplesTitle}>示例问题：</p>
          <div style={styles.examplesList}>
            {EXAMPLE_QUESTIONS.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                style={styles.exampleButton}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={styles.error}>
          搜索出错: {error.message}
        </div>
      )}

      {/* 搜索结果 */}
      {hasSearched && !loading && data && (
        <div style={styles.resultsContainer}>
          <h4 style={styles.resultsTitle}>
            搜索结果 ({data.ragQuestionAnswer?.length || 0} 条)
          </h4>

          {!data.ragQuestionAnswer || data.ragQuestionAnswer.length === 0 ? (
            <div style={styles.noResults}>
              未找到相关结果。请尝试：
              <ul style={styles.suggestions}>
                <li>更换问题描述</li>
                <li>确认合同是否已向量化</li>
                <li>使用更通用的关键词</li>
              </ul>
            </div>
          ) : (
            <div style={styles.resultsList}>
              {data.ragQuestionAnswer.map((result, index) => (
                <div key={index} style={styles.resultItem}>
                  {/* 结果头部 */}
                  <div style={styles.resultHeader}>
                    <div style={styles.resultMeta}>
                      <Link
                        to={`/contracts/${result.contractId}`}
                        onClick={() => onResultClick?.(result.contractId)}
                        style={styles.contractLink}
                      >
                        {result.contractNo}
                      </Link>
                      <span style={styles.separator}>•</span>
                      <span style={styles.contractName}>{result.contractName}</span>
                      <span style={styles.separator}>•</span>
                      <span style={styles.customerName}>{result.customerName}</span>
                    </div>
                    <div style={styles.similarityBadge}>
                      相似度: {formatSimilarity(result.similarity)}
                    </div>
                  </div>

                  {/* 元数据 */}
                  {(result.chunkMetadata?.title || result.chunkMetadata?.chunkType) && (
                    <div style={styles.metadata}>
                      {result.chunkMetadata.title && (
                        <span style={styles.metadataItem}>
                          章节: {result.chunkMetadata.title}
                        </span>
                      )}
                      {result.chunkMetadata.chunkType && (
                        <span style={styles.metadataItem}>
                          类型: {result.chunkMetadata.chunkType}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 内容片段 */}
                  <div style={styles.content}>
                    {result.chunkContent}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px 0',
  },
  inputContainer: {
    marginBottom: '16px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  searchButton: {
    marginTop: '12px',
    padding: '10px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  searchButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  examplesContainer: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  examplesTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    margin: '0 0 12px 0',
  },
  examplesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  exampleButton: {
    padding: '8px 12px',
    fontSize: '13px',
    color: '#3b82f6',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  resultsContainer: {
    marginTop: '20px',
  },
  resultsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  noResults: {
    padding: '20px',
    textAlign: 'center',
    color: '#6b7280',
  },
  suggestions: {
    textAlign: 'left',
    marginTop: '12px',
    paddingLeft: '20px',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  resultItem: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  resultMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  contractLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  separator: {
    color: '#9ca3af',
  },
  contractName: {
    fontSize: '14px',
    color: '#374151',
  },
  customerName: {
    fontSize: '13px',
    color: '#6b7280',
  },
  similarityBadge: {
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
  },
  metadata: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
  },
  metadataItem: {
    fontSize: '12px',
    color: '#6b7280',
  },
  content: {
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap' as const,
  },
};

export default RAGQuestionAnswer;
