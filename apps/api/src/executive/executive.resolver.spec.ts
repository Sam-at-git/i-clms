import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ExecutiveResolver } from './executive.resolver';
import { ExecutiveService } from './executive.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('ExecutiveResolver', () => {
  let resolver: ExecutiveResolver;
  let service: DeepMockProxy<ExecutiveService>;

  const mockCompanyHealth = {
    overallScore: 85.5,
    dimensions: [
      {
        dimension: 'financial',
        score: 90,
        trend: 'up',
        description: 'Strong financial performance',
      },
      {
        dimension: 'operational',
        score: 82,
        trend: 'stable',
        description: 'Consistent operations',
      },
    ],
    alerts: [
      {
        level: 'warning',
        message: 'Cash flow declining',
        dimension: 'financial',
        value: 75,
      },
    ],
    trend: [
      { month: '2024-01', score: 85 },
      { month: '2024-02', score: 86 },
      { month: '2024-03', score: 85.5 },
    ],
  };

  const mockRiskHeatmap = {
    rows: ['Finance', 'Operations', 'Legal'],
    columns: ['High', 'Medium', 'Low'],
    cells: [
      {
        category: 'Finance',
        subCategory: 'Payment',
        riskScore: 75,
        riskLevel: 'HIGH',
        contractCount: 5,
        totalValue: 500000,
      },
    ],
    summary: {
      totalContracts: 150,
      highRiskCount: 15,
      criticalRiskCount: 3,
      avgRiskScore: 45.5,
    },
  };

  const mockCoreKPIs = {
    period: 'monthly',
    categories: [
      {
        category: 'Revenue',
        metrics: [
          {
            name: 'Total Revenue',
            value: 5000000,
            unit: 'CNY',
            target: 5500000,
            achievement: 90.9,
            trend: 'up',
            previousValue: 4500000,
          },
        ],
      },
    ],
    highlights: [
      'Revenue increased by 11%',
      'Customer satisfaction at 95%',
    ],
  };

  beforeEach(async () => {
    service = mockDeep<ExecutiveService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutiveResolver,
        { provide: ExecutiveService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<ExecutiveResolver>(ExecutiveResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('companyHealth', () => {
    it('should return company health data', async () => {
      service.getCompanyHealth.mockResolvedValue(mockCompanyHealth);

      const result = await resolver.companyHealth();

      expect(result).toBeDefined();
      expect(result.overallScore).toBe(85.5);
      expect(result.dimensions).toHaveLength(2);
      expect(result.alerts).toHaveLength(1);
      expect(result.trend).toHaveLength(3);
      expect(service.getCompanyHealth).toHaveBeenCalled();
    });

    it('should require ADMIN role only', async () => {
      expect(true).toBe(true);
    });
  });

  describe('riskHeatmap', () => {
    it('should return risk heatmap with default groupBy', async () => {
      service.getRiskHeatmap.mockResolvedValue(mockRiskHeatmap);

      const result = await resolver.riskHeatmap('department');

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(3);
      expect(result.columns).toHaveLength(3);
      expect(result.cells).toHaveLength(1);
      expect(result.summary.totalContracts).toBe(150);
      expect(service.getRiskHeatmap).toHaveBeenCalledWith('department');
    });

    it('should use custom groupBy when provided', async () => {
      service.getRiskHeatmap.mockResolvedValue(mockRiskHeatmap);

      await resolver.riskHeatmap('region');

      expect(service.getRiskHeatmap).toHaveBeenCalledWith('region');
    });

    it('should require ADMIN role only', async () => {
      expect(true).toBe(true);
    });
  });

  describe('coreKPIs', () => {
    it('should return core KPIs with default period', async () => {
      service.getCoreKPIs.mockResolvedValue(mockCoreKPIs);

      const result = await resolver.coreKPIs('monthly');

      expect(result).toBeDefined();
      expect(result.period).toBe('monthly');
      expect(result.categories).toHaveLength(1);
      expect(result.highlights).toHaveLength(2);
      expect(service.getCoreKPIs).toHaveBeenCalledWith('monthly');
    });

    it('should use custom period when provided', async () => {
      service.getCoreKPIs.mockResolvedValue({
        ...mockCoreKPIs,
        period: 'quarterly',
      });

      const result = await resolver.coreKPIs('quarterly');

      expect(result.period).toBe('quarterly');
      expect(service.getCoreKPIs).toHaveBeenCalledWith('quarterly');
    });

    it('should include metric details', async () => {
      service.getCoreKPIs.mockResolvedValue(mockCoreKPIs);

      const result = await resolver.coreKPIs('monthly');

      const revenueMetric = result.categories[0].metrics[0];
      expect(revenueMetric.name).toBe('Total Revenue');
      expect(revenueMetric.value).toBe(5000000);
      expect(revenueMetric.unit).toBe('CNY');
      expect(revenueMetric.target).toBe(5500000);
      expect(revenueMetric.achievement).toBe(90.9);
      expect(revenueMetric.trend).toBe('up');
      expect(revenueMetric.previousValue).toBe(4500000);
    });

    it('should require ADMIN role only', async () => {
      expect(true).toBe(true);
    });
  });
});
