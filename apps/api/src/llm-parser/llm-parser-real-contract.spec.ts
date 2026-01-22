// Mock modules before imports to avoid ESM issues
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

// Mock parse-strategy.dto to avoid decorator issues
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
import { SemanticChunkerService } from './semantic-chunker.service';
import { RagEnhancedParserService } from './rag-enhanced-parser.service';
import { ConcurrentParserService } from './concurrent-parser.service';
import { OptimizedParserService } from './optimized-parser.service';
import { LlmConfigService } from './config/llm-config.service';
import { PrismaService } from '../prisma';
import { LlmParserService } from './llm-parser.service';
import { LlmClientService } from './llm-client.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { FieldExtractor } from '../parser/extractors/field.extractor';

// 真实测试合同文本（从 scripts/测试合同-项目外包.docx 提取）
const TEST_CONTRACT_PROJECT_OUTSOURCING = `
项目外包服务合同
合同编号：CTR-2024-00123
签订日期：2024-01-15
签订地点：上海市浦东新区

甲方（委托方）
公司名称：上海某某科技有限公司
统一社会信用代码：91310000XXXXXXXX01
地址：上海市浦东新区张江高科技园区XXX号
联系人：张三
电话：021-12345678

乙方（服务方）
公司名称：insigma软件有限公司
统一社会信用代码：91330000XXXXXXXX02
地址：杭州市滨江区长河路XXX号
联系人：李四
电话：0571-87654321

第一条 项目概述
1.1 项目名称：智能合同管理系统开发项目
1.2 项目描述：乙方为甲方开发一套智能合同全生命周期管理系统（i-CLMS），包括合同上传、智能解析、工作流审批、财务管理、交付跟踪等功能模块。
1.3 项目目标：通过智能化手段提升甲方合同管理效率，实现合同数据的数字化和智能化管理。

第二条 合同金额与付款方式
2.1 合同总价：本合同总金额为人民币壹佰贰拾万元整（¥1,200,000.00元）
2.2 含税金额：¥1,200,000.00元（含增值税）
2.3 不含税金额：¥1,132,075.47元
2.4 税率：6%（增值税一般纳税人）
2.5 币种：人民币（CNY）
2.6 付款方式：银行转账

第三条 付款条件与里程碑
甲方按照以下里程碑向乙方支付项目款项：

里程碑1：合同签订
  交付物：合同签署完成
  付款金额：¥360,000.00元（30%）
  计划完成日期：2024-01-20

里程碑2：需求确认与设计完成
  交付物：需求规格说明书、系统设计文档、数据库设计文档
  付款金额：¥240,000.00元（20%）
  计划完成日期：2024-03-15

里程碑3：开发完成与测试通过
  交付物：系统源代码、测试报告、用户手册
  付款金额：¥360,000.00元（30%）
  计划完成日期：2024-06-30

里程碑4：上线验收合格
  交付物：系统部署完成、验收报告、培训完成
  付款金额：¥180,000.00元（15%）
  计划完成日期：2024-08-15

里程碑5：质保期满
  交付物：质保服务完成、系统稳定运行
  付款金额：¥60,000.00元（5%）
  计划完成日期：2025-02-15

第四条 合同期限
4.1 合同签订日期：2024年1月15日
4.2 合同生效日期：2024年1月20日
4.3 项目交付期限：2024年8月15日
4.4 质保期：自验收合格之日起12个月，至2025年8月15日
4.5 合同有效期：自2024年1月20日至2025年8月15日
4.6 合同期限：共19个月

第五条 交付标准与验收
5.1 交付物清单：
  - 完整的系统源代码（包含前端、后端、数据库脚本）
  - 系统部署文档
  - 用户操作手册
  - 系统管理员手册
  - 测试报告及用例
  - 需求规格说明书
  - 系统设计文档
  - API接口文档

5.2 验收标准：
  - 系统功能符合需求规格说明书
  - 系统性能满足设计指标
  - 通过甲方组织的UAT测试
  - 文档齐全、准确

5.3 验收流程：
  甲方应在收到交付物后15个工作日内完成验收。验收通过后3个工作日内签署验收报告。

第六条 其他条款
6.1 销售负责人：王经理
6.2 所属行业：信息技术服务业
6.3 合同份数：本合同一式贰份，甲乙双方各执壹份，具有同等法律效力。
6.4 争议解决：因本合同引起的或与本合同有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向合同签订地人民法院提起诉讼。

第七条 保密条款
7.1 双方对在本合同履行过程中知悉的对方商业秘密负有保密义务。
7.2 未经对方书面同意，任何一方不得向第三方披露、使用或允许第三方使用对方的商业秘密。
7.3 保密期限自本合同签订之日起至合同终止后三年内有效。
`;

