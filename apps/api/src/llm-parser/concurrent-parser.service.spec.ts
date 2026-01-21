import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConcurrentParserService } from './concurrent-parser.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { LlmConfigService } from './config/llm-config.service';
import { PrismaService } from '../prisma';

describe('ConcurrentParserService', () => {
  let service: ConcurrentParserService;
  let semanticChunker: SemanticChunkerService;

  beforeEach(async () => {
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
    };

    const mockPrismaService = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcurrentParserService,
        SemanticChunkerService,
        {
          provide: LlmConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ConcurrentParserService>(ConcurrentParserService);
    semanticChunker = module.get<SemanticChunkerService>(SemanticChunkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRelevantFieldsForChunk', () => {
    it('should return relevant fields for header chunk', () => {
      const sampleText = `
合同编号：CT-2024-001
合同名称：技术服务合同
甲方：ABC公司
乙方：XYZ公司
      `;

      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const headerChunk = chunks.find(c => c.metadata.type === 'header');

      if (headerChunk) {
        const allFields = ['contractNo', 'name', 'customerName', 'ourEntity', 'amountWithTax', 'signedAt'];
        const relevant = (service as any).getRelevantFieldsForChunk(headerChunk, allFields);

        expect(relevant).toContain('contractNo');
        expect(relevant).toContain('name');
        // header应该不包含financial字段
        expect(relevant).not.toContain('amountWithTax');
      }
    });

    it('should return relevant fields for financial chunk', () => {
      const sampleText = `
第一条 合同价格
1.1 本合同总价款为人民币500,000元
1.2 税率：13%
1.3 付款方式：银行转账
      `;

      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const financialChunk = chunks.find(c => c.metadata.type === 'financial');

      if (financialChunk) {
        const allFields = ['contractNo', 'amountWithTax', 'taxRate', 'paymentMethod', 'signedAt'];
        const relevant = (service as any).getRelevantFieldsForChunk(financialChunk, allFields);

        expect(relevant).toContain('amountWithTax');
        expect(relevant).toContain('taxRate');
        expect(relevant).toContain('paymentMethod');
        // financial应该不包含基本信息
        expect(relevant).not.toContain('contractNo');
      }
    });
  });

  describe('createExtractionTasks', () => {
    const sampleText = `
合同编号：CT-2024-001
合同名称：技术服务合同
甲方：ABC公司
乙方：XYZ公司

第一条 合同价格
1.1 本合同总价款为人民币500,000元
1.2 税率：13%

第二条 付款条件
2.1 合同签订后支付30%
2.2 项目验收后支付剩余70%

第三条 合同期限
3.1 合同签订日期：2024-01-15
3.2 合同生效日期：2024-01-20
3.3 合同有效期至2024-12-31
    `;

    it('should create extraction tasks for chunks', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const targetFields = ['contractNo', 'name', 'amountWithTax', 'signedAt'];

      const tasks = (service as any).createExtractionTasks(chunks, targetFields);

      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);

      tasks.forEach((task: any) => {
        expect(task).toHaveProperty('chunkId');
        expect(task).toHaveProperty('chunk');
        expect(task).toHaveProperty('targetFields');
        expect(task).toHaveProperty('prompt');
        expect(task.targetFields.length).toBeGreaterThan(0);
      });
    });

    it('should filter out chunks with no relevant fields', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const targetFields = ['contractNo', 'amountWithTax'];

      const tasks = (service as any).createExtractionTasks(chunks, targetFields);

      // 所有任务都应该有相关的字段
      tasks.forEach((task: any) => {
        expect(task.targetFields.length).toBeGreaterThan(0);
      });
    });
  });

  describe('buildPromptForChunk', () => {
    it('should build prompt for header chunk', () => {
      const sampleText = '合同编号：CT-2024-001\n合同名称：技术服务合同';
      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const headerChunk = chunks.find(c => c.metadata.type === 'header');

      if (headerChunk) {
        const prompt = (service as any).buildPromptForChunk(headerChunk, ['contractNo', 'name']);

        expect(prompt).toBeDefined();
        expect(typeof prompt).toBe('string');
        expect(prompt).toContain('合同片段');
        expect(prompt).toContain('contractNo');
        expect(prompt).toContain('name');
      }
    });
  });

  describe('mergeResults', () => {
    it('should merge extraction results correctly', () => {
      const results = [
        {
          chunkId: 'chunk-0',
          success: true,
          data: { contractNo: 'CT-001', name: 'Test Contract' },
          tokensUsed: 100,
          processingTimeMs: 1000,
        },
        {
          chunkId: 'chunk-1',
          success: true,
          data: { amountWithTax: '500000', taxRate: '0.13' },
          tokensUsed: 150,
          processingTimeMs: 1500,
        },
        {
          chunkId: 'chunk-2',
          success: false,
          error: 'Timeout',
          processingTimeMs: 60000,
        },
      ];

      const strategy = (service as any).DEFAULT_MERGE_STRATEGY;
      const merged = (service as any).mergeResults(results, strategy);

      expect(merged).toBeDefined();
      expect(merged.contractNo).toBe('CT-001');
      expect(merged.name).toBe('Test Contract');
      expect(merged.amountWithTax).toBe('500000');
      expect(merged.taxRate).toBe('0.13');
    });
  });
});
