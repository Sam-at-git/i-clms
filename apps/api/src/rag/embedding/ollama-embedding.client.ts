import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingClient } from './embedding-client.interface';
import { EmbeddingModelConfig, EmbeddingProvider } from '../dto/embedding-config.dto';

/**
 * Ollama Embedding Client
 *
 * Client for generating embeddings using local Ollama models.
 * Supports models like nomic-embed-text, mxbai-embed-large, all-minilm.
 */
@Injectable()
export class OllamaEmbeddingClient implements EmbeddingClient {
  private readonly logger = new Logger(OllamaEmbeddingClient.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly dimensions: number;
  private readonly timeout: number;

  constructor(config: EmbeddingModelConfig, configService: ConfigService) {
    this.baseUrl =
      config.baseUrl || configService.get('OLLAMA_EMBEDDING_BASE_URL') || 'http://localhost:11434';
    this.model = config.model;
    this.dimensions = config.dimensions;
    this.timeout = configService.get('LLM_TIMEOUT') || 120000;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText} (${response.status})`);
      }

      const data = (await response.json()) as OllamaEmbeddingResponse;

      if (!data.embedding) {
        throw new Error('No embedding returned from Ollama');
      }

      return data.embedding;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Ollama embed timeout after ${this.timeout}ms`);
        throw new Error(`Embedding generation timeout`);
      }
      this.logger.error(`Ollama embed error: ${this.errorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * Ollama has limited concurrency, so process sequentially with delay
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    // Process sequentially to avoid overwhelming Ollama
    for (let i = 0; i < texts.length; i++) {
      const embedding = await this.embed(texts[i]);
      results.push(embedding);

      // Add delay between requests (except for last one)
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.logger.debug(`Generated ${results.length} embeddings using ${this.model}`);
    return results;
  }

  /**
   * Test connection to Ollama and verify model is available
   */
  async testConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as OllamaTagsResponse;

      // Check if model exists
      if (data.models) {
        return data.models.some(m => m.name.includes(this.model));
      }

      return true;
    } catch {
      return false;
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getProvider(): string {
    return EmbeddingProvider.OLLAMA;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}
