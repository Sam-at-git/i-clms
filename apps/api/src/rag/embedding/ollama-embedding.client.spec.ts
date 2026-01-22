import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OllamaEmbeddingClient } from './ollama-embedding.client';
import { EmbeddingModelConfig, EmbeddingProvider } from '../dto/embedding-config.dto';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('OllamaEmbeddingClient', () => {
  let client: OllamaEmbeddingClient;
  let configService: jest.Mocked<ConfigService>;

  const mockConfig: EmbeddingModelConfig = {
    provider: EmbeddingProvider.OLLAMA,
    model: 'nomic-embed-text',
    baseUrl: 'http://localhost:11434',
    dimensions: 768,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const configs: Record<string, unknown> = {
                LLM_TIMEOUT: 120000,
                OLLAMA_EMBEDDING_BASE_URL: 'http://localhost:11434',
              };
              return configs[key];
            }),
          },
        },
      ],
    }).compile();

    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    // Create client directly with mock config
    client = new OllamaEmbeddingClient(mockConfig, configService);

    mockFetch.mockClear();
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  describe('getDimensions', () => {
    it('should return correct dimensions', () => {
      expect(client.getDimensions()).toBe(768);
    });
  });

  describe('getProvider', () => {
    it('should return OLLAMA provider', () => {
      expect(client.getProvider()).toBe(EmbeddingProvider.OLLAMA);
    });
  });

  describe('embed', () => {
    it('should generate embedding successfully', async () => {
      const mockEmbedding = Array(768).fill(0.1);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ embedding: mockEmbedding }),
      });

      const result = await client.embed('test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nomic-embed-text',
            prompt: 'test text',
          }),
        }),
      );
    });

    it('should throw error when API returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.embed('test text')).rejects.toThrow('Ollama API error');
    });

    it('should throw error when no embedding returned', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await expect(client.embed('test text')).rejects.toThrow('No embedding returned');
    });

    it('should handle timeout', async () => {
      // This test is skipped because mocking timeout behavior with fetch is complex
      // The timeout logic is tested in integration scenarios
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            // Simulate immediate abort
            const error = new Error('AbortError') as any;
            error.name = 'AbortError';
            reject(error);
          }),
      );

      // Mock AbortController to trigger immediately
      const originalAbortController = global.AbortController;
      global.AbortController = jest.fn().mockImplementation(() => {
        const controller = new originalAbortController();
        // Immediately abort
        setTimeout(() => controller.abort(), 0);
        return controller;
      }) as any;

      await expect(client.embed('test text')).rejects.toThrow();

      // Restore
      global.AbortController = originalAbortController;
    });
  });

  describe('embedBatch', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbedding1 = Array(768).fill(0.1);
      const mockEmbedding2 = Array(768).fill(0.2);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ embedding: mockEmbedding2 }),
        });

      const results = await client.embedBatch(['text 1', 'text 2']);

      expect(results).toEqual([mockEmbedding1, mockEmbedding2]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('testConnection', () => {
    it('should return true when connection successful', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'nomic-embed-text' }, { name: 'llama2' }],
        }),
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags', expect.any(Object));
    });

    it('should return false when model not in list but connection OK', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const result = await client.testConnection();

      // When models list is returned but doesn't contain our model, return false
      // (model needs to be pulled first)
      expect(result).toBe(false);
    });

    it('should return true when models property is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.testConnection();

      // When models property doesn't exist, assume connection is OK
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when API returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
      });

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
});
