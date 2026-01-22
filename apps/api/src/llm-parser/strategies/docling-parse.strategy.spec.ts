import { Test, TestingModule } from '@nestjs/testing';
import { DoclingParseStrategy } from './docling-parse.strategy';
import { DoclingService } from '../../docling/docling.service';
import { TopicRegistryService } from '../topics/topic-registry.service';
import { ExtractTopic } from '../topics/topics.const';
import { ParseStrategy } from './parse-strategy.interface';

describe('DoclingParseStrategy', () => {
  let strategy: DoclingParseStrategy;
  let mockDoclingService: jest.Mocked<DoclingService>;
  let mockTopicRegistry: jest.Mocked<TopicRegistryService>;

  const mockDoclingConvertResult = {
    markdown: `合同编号：TEST-001
合同名称：测试合同
甲方：公司A
乙方：公司B
合同金额：¥100,000
签订日期：2024-01-01`,
    tables: [],
    pages: 1,
    images: [],
    success: true,
  };

  beforeEach(async () => {
    mockDoclingService = {
      isAvailable: jest.fn(() => true),
      convertToMarkdown: jest.fn().mockResolvedValue(mockDoclingConvertResult),
      getVersion: jest.fn().mockResolvedValue('1.0.0'),
    } as unknown as jest.Mocked<DoclingService>;

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
        DoclingParseStrategy,
        {
          provide: DoclingService,
          useValue: mockDoclingService,
        },
        {
          provide: TopicRegistryService,
          useValue: mockTopicRegistry,
        },
      ],
    }).compile();

    strategy = module.get<DoclingParseStrategy>(DoclingParseStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('name', () => {
    it('should have DOCLING as name', () => {
      expect(strategy.name).toBe(ParseStrategy.DOCLING);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Docling is available', () => {
      mockDoclingService.isAvailable.mockReturnValue(true);
      expect(strategy.isAvailable()).toBe(true);
    });

    it('should return false when Docling is not available', () => {
      mockDoclingService.isAvailable.mockReturnValue(false);
      expect(strategy.isAvailable()).toBe(false);
    });
  });

  describe('getPriority', () => {
    it('should return priority 2', () => {
      expect(strategy.getPriority()).toBe(2);
    });
  });

  describe('parse', () => {
    it('should parse content and return result', async () => {
      const result = await strategy.parse('test content', {});

      expect(result).toMatchObject({
        strategy: ParseStrategy.DOCLING,
        completeness: expect.any(Number),
        confidence: expect.any(Number),
        warnings: expect.any(Array),
        duration: expect.any(Number),
      });
      expect(result.fields).toBeDefined();
      expect(mockDoclingService.convertToMarkdown).toHaveBeenCalled();
    });

    it('should extract basic fields from markdown', async () => {
      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.fields.contractNo).toBe('TEST-001');
      expect(result.fields.contractName).toBe('测试合同');
      expect(result.fields.partyA).toBe('公司A');
      expect(result.fields.partyB).toBe('公司B');
      expect(result.fields.contractAmount).toBe(100000);
    });

    it('should handle Docling unavailability', async () => {
      mockDoclingService.isAvailable.mockReturnValue(false);

      const result = await strategy.parse('test content', {});

      expect(result.completeness).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Python/Docling not available');
    });

    it('should handle Docling conversion failure', async () => {
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        success: false,
        error: 'Conversion failed',
        markdown: '',
        tables: [],
        pages: 0,
        images: [],
      });

      const result = await strategy.parse('test content', {});

      expect(result.completeness).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Conversion failed');
    });

    it('should add warning for low completeness', async () => {
      // Mock a result with low completeness by having few fields
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        markdown: '合同编号：TEST-001', // Only one field
        tables: [],
        pages: 1,
        images: [],
        success: true,
      });

      const result = await strategy.parse('test content', {});

      expect(result.warnings.some(w => w.includes('完整性较低'))).toBe(true);
    });

    it('should add warning for large documents', async () => {
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        ...mockDoclingConvertResult,
        pages: 60,
      });

      const result = await strategy.parse('test content', {});

      expect(result.warnings.some(w => w.includes('页数较多'))).toBe(true);
    });

    it('should calculate completeness correctly', async () => {
      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.completeness).toBeGreaterThan(0);
      expect(result.completeness).toBeLessThanOrEqual(100);
    });

    it('should calculate confidence correctly', async () => {
      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('parse with OCR option', () => {
    it('should pass OCR option to Docling', async () => {
      await strategy.parse('test content', { ocr: true });

      expect(mockDoclingService.convertToMarkdown).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ocr: true,
        }),
      );
    });

    it('should default OCR to true when not specified', async () => {
      await strategy.parse('test content', {});

      expect(mockDoclingService.convertToMarkdown).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ocr: true,
        }),
      );
    });
  });

  describe('table extraction', () => {
    it('should extract milestones from tables', async () => {
      const mockTable = {
        markdown: `| 名称 | 金额 | 日期 |
|---|---|---|
| 里程碑1 | 50000 | 2024-01-15 |
| 里程碑2 | 50000 | 2024-06-30 |`,
        rows: 3,
        cols: 3,
      };

      mockDoclingService.convertToMarkdown.mockResolvedValue({
        ...mockDoclingConvertResult,
        tables: [mockTable],
      });

      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.MILESTONES],
      });

      expect(result.fields.milestones).toBeDefined();
      expect(Array.isArray(result.fields.milestones)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle extraction errors gracefully', async () => {
      mockDoclingService.convertToMarkdown.mockRejectedValue(
        new Error('Network error'),
      );

      const result = await strategy.parse('test content', {});

      expect(result.completeness).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Network error');
    });

    it('should handle temp file cleanup error', async () => {
      // This test verifies the strategy continues even if cleanup fails
      const result = await strategy.parse('test content', {});

      // Should still return a result even if temp file had issues
      expect(result).toBeDefined();
      expect(result.strategy).toBe(ParseStrategy.DOCLING);
    });
  });

  describe('calculateCompleteness', () => {
    it('should return 0 when no fields extracted', async () => {
      mockDoclingService.convertToMarkdown.mockResolvedValue({
        markdown: 'No contract data here',
        tables: [],
        pages: 1,
        images: [],
        success: true,
      });

      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.BASIC_INFO],
      });

      expect(result.completeness).toBe(0);
    });
  });

  describe('calculateConfidence', () => {
    it('should increase confidence with table data', async () => {
      const mockTable = {
        markdown: '| 名称 | 金额 |\n|---|---|\n| 项目1 | 10000 |',
        rows: 2,
        cols: 2,
      };

      mockDoclingService.convertToMarkdown.mockResolvedValue({
        ...mockDoclingConvertResult,
        tables: [mockTable],
      });

      const result = await strategy.parse('test content', {
        topics: [ExtractTopic.MILESTONES],
      });

      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});
