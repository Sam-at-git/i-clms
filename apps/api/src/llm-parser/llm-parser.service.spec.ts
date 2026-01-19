import { Test, TestingModule } from '@nestjs/testing';
import { ParseStrategy } from './entities/completeness-score.entity';

// Mock OpenAI before import
const mockOpenAICreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockOpenAICreate,
        },
      },
    })),
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

// Mock ParserService
jest.mock('../parser/parser.service', () => {
  return {
    ParserService: jest.fn().mockImplementation(() => ({
      parseDocument: jest.fn(),
    })),
  };
});

import { LlmParserService } from './llm-parser.service';
import { LlmConfigService } from './config/llm-config.service';
import { ParserService } from '../parser/parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { ChunkingStrategyService } from './chunking-strategy.service';

// Test fixtures
const completeExtractedFields = {
  contractNumber: 'CTR-2026-001',
  title: '软件开发服务合同',
  contractType: 'PROJECT_OUTSOURCING',
  firstPartyName: '某某科技有限公司',
  secondPartyName: '某某软件股份有限公司',
  totalAmount: 1000000,
  currency: 'CNY',
  taxRate: 0.06,
  paymentTerms: '按里程碑付款',
  signDate: '2026-01-15',
  startDate: '2026-02-01',
  endDate: '2026-12-31',
  duration: '11个月',
  industry: 'IT服务',
  governingLaw: '中华人民共和国法律',
  signLocation: '上海市',
  salesPerson: '张三',
};

const partialExtractedFields = {
  contractNumber: 'CTR-2026-002',
  title: '采购合同',
  firstPartyName: '买方公司',
  secondPartyName: '卖方公司',
  totalAmount: 500000,
  currency: 'CNY',
  taxRate: 0.06,
  paymentTerms: '到货付款',
};

const minimalExtractedFields = {
  contractNumber: 'CTR-2026-003',
};

