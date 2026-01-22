import { Test, TestingModule } from '@nestjs/testing';
import { StrategyManagerService } from './strategy-manager.service';
import { DoclingParseStrategy } from './docling-parse.strategy';
import { ParseStrategy } from './parse-strategy.interface';

describe('StrategyManagerService', () => {
  let service: StrategyManagerService;
  let mockStrategy: jest.Mocked<DoclingParseStrategy>;

  const mockDoclingService = {
    isAvailable: jest.fn(() => true),
    convertToMarkdown: jest.fn(),
    getVersion: jest.fn(),
  };

  const mockTopicRegistry = {
    getTopic: jest.fn(),
    getTopicSafe: jest.fn(),
    getTopicNames: jest.fn(() => ['BASIC_INFO', 'FINANCIAL']),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyManagerService,
        {
          provide: DoclingParseStrategy,
          useFactory: () => ({
            name: ParseStrategy.DOCLING,
            parse: jest.fn(),
            isAvailable: jest.fn(() => true),
            getPriority: jest.fn(() => 2),
          }),
        },
      ],
    }).compile();

    service = module.get<StrategyManagerService>(StrategyManagerService);

    // Create a mock strategy
    mockStrategy = {
      name: ParseStrategy.DOCLING,
      parse: jest.fn(),
      isAvailable: jest.fn(() => true),
      getPriority: jest.fn(() => 2),
    } as unknown as jest.Mocked<DoclingParseStrategy>;
  });

  afterEach(() => {
    service.clearStrategies();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a strategy', () => {
      service.register(mockStrategy);
      expect(service.hasStrategy(ParseStrategy.DOCLING)).toBe(true);
    });

    it('should log strategy registration', () => {
      const consoleSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
      service.register(mockStrategy);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Strategy registered: docling'),
      );
      consoleSpy.mockRestore();
    });

    it('should overwrite existing strategy with same name', () => {
      service.register(mockStrategy);
      const newStrategy = { ...mockStrategy, getPriority: jest.fn(() => 5) };
      service.register(newStrategy as any);
      expect(service.getStrategyCount()).toBe(1);
    });
  });

  describe('unregister', () => {
    it('should unregister a strategy', () => {
      service.register(mockStrategy);
      const result = service.unregister(ParseStrategy.DOCLING);
      expect(result).toBe(true);
      expect(service.hasStrategy(ParseStrategy.DOCLING)).toBe(false);
    });

    it('should return false when unregistering non-existent strategy', () => {
      const result = service.unregister(ParseStrategy.LLM);
      expect(result).toBe(false);
    });
  });

  describe('getStrategy', () => {
    it('should return registered strategy', () => {
      service.register(mockStrategy);
      const result = service.getStrategy(ParseStrategy.DOCLING);
      expect(result).toBe(mockStrategy);
    });

    it('should return undefined for non-existent strategy', () => {
      const result = service.getStrategy(ParseStrategy.LLM);
      expect(result).toBeUndefined();
    });
  });

  describe('getAllStrategies', () => {
    it('should return all registered strategies', () => {
      service.register(mockStrategy);
      const strategies = service.getAllStrategies();
      expect(strategies).toHaveLength(1);
      expect(strategies[0]).toBe(mockStrategy);
    });

    it('should return empty array when no strategies registered', () => {
      const strategies = service.getAllStrategies();
      expect(strategies).toEqual([]);
    });
  });

  describe('getAvailableStrategies', () => {
    it('should return only available strategies', () => {
      const availableStrategy = { ...mockStrategy, isAvailable: jest.fn(() => true) };
      const unavailableStrategy = {
        name: ParseStrategy.LLM,
        isAvailable: jest.fn(() => false),
        getPriority: jest.fn(() => 1),
        parse: jest.fn(),
      };
      service.register(availableStrategy as any);
      service.register(unavailableStrategy as any);

      const available = service.getAvailableStrategies();
      expect(available).toHaveLength(1);
      expect(available[0].name).toBe(ParseStrategy.DOCLING);
    });

    it('should sort strategies by priority (highest first)', () => {
      const lowPriority = { ...mockStrategy, getPriority: jest.fn(() => 1) };
      const highPriority = {
        name: ParseStrategy.LLM,
        isAvailable: jest.fn(() => true),
        getPriority: jest.fn(() => 5),
        parse: jest.fn(),
      };
      service.register(lowPriority as any);
      service.register(highPriority as any);

      const available = service.getAvailableStrategies();
      expect(available).toHaveLength(2);
      expect(available[0].name).toBe(ParseStrategy.LLM);
      expect(available[1].name).toBe(ParseStrategy.DOCLING);
    });
  });

  describe('getBestStrategy', () => {
    it('should return strategy with highest priority', () => {
      const lowPriority = { ...mockStrategy, getPriority: jest.fn(() => 1) };
      const highPriority = {
        name: ParseStrategy.LLM,
        isAvailable: jest.fn(() => true),
        getPriority: jest.fn(() => 5),
        parse: jest.fn(),
      };
      service.register(lowPriority as any);
      service.register(highPriority as any);

      const best = service.getBestStrategy();
      expect(best?.name).toBe(ParseStrategy.LLM);
    });

    it('should return undefined when no strategies available', () => {
      const best = service.getBestStrategy();
      expect(best).toBeUndefined();
    });
  });

  describe('parseWith', () => {
    it('should execute parse with specific strategy', async () => {
      const mockResult = {
        strategy: ParseStrategy.DOCLING,
        fields: { contractNo: 'TEST-001' },
        completeness: 80,
        confidence: 85,
        warnings: [],
        duration: 100,
        timestamp: new Date(),
      };
      mockStrategy.parse = jest.fn().mockResolvedValue(mockResult);
      service.register(mockStrategy);

      const result = await service.parseWith(ParseStrategy.DOCLING, 'test content', {});
      expect(result).toEqual(mockResult);
      expect(mockStrategy.parse).toHaveBeenCalledWith('test content', {});
    });

    it('should throw error for non-registered strategy', async () => {
      await expect(
        service.parseWith(ParseStrategy.LLM, 'test content', {}),
      ).rejects.toThrow('Strategy llm not registered');
    });

    it('should throw error for unavailable strategy', async () => {
      mockStrategy.isAvailable = jest.fn(() => false);
      service.register(mockStrategy);

      await expect(
        service.parseWith(ParseStrategy.DOCLING, 'test content', {}),
      ).rejects.toThrow('Strategy docling is not available');
    });
  });

  describe('parseWithMulti', () => {
    it('should execute parse with multiple strategies', async () => {
      const mockResult1 = {
        strategy: ParseStrategy.DOCLING,
        fields: { contractNo: 'TEST-001' },
        completeness: 80,
        confidence: 85,
        warnings: [],
        duration: 100,
        timestamp: new Date(),
      };
      const mockResult2 = {
        strategy: ParseStrategy.LLM,
        fields: { contractNo: 'TEST-001' },
        completeness: 90,
        confidence: 95,
        warnings: [],
        duration: 200,
        timestamp: new Date(),
      };

      const strategy1 = { ...mockStrategy, parse: jest.fn().mockResolvedValue(mockResult1) };
      const strategy2 = {
        name: ParseStrategy.LLM,
        isAvailable: jest.fn(() => true),
        getPriority: jest.fn(() => 1),
        parse: jest.fn().mockResolvedValue(mockResult2),
      };

      service.register(strategy1 as any);
      service.register(strategy2 as any);

      const results = await service.parseWithMulti(
        [ParseStrategy.DOCLING, ParseStrategy.LLM],
        'test content',
        {},
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockResult1);
      expect(results[1]).toEqual(mockResult2);
    });

    it('should continue when one strategy fails', async () => {
      const mockResult = {
        strategy: ParseStrategy.DOCLING,
        fields: { contractNo: 'TEST-001' },
        completeness: 80,
        confidence: 85,
        warnings: [],
        duration: 100,
        timestamp: new Date(),
      };

      const failingStrategy = {
        name: ParseStrategy.LLM,
        isAvailable: jest.fn(() => true),
        getPriority: jest.fn(() => 1),
        parse: jest.fn().mockRejectedValue(new Error('LLM failed')),
      };
      const workingStrategy = { ...mockStrategy, parse: jest.fn().mockResolvedValue(mockResult) };

      service.register(failingStrategy as any);
      service.register(workingStrategy as any);

      const results = await service.parseWithMulti(
        [ParseStrategy.DOCLING, ParseStrategy.LLM],
        'test content',
        {},
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockResult);
    });
  });

  describe('clearStrategies', () => {
    it('should clear all registered strategies', () => {
      service.register(mockStrategy);
      expect(service.getStrategyCount()).toBe(1);

      service.clearStrategies();
      expect(service.getStrategyCount()).toBe(0);
    });
  });

  describe('getStrategyNames', () => {
    it('should return all strategy names', () => {
      service.register(mockStrategy);
      const names = service.getStrategyNames();
      expect(names).toEqual([ParseStrategy.DOCLING]);
    });
  });

  describe('getAvailableStrategyNames', () => {
    it('should return only available strategy names', () => {
      const availableStrategy = { ...mockStrategy, isAvailable: jest.fn(() => true) };
      const unavailableStrategy = {
        name: ParseStrategy.LLM,
        isAvailable: jest.fn(() => false),
        getPriority: jest.fn(() => 1),
        parse: jest.fn(),
      };
      service.register(availableStrategy as any);
      service.register(unavailableStrategy as any);

      const names = service.getAvailableStrategyNames();
      expect(names).toEqual([ParseStrategy.DOCLING]);
    });
  });
});
