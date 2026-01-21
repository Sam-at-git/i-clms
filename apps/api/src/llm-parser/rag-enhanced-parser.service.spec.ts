import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SemanticChunkerService } from './semantic-chunker.service';
import { RagEnhancedParserService } from './rag-enhanced-parser.service';
import { LlmConfigService } from './config/llm-config.service';
import { PrismaService } from '../prisma';

describe('RagEnhancedParserService', () => {
  let service: RagEnhancedParserService;
  let semanticChunker: SemanticChunkerService;
  let configService: jest.Mocked<LlmConfigService>;

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
        RagEnhancedParserService,
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

    service = module.get<RagEnhancedParserService>(RagEnhancedParserService);
    semanticChunker = module.get<SemanticChunkerService>(SemanticChunkerService);
    configService = mockConfigService as any;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createExtractionPlans', () => {
    const sampleText = `
合同编号：CT-2024-001
合同名称：技术服务合同
甲方：ABC科技公司

第一条 合同价格
本合同总价款为人民币500,000元
税率：13%

第二条 付款条件
合同签订后支付30%

第三条 合同期限
签订日期：2024-01-15
生效日期：2024-01-20
`;

    it('should create extraction plans for target fields', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const targetFields = ['amountWithTax', 'signedAt', 'contractNo'];

      // 访问私有方法进行测试
      const plans = (service as any).createExtractionPlans(chunks, targetFields, 3);

      expect(plans).toBeDefined();
      expect(plans.length).toBe(targetFields.length);

      plans.forEach((plan: any) => {
        expect(plan).toHaveProperty('field');
        expect(plan).toHaveProperty('relevantChunks');
        expect(plan).toHaveProperty('strategy');
        expect(plan).toHaveProperty('confidence');
      });
    });

    it('should assign correct strategies based on relevance', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const targetFields = ['contractNo', 'amountWithTax'];

      const plans = (service as any).createExtractionPlans(chunks, targetFields, 3);

      // contractNo 应该在header中，有高相关性
      const contractNoPlan = plans.find((p: any) => p.field === 'contractNo');
      expect(contractNoPlan).toBeDefined();
      expect(['direct', 'hybrid', 'llm']).toContain(contractNoPlan.strategy);
    });
  });

  describe('calculateFieldRelevance', () => {
    const sampleText = `
合同编号：CT-2024-001
第一条 合同价格：500,000元
第二条 期限：1年
`;

    it('should calculate relevance score for header chunk', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const headerChunk = chunks.find(c => c.metadata.type === 'header');

      if (headerChunk) {
        const score = (service as any).calculateFieldRelevance(headerChunk, 'contractNo');
        expect(score).toBeGreaterThan(0);
      }
    });

    it('should calculate relevance score for financial chunk', () => {
      const chunks = semanticChunker.chunkBySemanticStructure(sampleText);
      const financialChunk = chunks.find(c => c.metadata.type === 'financial');

      if (financialChunk) {
        const score = (service as any).calculateFieldRelevance(financialChunk, 'amountWithTax');
        expect(score).toBeGreaterThan(0);
      }
    });
  });
});
