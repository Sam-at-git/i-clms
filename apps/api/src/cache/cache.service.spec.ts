import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';
import { DocumentFingerprintService } from './document-fingerprint.service';
import { EmbeddingCacheService } from './embedding-cache.service';
import { LlmResultCacheService } from './llm-result-cache.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

describe('CacheService', () => {
  let service: CacheService;
  let memoryCache: jest.Mocked<MemoryCacheStrategy>;
  let documentFingerprint: jest.Mocked<DocumentFingerprintService>;
  let vectorStore: jest.Mocked<VectorStoreService>;

  const mockMemoryCache = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(),
    size: jest.fn(),
    clearPrefix: jest.fn(),
    getStats: jest.fn(),
  };

  const mockDocumentFingerprint = {
    getCachedResult: jest.fn(),
    cacheResult: jest.fn(),
    invalidate: jest.fn(),
    clear: jest.fn(),
  };

  const mockEmbeddingCache = {
    getCachedEmbedding: jest.fn(),
    cacheEmbedding: jest.fn(),
  };

  const mockLlmCache = {
    getCachedResponse: jest.fn(),
    cacheResponse: jest.fn(),
  };

  const mockVectorStore = {
    getVectorCacheStats: jest.fn(),
    cleanExpiredCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: MemoryCacheStrategy,
          useValue: mockMemoryCache,
        },
        {
          provide: DocumentFingerprintService,
          useValue: mockDocumentFingerprint,
        },
        {
          provide: EmbeddingCacheService,
          useValue: mockEmbeddingCache,
        },
        {
          provide: LlmResultCacheService,
          useValue: mockLlmCache,
        },
        {
          provide: VectorStoreService,
          useValue: mockVectorStore,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    memoryCache = module.get(MemoryCacheStrategy) as jest.Mocked<MemoryCacheStrategy>;
    documentFingerprint = module.get(DocumentFingerprintService) as jest.Mocked<DocumentFingerprintService>;
    vectorStore = module.get(VectorStoreService) as jest.Mocked<VectorStoreService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return aggregated cache statistics', async () => {
      // Arrange
      mockMemoryCache.size.mockResolvedValue(100);
      mockMemoryCache.getStats.mockReturnValue({
        hits: 80,
        misses: 20,
        hitRate: 0.8,
      });
      mockVectorStore.getVectorCacheStats.mockResolvedValue({
        embeddingCacheCount: 500,
        llmCacheCount: 200,
        contractChunksCount: 1000,
      });

      // Act
      const stats = await service.getStats();

      // Assert
      expect(stats.level1.size).toBe(100);
      expect(stats.level1.hits).toBe(80);
      expect(stats.level1.misses).toBe(20);
      expect(stats.level1.hitRate).toBe(0.8);
      expect(stats.level2.count).toBe(500);
      expect(stats.level3.count).toBe(200);
    });
  });

  describe('clearAll', () => {
    it('should clear all caches', async () => {
      // Arrange
      mockMemoryCache.clear.mockResolvedValue(undefined);
      mockDocumentFingerprint.clear.mockResolvedValue(undefined);

      // Act
      await service.clearAll();

      // Assert
      expect(mockMemoryCache.clear).toHaveBeenCalled();
      expect(mockDocumentFingerprint.clear).toHaveBeenCalled();
    });
  });

  describe('cleanExpired', () => {
    it('should clean expired cache entries', async () => {
      // Arrange
      mockVectorStore.cleanExpiredCache.mockResolvedValue({
        llm: 10,
        document: 5,
      });

      // Act
      const result = await service.cleanExpired();

      // Assert
      expect(result).toEqual({ llm: 10, document: 5 });
      expect(mockVectorStore.cleanExpiredCache).toHaveBeenCalled();
    });
  });
});
