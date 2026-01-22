import { Test, TestingModule } from '@nestjs/testing';
import { LlmResultCacheService } from './llm-result-cache.service';
import { PrismaService } from '../prisma';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';

describe('LlmResultCacheService', () => {
  let service: LlmResultCacheService;
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
        LlmResultCacheService,
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

    service = module.get<LlmResultCacheService>(LlmResultCacheService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    memoryCache = module.get(MemoryCacheStrategy) as jest.Mocked<MemoryCacheStrategy>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCachedResponse', () => {
    const mockPrompt = 'Extract contract number';
    const mockInput = 'Contract content here';
    const mockModelName = 'gpt-4';
    const mockResponse = '{"contractNumber": "CTR-001"}';

    it('TEST-012: should cache and retrieve LLM response', async () => {
      // Arrange - L1 hit
      mockMemoryCache.get.mockResolvedValue(mockResponse);

      // Act
      const result = await service.getCachedResponse(mockPrompt, mockInput, mockModelName);

      // Assert
      expect(result).toBe(mockResponse);
      expect(mockMemoryCache.get).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should return null when cache miss', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.getCachedResponse(mockPrompt, mockInput, mockModelName);

      // Assert
      expect(result).toBeNull();
    });

    it('should backfill L1 cache on L2 hit', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValue([
        { response: mockResponse, expires_at: null },
      ]);

      // Act
      const result = await service.getCachedResponse(mockPrompt, mockInput, mockModelName);

      // Assert
      expect(result).toBe(mockResponse);
      expect(mockMemoryCache.set).toHaveBeenCalled();
    });

    it('TEST-013: should return null for expired cache', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.$queryRaw.mockResolvedValue([
        { response: mockResponse, expires_at: pastDate },
      ]);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      const result = await service.getCachedResponse(mockPrompt, mockInput, mockModelName);

      // Assert
      expect(result).toBeNull();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('cacheResponse', () => {
    const mockPrompt = 'Extract contract number';
    const mockInput = 'Contract content here';
    const mockModelName = 'gpt-4';
    const mockResponse = '{"contractNumber": "CTR-001"}';

    it('should cache response in both L1 and L2', async () => {
      // Arrange
      mockMemoryCache.set.mockResolvedValue(undefined);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.cacheResponse(mockPrompt, mockInput, mockModelName, mockResponse, 30);

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
        service.cacheResponse(mockPrompt, mockInput, mockModelName, mockResponse)
      ).resolves.toBeUndefined();
    });
  });
});
