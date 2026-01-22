import { Test, TestingModule } from '@nestjs/testing';
import { ParseStrategy, CompletenessScore } from './entities/completeness-score.entity';
import { LlmParseResult } from './dto/llm-parse-result.dto';
import { SemanticChunkerService } from './semantic-chunker.service';
import { OptimizedParserService } from './optimized-parser.service';

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

// Mock parse-strategy.dto to avoid decorator issues in test context
jest.mock('./dto/parse-strategy.dto', () => ({
  ParseStrategyType: {
    RULE: 'RULE',
    LLM: 'LLM',
    DOCLING: 'DOCLING',
    RAG: 'RAG',
    MULTI: 'MULTI',
  },
  StrategyCost: {
    FREE: 'free',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
  },
  registerEnumType: jest.fn(),
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
import { ParseProgressService } from './parse-progress.service';
import { TaskBasedParserService } from './task-based-parser.service';
import { TopicRegistryService } from './topics/topic-registry.service';
import { ParseStrategyService } from './parse-strategy.service';
import { MultiStrategyService } from './multi-strategy.service';
import { LLMEvaluatorService } from './evaluation/llm-evaluator.service';

describe('LlmParserResolver', () => {
  let resolver: LlmParserResolver;
  let llmParserService: jest.Mocked<LlmParserService>;
  let completenessChecker: jest.Mocked<CompletenessCheckerService>;
  let progressService: jest.Mocked<ParseProgressService>;
  let taskBasedParser: jest.Mocked<TaskBasedParserService>;
  let topicRegistry: jest.Mocked<TopicRegistryService>;
  let parseStrategyService: jest.Mocked<ParseStrategyService>;

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
        {
          provide: SemanticChunkerService,
          useValue: {
            chunkBySemanticStructure: jest.fn(),
            getRelevantChunksForFields: jest.fn(),
            chunkText: jest.fn(),
          },
        },
        {
          provide: OptimizedParserService,
          useValue: {
            parseOptimized: jest.fn(),
          },
        },
        {
          provide: ParseProgressService,
          useValue: {
            createSession: jest.fn().mockReturnValue('test-session-id'),
            getSession: jest.fn(),
            getParseProgress: jest.fn(),
            getProgressPercentage: jest.fn(),
            completeSession: jest.fn(),
            failSession: jest.fn(),
            updateStage: jest.fn(),
            setChunks: jest.fn(),
            setTasks: jest.fn(),
            startChunk: jest.fn(),
            completeChunk: jest.fn(),
            failChunk: jest.fn(),
            startTask: jest.fn(),
            completeTask: jest.fn(),
            failTask: jest.fn(),
            getAllSessions: jest.fn(),
            cleanupExpiredSessions: jest.fn(),
          },
        },
        {
          provide: TaskBasedParserService,
          useValue: {
            parseByTasks: jest.fn(),
            refreshClient: jest.fn(),
          },
        },
        {
          provide: TopicRegistryService,
          useValue: {
            getAllTopics: jest.fn().mockReturnValue([]),
            getTopic: jest.fn(),
            getTopicFields: jest.fn().mockReturnValue([]),
            calculateCompleteness: jest.fn().mockReturnValue({
              score: 80,
              total: 12.8,
              maxScore: 16,
              topicScores: [],
            }),
            getTopicFieldValues: jest.fn().mockReturnValue([]),
            getMissingFields: jest.fn().mockReturnValue([]),
            hasTopic: jest.fn().mockReturnValue(true),
            getTopicCount: jest.fn().mockReturnValue(8),
            getTotalWeight: jest.fn().mockReturnValue(16),
          },
        },
        {
          provide: ParseStrategyService,
          useValue: {
            getAvailableStrategies: jest.fn().mockResolvedValue([]),
            getStrategyConfig: jest.fn().mockReturnValue({}),
            updateStrategyConfig: jest.fn().mockReturnValue({}),
            testStrategyAvailability: jest.fn().mockResolvedValue({}),
            testAllStrategies: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: MultiStrategyService,
          useValue: {
            parseWithMulti: jest.fn().mockResolvedValue({
              results: [],
              finalFields: {},
              voteResults: [],
              overallConfidence: 0,
              conflicts: [],
              warnings: [],
              duration: 0,
            }),
            getParseResult: jest.fn(),
            resolveConflicts: jest.fn(),
            compareSessions: jest.fn(),
            cleanupOldSessions: jest.fn(),
          },
        },
        {
          provide: LLMEvaluatorService,
          useValue: {
            evaluateConflict: jest.fn(),
            evaluateSimilarity: jest.fn(),
            evaluateQuality: jest.fn(),
            batchEvaluate: jest.fn(),
            batchEvaluateConflicts: jest.fn(),
            resolveConflictEnhanced: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<LlmParserResolver>(LlmParserResolver);
    llmParserService = module.get(LlmParserService) as jest.Mocked<LlmParserService>;
    completenessChecker = module.get(
      CompletenessCheckerService,
    ) as jest.Mocked<CompletenessCheckerService>;
    progressService = module.get(ParseProgressService) as jest.Mocked<ParseProgressService>;
    taskBasedParser = module.get(TaskBasedParserService) as jest.Mocked<TaskBasedParserService>;
    topicRegistry = module.get(TopicRegistryService) as jest.Mocked<TopicRegistryService>;
    parseStrategyService = module.get(ParseStrategyService) as jest.Mocked<ParseStrategyService>;
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

      expect(llmParserService.parseContractWithLlm).toHaveBeenCalledWith('contract.pdf', undefined);
      expect(result).toEqual(mockParseResult);
    });

    it('should call service with object name and sessionId', async () => {
      llmParserService.parseContractWithLlm.mockResolvedValue(mockParseResult);

      const result = await resolver.parseContractWithLlm('contract.pdf', 'test-session-123');

      expect(llmParserService.parseContractWithLlm).toHaveBeenCalledWith('contract.pdf', 'test-session-123');
      expect(result).toEqual(mockParseResult);
    });
  });

  describe('createParseSession', () => {
    it('should create a new parse session and return sessionId', () => {
      progressService.createSession.mockReturnValue('new-session-id');

      const sessionId = resolver.createParseSession('contract.pdf');

      expect(progressService.createSession).toHaveBeenCalledWith('contract.pdf');
      expect(sessionId).toBe('new-session-id');
    });
  });

  describe('startParseContractAsync', () => {
    it('should start async parsing and return sessionId immediately', async () => {
      progressService.createSession.mockReturnValue('async-session-123');
      llmParserService.parseContractWithLlm.mockResolvedValue(mockParseResult);

      const result = await resolver.startParseContractAsync('contract.pdf');

      expect(progressService.createSession).toHaveBeenCalledWith('contract.pdf');
      expect(result.sessionId).toBe('async-session-123');
      expect(result.message).toContain('解析任务已启动');

      // Service should be called in background (not awaited)
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(llmParserService.parseContractWithLlm).toHaveBeenCalledWith('contract.pdf', 'async-session-123');
    });

    it('should handle background errors by failing the session', async () => {
      progressService.createSession.mockReturnValue('async-session-fail');
      llmParserService.parseContractWithLlm.mockRejectedValue(new Error('Parse failed'));

      const result = await resolver.startParseContractAsync('contract.pdf');

      expect(result.sessionId).toBe('async-session-fail');

      // Wait for background execution
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(progressService.failSession).toHaveBeenCalledWith('async-session-fail', 'Parse failed');
    });
  });

  describe('getParseProgress', () => {
    it('should return progress for a valid session', () => {
      const mockSession = {
        sessionId: 'test-session',
        objectName: 'contract.pdf',
        status: 'llm_processing' as const,
        currentStage: 'Extracting contract data',
        totalChunks: 5,
        completedChunks: 2,
        currentChunkIndex: 2,
        chunks: [],
        totalTasks: 8,
        completedTasks: 3,
        tasks: [],
        startTime: Date.now(),
      };
      progressService.getSession.mockReturnValue(mockSession as any);
      progressService.getProgressPercentage.mockReturnValue(40);

      const result = resolver.getParseProgress('test-session');

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe('test-session');
      expect(result?.progressPercentage).toBe(40);
      expect(result?.status).toBe('llm_processing');
    });

    it('should return null for non-existent session', () => {
      progressService.getSession.mockReturnValue(undefined);

      const result = resolver.getParseProgress('non-existent');

      expect(result).toBeNull();
    });

    it('should calculate estimated remaining time', () => {
      const futureTime = Date.now() + 30000; // 30 seconds in future
      const mockSession = {
        sessionId: 'test-session',
        objectName: 'contract.pdf',
        status: 'llm_processing' as const,
        currentStage: 'Processing',
        totalChunks: 5,
        completedChunks: 2,
        currentChunkIndex: 2,
        chunks: [],
        totalTasks: 8,
        completedTasks: 3,
        tasks: [],
        startTime: Date.now() - 10000,
        estimatedEndTime: futureTime,
      };
      progressService.getSession.mockReturnValue(mockSession as any);
      progressService.getProgressPercentage.mockReturnValue(40);

      const result = resolver.getParseProgress('test-session');

      expect(result?.estimatedRemainingSeconds).toBeGreaterThanOrEqual(0);
      expect(result?.estimatedRemainingSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe('getParseResult', () => {
    it('should return null for non-existent session', () => {
      progressService.getSession.mockReturnValue(undefined);

      const result = resolver.getParseResult('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for incomplete session', () => {
      const mockSession = {
        sessionId: 'test-session',
        objectName: 'contract.pdf',
        status: 'llm_processing' as const,
        currentStage: 'Processing',
        totalChunks: 5,
        completedChunks: 2,
        currentChunkIndex: 2,
        chunks: [],
        totalTasks: 8,
        completedTasks: 3,
        tasks: [],
        startTime: Date.now(),
      };
      progressService.getSession.mockReturnValue(mockSession as any);

      const result = resolver.getParseResult('test-session');

      expect(result).toBeNull();
    });
  });

  // TEST-032: Authentication would be tested in e2e tests
  // The @UseGuards(GqlAuthGuard) decorator ensures authentication
  // Unit tests don't cover guard execution
});
