import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';

// Types
interface LLMConfig {
  provider: string;
  model: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
}

interface EmbeddingConfig {
  provider: string;
  model: string;
  baseUrl?: string;
  dimensions: number;
}

interface ModelTestResult {
  success: boolean;
  message?: string;
  latency?: number;
}

// LLM Presets
const LLM_PRESETS: Record<string, Partial<LLMConfig>> = {
  'ollama-gemma': {
    provider: 'ollama',
    model: 'gemma3:27b',
    baseUrl: '',
    temperature: 0.1,
    maxTokens: 4000,
  },
  'ollama-llama': {
    provider: 'ollama',
    model: 'llama3.2',
    baseUrl: '',
    temperature: 0.1,
    maxTokens: 4000,
  },
  'ollama-qwen': {
    provider: 'ollama',
    model: 'qwen2.5',
    baseUrl: '',
    temperature: 0.1,
    maxTokens: 4000,
  },
  'openai-gpt4': {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 4000,
  },
  'openai-gpt35': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.1,
    maxTokens: 4000,
  },
};

// Embedding Presets
const EMBEDDING_PRESETS: Record<string, Partial<EmbeddingConfig>> = {
  'ollama-nomic': {
    provider: 'ollama',
    model: 'nomic-embed-text',
    baseUrl: '',
    dimensions: 768,
  },
  'ollama-mxbai': {
    provider: 'ollama',
    model: 'mxbai-embed-large',
    baseUrl: '',
    dimensions: 1024,
  },
  'openai-small': {
    provider: 'openai',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  'openai-large': {
    provider: 'openai',
    model: 'text-embedding-3-large',
    dimensions: 3072,
  },
};

// GraphQL Queries and Mutations
const GET_LLM_CONFIG = gql`
  query GetLLMConfig {
    llmConfig {
      provider
      model
      baseUrl
      temperature
      maxTokens
    }
  }
`;

const GET_EMBEDDING_CONFIG = gql`
  query GetEmbeddingConfig {
    embeddingConfig {
      provider
      model
      baseUrl
      dimensions
    }
  }
`;

const SAVE_LLM_CONFIG = gql`
  mutation SaveLLMConfig($config: UpdateSystemConfigInput!) {
    saveLLMConfig(config: $config) {
      provider
      model
      baseUrl
      temperature
      maxTokens
    }
  }
`;

const SAVE_EMBEDDING_CONFIG = gql`
  mutation SaveEmbeddingConfig(
    $provider: String
    $model: String
    $baseUrl: String
    $apiKey: String
    $dimensions: Float
  ) {
    saveEmbeddingConfig(
      provider: $provider
      model: $model
      baseUrl: $baseUrl
      apiKey: $apiKey
      dimensions: $dimensions
    ) {
      provider
      model
      baseUrl
      dimensions
    }
  }
`;

const TEST_LLM_CONNECTION = gql`
  mutation TestLLMConnection {
    testLLMConnection {
      success
      message
      latency
    }
  }
`;

const TEST_EMBEDDING_CONNECTION = gql`
  mutation TestEmbeddingConnection {
    testEmbeddingConnection {
      success
      message
      latency
    }
  }
`;

const RESET_LLM_CONFIG = gql`
  mutation ResetLLMConfig {
    resetLLMConfig {
      provider
      model
      baseUrl
      temperature
      maxTokens
    }
  }
`;

const RESET_EMBEDDING_CONFIG = gql`
  mutation ResetEmbeddingConfig {
    resetEmbeddingConfig {
      provider
      model
      baseUrl
      dimensions
    }
  }
`;

export function ModelConfigPage() {
  const [activeTab, setActiveTab] = useState<'llm' | 'embedding'>('llm');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // LLM Config State
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'ollama',
    model: 'gemma3:27b',
    baseUrl: '',
    temperature: 0.1,
    maxTokens: 4000,
  });
  const [llmTestResult, setLlmTestResult] = useState<ModelTestResult | null>(null);

  // Embedding Config State
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig>({
    provider: 'ollama',
    model: 'nomic-embed-text',
    baseUrl: '',
    dimensions: 768,
  });
  const [embeddingTestResult, setEmbeddingTestResult] = useState<ModelTestResult | null>(null);

  // Queries
  const { data: llmData, refetch: refetchLlm } = useQuery<{ llmConfig: LLMConfig }>(
    GET_LLM_CONFIG,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: embeddingData, refetch: refetchEmbedding } = useQuery<{ embeddingConfig: EmbeddingConfig }>(
    GET_EMBEDDING_CONFIG,
    { fetchPolicy: 'cache-and-network' },
  );

  // Mutations
  const [saveLLMConfig, { loading: savingLLM }] = useMutation(SAVE_LLM_CONFIG, {
    onCompleted: () => {
      setSuccess('LLM配置保存成功');
      setTimeout(() => setSuccess(''), 3000);
      refetchLlm();
    },
    onError: (err) => {
      setError(err.message || '保存失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const [saveEmbeddingConfig, { loading: savingEmbedding }] = useMutation(SAVE_EMBEDDING_CONFIG, {
    onCompleted: () => {
      setSuccess('嵌入模型配置保存成功');
      setTimeout(() => setSuccess(''), 3000);
      refetchEmbedding();
    },
    onError: (err) => {
      setError(err.message || '保存失败');
      setTimeout(() => setError(''), 5000);
    },
  });

  const [testLLMConnection, { loading: testingLLM }] = useMutation(TEST_LLM_CONNECTION, {
    onCompleted: (data) => {
      setLlmTestResult(data.testLLMConnection);
    },
    onError: (err) => {
      setLlmTestResult({ success: false, message: err.message });
    },
  });

  const [testEmbeddingConnection, { loading: testingEmbedding }] = useMutation(TEST_EMBEDDING_CONNECTION, {
    onCompleted: (data) => {
      setEmbeddingTestResult(data.testEmbeddingConnection);
    },
    onError: (err) => {
      setEmbeddingTestResult({ success: false, message: err.message });
    },
  });

  const [resetLLMConfig] = useMutation(RESET_LLM_CONFIG, {
    onCompleted: (data) => {
      setLlmConfig(data.resetLLMConfig);
      setLlmTestResult(null);
      setSuccess('LLM配置已重置为默认值');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const [resetEmbeddingConfig] = useMutation(RESET_EMBEDDING_CONFIG, {
    onCompleted: (data) => {
      setEmbeddingConfig(data.resetEmbeddingConfig);
      setEmbeddingTestResult(null);
      setSuccess('嵌入模型配置已重置为默认值');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  // Update config when data is loaded
  useEffect(() => {
    if (llmData?.llmConfig) {
      setLlmConfig(llmData.llmConfig);
    }
  }, [llmData]);

  useEffect(() => {
    if (embeddingData?.embeddingConfig) {
      setEmbeddingConfig(embeddingData.embeddingConfig);
    }
  }, [embeddingData]);

  // Handlers
  const handleSaveLLM = async () => {
    setError('');
    setSuccess('');
    await saveLLMConfig({
      variables: {
        config: {
          llmProvider: llmConfig.provider,
          llmModel: llmConfig.model,
          llmBaseUrl: llmConfig.baseUrl,
          llmTemperature: llmConfig.temperature,
          llmMaxTokens: llmConfig.maxTokens,
        },
      },
    });
  };

  const handleSaveEmbedding = async () => {
    setError('');
    setSuccess('');
    await saveEmbeddingConfig({
      variables: {
        provider: embeddingConfig.provider,
        model: embeddingConfig.model,
        baseUrl: embeddingConfig.baseUrl,
        dimensions: embeddingConfig.dimensions,
      },
    });
  };

  const handleTestLLM = async () => {
    setLlmTestResult(null);
    await testLLMConnection();
  };

  const handleTestEmbedding = async () => {
    setEmbeddingTestResult(null);
    await testEmbeddingConnection();
  };

  const handleLLMPresetChange = (value: string) => {
    const preset = LLM_PRESETS[value];
    if (preset) {
      setLlmConfig({ ...llmConfig, ...preset });
      setLlmTestResult(null);
    }
  };

  const handleEmbeddingPresetChange = (value: string) => {
    const preset = EMBEDDING_PRESETS[value];
    if (preset) {
      setEmbeddingConfig({ ...embeddingConfig, ...preset });
      setEmbeddingTestResult(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>模型设置</h1>
          <p style={styles.subtitle}>配置大语言模型和向量嵌入模型</p>
        </div>

        {success && <div style={styles.success}>{success}</div>}
        {error && <div style={styles.error}>{error}</div>}

        {/* Tab Navigation */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'llm' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('llm')}
          >
            LLM模型
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'embedding' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('embedding')}
          >
            向量嵌入模型
          </button>
        </div>

        {/* LLM Config Tab */}
        {activeTab === 'llm' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>大语言模型配置</h2>
            <p style={styles.sectionDescription}>
              配置用于智能合同解析的LLM提供商和模型参数
            </p>

            {/* Preset Selection */}
            <div style={styles.presetBox}>
              <label style={styles.label}>快速预设</label>
              <select
                style={styles.select}
                onChange={(e) => handleLLMPresetChange(e.target.value)}
                defaultValue=""
              >
                <option value="">-- 选择预设配置 --</option>
                <optgroup label="Ollama (本地免费)">
                  <option value="ollama-gemma">Ollama + Gemma3 (27B)</option>
                  <option value="ollama-llama">Ollama + Llama3.2</option>
                  <option value="ollama-qwen">Ollama + Qwen2.5</option>
                </optgroup>
                <optgroup label="OpenAI (云端收费)">
                  <option value="openai-gpt4">OpenAI + GPT-4o</option>
                  <option value="openai-gpt35">OpenAI + GPT-4o-mini</option>
                </optgroup>
              </select>
            </div>

            {/* Provider */}
            <div style={styles.field}>
              <label style={styles.label}>提供商</label>
              <div style={styles.radioGroup}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="llm-provider"
                    value="ollama"
                    checked={llmConfig.provider === 'ollama'}
                    onChange={(e) => setLlmConfig({ ...llmConfig, provider: e.target.value })}
                  />
                  <span>Ollama (本地)</span>
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="llm-provider"
                    value="openai"
                    checked={llmConfig.provider === 'openai'}
                    onChange={(e) => setLlmConfig({ ...llmConfig, provider: e.target.value })}
                  />
                  <span>OpenAI (云端)</span>
                </label>
              </div>
            </div>

            {/* Model Name */}
            <div style={styles.field}>
              <label style={styles.label}>模型名称</label>
              <input
                type="text"
                style={styles.input}
                value={llmConfig.model}
                onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                placeholder={llmConfig.provider === 'openai' ? 'gpt-4o' : 'gemma3:27b'}
              />
              <div style={styles.help}>
                {llmConfig.provider === 'openai'
                  ? 'OpenAI模型: gpt-4o, gpt-4o-mini, gpt-4-turbo等'
                  : 'Ollama模型: gemma3:27b, llama3.2, qwen2.5, deepseek-r1等'}
              </div>
            </div>

            {/* Base URL */}
            <div style={styles.field}>
              <label style={styles.label}>
                服务地址 {llmConfig.provider === 'ollama' ? '(可选)' : ''}
              </label>
              <input
                type="text"
                style={styles.input}
                value={llmConfig.baseUrl || ''}
                onChange={(e) => setLlmConfig({ ...llmConfig, baseUrl: e.target.value })}
                placeholder={llmConfig.provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1'}
              />
              <div style={styles.help}>
                {llmConfig.provider === 'ollama'
                  ? 'Ollama服务地址，留空使用默认值'
                  : 'OpenAI API地址，通常为https://api.openai.com/v1'}
              </div>
            </div>

            {/* Temperature */}
            <div style={styles.field}>
              <label style={styles.label}>
                Temperature: {llmConfig.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={llmConfig.temperature}
                onChange={(e) => setLlmConfig({ ...llmConfig, temperature: parseFloat(e.target.value) })}
                style={styles.range}
              />
              <div style={styles.help}>
                较低的值使输出更确定性，较高的值使输出更随机
              </div>
            </div>

            {/* Max Tokens */}
            <div style={styles.field}>
              <label style={styles.label}>最大Token数</label>
              <input
                type="number"
                min="1"
                style={styles.input}
                value={llmConfig.maxTokens}
                onChange={(e) => setLlmConfig({ ...llmConfig, maxTokens: parseInt(e.target.value) || 4000 })}
              />
              <div style={styles.help}>单次请求最大输出Token数量</div>
            </div>

            {/* Test Result */}
            {llmTestResult && (
              <div style={{
                ...styles.testResult,
                backgroundColor: llmTestResult.success ? '#dcfce7' : '#fef2f2',
                color: llmTestResult.success ? '#166534' : '#dc2626',
              }}>
                <div style={styles.testResultTitle}>
                  {llmTestResult.success ? '✓ 连接成功' : '✗ 连接失败'}
                </div>
                {llmTestResult.message && <div style={styles.testResultMessage}>{llmTestResult.message}</div>}
                {llmTestResult.latency && <div style={styles.testResultMessage}>延迟: {llmTestResult.latency}ms</div>}
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button onClick={handleSaveLLM} disabled={savingLLM} style={styles.primaryButton}>
                {savingLLM ? '保存中...' : '保存配置'}
              </button>
              <button onClick={handleTestLLM} disabled={testingLLM} style={styles.secondaryButton}>
                {testingLLM ? '测试中...' : '测试连接'}
              </button>
              <button onClick={() => resetLLMConfig()} style={styles.textButton}>
                重置为默认
              </button>
            </div>
          </div>
        )}

        {/* Embedding Config Tab */}
        {activeTab === 'embedding' && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>向量嵌入模型配置</h2>
            <p style={styles.sectionDescription}>
              配置用于语义搜索和RAG的向量嵌入模型
            </p>

            {/* Preset Selection */}
            <div style={styles.presetBox}>
              <label style={styles.label}>快速预设</label>
              <select
                style={styles.select}
                onChange={(e) => handleEmbeddingPresetChange(e.target.value)}
                defaultValue=""
              >
                <option value="">-- 选择预设配置 --</option>
                <optgroup label="Ollama (本地免费)">
                  <option value="ollama-nomic">Ollama + Nomic Embed (768维)</option>
                  <option value="ollama-mxbai">Ollama + MXBAI (1024维)</option>
                </optgroup>
                <optgroup label="OpenAI (云端收费)">
                  <option value="openai-small">OpenAI + Small (1536维)</option>
                  <option value="openai-large">OpenAI + Large (3072维)</option>
                </optgroup>
              </select>
            </div>

            {/* Provider */}
            <div style={styles.field}>
              <label style={styles.label}>提供商</label>
              <div style={styles.radioGroup}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="embedding-provider"
                    value="ollama"
                    checked={embeddingConfig.provider === 'ollama'}
                    onChange={(e) => setEmbeddingConfig({ ...embeddingConfig, provider: e.target.value })}
                  />
                  <span>Ollama (本地)</span>
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="embedding-provider"
                    value="openai"
                    checked={embeddingConfig.provider === 'openai'}
                    onChange={(e) => setEmbeddingConfig({ ...embeddingConfig, provider: e.target.value })}
                  />
                  <span>OpenAI (云端)</span>
                </label>
              </div>
            </div>

            {/* Model Name */}
            <div style={styles.field}>
              <label style={styles.label}>模型名称</label>
              <input
                type="text"
                style={styles.input}
                value={embeddingConfig.model}
                onChange={(e) => setEmbeddingConfig({ ...embeddingConfig, model: e.target.value })}
                placeholder={embeddingConfig.provider === 'openai' ? 'text-embedding-3-small' : 'nomic-embed-text'}
              />
              <div style={styles.help}>
                {embeddingConfig.provider === 'openai'
                  ? 'OpenAI模型: text-embedding-3-small, text-embedding-3-large等'
                  : 'Ollama模型: nomic-embed-text, mxbai-embed-large等'}
              </div>
            </div>

            {/* Base URL */}
            <div style={styles.field}>
              <label style={styles.label}>
                服务地址 {embeddingConfig.provider === 'ollama' ? '(可选)' : ''}
              </label>
              <input
                type="text"
                style={styles.input}
                value={embeddingConfig.baseUrl || ''}
                onChange={(e) => setEmbeddingConfig({ ...embeddingConfig, baseUrl: e.target.value })}
                placeholder={embeddingConfig.provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1'}
              />
            </div>

            {/* Dimensions */}
            <div style={styles.field}>
              <label style={styles.label}>向量维度</label>
              <input
                type="number"
                min="1"
                style={styles.input}
                value={embeddingConfig.dimensions}
                onChange={(e) => setEmbeddingConfig({ ...embeddingConfig, dimensions: parseInt(e.target.value) || 768 })}
              />
              <div style={styles.help}>
                向量嵌入的维度数，需与模型输出维度匹配
              </div>
            </div>

            {/* Test Result */}
            {embeddingTestResult && (
              <div style={{
                ...styles.testResult,
                backgroundColor: embeddingTestResult.success ? '#dcfce7' : '#fef2f2',
                color: embeddingTestResult.success ? '#166534' : '#dc2626',
              }}>
                <div style={styles.testResultTitle}>
                  {embeddingTestResult.success ? '✓ 连接成功' : '✗ 连接失败'}
                </div>
                {embeddingTestResult.message && <div style={styles.testResultMessage}>{embeddingTestResult.message}</div>}
                {embeddingTestResult.latency && <div style={styles.testResultMessage}>延迟: {embeddingTestResult.latency}ms</div>}
              </div>
            )}

            {/* Actions */}
            <div style={styles.actions}>
              <button onClick={handleSaveEmbedding} disabled={savingEmbedding} style={styles.primaryButton}>
                {savingEmbedding ? '保存中...' : '保存配置'}
              </button>
              <button onClick={handleTestEmbedding} disabled={testingEmbedding} style={styles.secondaryButton}>
                {testingEmbedding ? '测试中...' : '测试连接'}
              </button>
              <button onClick={() => resetEmbeddingConfig()} style={styles.textButton}>
                重置为默认
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    minHeight: 'calc(100vh - 56px)',
    backgroundColor: '#f3f4f6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '800px',
    margin: '0 auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#1e3a5f',
    borderBottomColor: '#1e3a5f',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
  },
  presetBox: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  range: {
    width: '100%',
    maxWidth: '400px',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  help: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '6px',
  },
  testResult: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  testResultTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  testResultMessage: {
    fontSize: '13px',
    opacity: 0.8,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1e3a5f',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  textButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
};

export default ModelConfigPage;
