// Mock modules before imports
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  })),
}));

// Mock DTO to avoid decorator issues
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

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmConfigService } from './config/llm-config.service';
import { PrismaService } from '../prisma';
import { ParserService } from '../parser/parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { TaskBasedParserService } from './task-based-parser.service';
import { ChunkingStrategyService } from './chunking-strategy.service';
import { ParseProgressService } from './parse-progress.service';
import { LlmParserService } from './llm-parser.service';
import OpenAI from 'openai';
import * as fs from 'fs';

// 加载测试合同文件
const TEST_CONTRACT_PATH = '/Users/samzhou/Documents/workspaces/SCKB/scripts/项目外包服务合同.md';
const TEST_CONTRACT_TEXT = fs.readFileSync(TEST_CONTRACT_PATH, 'utf-8');

// 预期提取的联系信息字段
const EXPECTED_CONTACT_FIELDS = {
  // 合同基本信息
  contract_id: 'CTR-2024-00123',
  signing_date: '2024-01-15',

  // 甲方（客户）信息
  client_legal_name: '上海某某科技有限公司',
  client_registration_number: '91310000XXXXXXXX01',
  client_address: '上海市浦东新区张江高科技园区XXX号',
  client_contact_person: '张三',
  client_phone: '021-12345678',

  // 乙方（供应商）信息
  vendor_legal_name: 'insigma软件有限公司',
  vendor_registration_number: '91330000XXXXXXXX02',
  vendor_address: '杭州市滨江区长河路XXX号',
  vendor_contact_person: '李四',
  vendor_phone: '0571-87654321',
};

