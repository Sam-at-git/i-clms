import { Test, TestingModule } from '@nestjs/testing';
import { OpenAIEmbeddingClient } from './openai-embedding.client';
import { EmbeddingModelConfig, EmbeddingProvider } from '../dto/embedding-config.dto';

// Mock OpenAI
jest.mock('openai');

describe('OpenAIEmbeddingClient', () => {
  let client: OpenAIEmbeddingClient;
  let mockOpenAI: jest.Mocked<any>;

  const mockConfig: EmbeddingModelConfig = {
    provider: EmbeddingProvider.OPENAI,
    model: 'text-embedding-3-small',
    dimensions: 1536,
    apiKey: 'test-api-key',
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock OpenAI client
    mockOpenAI = {
      embeddings: {
        create: jest.fn(),
      },
    };

    // Mock the OpenAI constructor
    const OpenAI = require('openai').OpenAI;
    OpenAI.mockImplementation(() => mockOpenAI);

    client = new OpenAIEmbeddingClient(mockConfig);
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  it('should throw error when API key is not provided', () => {
    expect(() => {
      new OpenAIEmbeddingClient({
        provider: EmbeddingProvider.OPENAI,
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });
    }).toThrow('OpenAI API key is required');
  });

  describe('getDimensions', () => {
    it('should return correct dimensions', () => {
      expect(client.getDimensions()).toBe(1536);
    });
  });

  describe('getProvider', () => {
    it('should return OPENAI provider', () => {
      expect(client.getProvider()).toBe(EmbeddingProvider.OPENAI);
    });
  });

  describe('embed', () => {
    it('should generate embedding successfully', async () => {
      const mockEmbedding = Array(1536).fill(0.1);
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: mockEmbedding, index: 0 }],
      });

      const result = await client.embed('test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text',
      });
    });

    it('should throw error when API fails', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('API Error'));

      await expect(client.embed('test text')).rejects.toThrow('API Error');
    });
  });

  describe('embedBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbedding1 = Array(1536).fill(0.1);
      const mockEmbedding2 = Array(1536).fill(0.2);

      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbedding1, index: 0 },
          { embedding: mockEmbedding2, index: 1 },
        ],
      });

      const results = await client.embedBatch(['text 1', 'text 2']);

      expect(results).toEqual([mockEmbedding1, mockEmbedding2]);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text 1', 'text 2'],
      });
    });

    it('should sort results by index', async () => {
      const mockEmbedding1 = Array(1536).fill(0.1);
      const mockEmbedding2 = Array(1536).fill(0.2);

      // Return results out of order
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [
          { embedding: mockEmbedding2, index: 1 },
          { embedding: mockEmbedding1, index: 0 },
        ],
      });

      const results = await client.embedBatch(['text 1', 'text 2']);

      expect(results).toEqual([mockEmbedding1, mockEmbedding2]);
    });

    it('should batch large requests', async () => {
      const texts = Array(150).fill('test');

      // Mock to return correct number of embeddings per call
      mockOpenAI.embeddings.create.mockImplementation(async (params: any) => {
        const inputArray = Array.isArray(params.input) ? params.input : [params.input];
        return {
          data: inputArray.map((_: any, i: number) => ({
            embedding: Array(1536).fill(0.1),
            index: i,
          })),
        };
      });

      const results = await client.embedBatch(texts);

      expect(results).toHaveLength(150);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2); // 2 batches
    });
  });

  describe('testConnection', () => {
    it('should return true when connection successful', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: Array(1536).fill(0.1), index: 0 }],
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('API Error'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
});
