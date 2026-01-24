import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { LegalService } from './legal.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { ReviewStatus, LegalRiskLevel } from './dto/legal-review.dto';
import { NotFoundException } from '@nestjs/common';

describe('LegalService', () => {
  let service: LegalService;
  let prismaService: DeepMockProxy<PrismaClient>;

  const mockContract = {
    id: 'contract-1',
    contractNo: 'CT-2024-001',
    name: 'Test Contract',
    type: 'STAFF_AUGMENTATION',
    status: 'ACTIVE',
    amountWithTax: { toString: () => '100000' } as any,
    signedAt: new Date('2024-01-15'),
    effectiveAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-12-31'),
    customer: {
      id: 'customer-1',
      name: 'Test Customer',
    },
  };

  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
  };

  const mockLegalReview = {
    id: 'review-1',
    contractId: 'contract-1',
    reviewerId: 'user-1',
    status: ReviewStatus.DRAFT,
    findings: { riskScore: 30, issues: [] },
    riskLevel: LegalRiskLevel.LOW,
    recommendations: 'No issues found',
    reviewedAt: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    contract: {
      id: 'contract-1',
      contractNo: 'CT-2024-001',
      name: 'Test Contract',
    },
    reviewer: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<LegalService>(LegalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // Legal Review CRUD Tests
  // ================================

  describe('legalReviews', () => {
    it('should return paginated legal reviews', async () => {
      prismaService.legalReview.findMany.mockResolvedValue([mockLegalReview] as any);
      prismaService.legalReview.count.mockResolvedValue(1);

      const result = await service.legalReviews();

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should apply filters correctly', async () => {
      prismaService.legalReview.findMany.mockResolvedValue([] as any);
      prismaService.legalReview.count.mockResolvedValue(0);

      await service.legalReviews({
        filter: {
          contractId: 'contract-1',
          status: ReviewStatus.DRAFT,
          riskLevel: LegalRiskLevel.LOW,
          reviewerId: 'user-1',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(prismaService.legalReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractId: 'contract-1',
            status: ReviewStatus.DRAFT,
            riskLevel: LegalRiskLevel.LOW,
            reviewerId: 'user-1',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          skip: 10,
          take: 10,
          orderBy: { createdAt: 'asc' },
        })
      );
    });

    it('should return empty array when no reviews exist', async () => {
      prismaService.legalReview.findMany.mockResolvedValue([]);
      prismaService.legalReview.count.mockResolvedValue(0);

      const result = await service.legalReviews();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('legalReview', () => {
    it('should return a single legal review by ID', async () => {
      prismaService.legalReview.findUnique.mockResolvedValue(mockLegalReview as any);

      const result = await service.legalReview('review-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('review-1');
      expect(prismaService.legalReview.findUnique).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              name: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when review does not exist', async () => {
      prismaService.legalReview.findUnique.mockResolvedValue(null);

      await expect(service.legalReview('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.legalReview('nonexistent')).rejects.toThrow('Legal review with ID nonexistent not found');
    });
  });

  describe('pendingReviews', () => {
    it('should return pending reviews', async () => {
      prismaService.legalReview.findMany.mockResolvedValue([mockLegalReview] as any);

      const result = await service.pendingReviews();

      expect(result).toHaveLength(1);
    });

    it('should filter by department when provided', async () => {
      prismaService.legalReview.findMany.mockResolvedValue([] as any);

      await service.pendingReviews('dept-1');

      expect(prismaService.legalReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ReviewStatus.DRAFT, ReviewStatus.IN_PROGRESS] },
            contract: { departmentId: 'dept-1' },
          }),
        })
      );
    });

    it('should only return DRAFT and IN_PROGRESS reviews', async () => {
      prismaService.legalReview.findMany.mockResolvedValue([] as any);

      await service.pendingReviews();

      expect(prismaService.legalReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: [ReviewStatus.DRAFT, ReviewStatus.IN_PROGRESS] },
          }),
        })
      );
    });

    it('should order by createdAt ascending', async () => {
      prismaService.legalReview.findMany.mockResolvedValue([] as any);

      await service.pendingReviews();

      expect(prismaService.legalReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        })
      );
    });
  });

  describe('createLegalReview', () => {
    it('should create a new legal review', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.legalReview.create.mockResolvedValue(mockLegalReview as any);

      const result = await service.createLegalReview({
        contractId: 'contract-1',
        reviewerId: 'user-1',
        riskLevel: LegalRiskLevel.LOW,
      });

      expect(result).toBeDefined();
      expect(prismaService.legalReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            reviewerId: 'user-1',
            riskLevel: LegalRiskLevel.LOW,
            status: ReviewStatus.DRAFT,
          }),
        })
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.createLegalReview({
          contractId: 'nonexistent',
          reviewerId: 'user-1',
          riskLevel: LegalRiskLevel.LOW,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when reviewer does not exist', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createLegalReview({
          contractId: 'contract-1',
          reviewerId: 'nonexistent',
          riskLevel: LegalRiskLevel.LOW,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should parse findings JSON when provided', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.legalReview.create.mockResolvedValue(mockLegalReview as any);

      const findings = JSON.stringify({ riskScore: 30, issues: ['Missing signature'] });

      await service.createLegalReview({
        contractId: 'contract-1',
        reviewerId: 'user-1',
        riskLevel: LegalRiskLevel.MEDIUM,
        findings,
      });

      expect(prismaService.legalReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            findings: { riskScore: 30, issues: ['Missing signature'] },
          }),
        })
      );
    });

    it('should use provided status when specified', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.legalReview.create.mockResolvedValue(mockLegalReview as any);

      await service.createLegalReview({
        contractId: 'contract-1',
        reviewerId: 'user-1',
        riskLevel: LegalRiskLevel.LOW,
        status: ReviewStatus.IN_PROGRESS,
      });

      expect(prismaService.legalReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReviewStatus.IN_PROGRESS,
          }),
        })
      );
    });
  });

  describe('updateLegalReview', () => {
    it('should update an existing legal review', async () => {
      prismaService.legalReview.findUnique.mockResolvedValue(mockLegalReview as any);
      prismaService.legalReview.update.mockResolvedValue({
        ...mockLegalReview,
        status: ReviewStatus.SUBMITTED,
      } as any);

      const result = await service.updateLegalReview('review-1', {
        status: ReviewStatus.SUBMITTED,
      });

      expect(result).toBeDefined();
      expect(prismaService.legalReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'review-1' },
          data: expect.objectContaining({
            status: ReviewStatus.SUBMITTED,
          }),
        })
      );
    });

    it('should throw NotFoundException when review does not exist', async () => {
      prismaService.legalReview.findUnique.mockResolvedValue(null);

      await expect(
        service.updateLegalReview('nonexistent', { status: ReviewStatus.SUBMITTED })
      ).rejects.toThrow(NotFoundException);
    });

    it('should update multiple fields', async () => {
      prismaService.legalReview.findUnique.mockResolvedValue(mockLegalReview as any);
      prismaService.legalReview.update.mockResolvedValue(mockLegalReview as any);

      await service.updateLegalReview('review-1', {
        status: ReviewStatus.APPROVED,
        riskLevel: LegalRiskLevel.MEDIUM,
        recommendations: 'Updated recommendations',
      });

      expect(prismaService.legalReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReviewStatus.APPROVED,
            riskLevel: LegalRiskLevel.MEDIUM,
            recommendations: 'Updated recommendations',
          }),
        })
      );
    });

    it('should parse findings JSON when updating', async () => {
      prismaService.legalReview.findUnique.mockResolvedValue(mockLegalReview as any);
      prismaService.legalReview.update.mockResolvedValue(mockLegalReview as any);

      const findings = JSON.stringify({ riskScore: 50, issues: ['New issue'] });

      await service.updateLegalReview('review-1', { findings });

      expect(prismaService.legalReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            findings: { riskScore: 50, issues: ['New issue'] },
          }),
        })
      );
    });

    it('should update reviewedAt when provided', async () => {
      prismaService.legalReview.findUnique.mockResolvedValue(mockLegalReview as any);
      prismaService.legalReview.update.mockResolvedValue(mockLegalReview as any);

      await service.updateLegalReview('review-1', {
        reviewedAt: '2024-01-20',
      });

      expect(prismaService.legalReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reviewedAt: new Date('2024-01-20'),
          }),
        })
      );
    });
  });

  describe('submitLegalReview', () => {
    it('should submit a legal review', async () => {
      prismaService.legalReview.update.mockResolvedValue({
        ...mockLegalReview,
        status: ReviewStatus.SUBMITTED,
      } as any);

      const result = await service.submitLegalReview('review-1');

      expect(result).toBeDefined();
      expect(prismaService.legalReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'review-1' },
          data: {
            status: ReviewStatus.SUBMITTED,
          },
        })
      );
    });

    it('should return the submitted review', async () => {
      const submittedReview = { ...mockLegalReview, status: ReviewStatus.SUBMITTED };
      prismaService.legalReview.update.mockResolvedValue(submittedReview as any);

      const result = await service.submitLegalReview('review-1');

      expect(result.status).toBe(ReviewStatus.SUBMITTED);
    });
  });
});
