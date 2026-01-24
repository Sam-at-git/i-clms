import { Test, TestingModule } from '@nestjs/testing';
import { RAGParseStrategy } from './rag-parse.strategy';
import { RAGService } from './rag.service';
import { TopicRegistryService } from '../llm-parser/topics/topic-registry.service';
import { ParseStrategy } from '../llm-parser/strategies/parse-strategy.interface';
import { ExtractTopic } from '../llm-parser/topics/topics.const';

describe('RAGParseStrategy', () => {
  let strategy: RAGParseStrategy;
  let mockRAGService: jest.Mocked<RAGService>;
  let mockTopicRegistry: jest.Mocked<TopicRegistryService>;

  const mockRAGExtractResults = [
    {
      topic: ExtractTopic.BASIC_INFO,
      query: '合同编号、合同名称、签约方信息',
      retrievedChunks: [
        {
          content: '合同编号：TEST-001\n合同名称：测试合同',
          similarity: 0.9,
        },
      ],
      extractedData: {
        contractNo: 'TEST-001',
        contractName: '测试合同',
        partyA: '公司A',
        partyB: '公司B',
      },
    },
    {
      topic: ExtractTopic.FINANCIAL,
      query: '合同金额、价款、费用',
      retrievedChunks: [
        {
          content: '合同金额：100000元',
          similarity: 0.85,
        },
      ],
      extractedData: {
        contractAmount: 100000,
      },
    },
  ];

  beforeEach(async () => {
    mockRAGService = {
      isAvailable: jest.fn(() => true),
      indexContract: jest.fn().mockResolvedValue(undefined),
      extractByTopic: jest.fn().mockResolvedValue(mockRAGExtractResults),
      getCurrentConfig: jest.fn().mockReturnValue(null),
      initializeEmbeddingClient: jest.fn().mockResolvedValue(undefined),
      testConnection: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<RAGService>;

    const mockTopicDefinition = {
      name: ExtractTopic.BASIC_INFO,
      displayName: '基本信息',
      description: '合同基本信息',
      order: 1,
      weight: 2,
      fields: [
        { name: 'contractNo', type: 'string', description: '合同编号', required: true },
        { name: 'contractName', type: 'string', description: '合同名称', required: true },
        { name: 'partyA', type: 'string', description: '甲方', required: true },
        { name: 'partyB', type: 'string', description: '乙方', required: true },
        { name: 'contractAmount', type: 'number', description: '合同金额', required: true },
        { name: 'signedDate', type: 'date', description: '签订日期', required: true },
      ],
    };

    mockTopicRegistry = {
      getTopic: jest.fn().mockReturnValue(mockTopicDefinition),
      getTopicSafe: jest.fn().mockReturnValue(mockTopicDefinition),
      getTopicNames: jest.fn(() => [ExtractTopic.BASIC_INFO, ExtractTopic.FINANCIAL]),
      getAllTopics: jest.fn(() => [mockTopicDefinition]),
      register: jest.fn(),
      registerAll: jest.fn(),
      getTopicFields: jest.fn().mockReturnValue(mockTopicDefinition.fields),
      getField: jest.fn(),
      hasTopic: jest.fn().mockReturnValue(true),
      getTopicFieldValues: jest.fn(),
      getMissingFields: jest.fn().mockReturnValue([]),
      getAllMissingFields: jest.fn().mockReturnValue(new Map()),
      calculateCompleteness: jest.fn().mockReturnValue({
        score: 80,
        total: 2,
        maxScore: 2.5,
        topicScores: [],
      }),
      infoTypeToTopic: jest.fn(),
      getExtractTopics: jest.fn(),
      getTopicDisplayName: jest.fn().mockReturnValue('基本信息'),
      getTopicCount: jest.fn().mockReturnValue(1),
      getTotalWeight: jest.fn().mockReturnValue(2),
      getTopicsByOrder: jest.fn().mockReturnValue([mockTopicDefinition]),
    } as unknown as jest.Mocked<TopicRegistryService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGParseStrategy,
        {
          provide: RAGService,
          useValue: mockRAGService,
        },
        {
          provide: TopicRegistryService,
          useValue: mockTopicRegistry,
        },
      ],
    }).compile();

    strategy = module.get<RAGParseStrategy>(RAGParseStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('name', () => {
    it('should have RAG as name', () => {
      expect(strategy.name).toBe(ParseStrategy.RAG);
    });
  });

  describe('isAvailable', () => {
    it('should return true when RAG is available', () => {
      mockRAGService.isAvailable.mockReturnValue(true);
      expect(strategy.isAvailable()).toBe(true);
    });

    it('should return false when RAG is not available', () => {
      mockRAGService.isAvailable.mockReturnValue(false);
      expect(strategy.isAvailable()).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should return priority 1', () => {
      expect(strategy.getPriority()).toBe(1);
    });
  });

  describe('parse', () => {
    it('should parse content and return result', async () => {
      const result = await strategy.parse('test content', {});

      expect(result).toMatchObject({
        strategy: ParseStrategy.RAG,
        completeness: expect.any(Number),
        confidence: expect.any(Number),
        warnings: expect.any(Array),
        duration: expect.any(Number),
      });
      expect(result.fields).toBeDefined();
      expect(mockRAGService.indexContract).toHaveBeenCalled();
      expect(mockRAGService.extractByTopic).toHaveBeenCalled();
    });

    it('should extract fields from RAG results', async () => {
      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.fields.contractNo).toBe('TEST-001');
      expect(result.fields.contractName).toBe('测试合同');
      expect(result.fields.partyA).toBe('公司A');
      expect(result.fields.partyB).toBe('公司B');
    });

    it('should handle RAG unavailability', async () => {
      mockRAGService.isAvailable.mockReturnValue(false);

      const result = await strategy.parse('test content', {});

      expect(result.completeness).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.warnings.some(w => w.includes('RAG service not available'))).toBe(true);
    });

    it('should add warning for low completeness', async () => {
      // Mock low completeness results
      mockRAGService.extractByTopic.mockResolvedValue([
        {
          topic: ExtractTopic.BASIC_INFO,
          query: 'test',
          retrievedChunks: [],
          extractedData: {}, // No fields extracted
        },
      ]);

      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.warnings.some(w => w.includes('完整性较低'))).toBe(true);
    });

    it('should use provided contractId when available', async () => {
      await strategy.parse('test content', { contractId: 123 });

      expect(mockRAGService.indexContract).toHaveBeenCalledWith(123, 'test content');
    });

    it('should generate temp contractId when not provided', async () => {
      await strategy.parse('test content', {});

      expect(mockRAGService.indexContract).toHaveBeenCalledWith(
        expect.stringMatching(/^temp-\d+$/),
        'test content',
      );
    });

    it('should calculate confidence based on similarities', async () => {
      const result = await strategy.parse('test content', {});

      // Confidence should be based on average similarity
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle indexing failures gracefully', async () => {
      mockRAGService.indexContract.mockRejectedValue(new Error('Indexing failed'));

      const result = await strategy.parse('test content', {});

      // Should still return a result with a warning
      expect(result).toBeDefined();
      expect(result.warnings.some(w => w.includes('Indexing failed'))).toBe(true);
    });
  });

  describe('calculateCompleteness', () => {
    it('should return 0 when no fields extracted', async () => {
      mockRAGService.extractByTopic.mockResolvedValue([
        {
          topic: ExtractTopic.BASIC_INFO,
          query: 'test',
          retrievedChunks: [],
          extractedData: {},
        },
      ]);

      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.completeness).toBe(0);
    });

    it('should return higher score when more fields extracted', async () => {
      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.completeness).toBeGreaterThan(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0 when no results', async () => {
      mockRAGService.extractByTopic.mockResolvedValue([]);

      const result = await strategy.parse('test content', {});

      expect(result.confidence).toBe(0);
    });

    it('should return 0 when no chunks retrieved', async () => {
      mockRAGService.extractByTopic.mockResolvedValue([
        {
          topic: ExtractTopic.BASIC_INFO,
          query: 'test',
          retrievedChunks: [], // No chunks
          extractedData: {},
        },
      ]);

      const result = await strategy.parse('test content', {});

      expect(result.confidence).toBe(0);
    });

    it('should calculate based on average similarity', async () => {
      // Mock with specific similarity values
      mockRAGService.extractByTopic.mockResolvedValue([
        {
          topic: ExtractTopic.BASIC_INFO,
          query: 'test',
          retrievedChunks: [
            { content: 'test', similarity: 0.8 },
            { content: 'test2', similarity: 0.9 },
          ],
          extractedData: { contractNo: 'TEST-001' },
        },
      ]);

      const result = await strategy.parse('test content', {});

      // Average of 0.8 and 0.9 is 0.85, so confidence should be 85
      expect(result.confidence).toBe(85);
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      mockRAGService.extractByTopic.mockRejectedValue(new Error('Extraction failed'));

      const result = await strategy.parse('test content', {});

      expect(result.completeness).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Extraction failed');
    });
  });
});
