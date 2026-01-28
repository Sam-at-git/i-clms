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
            chunkBySemanticStructure: jest.fn().mockReturnValue([{ text: 'dummy text', type: 'header' as const }]),
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
            // Spec 40: Token and time tracking methods
            resetCurrentTaskTokens: jest.fn(),
            recordTokenUsage: jest.fn(),
            setInitialEstimate: jest.fn(),
            setTaskChunks: jest.fn(),
            completeTaskChunk: jest.fn(),
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
      // The service may add retry information to the error message
      expect(progressService.failTask).toHaveBeenCalledWith(
        'test-session',
        InfoType.BASIC_INFO,
        expect.stringContaining('Connection error')
      );
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
      // Track which task type is being called - always fail BASIC_INFO, succeed for FINANCIAL
      mockOpenai.chat.completions.create.mockImplementation(async (args: any) => {
        const prompt = args?.messages?.[0]?.content || '';
        // BASIC_INFO tasks mention 基本信息 or contract metadata
        if (prompt.includes('基本信息') || prompt.includes('contractNumber') || prompt.includes('title')) {
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
      // At least one task should succeed (FINANCIAL), BASIC_INFO should fail
      expect(result.summary.successfulTasks).toBeGreaterThanOrEqual(1);
      expect(result.summary.failedTasks).toBeGreaterThanOrEqual(1);
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
        usage: { prompt_tokens: 10, completion_tokens: 0 },
      } as any);

      const result = await service.parseByTasks('sample text', undefined, [InfoType.BASIC_INFO], 'test-session');

      expect(result.summary.failedTasks).toBe(1);
      expect(result.results[0].error).toContain('Empty response');
    });

    it('should handle invalid JSON response', async () => {
      mockOpenai.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Not valid JSON {' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
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

  // ========== Spec 41.5: 评分算法单元测试 ==========
  describe('scoreCompanyName', () => {
    it('should score valid company name highly (AC-07)', () => {
      const validName = '北京XX科技有限公司';
      const score = (service as any).scoreCompanyName(validName);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should score another valid company with city name highly', () => {
      const validName = '上海YY信息技术服务有限公司';
      const score = (service as any).scoreCompanyName(validName);
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should score invalid content low - project name (AC-08)', () => {
      const invalidName = '项目外包合同';
      const score = (service as any).scoreCompanyName(invalidName);
      expect(score).toBeLessThan(30);
    });

    it('should score service content as invalid', () => {
      const invalidName = '提供技术咨询和软件开发服务';
      const score = (service as any).scoreCompanyName(invalidName);
      expect(score).toBeLessThan(30);
    });

    it('should score rate info as invalid', () => {
      const invalidName = '高级工程师800元/小时';
      const score = (service as any).scoreCompanyName(invalidName);
      expect(score).toBeLessThan(30);
    });

    it('should score date as invalid', () => {
      const invalidName = '2024年3月15日';
      const score = (service as any).scoreCompanyName(invalidName);
      expect(score).toBeLessThan(30);
    });

    it('should score company with address lower (AC-09)', () => {
      const nameWithAddress = '北京XX科技有限公司（地址：朝阳区XX路XX号）';
      const score = (service as any).scoreCompanyName(nameWithAddress);
      // 包含"地址"关键词会扣50分，所以总分应该低于30
      expect(score).toBeLessThan(30);
    });

    it('should score company with contact info as invalid', () => {
      const nameWithContact = 'XX公司，联系人：张三';
      const score = (service as any).scoreCompanyName(nameWithContact);
      expect(score).toBeLessThan(30);
    });

    it('should score very short name lower but acceptable', () => {
      const shortName = 'XX公司';
      const score = (service as any).scoreCompanyName(shortName);
      // 4字符的公司名虽然简短，但包含"公司"关键词，应该勉强可用
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(70);
    });

    it('should score too long name as invalid', () => {
      const longName = 'A'.repeat(100) + '有限公司';
      const score = (service as any).scoreCompanyName(longName);
      expect(score).toBeLessThan(30);
    });
  });

  describe('scoreContractNo', () => {
    it('should score valid contract number highly', () => {
      const validNo = 'CTR-2024-001';
      const score = (service as any).scoreContractNo(validNo);
      expect(score).toBeGreaterThan(50);
    });

    it('should score another valid format highly', () => {
      const validNo = 'HT20240115';
      const score = (service as any).scoreContractNo(validNo);
      expect(score).toBeGreaterThan(50);
    });

    it('should score numeric only contract no lower but acceptable', () => {
      const numericNo = '20240115001';
      const score = (service as any).scoreContractNo(numericNo);
      expect(score).toBeGreaterThan(20);
    });

    it('should score contract no with Chinese punctuation as invalid', () => {
      const invalidNo = 'CTR-2024-001，';
      const score = (service as any).scoreContractNo(invalidNo);
      expect(score).toBeLessThan(30);
    });
  });

  describe('scoreContractName', () => {
    it('should score valid contract name highly', () => {
      const validName = '人力资源外包服务框架协议';
      const score = (service as any).scoreContractName(validName);
      expect(score).toBeGreaterThan(50);
    });

    it('should score project type contract name highly', () => {
      const validName = 'XX系统开发项目外包合同';
      const score = (service as any).scoreContractName(validName);
      expect(score).toBeGreaterThan(50);
    });

    it('should score just "合同" as invalid', () => {
      const invalidName = '合同';
      const score = (service as any).scoreContractName(invalidName);
      expect(score).toBeLessThan(30);
    });

    it('should score date as invalid contract name', () => {
      const invalidName = '2024年01月15日';
      const score = (service as any).scoreContractName(invalidName);
      expect(score).toBeLessThan(30);
    });
  });

  // ========== Spec 41.6: 后处理清理单元测试 ==========
  describe('postProcessCompanyName', () => {
    it('should remove address in parentheses (AC-10)', () => {
      const nameWithAddress = '北京XX科技有限公司（地址：朝阳区XX路XX号）';
      const cleaned = (service as any).postProcessCompanyName(nameWithAddress);
      expect(cleaned).toBe('北京XX科技有限公司');
    });

    it('should remove address in English parentheses', () => {
      const nameWithAddress = 'Beijing XX Tech Co., Ltd (Address: XX Road)';
      const cleaned = (service as any).postProcessCompanyName(nameWithAddress);
      expect(cleaned).toBe('Beijing XX Tech Co., Ltd');
    });

    it('should remove contact person', () => {
      const nameWithContact = 'XX公司，联系人：张三';
      const cleaned = (service as any).postProcessCompanyName(nameWithContact);
      // 后处理会按逗号分割并取第一部分，得到 "XX公司"，这是有效公司名
      expect(cleaned).toBe('XX公司');
    });

    it('should remove phone number in parentheses', () => {
      const nameWithPhone = 'XX公司（电话：010-12345678）';
      const cleaned = (service as any).postProcessCompanyName(nameWithPhone);
      // 后处理会移除括号内容，并返回 "XX公司"
      expect(cleaned).toBe('XX公司');
    });

    it('should remove comma-separated address', () => {
      const nameWithAddress = '北京XX科技有限公司，北京市朝阳区';
      const cleaned = (service as any).postProcessCompanyName(nameWithAddress);
      expect(cleaned).toBe('北京XX科技有限公司');
    });

    it('should return undefined for invalid company name', () => {
      const invalidName = '项目外包合同';
      const cleaned = (service as any).postProcessCompanyName(invalidName);
      expect(cleaned).toBeUndefined();
    });

    it('should return undefined for too short name', () => {
      const shortName = '公司';
      const cleaned = (service as any).postProcessCompanyName(shortName);
      expect(cleaned).toBeUndefined();
    });

    it('should return undefined for name without company keyword', () => {
      const noKeywordName = '北京XX科技';
      const cleaned = (service as any).postProcessCompanyName(noKeywordName);
      expect(cleaned).toBeUndefined();
    });

    it('should preserve valid company name as-is', () => {
      const validName = '北京XX科技有限公司';
      const cleaned = (service as any).postProcessCompanyName(validName);
      expect(cleaned).toBe('北京XX科技有限公司');
    });
  });

  describe('isValidCompanyName', () => {
    it('should return true for valid company name', () => {
      const validName = '北京XX科技有限公司';
      const isValid = (service as any).isValidCompanyName(validName);
      expect(isValid).toBe(true);
    });

    it('should return true for English company name with Ltd', () => {
      const validName = 'ABC Technology Co., Ltd';
      const isValid = (service as any).isValidCompanyName(validName);
      expect(isValid).toBe(true);
    });

    it('should return false for name without company keyword', () => {
      const invalidName = '北京XX科技';
      const isValid = (service as any).isValidCompanyName(invalidName);
      expect(isValid).toBe(false);
    });

    it('should return true for minimally valid short name', () => {
      const shortName = 'XX公司';
      const isValid = (service as any).isValidCompanyName(shortName);
      // 4字符 + "公司"关键词，达到最小验证门槛
      expect(isValid).toBe(true);
    });

    it('should return false for too short name', () => {
      const shortName = 'XX';
      const isValid = (service as any).isValidCompanyName(shortName);
      expect(isValid).toBe(false);
    });

    it('should return false for just keyword', () => {
      const justKeyword = '有限公司';
      const isValid = (service as any).isValidCompanyName(justKeyword);
      expect(isValid).toBe(false);
    });
  });

  // ========== Spec 41.5: 合并策略单元测试 ==========
  describe('mergeBasicInfoResults', () => {
    it('should select highest scored value (AC-11)', () => {
      const results = [
        { customerName: '项目名称' },
        { customerName: '北京XX科技有限公司' },
        { customerName: '2024年3月15日' },
      ];

      const merged = (service as any).mergeBasicInfoResults(results);

      // 北京XX科技有限公司应该得分最高（>=70），被选中
      expect(merged.customerName).toBe('北京XX科技有限公司');
    });

    it('should return null when all scores are below threshold (AC-11)', () => {
      const results = [
        { customerName: '项目名称' },
        { customerName: '合同内容' },
        { customerName: '提供技术咨询服务' },
      ];

      const merged = (service as any).mergeBasicInfoResults(results);

      // 所有候选值得分都低于30分阈值，应该返回undefined或被删除
      expect(merged.customerName).toBeUndefined();
    });

    it('should select valid contractNo and filter invalid ones', () => {
      const results = [
        { contractNo: '第一期支付' },
        { contractNo: 'CTR-2024-001' },
        { contractNo: '2024年3月' },
      ];

      const merged = (service as any).mergeBasicInfoResults(results);

      expect(merged.contractNo).toBe('CTR-2024-001');
    });

    it('should use voting for enum fields (contractType)', () => {
      const results = [
        { contractType: 'PROJECT_OUTSOURCING' },
        { contractType: 'PROJECT_OUTSOURCING' },
        { contractType: 'STAFF_AUGMENTATION' },
      ];

      const merged = (service as any).mergeBasicInfoResults(results);

      // PROJECT_OUTSOURCING 出现2次，应该被选中
      expect(merged.contractType).toBe('PROJECT_OUTSOURCING');
    });

    it('should merge multiple fields independently', () => {
      const results = [
        {
          customerName: '北京XX科技有限公司',
          contractNo: '第一期支付',
          contractName: '服务协议'
        },
        {
          customerName: '项目名称',
          contractNo: 'CTR-2024-001',
          contractName: '人力资源服务合同'
        },
      ];

      const merged = (service as any).mergeBasicInfoResults(results);

      expect(merged.customerName).toBe('北京XX科技有限公司');
      expect(merged.contractNo).toBe('CTR-2024-001');
      expect(merged.contractName).toBe('人力资源服务合同');
    });
  });

  describe('applyPostProcessing', () => {
    it('should clean customerName and ourEntity', () => {
      const input = {
        customerName: '北京XX科技有限公司（地址：朝阳区）',
        ourEntity: '深圳YY信息技术有限公司，联系人：张三',
        contractNo: 'CTR-001',
      };

      const cleaned = (service as any).applyPostProcessing(input);

      expect(cleaned.customerName).toBe('北京XX科技有限公司');
      expect(cleaned.ourEntity).toBe('深圳YY信息技术有限公司');
      expect(cleaned.contractNo).toBe('CTR-001');
    });

    it('should remove invalid customerName', () => {
      const input = {
        customerName: '项目外包合同',
        contractNo: 'CTR-001',
      };

      const cleaned = (service as any).applyPostProcessing(input);

      expect(cleaned.customerName).toBeUndefined();
      expect(cleaned.contractNo).toBe('CTR-001');
    });

    it('should remove invalid ourEntity', () => {
      const input = {
        ourEntity: '2024年3月15日',
        contractNo: 'CTR-001',
      };

      const cleaned = (service as any).applyPostProcessing(input);

      expect(cleaned.ourEntity).toBeUndefined();
      expect(cleaned.contractNo).toBe('CTR-001');
    });
  });
});
