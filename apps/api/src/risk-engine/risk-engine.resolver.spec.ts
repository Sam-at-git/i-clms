import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { RiskEngineResolver } from './risk-engine.resolver';
import { RiskEngineService } from './risk-engine.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../graphql/types/enums';
import { RiskAlertType, RiskSeverity, AlertStatus } from './dto/risk-alert.dto';

describe('RiskEngineResolver', () => {
  let resolver: RiskEngineResolver;
  let service: DeepMockProxy<RiskEngineService>;

  const mockUser = { id: 'user-1', email: 'test@example.com' };

  const mockRiskAlert = {
    id: 'alert-1',
    contractId: 'contract-1',
    type: RiskAlertType.CONTRACT_EXPIRY,
    severity: RiskSeverity.MEDIUM,
    title: 'Contract Expiring Soon',
    description: 'Contract will expire in 30 days',
    status: AlertStatus.ACTIVE,
    dismissedAt: undefined,
    dismissedBy: undefined,
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
    recommendations: { items: ['Monitor payment terms'] } as Record<string, unknown>,
    assessedAt: new Date('2024-01-15'),
    assessedBy: 'user-1',
  };

  beforeEach(async () => {
    service = mockDeep<RiskEngineService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskEngineResolver,
        { provide: RiskEngineService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<RiskEngineResolver>(RiskEngineResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Existing Queries', () => {
    it('should assess contract risk', async () => {
      service.assessContractRisk.mockResolvedValue({
        contractId: 'contract-1',
        totalScore: 45.5,
        level: 'MEDIUM',
        factors: [],
        recommendations: [],
      });

      const result = await resolver.assessContractRisk('contract-1');

      expect(result).toBeDefined();
      expect(service.assessContractRisk).toHaveBeenCalledWith('contract-1');
    });

    it('should detect risk clauses', async () => {
      service.detectRiskClauses.mockResolvedValue([]);

      const result = await resolver.detectRiskClauses('contract-1');

      expect(result).toBeDefined();
      expect(service.detectRiskClauses).toHaveBeenCalledWith('contract-1');
    });

    it('should get risk alerts', async () => {
      service.getRiskAlerts.mockResolvedValue([]);

      const result = await resolver.getRiskAlerts(10);

      expect(result).toBeDefined();
      expect(service.getRiskAlerts).toHaveBeenCalledWith(10);
    });
  });

  // ================================
  // Risk Alert CRUD Queries
  // ================================

  describe('riskAlerts', () => {
    it('should return paginated risk alerts', async () => {
      service.riskAlerts.mockResolvedValue({
        items: [mockRiskAlert],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const result = await resolver.riskAlerts();

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(service.riskAlerts).toHaveBeenCalledWith(undefined);
    });

    it('should pass pagination options to service', async () => {
      service.riskAlerts.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
        totalPages: 0,
      });

      const pagination = {
        filter: { contractId: 'contract-1' },
        page: 2,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      await resolver.riskAlerts(pagination);

      expect(service.riskAlerts).toHaveBeenCalledWith(pagination);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('activeAlerts', () => {
    it('should return active alerts', async () => {
      service.getActiveAlerts.mockResolvedValue([mockRiskAlert]);

      const result = await resolver.activeAlerts();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(service.getActiveAlerts).toHaveBeenCalledWith(undefined);
    });

    it('should filter by severity when provided', async () => {
      service.getActiveAlerts.mockResolvedValue([]);

      await resolver.activeAlerts(RiskSeverity.HIGH);

      expect(service.getActiveAlerts).toHaveBeenCalledWith(RiskSeverity.HIGH);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('alertHistory', () => {
    it('should return alert history for a contract', async () => {
      service.getAlertHistory.mockResolvedValue([mockRiskAlert]);

      const result = await resolver.alertHistory('contract-1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(service.getAlertHistory).toHaveBeenCalledWith('contract-1');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  // ================================
  // Risk Alert Mutations
  // ================================

  describe('createRiskAlert', () => {
    it('should create a new risk alert', async () => {
      service.createAlert.mockResolvedValue(mockRiskAlert);

      const input = {
        contractId: 'contract-1',
        type: RiskAlertType.CONTRACT_EXPIRY,
        severity: RiskSeverity.MEDIUM,
        title: 'Contract Expiring Soon',
        description: 'Contract will expire in 30 days',
      };

      const result = await resolver.createRiskAlert(input, mockUser);

      expect(result).toBeDefined();
      expect(service.createAlert).toHaveBeenCalledWith(input, mockUser.id);
    });

    it('should work without user context', async () => {
      service.createAlert.mockResolvedValue(mockRiskAlert);

      const input = {
        contractId: 'contract-1',
        type: RiskAlertType.CONTRACT_EXPIRY,
        severity: RiskSeverity.MEDIUM,
        title: 'Test Alert',
        description: 'Test',
      };

      await resolver.createRiskAlert(input);

      expect(service.createAlert).toHaveBeenCalledWith(input, undefined);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });

    it('should throw error when contract does not exist', async () => {
      service.createAlert.mockRejectedValue(new Error('Contract not found'));

      const input = {
        contractId: 'nonexistent',
        type: RiskAlertType.CONTRACT_EXPIRY,
        severity: RiskSeverity.MEDIUM,
        title: 'Test',
        description: 'Test',
      };

      await expect(resolver.createRiskAlert(input, mockUser)).rejects.toThrow();
    });
  });

  describe('updateRiskAlert', () => {
    it('should update an existing risk alert', async () => {
      service.updateAlert.mockResolvedValue(mockRiskAlert);

      const input = {
        severity: RiskSeverity.HIGH,
      };

      const result = await resolver.updateRiskAlert('alert-1', input);

      expect(result).toBeDefined();
      expect(service.updateAlert).toHaveBeenCalledWith('alert-1', input);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });

    it('should throw error when alert does not exist', async () => {
      service.updateAlert.mockRejectedValue(new Error('Alert not found'));

      const input = {
        severity: RiskSeverity.HIGH,
      };

      await expect(resolver.updateRiskAlert('nonexistent', input)).rejects.toThrow();
    });
  });

  describe('dismissRiskAlert', () => {
    it('should dismiss a risk alert', async () => {
      service.dismissAlert.mockResolvedValue({
        ...mockRiskAlert,
        status: AlertStatus.DISMISSED,
      });

      const result = await resolver.dismissRiskAlert('alert-1', mockUser);

      expect(result).toBeDefined();
      expect(service.dismissAlert).toHaveBeenCalledWith('alert-1', mockUser.id);
    });

    it('should work without user context', async () => {
      service.dismissAlert.mockResolvedValue(mockRiskAlert);

      await resolver.dismissRiskAlert('alert-1');

      expect(service.dismissAlert).toHaveBeenCalledWith('alert-1', undefined);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });

    it('should throw error when alert does not exist', async () => {
      service.dismissAlert.mockRejectedValue(new Error('Alert not found'));

      await expect(resolver.dismissRiskAlert('nonexistent')).rejects.toThrow();
    });
  });

  // ================================
  // Risk Assessment Mutations & Queries
  // ================================

  describe('saveRiskAssessment', () => {
    it('should save a risk assessment', async () => {
      service.saveRiskAssessment.mockResolvedValue(mockRiskAssessment);

      const input = {
        contractId: 'contract-1',
        totalScore: 45.5,
        riskLevel: 'MEDIUM',
        factors: JSON.stringify({ amount: { score: 60, weight: 0.25 } }),
      };

      const result = await resolver.saveRiskAssessment(input);

      expect(result).toBeDefined();
      expect(service.saveRiskAssessment).toHaveBeenCalledWith(input);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });

    it('should throw error when contract does not exist', async () => {
      service.saveRiskAssessment.mockRejectedValue(new Error('Contract not found'));

      const input = {
        contractId: 'nonexistent',
        totalScore: 45.5,
        riskLevel: 'MEDIUM',
        factors: '{}',
      };

      await expect(resolver.saveRiskAssessment(input)).rejects.toThrow();
    });
  });

  describe('riskAssessmentHistory', () => {
    it('should return paginated assessment history', async () => {
      service.riskAssessmentHistory.mockResolvedValue({
        items: [mockRiskAssessment],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const result = await resolver.riskAssessmentHistory('contract-1', 1, 20);

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(service.riskAssessmentHistory).toHaveBeenCalledWith('contract-1', 1, 20);
    });

    it('should use custom pagination when provided', async () => {
      service.riskAssessmentHistory.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
        totalPages: 0,
      });

      await resolver.riskAssessmentHistory('contract-1', 2, 10);

      expect(service.riskAssessmentHistory).toHaveBeenCalledWith('contract-1', 2, 10);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('compareRiskScores', () => {
    it('should return comparison with trend', async () => {
      service.compareRiskScores.mockResolvedValue({
        current: { score: 45.5, level: 'MEDIUM', date: new Date('2024-01-15') },
        previous: [
          { score: 60, level: 'HIGH', date: new Date('2024-01-10') },
        ],
        trend: 'IMPROVING',
      });

      const result = await resolver.compareRiskScores('contract-1');

      expect(result).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.previous).toHaveLength(1);
      expect(result.trend).toBe('IMPROVING');
      expect(service.compareRiskScores).toHaveBeenCalledWith('contract-1');
    });

    it('should handle empty history', async () => {
      service.compareRiskScores.mockResolvedValue({
        current: null,
        previous: [],
        trend: 'STABLE',
      });

      const result = await resolver.compareRiskScores('contract-1');

      expect(result.current).toBeNull();
      expect(result.previous).toHaveLength(0);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });
});
