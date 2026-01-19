import { Test, TestingModule } from '@nestjs/testing';

// Mock ParserService module first to avoid uuid import issues
jest.mock('../parser/parser.service', () => {
  return {
    ParserService: jest.fn().mockImplementation(() => ({
      parseDocument: jest.fn(),
    })),
  };
});

// Mock OpenAI
const mockOpenAICreate = jest.fn();
class MockOpenAI {
  chat = {
    completions: {
      create: mockOpenAICreate,
    },
  };
}

jest.mock('openai', () => {
  return {
    default: MockOpenAI,
  };
});

import { LlmParserService } from './llm-parser.service';
import { LlmConfigService } from './config/llm-config.service';
import { ParserService } from '../parser/parser.service';

// Mock ParserService instance
const mockParserService = {
  parseDocument: jest.fn(),
};

describe('LlmParserService', () => {
  let service: LlmParserService;
  let configService: LlmConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmParserService,
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
      ],
    }).compile();

    service = module.get<LlmParserService>(LlmParserService);
    configService = module.get<LlmConfigService>(LlmConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseContractWithLlm', () => {
    it('should successfully parse contract with valid LLM response', async () => {
      // Mock ParserService
      mockParserService.parseDocument.mockResolvedValue({
        success: true,
        text: '合同编号：CTR-2024-001\n合同名称：软件开发服务合同\n甲方：测试公司\n乙方：软件公司\n合同金额：1000000元',
        pageCount: 5,
      });

      // Mock OpenAI response
      const mockLlmResponse = {
        contractType: 'PROJECT_OUTSOURCING',
        basicInfo: {
          contractNo: 'CTR-2024-001',
          contractName: '软件开发服务合同',
          ourEntity: '软件公司',
          customerName: '测试公司',
          status: 'DRAFT',
        },
        financialInfo: {
          amountWithTax: '1000000',
          currency: 'CNY',
        },
        metadata: {
          overallConfidence: 0.95,
        },
      };

      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockLlmResponse),
            },
          },
        ],
      });

      const result = await service.parseContractWithLlm('test-object.pdf');

      expect(result.success).toBe(true);
      expect(result.extractedData).toBeDefined();
      expect(result.extractedData?.contractType).toBe('PROJECT_OUTSOURCING');
      expect(result.extractedData?.basicInfo.contractNo).toBe('CTR-2024-001');
      expect(result.llmModel).toBe('gpt-4o');
      expect(result.llmProvider).toBe('openai');
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

    it('should handle empty LLM response', async () => {
      mockParserService.parseDocument.mockResolvedValue({
        success: true,
        text: 'Test contract text',
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [],
      });

      const result = await service.parseContractWithLlm('test-object.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty response from LLM');
    });

    it('should handle invalid JSON from LLM', async () => {
      mockParserService.parseDocument.mockResolvedValue({
        success: true,
        text: 'Test contract text',
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON {{{',
            },
          },
        ],
      });

      const result = await service.parseContractWithLlm('test-object.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing required fields in extracted data', async () => {
      mockParserService.parseDocument.mockResolvedValue({
        success: true,
        text: 'Test contract text',
      });

      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                // Missing contractType and basicInfo
                financialInfo: {
                  amountWithTax: '1000000',
                },
              }),
            },
          },
        ],
      });

      const result = await service.parseContractWithLlm('test-object.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
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
});