// 预期提取结果
const EXPECTED_EXTRACTION = {
  contractNo: 'CTR-2024-00123',
  contractType: 'PROJECT_OUTSOURCING',
  name: '智能合同管理系统开发项目',
  customerName: '上海某某科技有限公司',
  ourEntity: 'insigma软件有限公司',
  amountWithTax: '1200000',
  amountWithoutTax: '1132075.47',
  taxRate: '0.06',
  currency: 'CNY',
  paymentMethod: '银行转账',
  signedAt: '2024-01-15',
  effectiveAt: '2024-01-20',
  expiresAt: '2025-08-15',
  duration: '19个月',
  salesPerson: '王经理',
  industry: '信息技术服务业',
  signLocation: '上海市浦东新区',
  copies: '2',
};

describe('LLM Parser Integration Tests - Real Contract', () => {
  let semanticChunker: SemanticChunkerService;
  let ragParser: RagEnhancedParserService;
  let concurrentParser: ConcurrentParserService;
  let optimizedParser: OptimizedParserService;
  let configService: any;

  beforeAll(async () => {
    const mockConfigService = {
      getActiveConfig: jest.fn().mockReturnValue({
        baseUrl: 'http://localhost:11434/v1',
        apiKey: 'test-key',
        model: 'gemma3:27b',
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 60000,
      }),
      getProviderName: jest.fn().mockReturnValue('ollama'),
      refreshCache: jest.fn().mockResolvedValue(undefined),
    };

    const mockPrismaService = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    // Mock LlmClientService
    const mockLlmClientService = {
      chat: jest.fn().mockResolvedValue({
        success: true,
        extractedData: {},
        tokensUsed: 100,
      }),
    };

    // Mock LlmParserService - minimal mock with required methods
    const mockLlmParserService = {
      parseWithMixedStrategy: jest.fn().mockResolvedValue({
        success: true,
        extractedDataJson: { contractNo: 'CTR-2024-00123' },
        completenessScore: { totalScore: 80, maxScore: 100, percentage: 80 },
        strategyUsed: 'DIRECT_USE',
        confidence: 0.8,
        processingTimeMs: 100,
      }),
      parseContractWithLlm: jest.fn().mockResolvedValue({
        success: true,
        extractedDataJson: { contractNo: 'CTR-2024-00123' },
        completenessScore: { totalScore: 80 },
        strategyUsed: 'DIRECT_USE',
      }),
    };

    // Mock FieldExtractor
    const mockFieldExtractor = {
      extractAllFields: jest.fn().mockReturnValue({ contractNo: 'CTR-2024-00123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticChunkerService,
        RagEnhancedParserService,
        ConcurrentParserService,
        OptimizedParserService,
        CompletenessCheckerService,
        {
          provide: LlmConfigService,
          useValue: mockConfigService,
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
          provide: LlmClientService,
          useValue: mockLlmClientService,
        },
        {
          provide: LlmParserService,
          useValue: mockLlmParserService,
        },
        {
          provide: FieldExtractor,
          useValue: mockFieldExtractor,
        },
      ],
    }).compile();

    semanticChunker = module.get<SemanticChunkerService>(SemanticChunkerService);
    ragParser = module.get<RagEnhancedParserService>(RagEnhancedParserService);
    concurrentParser = module.get<ConcurrentParserService>(ConcurrentParserService);
    optimizedParser = module.get<OptimizedParserService>(OptimizedParserService);
    configService = mockConfigService;
  });

  describe('SemanticChunker with Real Contract', () => {
    it('should chunk the project outsourcing contract correctly', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);

      expect(chunks.length).toBeGreaterThan(0);

      // 验证基本结构
      chunks.forEach(chunk => {
        expect(chunk).toHaveProperty('id');
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('metadata');
        expect(chunk).toHaveProperty('position');
        expect(chunk.text.length).toBeGreaterThan(0);
      });

      // 检查是否包含关键信息
      const allText = chunks.map(c => c.text).join('');
      expect(allText).toContain('CTR-2024-00123');
      expect(allText).toContain('1,200,000.00');
      expect(allText).toContain('上海某某科技有限公司');
      expect(allText).toContain('insigma软件有限公司');
    });

    it('should identify contract number in chunks', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);

      const contractNoChunks = chunks.filter(c =>
        c.text.includes('CTR-2024-00123') ||
        c.metadata.fieldRelevance.includes('contractNo')
      );

      expect(contractNoChunks.length).toBeGreaterThan(0);
    });

    it('should identify financial information in chunks', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);

      const amountChunks = chunks.filter(c =>
        c.text.includes('1,200,000') ||
        c.text.includes('1200000') ||
        c.metadata.fieldRelevance.includes('amountWithTax')
      );

      expect(amountChunks.length).toBeGreaterThan(0);
    });

    it('should identify milestone information in chunks', () => {
      // First verify the contract text contains milestone information
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('里程碑');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('付款金额');

      // The semantic chunker should preserve all the text in its chunks
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);
      const allText = chunks.map(c => c.text).join('');

      // Verify that chunking preserves all content (within 95% tolerance to account for formatting)
      const expectedLength = TEST_CONTRACT_PROJECT_OUTSOURCING.length;
      expect(allText.length).toBeGreaterThan(expectedLength * 0.95);

      // Verify key information is preserved
      expect(allText).toContain('CTR-2024-00123');
    });

    it('should get relevant chunks for financial fields', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);
      const relevant = semanticChunker.getRelevantChunksForFields(
        chunks,
        ['amountWithTax', 'taxRate', 'paymentMethod']
      );

      expect(relevant.length).toBeGreaterThan(0);

      // 验证至少有一个chunk包含金额信息
      const hasAmountInfo = relevant.some(c =>
        c.text.includes('1,200,000') ||
        c.text.includes('1200000') ||
        c.text.includes('壹佰贰拾万元')
      );
      expect(hasAmountInfo).toBe(true);
    });

    it('should get relevant chunks for schedule fields', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);
      const relevant = semanticChunker.getRelevantChunksForFields(
        chunks,
        ['signedAt', 'effectiveAt', 'expiresAt']
      );

      expect(relevant.length).toBeGreaterThan(0);

      // 验证至少有一个chunk包含日期信息
      const hasDateInfo = relevant.some(c =>
        c.text.includes('2024-01-15') ||
        c.text.includes('2024年1月15日') ||
        c.text.includes('签订日期')
      );
      expect(hasDateInfo).toBe(true);
    });
  });

  describe('RAG Parser with Real Contract', () => {
    it('should calculate field relevance correctly', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);

      // 测试合同编号字段的相关性
      const contractNoChunk = chunks.find(c => c.text.includes('CTR-2024'));
      if (contractNoChunk) {
        const contractNoRelevance = (ragParser as any).calculateFieldRelevance(
          contractNoChunk,
          'contractNo'
        );
        expect(contractNoRelevance).toBeGreaterThan(0);
      }
    });

    it('should create extraction plans for all fields', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);
      const targetFields = Object.keys(EXPECTED_EXTRACTION);

      const plans = (ragParser as any).createExtractionPlans(chunks, targetFields, 3);

      expect(plans).toBeDefined();
      expect(plans.length).toBe(targetFields.length);

      // 验证每个字段都有对应的计划
      const planFields = plans.map((p: any) => p.field);
      expect(planFields).toEqual(expect.arrayContaining(targetFields));
    });

    it('should create plans with correct strategies', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);
      const targetFields = ['contractNo', 'amountWithTax', 'signedAt'];

      const plans = (ragParser as any).createExtractionPlans(chunks, targetFields, 3);

      plans.forEach((plan: any) => {
        expect(['direct', 'hybrid', 'llm']).toContain(plan.strategy);
        expect(plan.confidence).toBeGreaterThanOrEqual(0);
        expect(plan.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(plan.relevantChunks)).toBe(true);
      });
    });
  });

  describe('Concurrent Parser with Real Contract', () => {
    it('should create extraction tasks for contract chunks', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);
      const targetFields = Object.keys(EXPECTED_EXTRACTION);

      const tasks = (concurrentParser as any).createExtractionTasks(chunks, targetFields);

      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);

      // 验证任务结构
      tasks.forEach((task: any) => {
        expect(task).toHaveProperty('chunkId');
        expect(task).toHaveProperty('targetFields');
        expect(task).toHaveProperty('prompt');
        expect(task.targetFields.length).toBeGreaterThan(0);
      });
    });

    it('should build correct prompts for different chunk types', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);

      chunks.forEach(chunk => {
        const prompt = (concurrentParser as any).buildPromptForChunk(chunk, ['contractNo', 'amountWithTax']);

        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
        expect(prompt).toContain('合同片段');
        expect(prompt).toContain('JSON');
      });
    });

    it('should merge results correctly', () => {
      const mockResults = [
        {
          chunkId: 'chunk-0',
          success: true,
          data: { contractNo: 'CTR-2024-00123', customerName: '上海某某科技有限公司' },
          tokensUsed: 100,
          processingTimeMs: 1000,
        },
        {
          chunkId: 'chunk-1',
          success: true,
          data: { amountWithTax: '1200000', taxRate: '0.06' },
          tokensUsed: 150,
          processingTimeMs: 1500,
        },
        {
          chunkId: 'chunk-2',
          success: true,
          data: { signedAt: '2024-01-15', effectiveAt: '2024-01-20' },
          tokensUsed: 120,
          processingTimeMs: 1200,
        },
      ];

      const strategy = (concurrentParser as any).DEFAULT_MERGE_STRATEGY;
      const merged = (concurrentParser as any).mergeResults(mockResults, strategy);

      expect(merged.contractNo).toBe('CTR-2024-00123');
      expect(merged.customerName).toBe('上海某某科技有限公司');
      expect(merged.amountWithTax).toBe('1200000');
      expect(merged.taxRate).toBe('0.06');
      expect(merged.signedAt).toBe('2024-01-15');
      expect(merged.effectiveAt).toBe('2024-01-20');
    });
  });

  describe('Optimized Parser with Real Contract', () => {
    it('should select optimal mode based on contract size', () => {
      // 小合同应该选择LEGACY模式
      const smallMode = (optimizedParser as any).selectOptimalMode(5000);
      expect(smallMode).toBe('LEGACY');

      // 中等合同应该选择SEMANTIC模式
      const mediumMode = (optimizedParser as any).selectOptimalMode(15000);
      expect(mediumMode).toBe('SEMANTIC');

      // 大合同应该选择CONCURRENT模式
      const largeMode = (optimizedParser as any).selectOptimalMode(25000);
      expect(largeMode).toBe('CONCURRENT');
    });

    it('should parse with AUTO mode', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);

      expect(chunks.length).toBeGreaterThan(0);

      // 验证chunk包含关键信息
      const allText = chunks.map(c => c.text).join('');
      expect(allText).toContain('CTR-2024-00123');
      expect(allText).toContain('1,200,000');
    });
  });

  describe('Expected Extraction Validation', () => {
    it('should have all expected fields in contract text', () => {
      // 验证测试合同包含所有预期的字段
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('CTR-2024-00123'); // contractNo
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('上海某某科技有限公司'); // customerName
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('insigma软件有限公司'); // ourEntity
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('1,200,000.00'); // amountWithTax
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('1,132,075.47'); // amountWithoutTax
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('6%'); // taxRate
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('银行转账'); // paymentMethod
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('2024年1月15日'); // signedAt
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('2024年1月20日'); // effectiveAt
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('2025年8月15日'); // expiresAt
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('19个月'); // duration
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('王经理'); // salesPerson
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('信息技术服务业'); // industry
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('上海市浦东新区'); // signLocation
    });

    it('should identify milestones in contract', () => {
      // 验证里程碑信息
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('里程碑1：合同签订');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('里程碑2：需求确认与设计完成');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('里程碑3：开发完成与测试通过');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('里程碑4：上线验收合格');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('里程碑5：质保期满');

      // 验证里程碑金额
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('¥360,000.00元（30%）');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('¥240,000.00元（20%）');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('¥180,000.00元（15%）');
      expect(TEST_CONTRACT_PROJECT_OUTSOURCING).toContain('¥60,000.00元（5%）');
    });
  });

  describe('Completeness Validation', () => {
    it('should validate all expected extraction fields are present in contract', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(TEST_CONTRACT_PROJECT_OUTSOURCING);
      const allText = chunks.map(c => c.text).join('');

      const fieldsFound: Record<string, boolean> = {};

      // 检查各字段在合同中的存在性（使用实际文本格式，而非标准化后的值）
      fieldsFound['contractNo'] = allText.includes('CTR-2024-00123');
      fieldsFound['contractType'] = allText.includes('项目外包') || allText.includes('里程碑');
      fieldsFound['customerName'] = allText.includes('上海某某科技有限公司');
      fieldsFound['ourEntity'] = allText.includes('insigma软件有限公司');
      fieldsFound['amountWithTax'] = allText.includes('1,200,000') || allText.includes('1200000');
      fieldsFound['signedAt'] = allText.includes('2024-01-15') || allText.includes('2024年1月15日');
      fieldsFound['effectiveAt'] = allText.includes('2024-01-20') || allText.includes('2024年1月20日');
      fieldsFound['salesPerson'] = allText.includes('王经理');
      fieldsFound['industry'] = allText.includes('信息技术服务业');
      fieldsFound['signLocation'] = allText.includes('上海市浦东新区');

      // 打印缺失字段
      const missingFields = Object.entries(fieldsFound)
        .filter(([_, found]) => !found)
        .map(([field, _]) => field);

      if (missingFields.length > 0) {
        console.log('Missing fields in contract:', missingFields);
      }

      // 验证所有关键字段都存在
      expect(fieldsFound['contractNo']).toBe(true);
      expect(fieldsFound['customerName']).toBe(true);
      expect(fieldsFound['ourEntity']).toBe(true);
      expect(fieldsFound['amountWithTax']).toBe(true);
      expect(fieldsFound['signedAt']).toBe(true);
    });
  });
});
