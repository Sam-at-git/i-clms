import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingCacheService } from './embedding-cache.service';
import { PrismaService } from '../prisma';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';

describe('EmbeddingCacheService', () => {
  let service: EmbeddingCacheService;
  let prisma: jest.Mocked<PrismaService>;
  let memoryCache: jest.Mocked<MemoryCacheStrategy>;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  const mockMemoryCache = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(),
    size: jest.fn(),
    clearPrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingCacheService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: MemoryCacheStrategy,
          useValue: mockMemoryCache,
        },
      ],
    }).compile();

    service = module.get<EmbeddingCacheService>(EmbeddingCacheService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    memoryCache = module.get(MemoryCacheStrategy) as jest.Mocked<MemoryCacheStrategy>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCachedEmbedding', () => {
    const mockText = 'sample text for embedding';
    const mockModelName = 'text-embedding-ada-002';
    const mockEmbedding = [0.1, 0.2, 0.3, 0.4];

    it('TEST-010: should cache and retrieve embedding', async () => {
      // Arrange - L1 hit
      mockMemoryCache.get.mockResolvedValue(mockEmbedding);

      // Act
      const result = await service.getCachedEmbedding(mockText, mockModelName);

      // Assert
      expect(result).toEqual(mockEmbedding);
      expect(mockMemoryCache.get).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should return null when cache miss', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.getCachedEmbedding(mockText, mockModelName);

      // Assert
      expect(result).toBeNull();
    });

    it('should backfill L1 cache on L2 hit', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValue([{ embedding: mockEmbedding }]);

      // Act
      const result = await service.getCachedEmbedding(mockText, mockModelName);

      // Assert
      expect(result).toEqual(mockEmbedding);
      expect(mockMemoryCache.set).toHaveBeenCalled();
    });

    it('TEST-011: should cache embeddings separately by model', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      mockMemoryCache.set.mockResolvedValue(undefined);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act - Cache with two different models
      await service.cacheEmbedding(mockText, 'model-a', mockEmbedding);
      await service.cacheEmbedding(mockText, 'model-b', mockEmbedding);

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('cacheEmbedding', () => {
    const mockText = 'sample text';
    const mockModelName = 'text-embedding-ada-002';
    const mockEmbedding = [0.1, 0.2, 0.3];

    it('should cache embedding in both L1 and L2', async () => {
      // Arrange
      mockMemoryCache.set.mockResolvedValue(undefined);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.cacheEmbedding(mockText, mockModelName, mockEmbedding);

      // Assert
      expect(mockMemoryCache.set).toHaveBeenCalled();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockMemoryCache.set.mockResolvedValue(undefined);
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(
        service.cacheEmbedding(mockText, mockModelName, mockEmbedding)
      ).resolves.toBeUndefined();
    });
  });
});
