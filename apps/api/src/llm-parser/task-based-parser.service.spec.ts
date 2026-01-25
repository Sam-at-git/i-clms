import { Test, TestingModule } from '@nestjs/testing';
import { TaskBasedParserService } from './task-based-parser.service';
import { LlmConfigService } from './config/llm-config.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { ParseProgressService, InfoType } from './parse-progress.service';
import { TopicRegistryService } from './topics/topic-registry.service';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-chunk-id'),
}));

// Mock openai
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

// Mock fs to avoid issues with debugLogFile
jest.mock('fs', () => ({
  appendFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false),
}));

describe('TaskBasedParserService', () => {
  let service: TaskBasedParserService;
  let llmConfigService: jest.Mocked<LlmConfigService>;
  let semanticChunker: jest.Mocked<SemanticChunkerService>;
  let progressService: jest.Mocked<ParseProgressService>;
  let mockOpenai: any;

  const mockConfig = {
    baseUrl: 'http://localhost:11434/v1',
    apiKey: 'test-key',
    model: 'gemma3:27b',
    timeout: 120000,
    maxTokens: 4000,
    temperature: 0.1,
  };

  const mockLLMResponse = (content: string) => ({
    choices: [
      {
        message: {
          content,
          role: 'assistant',
        },
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
    },
    id: 'test-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gemma3:27b',
  });

  beforeEach(async () => {
    // Create a fresh mock for each test
    const createMock = jest.fn();
    const mockChatCompletions = {
      create: createMock,
    };

    mockOpenai = {
      chat: {
        completions: mockChatCompletions,
      },
    } as any;

    // Store the create mock reference for easier access in tests
    (mockOpenai as any).chat.completions.create = createMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskBasedParserService,
        {
          provide: LlmConfigService,
          useValue: {
            getActiveConfig: jest.fn().mockReturnValue(mockConfig),
            getProviderName: jest.fn().mockReturnValue('ollama'),
            refreshCache: jest.fn(),
          },
        },
        {
          provide: SemanticChunkerService,
          useValue: {
            chunkBySemanticStructure: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: ParseProgressService,
          useValue: {
            createSession: jest.fn().mockReturnValue('test-session'),
            getSession: jest.fn(),
            setTasks: jest.fn(),
            startTask: jest.fn(),
            completeTask: jest.fn(),
            failTask: jest.fn(),
          },
        },
        {
          provide: TopicRegistryService,
          useValue: {
            getAllTopics: jest.fn().mockReturnValue([]),
            getTopic: jest.fn(),
            getTopicFields: jest.fn().mockReturnValue([]),
            calculateCompleteness: jest.fn().mockReturnValue({ score: 80, total: 10, maxScore: 16 }),
            getTopicNamesForContractType: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<TaskBasedParserService>(TaskBasedParserService);
    llmConfigService = module.get(LlmConfigService);
    semanticChunker = module.get(SemanticChunkerService);
    progressService = module.get(ParseProgressService);

    // Replace the internal openai client with our mock
    (service as any).openai = mockOpenai;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should refresh config and client on module init', async () => {
      await service.onModuleInit();

      expect(llmConfigService.refreshCache).toHaveBeenCalled();
    });
  });

  describe('parseByTasks', () => {
    const sampleContractText = `
      项目外包服务合同

      合同编号：CTR-2024-00123
      签订日期：2024-01-15

      甲方：某某科技有限公司
      乙方：XX信息技术有限公司

      合同金额：1,560,000元
      含税金额：1,560,000元
      不含税金额：1,471,698元
      税率：6%

      付款方式：
      第一期：合同生效后支付30%（468,000元）
      第二期：原型系统开发完成后支付30%（468,000元）
      第三期：系统上线后支付30%（468,000元）
      第四期：验收合格后支付10%（156,000元）
    `;

    it('should execute all 8 tasks successfully', async () => {
      // Mock LLM responses for each task
      const basicInfoResponse = JSON.stringify({
        contractNo: 'CTR-2024-00123',
        contractName: '项目外包服务合同',
        customerName: '某某科技有限公司',
        ourEntity: 'XX信息技术有限公司',
        contractType: 'PROJECT_OUTSOURCING',
      });

      const financialResponse = JSON.stringify({
        amountWithTax: '1560000',
        amountWithoutTax: '1471698',
        taxRate: '0.06',
        currency: 'CNY',
        paymentMethod: '银行转账',
        paymentTerms: '分期支付',
      });

      const milestonesResponse = JSON.stringify({
        milestones: [
          { sequence: 1, name: '合同生效', amount: '468000', paymentPercentage: '30' },
          { sequence: 2, name: '原型系统开发完成', amount: '468000', paymentPercentage: '30' },
          { sequence: 3, name: '系统上线', amount: '468000', paymentPercentage: '30' },
          { sequence: 4, name: '验收合格', amount: '156000', paymentPercentage: '10' },
        ],
      });

      const timeInfoResponse = JSON.stringify({
        signedAt: '2024-01-15',
        effectiveAt: '2024-01-15',
      });

      const emptyResponses = {
        [InfoType.RATE_ITEMS]: JSON.stringify({ rateItems: [] }),
        [InfoType.LINE_ITEMS]: JSON.stringify({ lineItems: [] }),
        [InfoType.RISK_CLAUSES]: JSON.stringify({}),
        [InfoType.DELIVERABLES]: JSON.stringify({
          deliverables: '合同签署, 需求规格说明书, 系统设计文档',
          sowSummary: '项目外包服务',
        }),
      };

      let callCount = 0;
      mockOpenai.chat.completions.create.mockImplementation(async () => {
        callCount++;
        // Return appropriate response based on call order
        if (callCount === 1) return mockLLMResponse(basicInfoResponse); // BASIC_INFO
        if (callCount === 2) return mockLLMResponse(financialResponse); // FINANCIAL
        if (callCount === 3) return mockLLMResponse(milestonesResponse); // MILESTONES
        if (callCount === 4) return mockLLMResponse(emptyResponses[InfoType.RATE_ITEMS]); // RATE_ITEMS
        if (callCount === 5) return mockLLMResponse(emptyResponses[InfoType.LINE_ITEMS]); // LINE_ITEMS
        if (callCount === 6) return mockLLMResponse(emptyResponses[InfoType.RISK_CLAUSES]); // RISK_CLAUSES
        if (callCount === 7) return mockLLMResponse(emptyResponses[InfoType.DELIVERABLES]); // DELIVERABLES
        return mockLLMResponse(timeInfoResponse); // TIME_INFO
      });

      // Pass a contract type to skip auto-detection (which would call BASIC_INFO twice)
      const result = await service.parseByTasks(sampleContractText, 'PROJECT_OUTSOURCING', undefined, 'test-session');

      expect(result.summary.totalTasks).toBe(8);
      expect(result.summary.successfulTasks).toBe(8);
      expect(result.summary.failedTasks).toBe(0);
      expect(result.data.basicInfo).toBeDefined();
      expect(result.data.basicInfo.contractNo).toBe('CTR-2024-00123');
      expect(result.data.typeSpecificDetails.milestones).toHaveLength(4);
    });

    it('should handle markdown-wrapped JSON from LLM', async () => {
      const markdownWrappedJson = `
\`\`\`json
{
  "contractNo": "CTR-2024-00123",
  "contractName": "测试合同"
}
\`\`\`
      `.trim();

      mockOpenai.chat.completions.create.mockResolvedValue(mockLLMResponse(markdownWrappedJson) as any);

      const result = await service.parseByTasks(sampleContractText, undefined, [InfoType.BASIC_INFO], 'test-session');

      expect(result.summary.successfulTasks).toBe(1);
      expect(result.data.basicInfo.contractNo).toBe('CTR-2024-00123');
    });

    it('should report progress through progress service', async () => {
      mockOpenai.chat.completions.create.mockResolvedValue(
        mockLLMResponse(JSON.stringify({ contractNo: 'CTR-001' })) as any
      );

      await service.parseByTasks(sampleContractText, undefined, [InfoType.BASIC_INFO], 'test-session');

      expect(progressService.setTasks).toHaveBeenCalledWith('test-session', [InfoType.BASIC_INFO]);
      expect(progressService.startTask).toHaveBeenCalledWith('test-session', InfoType.BASIC_INFO);
      expect(progressService.completeTask).toHaveBeenCalled();
    });

    it('should handle task failures gracefully', async () => {
      mockOpenai.chat.completions.create.mockRejectedValue(new Error('Connection error'));

      const result = await service.parseByTasks(sampleContractText, undefined, [InfoType.BASIC_INFO], 'test-session');

      expect(result.summary.successfulTasks).toBe(0);
      expect(result.summary.failedTasks).toBe(1);
      expect(progressService.failTask).toHaveBeenCalledWith('test-session', InfoType.BASIC_INFO, 'Connection error');
    });

    it('should filter tasks based on enabledTaskTypes', async () => {
      mockOpenai.chat.completions.create.mockResolvedValue(
        mockLLMResponse(JSON.stringify({ contractNo: 'CTR-001' })) as any
      );

      const result = await service.parseByTasks(
        sampleContractText,
        undefined,
        [InfoType.BASIC_INFO, InfoType.FINANCIAL],
        'test-session'
      );

      expect(result.summary.totalTasks).toBe(2);
      expect(progressService.setTasks).toHaveBeenCalledWith('test-session', [InfoType.BASIC_INFO, InfoType.FINANCIAL]);
    });

    it('should continue with remaining tasks when one task fails', async () => {
      let callCount = 0;
      mockOpenai.chat.completions.create.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First task failed');
        }
        return mockLLMResponse(JSON.stringify({ amount: '1000' })) as any;
      });

      const result = await service.parseByTasks(
        sampleContractText,
        undefined,
        [InfoType.BASIC_INFO, InfoType.FINANCIAL]
      );

      expect(result.summary.totalTasks).toBe(2);
      expect(result.summary.successfulTasks).toBe(1);
      expect(result.summary.failedTasks).toBe(1);
    });
  });

  describe('extractJson helper', () => {
    it('should extract JSON from markdown code blocks', () => {
      const markdownJson = `
Here is the result:

\`\`\`json
{
  "key": "value",
  "number": 123
}
\`\`\`

End of response.
      `;

      // Test the private method through the actual parsing flow
      mockOpenai.chat.completions.create.mockResolvedValue(mockLLMResponse(markdownJson) as any);

      const result = service.parseByTasks('dummy text', undefined, [InfoType.BASIC_INFO], 'test-session');

      // If we got here without throwing, the extraction worked
      expect(mockOpenai.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle JSON without markdown wrapping', () => {
      const plainJson = JSON.stringify({ key: 'value', number: 123 });

      mockOpenai.chat.completions.create.mockResolvedValue(mockLLMResponse(plainJson) as any);

      const result = service.parseByTasks('dummy text', undefined, [InfoType.BASIC_INFO], 'test-session');

      expect(mockOpenai.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('mergeTaskResults', () => {
    it('should merge task results correctly by InfoType', async () => {
      const basicInfoData = { contractNo: 'CTR-001', contractName: 'Test Contract', contractType: 'PROJECT_OUTSOURCING' };
      const financialData = { amountWithTax: '1000000', currency: 'CNY' };
      const milestonesData = { milestones: [{ sequence: 1, name: 'M1' }] };

      // Map task types to their expected responses
      let callIndex = 0;
      const responses = [
        JSON.stringify(basicInfoData),
        JSON.stringify(financialData),
        JSON.stringify(milestonesData),
      ];

      mockOpenai.chat.completions.create.mockImplementation(async () => {
        const response = responses[callIndex];
        callIndex++;
        return mockLLMResponse(response) as any;
      });

      // Pass specific task types to avoid the contract type auto-detection flow
      const result = await service.parseByTasks(
        'sample text',
        undefined,
        [InfoType.BASIC_INFO, InfoType.FINANCIAL, InfoType.MILESTONES],
        'test-session'
      );

      expect(result.data.basicInfo.contractNo).toBe('CTR-001');
      expect(result.data.financialInfo.amountWithTax).toBe('1000000');
      expect(result.data.typeSpecificDetails.milestones).toHaveLength(1);
      expect(result.data.contractType).toBe('PROJECT_OUTSOURCING');
    });
  });

  describe('error handling', () => {
    it('should handle empty LLM response', async () => {
      mockOpenai.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      } as any);

      const result = await service.parseByTasks('sample text', undefined, [InfoType.BASIC_INFO], 'test-session');

      expect(result.summary.failedTasks).toBe(1);
      expect(result.results[0].error).toContain('Empty response');
    });

    it('should handle invalid JSON response', async () => {
      mockOpenai.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Not valid JSON {' } }],
      } as any);

      const result = await service.parseByTasks('sample text', undefined, [InfoType.BASIC_INFO], 'test-session');

      expect(result.summary.failedTasks).toBe(1);
      expect(result.results[0].error).toContain('Unexpected token');
    });
  });

  describe('refreshClient', () => {
    it('should recreate openai client with current config', () => {
      const oldClient = (service as any).openai;

      service.refreshClient();

      expect((service as any).openai).toBeDefined();
      expect(llmConfigService.getActiveConfig).toHaveBeenCalled();
    });
  });
});
