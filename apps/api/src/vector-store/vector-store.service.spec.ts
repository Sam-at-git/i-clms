import { Test, TestingModule } from '@nestjs/testing';
import { VectorStoreService } from './vector-store.service';
import { PrismaService } from '../prisma';

describe('VectorStoreService', () => {
  let service: VectorStoreService;

  const mockPrisma = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStoreService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<VectorStoreService>(VectorStoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCachedEmbedding', () => {
    it('TEST-002: should return cached embedding when found', async () => {
      // Arrange
      const embedding = [0.1, 0.2, 0.3];
      mockPrisma.$queryRaw.mockResolvedValue([{ embedding }]);

      // Act
      const result = await service.getCachedEmbedding('test text', 'model-name');

      // Assert
      expect(result).toEqual(embedding);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('TEST-003: should return null when embedding not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.getCachedEmbedding('test text', 'model-name');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getCachedEmbedding('test text', 'model-name');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('cacheEmbedding', () => {
    it('should cache embedding successfully', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.cacheEmbedding('test text', 'model-name', [0.1, 0.2, 0.3]);

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Database error'));

      // Act - should not throw
      await expect(
        service.cacheEmbedding('test text', 'model-name', [0.1, 0.2, 0.3])
      ).resolves.toBeUndefined();
    });
  });

  describe('getCachedLlmResponse', () => {
    it('TEST-004: should return cached LLM response when found and not expired', async () => {
      // Arrange
      const response = 'test response';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      mockPrisma.$queryRaw.mockResolvedValue([
        { response, expires_at: futureDate },
      ]);

      // Act
      const result = await service.getCachedLlmResponse('prompt', 'input', 'model-name');

      // Assert
      expect(result).toBe(response);
    });

    it('TEST-005: should return null when LLM cache is expired', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.$queryRaw.mockResolvedValue([
        { response: 'old response', expires_at: pastDate },
      ]);

      // Act
      const result = await service.getCachedLlmResponse('prompt', 'input', 'model-name');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when LLM cache not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.getCachedLlmResponse('prompt', 'input', 'model-name');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('cacheLlmResponse', () => {
    it('should cache LLM response successfully', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.cacheLlmResponse('prompt', 'input', 'model-name', 'response');

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('saveContractChunk', () => {
    it('TEST-006: should save contract chunk successfully', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.saveContractChunk(
        { contractId: '1', chunkIndex: 0, content: 'test content' },
        [0.1, 0.2, 0.3]
      );

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('saveContractChunks', () => {
    it('TEST-007: should save multiple contract chunks', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      const chunks = [
        { contractId: '1', chunkIndex: 0, content: 'chunk 1', embedding: [0.1, 0.2] },
        { contractId: '1', chunkIndex: 1, content: 'chunk 2', embedding: [0.3, 0.4] },
      ];

      await service.saveContractChunks(chunks);

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('searchSimilarChunks', () => {
    it('TEST-008: should return similar chunks', async () => {
      // Arrange
      const mockResults = [
        { contract_id: '1', content: 'similar content 1', similarity: 0.85 },
        { contract_id: '2', content: 'similar content 2', similarity: 0.75 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      // Act
      const result = await service.searchSimilarChunks([0.1, 0.2, 0.3], 5, 0.7);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        contractId: '1',
        content: 'similar content 1',
        similarity: 0.85,
      });
    });

    it('should filter results by threshold', async () => {
      // Arrange
      const mockResults = [
        { contract_id: '1', content: 'similar content', similarity: 0.85 },
        { contract_id: '2', content: 'dissimilar content', similarity: 0.65 },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(mockResults);

      // Act
      const result = await service.searchSimilarChunks([0.1, 0.2, 0.3], 5, 0.7);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBeGreaterThanOrEqual(0.7);
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.searchSimilarChunks([0.1, 0.2, 0.3]);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getContractChunks', () => {
    it('TEST-009: should return contract chunks in order', async () => {
      // Arrange
      const mockChunks = [
        { chunk_index: 0, content: 'chunk 0', chunk_type: 'header' },
        { chunk_index: 1, content: 'chunk 1', chunk_type: 'financial' },
      ];
      mockPrisma.$queryRaw.mockResolvedValue(mockChunks);

      // Act
      const result = await service.getContractChunks('1');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
    });

    it('should default chunkType to "other" when null', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([
        { chunk_index: 0, content: 'content', chunk_type: null },
      ]);

      // Act
      const result = await service.getContractChunks('1');

      // Assert
      expect(result[0].chunkType).toBe('other');
    });

    it('should return empty array on error', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getContractChunks('1');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('deleteContractChunks', () => {
    it('TEST-010: should delete all contract chunks', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue({ rowCount: 5 });

      // Act
      await service.deleteContractChunks('1');

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('cleanExpiredCache', () => {
    it('TEST-011: should clean expired cache entries', async () => {
      // Arrange
      mockPrisma.$executeRaw
        .mockResolvedValueOnce(10) // llm cache
        .mockResolvedValueOnce(5); // document cache

      // Act
      const result = await service.cleanExpiredCache();

      // Assert
      expect(result).toEqual({ llm: 10, document: 5 });
    });

    it('should return zeros on error', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.cleanExpiredCache();

      // Assert
      expect(result).toEqual({ llm: 0, document: 0 });
    });
  });

  describe('getVectorCacheStats', () => {
    it('should return cache statistics', async () => {
      // Arrange
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ count: 100n }])
        .mockResolvedValueOnce([{ count: 50n }])
        .mockResolvedValueOnce([{ count: 200n }]);

      // Act
      const result = await service.getVectorCacheStats();

      // Assert
      expect(result).toEqual({
        embeddingCacheCount: 100,
        llmCacheCount: 50,
        contractChunksCount: 200,
      });
    });

    it('should return zeros on error', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getVectorCacheStats();

      // Assert
      expect(result).toEqual({
        embeddingCacheCount: 0,
        llmCacheCount: 0,
        contractChunksCount: 0,
      });
    });
  });

  describe('checkPgVectorAvailable', () => {
    it('TEST-001: should return true when pgvector is available', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ available: true }]);

      // Act
      const result = await service.checkPgVectorAvailable();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when pgvector is not available', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([{ available: false }]);

      // Act
      const result = await service.checkPgVectorAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.checkPgVectorAvailable();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('saveDocumentFingerprint', () => {
    it('should save document fingerprint successfully', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      // Act
      await service.saveDocumentFingerprint(
        'hash123',
        'file.pdf',
        1024,
        'application/pdf',
        { data: 'result' },
        'strategy'
      );

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('getDocumentFingerprint', () => {
    it('should return cached document fingerprint', async () => {
      // Arrange
      const mockData = {
        file_name: 'file.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        parse_result: { data: 'result' },
        strategy: 'strategy',
        expires_at: null,
      };
      mockPrisma.$queryRaw.mockResolvedValue([mockData]);

      // Act
      const result = await service.getDocumentFingerprint('hash123');

      // Assert
      expect(result).toEqual({
        fileName: 'file.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        parseResult: { data: 'result' },
        strategy: 'strategy',
      });
    });

    it('should return null for expired cache', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          file_name: 'file.pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          parse_result: {},
          strategy: 'strategy',
          expires_at: pastDate,
        },
      ]);

      // Act
      const result = await service.getDocumentFingerprint('hash123');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when not found', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      const result = await service.getDocumentFingerprint('hash123');

      // Assert
      expect(result).toBeNull();
    });
  });
});
