/**
 * Embedding Client Interface
 *
 * Abstraction for different embedding model providers
 * (Ollama, OpenAI, HuggingFace, etc.)
 */
export interface EmbeddingClient {
  /**
   * Generate embedding vector for a single text
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embedding vectors for multiple texts
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Test connection to the embedding service
   */
  testConnection(): Promise<boolean>;

  /**
   * Get the vector dimension of this model
   */
  getDimensions(): number;

  /**
   * Get the provider name
   */
  getProvider(): string;
}
