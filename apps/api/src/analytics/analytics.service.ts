import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnalyticsDimension,
  AnalyticsMetrics,
  TrendPoint,
  ForecastResult,
} from './dto/analytics.dto';

type DecimalValue = { toString(): string } | null | undefined;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async analyzeByDimension(
    dimension: string,
    _groupBy?: string
  ): Promise<AnalyticsDimension[]> {
    const contracts = await this.prisma.contract.findMany({
      include: { customer: true },
    });

    const groups = new Map<string, { count: number; total: number }>();

    for (const contract of contracts) {
      let key: string;

      switch (dimension) {
        case 'type':
          key = contract.type;
          break;
        case 'industry':
          key = contract.industry || '未分类';
          break;
        case 'status':
          key = contract.status;
          break;
        case 'customer':
          key = contract.customer.name;
          break;
        case 'year':
          key = contract.effectiveAt
            ? contract.effectiveAt.getFullYear().toString()
            : contract.createdAt.getFullYear().toString();
          break;
        case 'month':
          key = contract.effectiveAt
            ? `${contract.effectiveAt.getFullYear()}-${String(contract.effectiveAt.getMonth() + 1).padStart(2, '0')}`
            : `${contract.createdAt.getFullYear()}-${String(contract.createdAt.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = 'other';
      }

      const current = groups.get(key) || { count: 0, total: 0 };
      current.count += 1;
      current.total += this.decimalToNumber(contract.amountWithTax);
      groups.set(key, current);
    }

    const results: AnalyticsDimension[] = [];

    for (const [value, data] of groups.entries()) {
      const metrics: AnalyticsMetrics = {
        count: data.count,
        totalValue: data.total,
        avgValue: data.count > 0 ? data.total / data.count : 0,
      };

      results.push({
        dimension,
        value,
        metrics,
      });
    }

    // Sort by total value descending
    return results.sort((a, b) => b.metrics.totalValue - a.metrics.totalValue);
  }

  async getTrend(metric: string, periods = 12): Promise<TrendPoint[]> {
    const contracts = await this.prisma.contract.findMany({
      orderBy: { effectiveAt: 'asc' },
    });

    // Group contracts by month
    const monthlyData = new Map<string, number>();

    for (const contract of contracts) {
      const dateRef = contract.effectiveAt || contract.createdAt;
      const monthKey = `${dateRef.getFullYear()}-${String(dateRef.getMonth() + 1).padStart(2, '0')}`;

      let value: number;
      switch (metric) {
        case 'revenue':
          value = this.decimalToNumber(contract.amountWithTax);
          break;
        case 'count':
          value = 1;
          break;
        case 'avgValue':
          value = this.decimalToNumber(contract.amountWithTax);
          break;
        default:
          value = this.decimalToNumber(contract.amountWithTax);
      }

      const current = monthlyData.get(monthKey) || 0;
      monthlyData.set(monthKey, current + value);
    }

    // Convert to sorted array and calculate growth
    const sortedMonths = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-periods);

    const trendPoints: TrendPoint[] = [];
    let previousValue: number | null = null;

    for (const [period, value] of sortedMonths) {
      let growth: number | null = null;

      if (previousValue !== null && previousValue > 0) {
        growth = ((value - previousValue) / previousValue) * 100;
      }

      trendPoints.push({
        period,
        value,
        growth,
      });

      previousValue = value;
    }

    return trendPoints;
  }

  async forecast(metric: string): Promise<ForecastResult> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        effectiveAt: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last year
        },
      },
    });

    let currentValue: number;
    let forecastValue: number;
    let trend: string;

    switch (metric) {
      case 'revenue': {
        const totalRevenue = contracts.reduce(
          (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
          0
        );
        currentValue = totalRevenue;
        // Simple growth projection (5-15% growth)
        const growthRate = 1.05 + Math.random() * 0.1;
        forecastValue = totalRevenue * growthRate;
        trend = growthRate > 1.1 ? 'UP' : growthRate > 1.0 ? 'STABLE' : 'DOWN';
        break;
      }
      case 'contracts': {
        currentValue = contracts.length;
        const growthRate = 1.0 + Math.random() * 0.15;
        forecastValue = Math.round(contracts.length * growthRate);
        trend = growthRate > 1.1 ? 'UP' : growthRate > 1.0 ? 'STABLE' : 'DOWN';
        break;
      }
      case 'avgDealSize': {
        const total = contracts.reduce(
          (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
          0
        );
        currentValue = contracts.length > 0 ? total / contracts.length : 0;
        const growthRate = 0.95 + Math.random() * 0.15;
        forecastValue = currentValue * growthRate;
        trend = growthRate > 1.05 ? 'UP' : growthRate > 0.98 ? 'STABLE' : 'DOWN';
        break;
      }
      default: {
        currentValue = contracts.length;
        forecastValue = contracts.length * 1.1;
        trend = 'STABLE';
      }
    }

    // Confidence based on data volume
    const confidence = Math.min(0.5 + contracts.length * 0.02, 0.95);

    return {
      metric,
      currentValue,
      forecastValue,
      confidence,
      trend,
    };
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
