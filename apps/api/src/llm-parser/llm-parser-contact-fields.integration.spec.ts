/**
 * 集成测试：真实测试 LLM Parser 的联系字段提取功能
 *
 * 与单元测试不同，本测试使用真实的 NestJS 服务和依赖，
 * 真正调用 LLM API 进行合同解析。
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmConfigService } from './config/llm-config.service';
import { PrismaService } from '../prisma';
import { CompletenessCheckerService } from './completeness-checker.service';
import { TaskBasedParserService } from './task-based-parser.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { TopicRegistryService } from './topics/topic-registry.service';
import { ContractTypeDetectorService } from './contract-type-detector.service';
import { RuleEnhancedParserService } from './rule-enhanced-parser.service';
import { ResultValidatorService } from './result-validator.service';
import { ChunkTaskTaggerService } from './chunk-task-tagger.service';
import { InfoType } from './parse-progress.service';
import * as fs from 'fs';

// 测试合同路径
const TEST_CONTRACT_PATH = '/Users/samzhou/Documents/workspaces/SCKB/scripts/项目外包服务合同.md';

// 预期提取的联系信息字段（用于断言）
const EXPECTED_CONTACT_FIELDS = {
  contract_id: 'CTR-2024-00123',
  signing_date: '2024-01-15',
  client_legal_name: '上海某某科技有限公司',
  client_registration_number: '91310000XXXXXXXX01',
  client_address: '上海市浦东新区张江高科技园区XXX号',
  client_contact_person: '张三',
  client_phone: '021-12345678',
  vendor_legal_name: 'insigma软件有限公司',
  vendor_registration_number: '91330000XXXXXXXX02',
  vendor_address: '杭州市滨江区长河路XXX号',
  vendor_contact_person: '李四',
  vendor_phone: '0571-87654321',
};

describe('LLM Parser - Contact Fields Integration Test', () => {
  let taskBasedParser: TaskBasedParserService;
  let llmConfigService: LlmConfigService;
  let testContractText: string;

  // DeepSeek API 配置
  const DEEPSEEK_CONFIG = {
    provider: 'openai',
    baseUrl: 'https://llm.ai.szis.com.cn/v1/',
    apiKey: 'sk-RcS4Qt8U0ZRn7LXg2vz5mq8U8ptIOyZu',
    model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    temperature: 0.1,
    maxTokens: 4096,
    timeout: 120000,
  };

  beforeAll(async () => {
    // 读取测试合同文件
    testContractText = fs.readFileSync(TEST_CONTRACT_PATH, 'utf-8');
    console.log(`[Test Setup] Loaded test contract: ${testContractText.length} characters`);

    // Mock LlmConfigService 返回 DeepSeek 配置
    const mockLlmConfigService = {
      getProviderName: jest.fn().mockReturnValue('openai'),
      getActiveConfig: jest.fn().mockReturnValue(DEEPSEEK_CONFIG),
      refreshCache: jest.fn().mockResolvedValue(undefined),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
    };

    // 创建真实的 NestJS 测试模块
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // 核心解析服务
        TaskBasedParserService,
        SemanticChunkerService,
        TopicRegistryService,

        // 配置和依赖 - 使用 mock 的 LlmConfigService
        {
          provide: LlmConfigService,
          useValue: mockLlmConfigService,
        },
        ConfigService,
        CompletenessCheckerService,

        // 可选增强服务
        ContractTypeDetectorService,
        RuleEnhancedParserService,
        ResultValidatorService,
        ChunkTaskTaggerService,

        // Prisma 服务（最小化 mock）
        {
          provide: PrismaService,
          useValue: {
            systemConfig: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          },
        },
      ],
    }).compile();

    // 获取服务实例
    taskBasedParser = module.get<TaskBasedParserService>(TaskBasedParserService);
    llmConfigService = module.get<LlmConfigService>(LlmConfigService);

    // 手动触发生命周期钩子（NestJS 测试模块不会自动调用）
    await taskBasedParser.onModuleInit();

    // 输出 LLM 配置信息
    console.log('[Test Setup] LLM Configuration:');
    console.log(`  Provider: ${DEEPSEEK_CONFIG.provider}`);
    console.log(`  Base URL: ${DEEPSEEK_CONFIG.baseUrl}`);
    console.log(`  Model: ${DEEPSEEK_CONFIG.model}`);
    console.log(`  Temperature: ${DEEPSEEK_CONFIG.temperature}`);
    console.log(`  Max Tokens: ${DEEPSEEK_CONFIG.maxTokens}`);
    console.log(`  Timeout: ${DEEPSEEK_CONFIG.timeout}ms`);
  }, 60000); // 增加超时时间，等待模块初始化

  describe('Test Contract Validation', () => {
    it('should load test contract file successfully', () => {
      expect(testContractText).toBeDefined();
      expect(testContractText.length).toBeGreaterThan(0);
      console.log(`[Test] Contract text length: ${testContractText.length} characters`);
    });

    it('should contain all expected contact information in raw text', () => {
      // 验证合同文本包含预期字段
      expect(testContractText).toContain(EXPECTED_CONTACT_FIELDS.contract_id);
      expect(testContractText).toContain(EXPECTED_CONTACT_FIELDS.signing_date);
      expect(testContractText).toContain(EXPECTED_CONTACT_FIELDS.client_legal_name);
      expect(testContractText).toContain(EXPECTED_CONTACT_FIELDS.client_registration_number);
      expect(testContractText).toContain(EXPECTED_CONTACT_FIELDS.vendor_phone);
      console.log('[Test] All expected fields found in raw contract text');
    });
  });

  describe('TaskBasedParserService - Real LLM Call', () => {
    it('should parse contract and extract BASIC_INFO fields', async () => {
      console.log('\n[Test] Starting BASIC_INFO extraction...');

      const result = await taskBasedParser.parseByTasks(
        testContractText,
        'PROJECT_OUTSOURCING', // 项目外包
        [InfoType.BASIC_INFO], // 只执行 BASIC_INFO 任务
        'test-session-basic-info',
        '项目外包服务合同.md'
      );

      console.log(`[Test] BASIC_INFO extraction completed`);
      console.log(`  Total tasks: ${result.summary.totalTasks}`);
      console.log(`  Successful tasks: ${result.summary.successfulTasks}`);
      console.log(`  Failed tasks: ${result.summary.failedTasks}`);
      console.log(`  Total time: ${result.summary.totalTimeMs}ms`);
      console.log(`  Tokens used: ${result.summary.totalTokensUsed}`);

      // 验证执行成功
      expect(result.summary.successfulTasks).toBeGreaterThan(0);
      expect(result.data).toBeDefined();

      // 输出提取的数据
      console.log('\n[Test] Extracted BASIC_INFO:');
      console.log(JSON.stringify(result.data, null, 2));

      // 验证关键字段存在
      const basicInfo = result.data.basicInfo || result.data;
      expect(basicInfo).toBeDefined();

      // 验证甲方（客户）信息
      if (basicInfo.customerName) {
        console.log(`[Test] customerName: ${basicInfo.customerName}`);
        expect(basicInfo.customerName).toContain('上海某某科技');
      }
      if (basicInfo.clientRegistrationNumber) {
        console.log(`[Test] clientRegistrationNumber: ${basicInfo.clientRegistrationNumber}`);
        expect(basicInfo.clientRegistrationNumber).toContain('91310000');
      }
      if (basicInfo.clientAddress) {
        console.log(`[Test] clientAddress: ${basicInfo.clientAddress}`);
        expect(basicInfo.clientAddress).toContain('上海');
      }
      if (basicInfo.clientPhone) {
        console.log(`[Test] clientPhone: ${basicInfo.clientPhone}`);
        expect(basicInfo.clientPhone).toContain('021');
      }
    }, 120000); // 2分钟超时

    it('should parse contract and extract all contact fields with full parsing', async () => {
      // 添加延迟，避免 API 速率限制
      console.log('\n[Test] Waiting 10 seconds before full parsing to avoid rate limiting...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('\n[Test] Starting full contract parsing...');

      const result = await taskBasedParser.parseByTasks(
        testContractText,
        'PROJECT_OUTSOURCING', // 项目外包
        undefined, // 使用合同类型对应的所有任务
        'test-session-full',
        '项目外包服务合同.md'
      );

      console.log(`[Test] Full parsing completed`);
      console.log(`  Total tasks: ${result.summary.totalTasks}`);
      console.log(`  Successful tasks: ${result.summary.successfulTasks}`);
      console.log(`  Failed tasks: ${result.summary.failedTasks}`);
      console.log(`  Successful task types: ${result.summary.successfulTaskTypes.join(', ')}`);
      console.log(`  Total time: ${result.summary.totalTimeMs}ms`);

      // 验证执行成功
      expect(result.summary.successfulTasks).toBeGreaterThan(0);
      expect(result.data).toBeDefined();

      // 输出完整的提取数据
      console.log('\n[Test] Extracted full data:');
      console.log(JSON.stringify(result.data, null, 2));

      // 验证联系字段
      const basicInfo = result.data.basicInfo || result.data;

      // 甲方（客户）信息
      expect(basicInfo.customerName).toBeDefined();
      expect(basicInfo.customerName).toContain('上海某某科技');

      expect(basicInfo.clientRegistrationNumber).toBeDefined();
      expect(basicInfo.clientRegistrationNumber).toContain('91310000');

      expect(basicInfo.clientAddress).toBeDefined();
      expect(basicInfo.clientAddress).toContain('上海');

      expect(basicInfo.clientPhone).toBeDefined();
      expect(basicInfo.clientPhone).toContain('021');

      // 乙方（供应商）信息
      expect(basicInfo.ourEntity).toBeDefined();
      expect(basicInfo.ourEntity).toContain('insigma');

      expect(basicInfo.vendorRegistrationNumber).toBeDefined();
      expect(basicInfo.vendorRegistrationNumber).toContain('91330000');

      expect(basicInfo.vendorPhone).toBeDefined();
      expect(basicInfo.vendorPhone).toContain('0571');
    }, 300000); // 5分钟超时（包含延迟）
  });

  afterAll(async () => {
    // 清理资源
    console.log('\n[Test] Cleaning up...');
  });
});
