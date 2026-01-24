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
 *
 * NOTE: Currently only supports nomic-embed-text (768 dimensions).
 * Future versions may support additional models.
 */
export const EMBEDDING_MODELS: Record<string, EmbeddingModelConfig> = {
  'nomic-embed-text': {
    provider: EmbeddingProvider.OLLAMA,
    model: 'nomic-embed-text',
    baseUrl: 'http://localhost:11434',
    dimensions: 768,
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
