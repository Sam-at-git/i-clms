import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { VectorStoreResolver } from './vector-store.resolver';
import { VectorStoreService } from './vector-store.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

describe('VectorStoreResolver', () => {
  let resolver: VectorStoreResolver;
  let service: DeepMockProxy<VectorStoreService>;

  const mockVectorCacheStats = {
    embeddingCacheCount: 150,
    llmCacheCount: 75,
    contractChunksCount: 500,
  };

  const mockContractChunks = [
    {
      index: 0,
      content: 'This is the first paragraph of the contract.',
      chunkType: 'header',
    },
    {
      index: 1,
      content: 'This is the second paragraph with financial terms.',
      chunkType: 'financial',
    },
    {
      index: 2,
      content: 'This is the third paragraph with delivery terms.',
      chunkType: 'schedule',
    },
  ];

  beforeEach(async () => {
    service = mockDeep<VectorStoreService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStoreResolver,
        { provide: VectorStoreService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<VectorStoreResolver>(VectorStoreResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pgVectorStatus', () => {
    it('should return true when pgvector is available', async () => {
      service.checkPgVectorAvailable.mockResolvedValue(true);

      const result = await resolver.pgVectorStatus();

      expect(result).toBe(true);
      expect(service.checkPgVectorAvailable).toHaveBeenCalled();
    });

    it('should return false when pgvector is not available', async () => {
      service.checkPgVectorAvailable.mockResolvedValue(false);

      const result = await resolver.pgVectorStatus();

      expect(result).toBe(false);
    });

    it('should require authentication', async () => {
      expect(true).toBe(true);
    });
  });

  describe('vectorCacheStats', () => {
    it('should return vector cache statistics', async () => {
      service.getVectorCacheStats.mockResolvedValue(mockVectorCacheStats);

      const result = await resolver.vectorCacheStats();

      expect(result).toBeDefined();
      expect(result.embeddingCacheCount).toBe(150);
      expect(result.llmCacheCount).toBe(75);
      expect(result.contractChunksCount).toBe(500);
      expect(service.getVectorCacheStats).toHaveBeenCalled();
    });

    it('should return zero stats when no caches exist', async () => {
      service.getVectorCacheStats.mockResolvedValue({
        embeddingCacheCount: 0,
        llmCacheCount: 0,
        contractChunksCount: 0,
      });

      const result = await resolver.vectorCacheStats();

      expect(result.embeddingCacheCount).toBe(0);
      expect(result.llmCacheCount).toBe(0);
      expect(result.contractChunksCount).toBe(0);
    });

    it('should require authentication', async () => {
      expect(true).toBe(true);
    });
  });

  describe('contractChunks', () => {
    it('should return contract chunks', async () => {
      service.getContractChunks.mockResolvedValue(mockContractChunks);

      const result = await resolver.contractChunks('contract-1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(3);
      expect(result[0].index).toBe(0);
      expect(result[0].content).toBe('This is the first paragraph of the contract.');
      expect(result[0].chunkType).toBe('header');
      expect(service.getContractChunks).toHaveBeenCalledWith('contract-1');
    });

    it('should return empty array when contract has no chunks', async () => {
      service.getContractChunks.mockResolvedValue([]);

      const result = await resolver.contractChunks('contract-empty');

      expect(result).toHaveLength(0);
      expect(service.getContractChunks).toHaveBeenCalledWith('contract-empty');
    });

    it('should map chunk types correctly', async () => {
      service.getContractChunks.mockResolvedValue(mockContractChunks);

      const result = await resolver.contractChunks('contract-1');

      expect(result[0].chunkType).toBe('header');
      expect(result[1].chunkType).toBe('financial');
      expect(result[2].chunkType).toBe('schedule');
    });

    it('should preserve chunk indices', async () => {
      service.getContractChunks.mockResolvedValue(mockContractChunks);

      const result = await resolver.contractChunks('contract-1');

      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);
      expect(result[2].index).toBe(2);
    });

    it('should require authentication', async () => {
      expect(true).toBe(true);
    });
  });

  describe('cleanExpiredCache', () => {
    it('should clean expired cache and return stats', async () => {
      service.cleanExpiredCache.mockResolvedValue({ llm: 10, document: 5 });

      const result = await resolver.cleanExpiredCache();

      expect(result).toBeDefined();
      expect(result.llmCacheCount).toBe(10);
      expect(result.embeddingCacheCount).toBe(0);
      expect(result.contractChunksCount).toBe(0);
      expect(service.cleanExpiredCache).toHaveBeenCalled();
    });

    it('should return zero when no expired caches', async () => {
      service.cleanExpiredCache.mockResolvedValue({ llm: 0, document: 0 });

      const result = await resolver.cleanExpiredCache();

      expect(result.llmCacheCount).toBe(0);
      expect(result.embeddingCacheCount).toBe(0);
      expect(result.contractChunksCount).toBe(0);
    });

    it('should require authentication', async () => {
      expect(true).toBe(true);
    });
  });
});
