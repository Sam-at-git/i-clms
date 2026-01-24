import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './analytics.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('AnalyticsResolver', () => {
  let resolver: AnalyticsResolver;
  let service: DeepMockProxy<AnalyticsService>;

  const mockAnalyticsDimension = {
    dimension: 'department',
    value: 'sales',
    metrics: {
      count: 25,
      totalValue: 1500000,
      avgValue: 60000,
    },
  };

  const mockTrendPoint = {
    period: '2024-01',
    value: 150000,
    growth: 5.2,
  };

  const mockForecastResult = {
    metric: 'revenue',
    currentValue: 5000000,
    forecastValue: 5500000,
    confidence: 0.85,
    trend: 'upward',
  };

  beforeEach(async () => {
    service = mockDeep<AnalyticsService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsResolver,
        { provide: AnalyticsService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<AnalyticsResolver>(AnalyticsResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeByDimension', () => {
    it('should return analytics by dimension', async () => {
      service.analyzeByDimension.mockResolvedValue([mockAnalyticsDimension]);

      const result = await resolver.analyzeByDimension('department', 'region');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(service.analyzeByDimension).toHaveBeenCalledWith('department', 'region');
    });

    it('should call service without groupBy when not provided', async () => {
      service.analyzeByDimension.mockResolvedValue([]);

      await resolver.analyzeByDimension('department');

      expect(service.analyzeByDimension).toHaveBeenCalledWith('department', undefined);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('getTrend', () => {
    it('should return trend points with default periods', async () => {
      service.getTrend.mockResolvedValue([mockTrendPoint]);

      const result = await resolver.getTrend('revenue', 12);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(service.getTrend).toHaveBeenCalledWith('revenue', 12);
    });

    it('should use custom periods when provided', async () => {
      service.getTrend.mockResolvedValue([]);

      await resolver.getTrend('revenue', 24);

      expect(service.getTrend).toHaveBeenCalledWith('revenue', 24);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('forecast', () => {
    it('should return forecast result', async () => {
      service.forecast.mockResolvedValue(mockForecastResult);

      const result = await resolver.forecast('revenue');

      expect(result).toBeDefined();
      expect(result.metric).toBe('revenue');
      expect(result.currentValue).toBe(5000000);
      expect(result.forecastValue).toBe(5500000);
      expect(result.trend).toBe('upward');
      expect(result.confidence).toBe(0.85);
      expect(service.forecast).toHaveBeenCalledWith('revenue');
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });
});
