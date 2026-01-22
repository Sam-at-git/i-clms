import { Test, TestingModule } from '@nestjs/testing';
import { DocumentFingerprintService } from './document-fingerprint.service';
import { PrismaService } from '../prisma';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';
import { ParsedDocumentResult } from './dto/cache-config.dto';

describe('DocumentFingerprintService', () => {
  let service: DocumentFingerprintService;
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
        DocumentFingerprintService,
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

    service = module.get<DocumentFingerprintService>(DocumentFingerprintService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    memoryCache = module.get(MemoryCacheStrategy) as jest.Mocked<MemoryCacheStrategy>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCachedResult', () => {
    const mockFileContent = Buffer.from('test file content');
    const mockFileName = 'test.pdf';
    const mockResult: ParsedDocumentResult = {
      fields: { contractNumber: 'CTR-001' },
      completeness: 85,
      warnings: [],
      strategy: 'RULE',
      parsedAt: new Date(),
    };

    it('TEST-006: should return cached result from L1 memory cache', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(mockResult);

      // Act
      const result = await service.getCachedResult(mockFileContent, mockFileName);

      // Assert
      expect(result).toEqual(mockResult);
      expect(memoryCache.get).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('TEST-007: should return cached result from L2 database cache when L1 misses', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      const dbDate = new Date('2026-01-22T00:00:00.000Z');
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          file_name: mockFileName,
          file_size: mockFileContent.length,
          mime_type: 'application/pdf',
          parse_result: mockResult,
          strategy: 'RULE',
          expires_at: null,
          created_at: dbDate,
        },
      ]);

      // Act
      const result = await service.getCachedResult(mockFileContent, mockFileName);

      // Assert
      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        fields: mockResult.fields,
        completeness: mockResult.completeness,
        warnings: mockResult.warnings,
        strategy: 'RULE',
      });
      expect(result?.parsedAt).toEqual(dbDate);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(memoryCache.set).toHaveBeenCalled(); // Should backfill L1
    });

    it('TEST-008: should return null for expired cache', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          file_name: mockFileName,
          file_size: mockFileContent.length,
          mime_type: 'application/pdf',
          parse_result: mockResult,
          strategy: 'RULE',
          expires_at: pastDate,
          created_at: new Date(),
        },
      ]);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      const result = await service.getCachedResult(mockFileContent, mockFileName);

      // Assert
      expect(result).toBeNull();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should return null when no cache exists', async () => {
      // Arrange
      mockMemoryCache.get.mockResolvedValue(null);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.getCachedResult(mockFileContent, mockFileName);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('cacheResult', () => {
    const mockFileContent = Buffer.from('test file content');
    const mockFileName = 'test.pdf';
    const mockResult: ParsedDocumentResult = {
      fields: { contractNumber: 'CTR-001' },
      completeness: 85,
      warnings: [],
      strategy: 'RULE',
      parsedAt: new Date(),
    };

    it('should cache result in both L1 and L2', async () => {
      // Arrange
      mockMemoryCache.set.mockResolvedValue(undefined);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.cacheResult(mockFileContent, mockFileName, mockResult, 7);

      // Assert
      expect(memoryCache.set).toHaveBeenCalled();
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockMemoryCache.set.mockResolvedValue(undefined);
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(
        service.cacheResult(mockFileContent, mockFileName, mockResult)
      ).resolves.toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('TEST-009: should delete cache from both L1 and L2', async () => {
      // Arrange
      mockMemoryCache.delete.mockResolvedValue(undefined);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.invalidate('test-file-hash');

      // Assert
      expect(memoryCache.delete).toHaveBeenCalledWith('doc_fp:test-file-hash');
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all document cache', async () => {
      // Arrange
      mockMemoryCache.clearPrefix.mockResolvedValue(5);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.clear();

      // Assert
      expect(mockMemoryCache.clearPrefix).toHaveBeenCalledWith('doc_fp:');
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });
});
