import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { RiskEngineService } from './risk-engine.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { RiskAlertType, RiskSeverity, AlertStatus } from './dto/risk-alert.dto';
import { NotFoundException } from '@nestjs/common';

describe('RiskEngineService', () => {
  let service: RiskEngineService;
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

  const mockRiskAlert = {
    id: 'alert-1',
    contractId: 'contract-1',
    type: RiskAlertType.CONTRACT_EXPIRY,
    severity: RiskSeverity.MEDIUM,
    title: 'Contract Expiring Soon',
    description: 'Contract will expire in 30 days',
    status: AlertStatus.ACTIVE,
    dismissedAt: null,
    dismissedBy: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    contract: {
      id: 'contract-1',
      contractNo: 'CT-2024-001',
      name: 'Test Contract',
    },
  };

  const mockRiskAssessment = {
    id: 'assessment-1',
    contractId: 'contract-1',
    totalScore: 45.5,
    riskLevel: 'MEDIUM',
    factors: { amount: { score: 60, weight: 0.25 } },
    recommendations: ['Monitor payment terms'],
    assessedAt: new Date('2024-01-15'),
    assessedBy: 'user-1',
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskEngineService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<RiskEngineService>(RiskEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================================
  // Risk Alert CRUD Tests
  // ================================

  describe('riskAlerts', () => {
    it('should return paginated risk alerts', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([mockRiskAlert] as any);
      prismaService.riskAlert.count.mockResolvedValue(1);

      const result = await service.riskAlerts();

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should apply filters correctly', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([] as any);
      prismaService.riskAlert.count.mockResolvedValue(0);

      await service.riskAlerts({
        filter: {
          contractId: 'contract-1',
          type: RiskAlertType.CONTRACT_EXPIRY,
          severity: RiskSeverity.MEDIUM,
          status: AlertStatus.ACTIVE,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(prismaService.riskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractId: 'contract-1',
            type: RiskAlertType.CONTRACT_EXPIRY,
            severity: RiskSeverity.MEDIUM,
            status: AlertStatus.ACTIVE,
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

    it('should return empty array when no alerts exist', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([]);
      prismaService.riskAlert.count.mockResolvedValue(0);

      const result = await service.riskAlerts();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([mockRiskAlert] as any);

      const result = await service.getActiveAlerts();

      expect(result).toHaveLength(1);
    });

    it('should filter by severity when provided', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([] as any);

      await service.getActiveAlerts(RiskSeverity.HIGH);

      expect(prismaService.riskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AlertStatus.ACTIVE,
            severity: RiskSeverity.HIGH,
          }),
        })
      );
    });

    it('should only return ACTIVE alerts', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([] as any);

      await service.getActiveAlerts();

      expect(prismaService.riskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: AlertStatus.ACTIVE,
          }),
        })
      );
    });

    it('should order by createdAt descending', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([] as any);

      await service.getActiveAlerts();

      expect(prismaService.riskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history for a contract', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([mockRiskAlert] as any);

      const result = await service.getAlertHistory('contract-1');

      expect(result).toHaveLength(1);
    });

    it('should filter by contractId', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([] as any);

      await service.getAlertHistory('contract-1');

      expect(prismaService.riskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contractId: 'contract-1' },
        })
      );
    });

    it('should order by createdAt descending', async () => {
      prismaService.riskAlert.findMany.mockResolvedValue([] as any);

      await service.getAlertHistory('contract-1');

      expect(prismaService.riskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('createAlert', () => {
    it('should create a new risk alert', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.riskAlert.create.mockResolvedValue(mockRiskAlert as any);

      const result = await service.createAlert({
        contractId: 'contract-1',
        type: RiskAlertType.CONTRACT_EXPIRY,
        severity: RiskSeverity.MEDIUM,
        title: 'Contract Expiring Soon',
        description: 'Contract will expire in 30 days',
      });

      expect(result).toBeDefined();
      expect(prismaService.riskAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            type: RiskAlertType.CONTRACT_EXPIRY,
            severity: RiskSeverity.MEDIUM,
            title: 'Contract Expiring Soon',
            description: 'Contract will expire in 30 days',
            status: AlertStatus.ACTIVE,
          }),
        })
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.createAlert({
          contractId: 'nonexistent',
          type: RiskAlertType.CONTRACT_EXPIRY,
          severity: RiskSeverity.MEDIUM,
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAlert', () => {
    it('should update an existing risk alert', async () => {
      prismaService.riskAlert.findUnique.mockResolvedValue(mockRiskAlert as any);
      prismaService.riskAlert.update.mockResolvedValue({
        ...mockRiskAlert,
        severity: RiskSeverity.HIGH,
      } as any);

      const result = await service.updateAlert('alert-1', {
        severity: RiskSeverity.HIGH,
      });

      expect(result).toBeDefined();
      expect(prismaService.riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-1' },
          data: expect.objectContaining({
            severity: RiskSeverity.HIGH,
          }),
        })
      );
    });

    it('should throw NotFoundException when alert does not exist', async () => {
      prismaService.riskAlert.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAlert('nonexistent', { severity: RiskSeverity.HIGH })
      ).rejects.toThrow(NotFoundException);
    });

    it('should update multiple fields', async () => {
      prismaService.riskAlert.findUnique.mockResolvedValue(mockRiskAlert as any);
      prismaService.riskAlert.update.mockResolvedValue(mockRiskAlert as any);

      await service.updateAlert('alert-1', {
        severity: RiskSeverity.HIGH,
        status: AlertStatus.ESCALATED,
        title: 'Updated title',
      });

      expect(prismaService.riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            severity: RiskSeverity.HIGH,
            status: AlertStatus.ESCALATED,
            title: 'Updated title',
          }),
        })
      );
    });

    it('should set dismissedAt when status changes to RESOLVED', async () => {
      prismaService.riskAlert.findUnique.mockResolvedValue(mockRiskAlert as any);
      prismaService.riskAlert.update.mockResolvedValue(mockRiskAlert as any);

      await service.updateAlert('alert-1', { status: AlertStatus.RESOLVED });

      expect(prismaService.riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AlertStatus.RESOLVED,
            dismissedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should set dismissedAt when status changes to DISMISSED', async () => {
      prismaService.riskAlert.findUnique.mockResolvedValue(mockRiskAlert as any);
      prismaService.riskAlert.update.mockResolvedValue(mockRiskAlert as any);

      await service.updateAlert('alert-1', { status: AlertStatus.DISMISSED });

      expect(prismaService.riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AlertStatus.DISMISSED,
            dismissedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should not set dismissedAt if alert is already not ACTIVE', async () => {
      const inactiveAlert = { ...mockRiskAlert, status: AlertStatus.RESOLVED };
      prismaService.riskAlert.findUnique.mockResolvedValue(inactiveAlert as any);
      prismaService.riskAlert.update.mockResolvedValue(inactiveAlert as any);

      await service.updateAlert('alert-1', { severity: RiskSeverity.LOW });

      const updateCall = prismaService.riskAlert.update.mock.calls[0][0];
      expect(updateCall.data.dismissedAt).toBeUndefined();
    });
  });

  describe('dismissAlert', () => {
    it('should dismiss a risk alert', async () => {
      prismaService.riskAlert.update.mockResolvedValue({
        ...mockRiskAlert,
        status: AlertStatus.DISMISSED,
        dismissedAt: new Date(),
        dismissedBy: 'user-1',
      } as any);

      const result = await service.dismissAlert('alert-1', 'user-1');

      expect(result).toBeDefined();
      expect(prismaService.riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-1' },
          data: {
            status: AlertStatus.DISMISSED,
            dismissedAt: expect.any(Date),
            dismissedBy: 'user-1',
          },
        })
      );
    });

    it('should work without userId', async () => {
      prismaService.riskAlert.update.mockResolvedValue(mockRiskAlert as any);

      await service.dismissAlert('alert-1');

      expect(prismaService.riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AlertStatus.DISMISSED,
            dismissedAt: expect.any(Date),
            dismissedBy: undefined,
          }),
        })
      );
    });
  });

  // ================================
  // Risk Assessment History Tests
  // ================================

  describe('saveRiskAssessment', () => {
    it('should save a risk assessment', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.riskAssessment.create.mockResolvedValue(mockRiskAssessment as any);

      const result = await service.saveRiskAssessment({
        contractId: 'contract-1',
        totalScore: 45.5,
        riskLevel: 'MEDIUM',
        factors: JSON.stringify({ amount: { score: 60, weight: 0.25 } }),
      });

      expect(result).toBeDefined();
      expect(prismaService.riskAssessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            totalScore: 45.5,
            riskLevel: 'MEDIUM',
            factors: { amount: { score: 60, weight: 0.25 } },
          }),
        })
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.saveRiskAssessment({
          contractId: 'nonexistent',
          totalScore: 45.5,
          riskLevel: 'MEDIUM',
          factors: '{}',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should parse recommendations JSON when provided', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.riskAssessment.create.mockResolvedValue(mockRiskAssessment as any);

      const recommendations = JSON.stringify(['Monitor payment terms', 'Check clauses']);

      await service.saveRiskAssessment({
        contractId: 'contract-1',
        totalScore: 45.5,
        riskLevel: 'MEDIUM',
        factors: '{}',
        recommendations,
      });

      expect(prismaService.riskAssessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recommendations: ['Monitor payment terms', 'Check clauses'],
          }),
        })
      );
    });

    it('should include assessedBy when provided', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.riskAssessment.create.mockResolvedValue(mockRiskAssessment as any);

      await service.saveRiskAssessment({
        contractId: 'contract-1',
        totalScore: 45.5,
        riskLevel: 'MEDIUM',
        factors: '{}',
        assessedBy: 'user-1',
      });

      expect(prismaService.riskAssessment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assessedBy: 'user-1',
          }),
        })
      );
    });
  });

  describe('riskAssessmentHistory', () => {
    it('should return paginated risk assessment history', async () => {
      prismaService.riskAssessment.findMany.mockResolvedValue([mockRiskAssessment] as any);
      prismaService.riskAssessment.count.mockResolvedValue(1);

      const result = await service.riskAssessmentHistory('contract-1');

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by contractId', async () => {
      prismaService.riskAssessment.findMany.mockResolvedValue([] as any);
      prismaService.riskAssessment.count.mockResolvedValue(0);

      await service.riskAssessmentHistory('contract-1', 2, 10);

      expect(prismaService.riskAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contractId: 'contract-1' },
          skip: 10,
          take: 10,
        })
      );
    });

    it('should order by assessedAt descending', async () => {
      prismaService.riskAssessment.findMany.mockResolvedValue([] as any);

      await service.riskAssessmentHistory('contract-1');

      expect(prismaService.riskAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { assessedAt: 'desc' },
        })
      );
    });

    it('should return empty array when no assessments exist', async () => {
      prismaService.riskAssessment.findMany.mockResolvedValue([]);
      prismaService.riskAssessment.count.mockResolvedValue(0);

      const result = await service.riskAssessmentHistory('contract-1');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('compareRiskScores', () => {
    it('should return comparison with current and previous scores', async () => {
      const assessments = [
        { ...mockRiskAssessment, totalScore: 45.5, riskLevel: 'MEDIUM', assessedAt: new Date('2024-01-15') },
        { ...mockRiskAssessment, id: 'a2', totalScore: 60.0, riskLevel: 'HIGH', assessedAt: new Date('2024-01-10') },
        { ...mockRiskAssessment, id: 'a3', totalScore: 30.0, riskLevel: 'LOW', assessedAt: new Date('2024-01-05') },
      ];
      prismaService.riskAssessment.findMany.mockResolvedValue(assessments as any);

      const result = await service.compareRiskScores('contract-1');

      expect(result.current).toEqual({
        score: 45.5,
        level: 'MEDIUM',
        date: assessments[0].assessedAt,
      });
      expect(result.previous).toHaveLength(2);
      expect(result.previous[0].score).toBe(60.0);
      expect(result.previous[1].score).toBe(30.0);
    });

    it('should return STABLE trend when scores are similar', async () => {
      const assessments = [
        { ...mockRiskAssessment, totalScore: 50, riskLevel: 'MEDIUM', assessedAt: new Date('2024-01-15') },
        { ...mockRiskAssessment, id: 'a2', totalScore: 52, riskLevel: 'MEDIUM', assessedAt: new Date('2024-01-10') },
      ];
      prismaService.riskAssessment.findMany.mockResolvedValue(assessments as any);

      const result = await service.compareRiskScores('contract-1');

      expect(result.trend).toBe('STABLE');
    });

    it('should return IMPROVING trend when current score is lower', async () => {
      const assessments = [
        { ...mockRiskAssessment, totalScore: 30, riskLevel: 'LOW', assessedAt: new Date('2024-01-15') },
        { ...mockRiskAssessment, id: 'a2', totalScore: 50, riskLevel: 'MEDIUM', assessedAt: new Date('2024-01-10') },
        { ...mockRiskAssessment, id: 'a3', totalScore: 60, riskLevel: 'HIGH', assessedAt: new Date('2024-01-05') },
      ];
      prismaService.riskAssessment.findMany.mockResolvedValue(assessments as any);

      const result = await service.compareRiskScores('contract-1');

      expect(result.trend).toBe('IMPROVING');
    });

    it('should return DECLINING trend when current score is higher', async () => {
      const assessments = [
        { ...mockRiskAssessment, totalScore: 70, riskLevel: 'HIGH', assessedAt: new Date('2024-01-15') },
        { ...mockRiskAssessment, id: 'a2', totalScore: 40, riskLevel: 'MEDIUM', assessedAt: new Date('2024-01-10') },
      ];
      prismaService.riskAssessment.findMany.mockResolvedValue(assessments as any);

      const result = await service.compareRiskScores('contract-1');

      expect(result.trend).toBe('DECLINING');
    });

    it('should return null current and empty previous when no assessments exist', async () => {
      prismaService.riskAssessment.findMany.mockResolvedValue([]);

      const result = await service.compareRiskScores('contract-1');

      expect(result.current).toBeNull();
      expect(result.previous).toHaveLength(0);
      expect(result.trend).toBe('STABLE');
    });
  });
});