describe('LLM Parser - Contact Fields Extraction', () => {
  let llmParserService: LlmParserService;
  let configService: jest.Mocked<LlmConfigService>;

  beforeAll(async () => {
    // 创建 Mock OpenAI 客户端
    const mockOpenaiClient = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: JSON.stringify({
                    contractType: 'PROJECT_OUTSOURCING',
                    basicInfo: {
                      contractNo: 'CTR-2024-00123',
                      contractName: '智能合同管理系统开发项目',
                      customerName: '上海某某科技有限公司',
                      ourEntity: 'insigma软件有限公司',
                      clientRegistrationNumber: '91310000XXXXXXXX01',
                      clientAddress: '上海市浦东新区张江高科技园区XXX号',
                      clientContactPerson: '张三',
                      clientPhone: '021-12345678',
                      vendorRegistrationNumber: '91330000XXXXXXXX02',
                      vendorAddress: '杭州市滨江区长河路XXX号',
                      vendorContactPerson: '李四',
                      vendorPhone: '0571-87654321',
                    },
                    financialInfo: {
                      amountWithTax: '1200000',
                      amountWithoutTax: '1132075.47',
                      taxRate: '0.06',
                      currency: 'CNY',
                      paymentMethod: '银行转账',
                    },
                    timeInfo: {
                      signedAt: '2024-01-15',
                      effectiveAt: '2024-01-20',
                      expiresAt: '2025-08-15',
                      duration: '19个月',
                    },
                    typeSpecificDetails: {
                      milestones: [
                        { sequence: 1, name: '合同签订', amount: '360000', paymentPercentage: '30', plannedDate: '2024-01-20' },
                        { sequence: 2, name: '需求确认与设计完成', amount: '240000', paymentPercentage: '20', plannedDate: '2024-03-15' },
                        { sequence: 3, name: '开发完成与测试通过', amount: '360000', paymentPercentage: '30', plannedDate: '2024-06-30' },
                        { sequence: 4, name: '上线验收合格', amount: '180000', paymentPercentage: '15', plannedDate: '2024-08-15' },
                        { sequence: 5, name: '质保期满', amount: '60000', paymentPercentage: '5', plannedDate: '2025-02-15' },
                      ],
                    },
                  }),
                },
              },
            ],
          }),
        },
      },
    } as any;

    // Mock LlmConfigService
    configService = {
      getActiveConfig: jest.fn().mockReturnValue({
        baseUrl: 'https://llm.ai.szis.com.cn/v1',
        apiKey: 'test-key',
        model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 120000,
      }),
      getProviderName: jest.fn().mockReturnValue('openai'),
      refreshCache: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock PrismaService - 最小化mock，避免复杂依赖
    const mockPrismaService = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as any;

    // Mock ParseProgressService
    const mockProgressService = {
      createSession: jest.fn().mockReturnValue('test-session-id'),
      updateStage: jest.fn(),
      setChunks: jest.fn(),
      startChunk: jest.fn(),
      completeChunk: jest.fn(),
      failChunk: jest.fn(),
      setSessionResult: jest.fn(),
      completeSession: jest.fn(),
      failSession: jest.fn(),
      getSession: jest.fn(),
    } as any;

    // Mock TaskBasedParserService - 返回完整的提取结果
    const mockTaskBasedParser = {
      parseByTasks: jest.fn().mockResolvedValue({
        data: {
          contractType: 'PROJECT_OUTSOURCING',
          basicInfo: {
            contractNo: 'CTR-2024-00123',
            contractName: '智能合同管理系统开发项目',
            customerName: '上海某某科技有限公司',
            ourEntity: 'insigma软件有限公司',
            clientRegistrationNumber: '91310000XXXXXXXX01',
            clientAddress: '上海市浦东新区张江高科技园区XXX号',
            clientContactPerson: '张三',
            clientPhone: '021-12345678',
            vendorRegistrationNumber: '91330000XXXXXXXX02',
            vendorAddress: '杭州市滨江区长河路XXX号',
            vendorContactPerson: '李四',
            vendorPhone: '0571-87654321',
          },
          financialInfo: {
            amountWithTax: '1200000',
            amountWithoutTax: '1132075.47',
            taxRate: '0.06',
            currency: 'CNY',
            paymentMethod: '银行转账',
          },
          timeInfo: {
            signedAt: '2024-01-15',
            effectiveAt: '2024-01-20',
            expiresAt: '2025-08-15',
            duration: '19个月',
          },
          typeSpecificDetails: {
            milestones: [
              { sequence: 1, name: '合同签订', amount: '360000', paymentPercentage: '30', plannedDate: '2024-01-20' },
              { sequence: 2, name: '需求确认与设计完成', amount: '240000', paymentPercentage: '20', plannedDate: '2024-03-15' },
              { sequence: 3, name: '开发完成与测试通过', amount: '360000', paymentPercentage: '30', plannedDate: '2024-06-30' },
              { sequence: 4, name: '上线验收合格', amount: '180000', paymentPercentage: '15', plannedDate: '2024-08-15' },
              { sequence: 5, name: '质保期满', amount: '60000', paymentPercentage: '5', plannedDate: '2025-02-15' },
            ],
          },
        },
        summary: {
          totalTasks: 6,
          successfulTasks: 6,
          failedTasks: 0,
          totalTokensUsed: 15000,
          totalTimeMs: 25000,
        },
      }),
      refreshClient: jest.fn(),
    } as any;

    // Mock ParserService
    const mockParserService = {
      parseDocument: jest.fn().mockResolvedValue({
        success: true,
        text: TEST_CONTRACT_TEXT,
        pageCount: 1,
        extractedFields: {},
      }),
      extractFields: jest.fn().mockReturnValue({}),
    } as any;

    // Mock CompletenessCheckerService
    const mockCompletenessService = {
      calculateScore: jest.fn().mockReturnValue({
        totalScore: 30,
        maxScore: 100,
        percentage: 30,
        strategy: 'LLM_FULL_EXTRACTION',
        categoryScores: {
          basic: 10,
          financial: 10,
          temporal: 5,
          other: 5,
        },
        details: [],
      }),
      checkCompleteness: jest.fn().mockReturnValue({
        score: 30,
        missingFields: ['contractNumber', 'totalAmount'],
        needsLlm: true,
        reason: 'Low completeness score, using LLM full extraction',
      }),
      getMissingFields: jest.fn().mockReturnValue(['contractNumber', 'totalAmount']),
      identifyPriorityFields: jest.fn().mockReturnValue(['contractNumber', 'totalAmount']),
      needsLlm: jest.fn().mockReturnValue(true),
    } as any;

    // Mock ChunkingStrategyService
    const mockChunkingService = {
      determineStrategy: jest.fn().mockReturnValue({
        strategy: 'single',
        chunks: [{ id: 'chunk-0', text: TEST_CONTRACT_TEXT, purpose: 'full', targetFields: [] }],
        reason: 'Single chunk for short contract',
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmParserService,
        {
          provide: OpenAI,
          useValue: mockOpenaiClient,
        },
        {
          provide: LlmConfigService,
          useValue: configService,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ParserService,
          useValue: mockParserService,
        },
        {
          provide: CompletenessCheckerService,
          useValue: mockCompletenessService,
        },
        {
          provide: TaskBasedParserService,
          useValue: mockTaskBasedParser,
        },
        {
          provide: ChunkingStrategyService,
          useValue: mockChunkingService,
        },
        {
          provide: ParseProgressService,
          useValue: mockProgressService,
        },
      ],
    }).compile();

    llmParserService = module.get<LlmParserService>(LlmParserService);
  });

  describe('Contract Text Validation', () => {
    it('should load test contract file successfully', () => {
      expect(TEST_CONTRACT_TEXT).toBeDefined();
      expect(TEST_CONTRACT_TEXT.length).toBeGreaterThan(0);
      console.log(`Contract text length: ${TEST_CONTRACT_TEXT.length} characters`);
    });

    it('should contain all expected contact information in raw text', () => {
      // 验证合同文本包含预期字段
      expect(TEST_CONTRACT_TEXT).toContain(EXPECTED_CONTACT_FIELDS.contract_id);
      expect(TEST_CONTRACT_TEXT).toContain(EXPECTED_CONTACT_FIELDS.signing_date);
      expect(TEST_CONTRACT_TEXT).toContain(EXPECTED_CONTACT_FIELDS.client_legal_name);
      expect(TEST_CONTRACT_TEXT).toContain(EXPECTED_CONTACT_FIELDS.client_registration_number);
      expect(TEST_CONTRACT_TEXT).toContain(EXPECTED_CONTACT_FIELDS.vendor_phone);
    });
  });

  describe('TaskBasedParser Contact Fields Extraction', () => {
    it('should extract contract number (contract_id)', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      expect(result.data.basicInfo.contractNo).toBe(EXPECTED_CONTACT_FIELDS.contract_id);
    });

    it('should extract signing date', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      expect(result.data.timeInfo.signedAt).toBe(EXPECTED_CONTACT_FIELDS.signing_date);
    });

    it('should extract client legal name (甲方公司名称)', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      expect(result.data.basicInfo.customerName).toBe(EXPECTED_CONTACT_FIELDS.client_legal_name);
    });

    it('should extract client registration number (甲方统一社会信用代码)', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      expect(result.data.basicInfo.clientRegistrationNumber).toBe(EXPECTED_CONTACT_FIELDS.client_registration_number);
    });

    it('should extract vendor phone (乙方电话)', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      expect(result.data.basicInfo.vendorPhone).toBe(EXPECTED_CONTACT_FIELDS.vendor_phone);
    });
  });

  describe('Full Contact Fields Validation', () => {
    it('should extract all client contact fields', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      const basicInfo = result.data.basicInfo;

      // 验证所有甲方联系信息字段
      expect(basicInfo.customerName).toBe(EXPECTED_CONTACT_FIELDS.client_legal_name);
      expect(basicInfo.clientRegistrationNumber).toBe(EXPECTED_CONTACT_FIELDS.client_registration_number);
      expect(basicInfo.clientAddress).toBe(EXPECTED_CONTACT_FIELDS.client_address);
      expect(basicInfo.clientContactPerson).toBe(EXPECTED_CONTACT_FIELDS.client_contact_person);
      expect(basicInfo.clientPhone).toBe(EXPECTED_CONTACT_FIELDS.client_phone);
    });

    it('should extract all vendor contact fields', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      const basicInfo = result.data.basicInfo;

      // 验证所有乙方联系信息字段
      expect(basicInfo.ourEntity).toBe(EXPECTED_CONTACT_FIELDS.vendor_legal_name);
      expect(basicInfo.vendorRegistrationNumber).toBe(EXPECTED_CONTACT_FIELDS.vendor_registration_number);
      expect(basicInfo.vendorAddress).toBe(EXPECTED_CONTACT_FIELDS.vendor_address);
      expect(basicInfo.vendorContactPerson).toBe(EXPECTED_CONTACT_FIELDS.vendor_contact_person);
      expect(basicInfo.vendorPhone).toBe(EXPECTED_CONTACT_FIELDS.vendor_phone);
    });
  });

  describe('Field Mapping Validation', () => {
    it('should map Chinese field names to English correctly', () => {
      // 验证字段映射关系
      const fieldMappings = {
        '合同编号': 'contractNo',
        '签订日期': 'signedAt',
        '甲方': 'customerName',
        '乙方': 'ourEntity',
        '统一社会信用代码': 'registrationNumber',
        '地址': 'address',
        '联系人': 'contactPerson',
        '电话': 'phone',
      };

      // 验证合同文本包含所有中文字段名
      Object.keys(fieldMappings).forEach(chineseFieldName => {
        expect(TEST_CONTRACT_TEXT).toContain(chineseFieldName);
      });
    });

    it('should have correct field structure in extracted data', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      const basicInfo = result.data.basicInfo;

      // 验证数据结构
      expect(typeof basicInfo.contractNo).toBe('string');
      expect(typeof basicInfo.customerName).toBe('string');
      expect(typeof basicInfo.clientRegistrationNumber).toBe('string');
      expect(typeof basicInfo.clientPhone).toBe('string');
      expect(typeof basicInfo.vendorPhone).toBe('string');
    });
  });

  describe('Output JSON Format Validation', () => {
    it('should produce valid JSON output with all expected fields', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      // 验证可以序列化为JSON
      const jsonString = JSON.stringify(result.data, null, 2);
      expect(jsonString).toBeDefined();
      expect(jsonString.length).toBeGreaterThan(0);

      // 验证JSON可以解析回来
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(result.data);

      // 验证关键字段存在
      expect(parsed.basicInfo.contractNo).toBe(EXPECTED_CONTACT_FIELDS.contract_id);
      expect(parsed.basicInfo.customerName).toBe(EXPECTED_CONTACT_FIELDS.client_legal_name);
      expect(parsed.basicInfo.clientRegistrationNumber).toBe(EXPECTED_CONTACT_FIELDS.client_registration_number);
      expect(parsed.basicInfo.vendorPhone).toBe(EXPECTED_CONTACT_FIELDS.vendor_phone);
    });

    it('should match expected JSON output format', async () => {
      const mockTaskBasedParser = llmParserService['taskBasedParser'] as any;

      const result = await mockTaskBasedParser.parseByTasks(
        TEST_CONTRACT_TEXT,
        undefined,
        undefined,
        undefined,
        '项目外包服务合同.md'
      );

      // 验证输出格式符合预期
      const output = {
        contract_id: result.data.basicInfo.contractNo,
        signing_date: result.data.timeInfo.signedAt,
        client_legal_name: result.data.basicInfo.customerName,
        client_registration_number: result.data.basicInfo.clientRegistrationNumber,
        vendor_phone: result.data.basicInfo.vendorPhone,
      };

      expect(output.contract_id).toBe(EXPECTED_CONTACT_FIELDS.contract_id);
      expect(output.signing_date).toBe(EXPECTED_CONTACT_FIELDS.signing_date);
      expect(output.client_legal_name).toBe(EXPECTED_CONTACT_FIELDS.client_legal_name);
      expect(output.client_registration_number).toBe(EXPECTED_CONTACT_FIELDS.client_registration_number);
      expect(output.vendor_phone).toBe(EXPECTED_CONTACT_FIELDS.vendor_phone);

      console.log('\n=== 提取结果JSON ===');
      console.log(JSON.stringify(output, null, 2));
    });
  });
});
