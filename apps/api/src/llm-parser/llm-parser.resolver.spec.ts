import { Test, TestingModule } from '@nestjs/testing';
import { ParseStrategy, CompletenessScore } from './entities/completeness-score.entity';
import { LlmParseResult } from './dto/llm-parse-result.dto';

// Mock dependencies to avoid ESM import issues
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  })),
}));

// Mock file-type to avoid ESM issues
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

// Mock ParserService to avoid the import chain
jest.mock('../parser/parser.service', () => ({
  ParserService: jest.fn().mockImplementation(() => ({
    parseDocument: jest.fn(),
  })),
}));

// Import after mocks
import { LlmParserResolver } from './llm-parser.resolver';
import { LlmParserService } from './llm-parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';

describe('LlmParserResolver', () => {
  let resolver: LlmParserResolver;
  let llmParserService: jest.Mocked<LlmParserService>;
  let completenessChecker: jest.Mocked<CompletenessCheckerService>;

  const mockCompletenessScore: CompletenessScore = {
    totalScore: 80,
    maxScore: 100,
    percentage: 80,
    strategy: ParseStrategy.DIRECT_USE,
    categoryScores: {
      basic: 40,
      financial: 25,
      temporal: 10,
      other: 5,
    },
    details: [
      {
        field: 'contractNumber',
        category: 'basic',
        maxScore: 8,
        actualScore: 8,
        hasValue: true,
      },
    ],
  };

  const mockParseResult: LlmParseResult = {
    success: true,
    extractedDataJson: { contractNumber: 'CTR-001' },
    completenessScore: mockCompletenessScore,
    strategyUsed: ParseStrategy.DIRECT_USE,
    confidence: 0.8,
    processingTimeMs: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmParserResolver,
        {
          provide: LlmParserService,
          useValue: {
            parseWithMixedStrategy: jest.fn(),
            parseContractWithLlm: jest.fn(),
          },
        },
        {
          provide: CompletenessCheckerService,
          useValue: {
            calculateScore: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<LlmParserResolver>(LlmParserResolver);
    llmParserService = module.get(LlmParserService) as jest.Mocked<LlmParserService>;
    completenessChecker = module.get(
      CompletenessCheckerService,
    ) as jest.Mocked<CompletenessCheckerService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('calculateCompleteness', () => {
    // TEST-029: calculateCompleteness query
    it('should return completeness score for provided fields', () => {
      completenessChecker.calculateScore.mockReturnValue(mockCompletenessScore);

      const result = resolver.calculateCompleteness({
        contractNumber: 'CTR-001',
        title: '测试合同',
      });

      expect(completenessChecker.calculateScore).toHaveBeenCalledWith({
        contractNumber: 'CTR-001',
        title: '测试合同',
      });
      expect(result).toEqual(mockCompletenessScore);
      expect(result.totalScore).toBe(80);
      expect(result.strategy).toBe(ParseStrategy.DIRECT_USE);
    });

    it('should handle empty fields', () => {
      const emptyScore: CompletenessScore = {
        totalScore: 0,
        maxScore: 100,
        percentage: 0,
        strategy: ParseStrategy.LLM_FULL_EXTRACTION,
        categoryScores: { basic: 0, financial: 0, temporal: 0, other: 0 },
        details: [],
      };
      completenessChecker.calculateScore.mockReturnValue(emptyScore);

      const result = resolver.calculateCompleteness({});

      expect(result.totalScore).toBe(0);
      expect(result.strategy).toBe(ParseStrategy.LLM_FULL_EXTRACTION);
    });
  });

  describe('parseWithLlm', () => {
    // TEST-030: parseWithLlm mutation
    it('should return parse result for valid input', async () => {
      llmParserService.parseWithMixedStrategy.mockResolvedValue(mockParseResult);

      const result = await resolver.parseWithLlm({
        textContent: '合同内容...',
        programmaticResult: { contractNumber: 'CTR-001' },
      });

      expect(llmParserService.parseWithMixedStrategy).toHaveBeenCalledWith(
        '合同内容...',
        { contractNumber: 'CTR-001' },
        undefined,
      );
      expect(result).toEqual(mockParseResult);
      expect(result.success).toBe(true);
    });

    // TEST-031: Parameter validation
    it('should pass all parameters to service', async () => {
      llmParserService.parseWithMixedStrategy.mockResolvedValue(mockParseResult);

      await resolver.parseWithLlm({
        contractId: 'contract-123',
        textContent: '合同内容',
        programmaticResult: { field: 'value' },
        forceStrategy: ParseStrategy.LLM_VALIDATION,
      });

      expect(llmParserService.parseWithMixedStrategy).toHaveBeenCalledWith(
        '合同内容',
        { field: 'value' },
        ParseStrategy.LLM_VALIDATION,
      );
    });

    it('should handle missing optional parameters', async () => {
      llmParserService.parseWithMixedStrategy.mockResolvedValue(mockParseResult);

      await resolver.parseWithLlm({
        textContent: '仅文本',
      });

      expect(llmParserService.parseWithMixedStrategy).toHaveBeenCalledWith(
        '仅文本',
        undefined,
        undefined,
      );
    });

    it('should handle service errors', async () => {
      llmParserService.parseWithMixedStrategy.mockResolvedValue({
        success: false,
        error: 'Parsing failed',
        processingTimeMs: 50,
      });

      const result = await resolver.parseWithLlm({
        textContent: '内容',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parsing failed');
    });
  });

  describe('parseContractWithLlm', () => {
    it('should call service with object name', async () => {
      llmParserService.parseContractWithLlm.mockResolvedValue(mockParseResult);

      const result = await resolver.parseContractWithLlm('contract.pdf');

      expect(llmParserService.parseContractWithLlm).toHaveBeenCalledWith('contract.pdf');
      expect(result).toEqual(mockParseResult);
    });
  });

  // TEST-032: Authentication would be tested in e2e tests
  // The @UseGuards(GqlAuthGuard) decorator ensures authentication
  // Unit tests don't cover guard execution
});
