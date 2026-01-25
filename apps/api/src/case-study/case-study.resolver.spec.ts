import { Test, TestingModule } from '@nestjs/testing';
import { CaseStudyResolver } from './case-study.resolver';
import { CaseStudyService } from './case-study.service';
import { CaseStudyStatus } from '@prisma/client';

describe('CaseStudyResolver', () => {
  let resolver: CaseStudyResolver;
  let service: CaseStudyService;

  const mockUser = {
    id: 'user-1',
    name: '测试用户',
    email: 'test@example.com',
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
    createdBy: mockUser,
  };

  const mockCaseStudyService = {
    generate: jest.fn(),
    regenerate: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByContractId: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaseStudyResolver,
        { provide: CaseStudyService, useValue: mockCaseStudyService },
      ],
    }).compile();

    resolver = module.get<CaseStudyResolver>(CaseStudyResolver);
    service = module.get<CaseStudyService>(CaseStudyService);

    jest.clearAllMocks();
  });

  describe('generateCaseStudy', () => {
    it('should generate a case study using AI', async () => {
      const generateResult = { success: true, caseStudy: mockCaseStudy };
      mockCaseStudyService.generate.mockResolvedValue(generateResult);

      const input = {
        contractId: 'contract-1',
        desensitize: true,
        includeChallenges: true,
        includeSolution: true,
        includeResults: true,
        includeTestimonial: false,
        writingStyle: 'professional',
        tags: ['测试标签'],
      };

      const result = await resolver.generateCaseStudy(input, mockUser);

      expect(result).toEqual(generateResult);
      expect(mockCaseStudyService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-1',
          createdById: 'user-1',
          desensitize: true,
        })
      );
    });

    it('should return error when generation fails', async () => {
      const generateResult = { success: false, error: 'LLM error' };
      mockCaseStudyService.generate.mockResolvedValue(generateResult);

      const input = { contractId: 'contract-1' };

      const result = await resolver.generateCaseStudy(input, mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('LLM error');
    });
  });

  describe('regenerateCaseStudy', () => {
    it('should regenerate a case study', async () => {
      const regenerateResult = { success: true, caseStudy: mockCaseStudy };
      mockCaseStudyService.regenerate.mockResolvedValue(regenerateResult);

      const result = await resolver.regenerateCaseStudy(
        'case-study-1',
        { regenerateAll: true },
        mockUser
      );

      expect(result).toEqual(regenerateResult);
      expect(mockCaseStudyService.regenerate).toHaveBeenCalledWith(
        'case-study-1',
        'user-1',
        { regenerateAll: true }
      );
    });
  });

  describe('createCaseStudy', () => {
    it('should create a case study manually', async () => {
      mockCaseStudyService.create.mockResolvedValue(mockCaseStudy);

      const input = {
        contractId: 'contract-1',
        title: '测试案例标题',
        summary: '这是一个测试项目概述',
        fullMarkdown: '# 测试案例标题\n...',
      };

      const result = await resolver.createCaseStudy(input, mockUser);

      expect(result).toEqual(mockCaseStudy);
      expect(mockCaseStudyService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-1',
          createdById: 'user-1',
          title: '测试案例标题',
        })
      );
    });
  });

  describe('caseStudies', () => {
    it('should return paginated case studies', async () => {
      const mockResponse = { items: [mockCaseStudy], total: 1 };
      mockCaseStudyService.findAll.mockResolvedValue(mockResponse);

      const result = await resolver.caseStudies(undefined, undefined, 10, 0);

      expect(result).toEqual(mockResponse);
      expect(mockCaseStudyService.findAll).toHaveBeenCalledWith({
        contractId: undefined,
        status: undefined,
        limit: 10,
        offset: 0,
      });
    });

    it('should filter by contractId and status', async () => {
      const mockResponse = { items: [mockCaseStudy], total: 1 };
      mockCaseStudyService.findAll.mockResolvedValue(mockResponse);

      await resolver.caseStudies('contract-1', CaseStudyStatus.GENERATED, 10, 0);

      expect(mockCaseStudyService.findAll).toHaveBeenCalledWith({
        contractId: 'contract-1',
        status: CaseStudyStatus.GENERATED,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('caseStudy', () => {
    it('should return a single case study', async () => {
      mockCaseStudyService.findOne.mockResolvedValue(mockCaseStudy);

      const result = await resolver.caseStudy('case-study-1');

      expect(result).toEqual(mockCaseStudy);
      expect(mockCaseStudyService.findOne).toHaveBeenCalledWith('case-study-1');
    });
  });

  describe('caseStudiesByContract', () => {
    it('should return case studies for a contract', async () => {
      mockCaseStudyService.findByContractId.mockResolvedValue([mockCaseStudy]);

      const result = await resolver.caseStudiesByContract('contract-1');

      expect(result).toEqual([mockCaseStudy]);
      expect(mockCaseStudyService.findByContractId).toHaveBeenCalledWith('contract-1');
    });
  });

  describe('updateCaseStudy', () => {
    it('should update a case study', async () => {
      const updatedCaseStudy = { ...mockCaseStudy, title: '更新后的标题' };
      mockCaseStudyService.update.mockResolvedValue(updatedCaseStudy);

      const result = await resolver.updateCaseStudy(
        'case-study-1',
        { title: '更新后的标题' },
        mockUser
      );

      expect(result.title).toBe('更新后的标题');
      expect(mockCaseStudyService.update).toHaveBeenCalledWith(
        'case-study-1',
        'user-1',
        { title: '更新后的标题' }
      );
    });
  });

  describe('updateCaseStudyStatus', () => {
    it('should update case study status', async () => {
      const updatedCaseStudy = { ...mockCaseStudy, status: CaseStudyStatus.APPROVED };
      mockCaseStudyService.updateStatus.mockResolvedValue(updatedCaseStudy);

      const result = await resolver.updateCaseStudyStatus(
        'case-study-1',
        { status: CaseStudyStatus.APPROVED }
      );

      expect(result.status).toBe(CaseStudyStatus.APPROVED);
      expect(mockCaseStudyService.updateStatus).toHaveBeenCalledWith(
        'case-study-1',
        CaseStudyStatus.APPROVED
      );
    });
  });

  describe('deleteCaseStudy', () => {
    it('should delete a case study', async () => {
      mockCaseStudyService.remove.mockResolvedValue(undefined);

      const result = await resolver.deleteCaseStudy('case-study-1');

      expect(result).toBe(true);
      expect(mockCaseStudyService.remove).toHaveBeenCalledWith('case-study-1');
    });
  });
});
