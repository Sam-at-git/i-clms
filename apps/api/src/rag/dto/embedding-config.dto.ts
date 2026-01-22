/**
 * Embedding model providers
 */
export enum EmbeddingProvider {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  HUGGINGFACE = 'huggingface',
}

/**
 * Embedding model configuration
 */
export interface EmbeddingModelConfig {
  provider: EmbeddingProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  dimensions: number;
}

/**
 * Available embedding models
 */
export const EMBEDDING_MODELS: Record<string, EmbeddingModelConfig> = {
  // Ollama local models
  'nomic-embed-text': {
    provider: EmbeddingProvider.OLLAMA,
    model: 'nomic-embed-text',
    baseUrl: 'http://localhost:11434',
    dimensions: 768,
  },
  'mxbai-embed-large': {
    provider: EmbeddingProvider.OLLAMA,
    model: 'mxbai-embed-large',
    baseUrl: 'http://localhost:11434',
    dimensions: 1024,
  },
  'all-minilm': {
    provider: EmbeddingProvider.OLLAMA,
    model: 'all-minilm',
    baseUrl: 'http://localhost:11434',
    dimensions: 384,
  },
  // OpenAI cloud models
  'text-embedding-3-small': {
    provider: EmbeddingProvider.OPENAI,
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  'text-embedding-3-large': {
    provider: EmbeddingProvider.OPENAI,
    model: 'text-embedding-3-large',
    dimensions: 3072,
  },
  'text-embedding-ada-002': {
    provider: EmbeddingProvider.OPENAI,
    model: 'text-embedding-ada-002',
    dimensions: 1536,
  },
};

/**
 * Get available model names
 */
export function getAvailableModelNames(): string[] {
  return Object.keys(EMBEDDING_MODELS);
}

/**
 * Get model config by name
 */
export function getModelConfig(name: string): EmbeddingModelConfig | undefined {
  return EMBEDDING_MODELS[name];
}
