import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CaseStudyService } from './case-study.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { CaseStudyStatus, ContractType } from '@prisma/client';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: '测试案例标题',
                  subtitle: '测试副标题',
                  summary: '这是一个测试项目概述',
                  challenges: '客户面临的挑战描述',
                  solution: '我们提供的解决方案',
                  results: '项目取得的成果',
                  testimonial: '客户评价内容',
                  techStack: 'React, Node.js',
                  timeline: '3个月',
                  teamSize: '5人',
                  suggestedTags: ['数字化转型', '企业服务'],
                }),
              },
            },
          ],
        }),
      },
    },
  }));
});

describe('CaseStudyService', () => {
  let service: CaseStudyService;
  let prismaService: PrismaService;

  const mockContract = {
    id: 'contract-1',
    contractNo: 'C2024001',
    name: '测试合同',
    type: ContractType.PROJECT_OUTSOURCING,
    ourEntity: '测试公司',
    amountWithTax: 1500000,
    currency: 'CNY',
    industry: '金融',
    duration: '12个月',
    signedAt: new Date('2024-01-01'),
    customer: {
      id: 'customer-1',
      name: '某金融集团',
      industry: '金融',
    },
    staffAugmentation: null,
    projectOutsourcing: {
      id: 'detail-1',
      sowSummary: 'SOW范围描述',
      deliverables: '交付物清单',
      milestones: [
        { name: '需求分析', amount: 300000 },
        { name: '系统开发', amount: 800000 },
        { name: '上线部署', amount: 400000 },
      ],
    },
    productSales: null,
  };

  const mockCaseStudy = {
    id: 'case-study-1',
    contractId: 'contract-1',
    title: '测试案例标题',
    subtitle: '测试副标题',
    status: CaseStudyStatus.GENERATED,
    summary: '这是一个测试项目概述',
    challenges: '客户面临的挑战描述',
    solution: '我们提供的解决方案',
    results: '项目取得的成果',
    testimonial: '客户评价内容',
    techStack: 'React, Node.js',
    timeline: '3个月',
    teamSize: '5人',
    fullMarkdown: '# 测试案例标题\n...',
    isDesensitized: true,
    displayCustomerName: '某金融集团',
    displayAmount: '百万级项目',
    displayIndustry: '金融服务行业',
    llmModel: 'gemma3:27b',
    llmProvider: 'ollama',
    generatedAt: new Date(),
    confidence: null,
    isManuallyEdited: false,
    lastEditedAt: null,
    lastEditedBy: null,
    version: 1,
    tags: ['数字化转型', '企业服务'],
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    contract: {
      id: 'contract-1',
      contractNo: 'C2024001',
      name: '测试合同',
      industry: '金融',
      ourEntity: '测试公司',
    },
    createdBy: {
      id: 'user-1',
      name: '测试用户',
      email: 'test@example.com',
    },
  };

  const mockPrismaService = {
    contract: {
      findUnique: jest.fn(),
    },
    caseStudy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockLlmConfigService = {
    refreshCache: jest.fn().mockResolvedValue(undefined),
    getActiveConfig: jest.fn().mockReturnValue({
      baseUrl: 'http://localhost:11434/v1',
      apiKey: 'test-key',
      model: 'gemma3:27b',
      temperature: 0.1,
      maxTokens: 4000,
      timeout: 120000,
    }),
    getProviderName: jest.fn().mockReturnValue('ollama'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseStudyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LlmConfigService, useValue: mockLlmConfigService },
      ],
    }).compile();

    service = module.get<CaseStudyService>(CaseStudyService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a case study by id', async () => {
      mockPrismaService.caseStudy.findUnique.mockResolvedValue(mockCaseStudy);

      const result = await service.findOne('case-study-1');

      expect(result).toEqual(mockCaseStudy);
      expect(mockPrismaService.caseStudy.findUnique).toHaveBeenCalledWith({
        where: { id: 'case-study-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if case study not found', async () => {
      mockPrismaService.caseStudy.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated case studies', async () => {
      const mockItems = [mockCaseStudy];
      mockPrismaService.caseStudy.findMany.mockResolvedValue(mockItems);
      mockPrismaService.caseStudy.count.mockResolvedValue(1);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result).toEqual({ items: mockItems, total: 1 });
    });

    it('should filter by contractId', async () => {
      mockPrismaService.caseStudy.findMany.mockResolvedValue([mockCaseStudy]);
      mockPrismaService.caseStudy.count.mockResolvedValue(1);

      await service.findAll({ contractId: 'contract-1' });

      expect(mockPrismaService.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contractId: 'contract-1' },
        })
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.caseStudy.findMany.mockResolvedValue([mockCaseStudy]);
      mockPrismaService.caseStudy.count.mockResolvedValue(1);

      await service.findAll({ status: CaseStudyStatus.GENERATED });

      expect(mockPrismaService.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CaseStudyStatus.GENERATED },
        })
      );
    });
  });

  describe('findByContractId', () => {
    it('should return case studies for a contract', async () => {
      mockPrismaService.caseStudy.findMany.mockResolvedValue([mockCaseStudy]);

      const result = await service.findByContractId('contract-1');

      expect(result).toEqual([mockCaseStudy]);
      expect(mockPrismaService.caseStudy.findMany).toHaveBeenCalledWith({
        where: { contractId: 'contract-1' },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('create', () => {
    it('should create a case study manually', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(mockContract);
      mockPrismaService.caseStudy.create.mockResolvedValue(mockCaseStudy);

      const input = {
        contractId: 'contract-1',
        createdById: 'user-1',
        title: '测试案例标题',
        summary: '这是一个测试项目概述',
        fullMarkdown: '# 测试案例标题\n...',
      };

      const result = await service.create(input);

      expect(result).toEqual(mockCaseStudy);
      expect(mockPrismaService.caseStudy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            createdById: 'user-1',
            title: '测试案例标题',
            status: CaseStudyStatus.DRAFT,
            isManuallyEdited: true,
          }),
        })
      );
    });

    it('should throw NotFoundException if contract not found', async () => {
      mockPrismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          contractId: 'non-existent',
          createdById: 'user-1',
          title: '测试',
          summary: '测试',
          fullMarkdown: '# 测试',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a case study', async () => {
      const updatedCaseStudy = { ...mockCaseStudy, title: '更新后的标题' };
      mockPrismaService.caseStudy.findUnique.mockResolvedValue(mockCaseStudy);
      mockPrismaService.caseStudy.update.mockResolvedValue(updatedCaseStudy);

      const result = await service.update('case-study-1', 'user-1', { title: '更新后的标题' });

      expect(result.title).toBe('更新后的标题');
      expect(mockPrismaService.caseStudy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'case-study-1' },
          data: expect.objectContaining({
            title: '更新后的标题',
            isManuallyEdited: true,
            lastEditedBy: 'user-1',
          }),
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update case study status', async () => {
      const updatedCaseStudy = { ...mockCaseStudy, status: CaseStudyStatus.APPROVED };
      mockPrismaService.caseStudy.findUnique.mockResolvedValue(mockCaseStudy);
      mockPrismaService.caseStudy.update.mockResolvedValue(updatedCaseStudy);

      const result = await service.updateStatus('case-study-1', CaseStudyStatus.APPROVED);

      expect(result.status).toBe(CaseStudyStatus.APPROVED);
      expect(mockPrismaService.caseStudy.update).toHaveBeenCalledWith({
        where: { id: 'case-study-1' },
        data: { status: CaseStudyStatus.APPROVED },
        include: expect.any(Object),
      });
    });
  });

  describe('remove', () => {
    it('should delete a case study', async () => {
      mockPrismaService.caseStudy.findUnique.mockResolvedValue(mockCaseStudy);
      mockPrismaService.caseStudy.delete.mockResolvedValue(mockCaseStudy);

      await service.remove('case-study-1');

      expect(mockPrismaService.caseStudy.delete).toHaveBeenCalledWith({
        where: { id: 'case-study-1' },
      });
    });

    it('should throw NotFoundException if case study not found', async () => {
      mockPrismaService.caseStudy.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