describe('LlmParserService', () => {
  let service: LlmParserService;
  let configService: LlmConfigService;
  let completenessChecker: CompletenessCheckerService;
  let mockParserService: { parseDocument: jest.Mock };

  beforeEach(async () => {
    mockOpenAICreate.mockClear();
    mockParserService = { parseDocument: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmParserService,
        CompletenessCheckerService,
        {
          provide: LlmConfigService,
          useValue: {
            getActiveConfig: jest.fn().mockReturnValue({
              baseUrl: 'https://api.openai.com/v1',
              apiKey: 'sk-test-key',
              model: 'gpt-4o',
              temperature: 0.1,
              maxTokens: 4000,
              timeout: 60000,
            }),
            getProviderName: jest.fn().mockReturnValue('openai'),
          },
        },
        {
          provide: ParserService,
          useValue: mockParserService,
        },
        {
          provide: ChunkingStrategyService,
          useValue: {
            determineStrategy: jest.fn().mockReturnValue({
              strategy: 'single',
              chunks: [{ text: 'chunk text', purpose: 'test', targetFields: [] }],
              reason: 'Test reason',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LlmParserService>(LlmParserService);
    configService = module.get<LlmConfigService>(LlmConfigService);
    completenessChecker = module.get<CompletenessCheckerService>(CompletenessCheckerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseWithMixedStrategy', () => {
    // TEST-019: High score direct use
    it('should use DIRECT_USE strategy when score >= 70 and not call LLM', async () => {
      const result = await service.parseWithMixedStrategy(
        '合同文本内容',
        completeExtractedFields,
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ParseStrategy.DIRECT_USE);
      expect(result.llmTokensUsed).toBe(0);
      expect(mockOpenAICreate).not.toHaveBeenCalled();
      expect(result.hybridStrategy?.usedLlm).toBe(false);
    });

    // TEST-020: Medium score validation mode
    it('should use LLM_VALIDATION strategy when score is 50-69', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                validationResults: [
                  {
                    field: 'title',
                    isCorrect: true,
                    programValue: '采购合同',
                  },
                ],
                additionalFields: {},
              }),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const result = await service.parseWithMixedStrategy(
        '合同文本内容',
        partialExtractedFields,
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ParseStrategy.LLM_VALIDATION);
      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(result.hybridStrategy?.usedValidation).toBe(true);
    });

    // TEST-021: Low score full extraction
    it('should use LLM_FULL_EXTRACTION strategy when score < 50', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                contractNumber: 'CTR-2026-003',
                title: 'Extracted Title',
                totalAmount: 100000,
              }),
            },
          },
        ],
        usage: { prompt_tokens: 200, completion_tokens: 100 },
      });

      const result = await service.parseWithMixedStrategy(
        '合同文本内容',
        minimalExtractedFields,
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ParseStrategy.LLM_FULL_EXTRACTION);
      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(result.hybridStrategy?.usedLlm).toBe(true);
      expect(result.hybridStrategy?.usedValidation).toBe(false);
    });

    // TEST-022: Force strategy parameter
    it('should use forced strategy when specified', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                validationResults: [],
                additionalFields: {},
              }),
            },
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 25 },
      });

      // Force validation even with high score
      const result = await service.parseWithMixedStrategy(
        '合同文本内容',
        completeExtractedFields,
        ParseStrategy.LLM_VALIDATION,
      );

      expect(result.success).toBe(true);
      expect(result.strategyUsed).toBe(ParseStrategy.LLM_VALIDATION);
    });

    // TEST-023: Validation result merge
    it('should correctly merge validation corrections', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                validationResults: [
                  {
                    field: 'totalAmount',
                    isCorrect: false,
                    programValue: 500000,
                    correctedValue: 600000,
                  },
                ],
                additionalFields: {
                  newField: 'newValue',
                },
              }),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const result = await service.parseWithMixedStrategy(
        '合同文本',
        partialExtractedFields,
      );

      expect(result.success).toBe(true);
      expect(result.extractedDataJson?.totalAmount).toBe(600000);
      expect(result.extractedDataJson?.newField).toBe('newValue');
    });

    // TEST-025: Processing time recorded
    it('should record processing time', async () => {
      const result = await service.parseWithMixedStrategy(
        '合同文本',
        completeExtractedFields,
      );

      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    // TEST-026: Token statistics
    it('should record token usage for LLM calls', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                contractNumber: 'CTR-001',
                title: 'Test',
              }),
            },
          },
        ],
        usage: { prompt_tokens: 200, completion_tokens: 100 },
      });

      const result = await service.parseWithMixedStrategy(
        '合同文本',
        minimalExtractedFields,
      );

      expect(result.llmTokensUsed).toBe(300);
    });

    // TEST-027: Confidence calculation
    it('should calculate confidence based on strategy', async () => {
      // Direct use should have confidence based on score
      const directResult = await service.parseWithMixedStrategy(
        '合同文本',
        completeExtractedFields,
      );
      expect(directResult.confidence).toBe(1); // 100/100

      // Full extraction has fixed confidence
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const fullResult = await service.parseWithMixedStrategy(
        '合同文本',
        minimalExtractedFields,
      );
      expect(fullResult.confidence).toBe(0.85);
    });

    // TEST-028: Warning collection
    it('should collect warnings when validation fails and falls back', async () => {
      mockOpenAICreate
        .mockRejectedValueOnce(new Error('Validation API error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"data": "fallback"}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        });

      const result = await service.parseWithMixedStrategy(
        '合同文本',
        partialExtractedFields,
      );

      // Should have fallen back to full extraction with warning
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings?.[0]).toContain('Validation failed');
    });

    it('should handle errors gracefully', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('API Error'));

      const result = await service.parseWithMixedStrategy(
        '合同文本',
        minimalExtractedFields,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
      expect(result.processingTimeMs).toBeDefined();
    });
  });

  describe('parseContractWithLlm (legacy)', () => {
    it('should successfully parse contract with valid LLM response', async () => {
      mockParserService.parseDocument.mockResolvedValue({
        success: true,
        text: '合同编号：CTR-2024-001\n合同名称：软件开发服务合同',
        pageCount: 5,
        extractedFields: completeExtractedFields,
      });

      const result = await service.parseContractWithLlm('test-object.pdf');

      expect(result.success).toBe(true);
      expect(result.hybridStrategy?.usedLlm).toBe(false);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle parser service failure', async () => {
      mockParserService.parseDocument.mockResolvedValue({
        success: false,
        error: 'Failed to extract text',
      });

      const result = await service.parseContractWithLlm('test-object.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to extract text');
    });

    it('should use LLM when completeness is low', async () => {
      mockParserService.parseDocument.mockResolvedValue({
        success: true,
        text: '合同内容',
        pageCount: 1,
        extractedFields: minimalExtractedFields,
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                contractType: 'PROJECT_OUTSOURCING',
                basicInfo: {
                  contractNo: 'CTR-2026-003',
                  contractName: 'Extracted',
                  status: 'DRAFT',
                },
              }),
            },
          },
        ],
      });

      const result = await service.parseContractWithLlm('test-object.pdf');

      expect(result.success).toBe(true);
      expect(result.hybridStrategy?.usedLlm).toBe(true);
    });
  });

  describe('data cleaning', () => {
    it('should clean amount strings correctly', () => {
      const cleanAmount = service['cleanAmount'].bind(service);

      expect(cleanAmount('1,000,000')).toBe('1000000');
      expect(cleanAmount('1 000 000')).toBe('1000000');
      expect(cleanAmount('1000000.50')).toBe('1000000.50');
      expect(cleanAmount(1000000)).toBe('1000000');
      expect(cleanAmount('invalid')).toBeUndefined();
      expect(cleanAmount(null)).toBeUndefined();
    });

    it('should clean date strings correctly', () => {
      const cleanDate = service['cleanDate'].bind(service);

      expect(cleanDate('2024-01-15')).toBe('2024-01-15');
      expect(cleanDate('2024/01/15')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(cleanDate('invalid')).toBeUndefined();
      expect(cleanDate(null)).toBeUndefined();
    });

    it('should clean string values correctly', () => {
      const cleanString = service['cleanString'].bind(service);

      expect(cleanString('  test  ')).toBe('test');
      expect(cleanString('')).toBeUndefined();
      expect(cleanString('   ')).toBeUndefined();
      expect(cleanString(null)).toBeUndefined();
      expect(cleanString(123)).toBeUndefined();
    });
  });

  describe('helper methods', () => {
    it('should get nested values correctly', () => {
      const getNestedValue = service['getNestedValue'].bind(service);

      const obj = {
        level1: {
          level2: {
            value: 'found',
          },
        },
      };

      expect(getNestedValue(obj, 'level1.level2.value')).toBe('found');
      expect(getNestedValue(obj, 'level1.missing')).toBeUndefined();
      expect(getNestedValue(null, 'any')).toBeUndefined();
    });

    it('should set nested values correctly', () => {
      const setNestedValue = service['setNestedValue'].bind(service);

      const obj: any = {};
      setNestedValue(obj, 'level1.level2.value', 'set');

      expect(obj.level1.level2.value).toBe('set');
    });

    it('should merge extracted fields correctly', () => {
      const mergeExtractedFields = service['mergeExtractedFields'].bind(service);

      const program = { field1: 'program', field2: 'program' };
      const llm = { field2: 'llm', field3: 'llm' };
      const missing = ['field2', 'field3'];

      const merged = mergeExtractedFields(program, llm, missing);

      expect(merged.field1).toBe('program');
      expect(merged.field2).toBe('llm'); // Filled from LLM since missing
      expect(merged.field3).toBe('llm');
    });
  });
});
