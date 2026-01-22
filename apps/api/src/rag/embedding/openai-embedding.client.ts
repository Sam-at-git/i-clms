import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { EmbeddingClient } from './embedding-client.interface';
import { EmbeddingModelConfig, EmbeddingProvider } from '../dto/embedding-config.dto';

/**
 * OpenAI Embedding Client
 *
 * Client for generating embeddings using OpenAI's API.
 * Supports models like text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002.
 */
@Injectable()
export class OpenAIEmbeddingClient implements EmbeddingClient {
  private readonly logger = new Logger(OpenAIEmbeddingClient.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(config: EmbeddingModelConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required for embedding client');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.model = config.model;
    this.dimensions = config.dimensions;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`OpenAI embed error: ${this.errorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * OpenAI supports batch requests for better performance
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      // OpenAI supports up to 2048 texts in a single request
      // but we limit to 100 for safety
      const batchSize = 100;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        // Sort by index to ensure order matches input
        const sorted = response.data.sort((a, b) => a.index - b.index);
        results.push(...sorted.map(d => d.embedding));
      }

      this.logger.debug(`Generated ${results.length} embeddings using ${this.model}`);
      return results;
    } catch (error) {
      this.logger.error(`OpenAI embed batch error: ${this.errorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Test connection by generating a test embedding
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.embed('test');
      return true;
    } catch {
      return false;
    }
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getProvider(): string {
    return EmbeddingProvider.OPENAI;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
