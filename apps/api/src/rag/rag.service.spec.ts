import { Test, TestingModule } from '@nestjs/testing';
import { RAGService } from './rag.service';
import { ConfigService } from '@nestjs/config';
import { SemanticChunkerService } from '../llm-parser/semantic-chunker.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { TopicRegistryService } from '../llm-parser/topics/topic-registry.service';
import { EmbeddingProvider } from './dto/embedding-config.dto';

describe('RAGService', () => {
  let service: RAGService;
  let configService: jest.Mocked<ConfigService>;
  let chunker: jest.Mocked<SemanticChunkerService>;
  let vectorStore: jest.Mocked<VectorStoreService>;
  let topicRegistry: jest.Mocked<TopicRegistryService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockChunker = {
    chunkBySemanticStructure: jest.fn(),
  };

  const mockVectorStore = {
    saveContractChunk: jest.fn(),
    searchSimilarChunks: jest.fn(),
    getContractChunks: jest.fn(),
  };

  const mockTopicRegistry = {
    getTopic: jest.fn(),
    getTopicNames: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SemanticChunkerService,
          useValue: mockChunker,
        },
        {
          provide: VectorStoreService,
          useValue: mockVectorStore,
        },
        {
          provide: TopicRegistryService,
          useValue: mockTopicRegistry,
        },
      ],
    }).compile();

    service = module.get<RAGService>(RAGService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    chunker = module.get(SemanticChunkerService) as jest.Mocked<SemanticChunkerService>;
    vectorStore = module.get(VectorStoreService) as jest.Mocked<VectorStoreService>;
    topicRegistry = module.get(TopicRegistryService) as jest.Mocked<TopicRegistryService>;

    // Reset mocks
    jest.clearAllMocks();

    // Default config returns
    mockConfigService.get.mockImplementation(key => {
      const configs: Record<string, unknown> = {
        EMBEDDING_MODEL: 'nomic-embed-text',
        LLM_TIMEOUT: 120000,
        OLLAMA_EMBEDDING_BASE_URL: 'http://localhost:11434',
        OPENAI_API_KEY: undefined,
      };
      return configs[key] as string | number | undefined;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAvailable', () => {
    it('should return false when embedding client is not initialized', () => {
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('getCurrentConfig', () => {
    it('should return null when no config is set', () => {
      expect(service.getCurrentConfig()).toBeNull();
    });
  });

  describe('indexContract', () => {
    it('should throw error when embedding client is not available', async () => {
      mockChunker.chunkBySemanticStructure.mockReturnValue([]);

      await expect(service.indexContract(1, 'test content')).rejects.toThrow(
        'Embedding client not available',
      );
    });
  });

  describe('extractByTopic', () => {
    it('should throw error when embedding client is not available', async () => {
      await expect(service.extractByTopic(1, [{ topic: 'BASIC_INFO', query: 'test' }])).rejects.toThrow(
        'Embedding client not available',
      );
    });
  });

  describe('testConnection', () => {
    it('should return false for invalid provider', async () => {
      const result = await service.testConnection({
        provider: 'invalid' as EmbeddingProvider,
        model: 'test',
        dimensions: 100,
      });

      expect(result).toBe(false);
    });

    it('should return false for OpenAI without API key', async () => {
      const result = await service.testConnection({
        provider: EmbeddingProvider.OPENAI,
        model: 'text-embedding-3-small',
        dimensions: 1536,
      });

      expect(result).toBe(false);
    });
  });
});
