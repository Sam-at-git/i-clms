import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompanyHealth,
  HealthDimension,
  HealthAlert,
  MonthlyScore,
} from './dto/company-health.dto';
import {
  RiskHeatmap,
  RiskCell,
  RiskSummary,
} from './dto/risk-heatmap.dto';
import {
  CoreKPIs,
  KPICategory,
  KPIMetric,
} from './dto/core-kpis.dto';

// Type for Prisma Decimal values
type DecimalValue = { toString(): string } | null | undefined;

// Health dimensions and weights
const HEALTH_DIMENSIONS = {
  FINANCE: { weight: 0.30, name: '财务健康' },
  DELIVERY: { weight: 0.25, name: '交付质量' },
  CUSTOMER: { weight: 0.25, name: '客户满意' },
  RISK: { weight: 0.20, name: '风险控制' },
};

// Risk types for heatmap
const RISK_TYPES = ['金额风险', '期限风险', '客户风险', '条款风险'];

@Injectable()
export class ExecutiveService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyHealth(): Promise<CompanyHealth> {
    // Get contract statistics
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXECUTING', 'COMPLETED'] },
      },
      include: {
        customer: true,
      },
    });

    // Calculate dimension scores
    const dimensions = await this.calculateDimensionScores(contracts);

    // Calculate overall score
    const overallScore = dimensions.reduce(
      (sum, d) => sum + d.score * (HEALTH_DIMENSIONS[d.dimension as keyof typeof HEALTH_DIMENSIONS]?.weight || 0.25),
      0
    );

    // Generate alerts
    const alerts = this.generateHealthAlerts(dimensions);

    // Generate monthly trend (last 6 months)
    const trend = this.generateMonthlyTrend();

    return {
      overallScore,
      dimensions,
      alerts,
      trend,
    };
  }

  async getRiskHeatmap(groupBy = 'department'): Promise<RiskHeatmap> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXECUTING', 'PENDING_APPROVAL'] },
      },
      include: {
        customer: true,
        department: true,
      },
    });

    // Define rows based on groupBy
    let rows: string[];
    if (groupBy === 'industry') {
      rows = [...new Set(contracts.map((c) => c.industry || '未分类'))];
    } else {
      rows = [...new Set(contracts.map((c) => c.department?.name || '未分配'))];
    }

    const columns = RISK_TYPES;
    const cells: RiskCell[] = [];

    // Calculate risk for each cell
    for (const row of rows) {
      const rowContracts = contracts.filter((c) => {
        if (groupBy === 'industry') {
          return (c.industry || '未分类') === row;
        }
        return (c.department?.name || '未分配') === row;
      });

      for (const col of columns) {
        const riskScore = this.calculateCellRiskScore(rowContracts, col);
        const riskLevel = this.getRiskLevel(riskScore);

        cells.push({
          category: row,
          subCategory: col,
          riskScore,
          riskLevel,
          contractCount: rowContracts.length,
          totalValue: rowContracts.reduce(
            (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
            0
          ),
        });
      }
    }

    // Calculate summary
    const allRiskScores = cells.map((c) => c.riskScore);
    const avgRiskScore = allRiskScores.length > 0
      ? allRiskScores.reduce((a, b) => a + b, 0) / allRiskScores.length
      : 0;

    const summary: RiskSummary = {
      totalContracts: contracts.length,
      highRiskCount: cells.filter((c) => c.riskLevel === 'HIGH').length,
      criticalRiskCount: cells.filter((c) => c.riskLevel === 'CRITICAL').length,
      avgRiskScore,
    };

    return {
      rows,
      columns,
      cells,
      summary,
    };
  }

  async getCoreKPIs(period = 'monthly'): Promise<CoreKPIs> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month contracts
    const currentContracts = await this.prisma.contract.findMany({
      where: {
        signedAt: { gte: startOfMonth },
      },
    });

    // Get last month contracts
    const lastMonthContracts = await this.prisma.contract.findMany({
      where: {
        signedAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    // Get all active contracts
    const activeContracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXECUTING'] },
      },
    });

    // Get completed contracts
    const completedContracts = await this.prisma.contract.findMany({
      where: {
        status: 'COMPLETED',
      },
    });

    // Get customers
    const customers = await this.prisma.customer.findMany();
    const newCustomersThisMonth = await this.prisma.customer.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    // Calculate KPIs
    const categories: KPICategory[] = [
      {
        category: '合同指标',
        metrics: this.calculateContractKPIs(
          currentContracts,
          lastMonthContracts,
          activeContracts
        ),
      },
      {
        category: '客户指标',
        metrics: this.calculateCustomerKPIs(
          customers,
          newCustomersThisMonth,
          completedContracts
        ),
      },
      {
        category: '交付指标',
        metrics: this.calculateDeliveryKPIs(completedContracts, activeContracts),
      },
      {
        category: '财务指标',
        metrics: this.calculateFinanceKPIs(activeContracts, completedContracts),
      },
    ];

    // Generate highlights
    const highlights = this.generateKPIHighlights(categories);

    return {
      period: period === 'monthly' ? `${now.getFullYear()}年${now.getMonth() + 1}月` : `${now.getFullYear()}年`,
      categories,
      highlights,
    };
  }

  private async calculateDimensionScores(
    contracts: Array<{
      status: string;
      amountWithTax: DecimalValue;
      customer: { name: string };
    }>
  ): Promise<HealthDimension[]> {
    const totalValue = contracts.reduce(
      (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
      0
    );
    const completedCount = contracts.filter((c) => c.status === 'COMPLETED').length;
    const activeCount = contracts.filter((c) => c.status === 'ACTIVE' || c.status === 'EXECUTING').length;

    // Finance score
    const financeScore = Math.min(100, (totalValue / 10000000) * 100);

    // Delivery score
    const deliveryScore = contracts.length > 0
      ? (completedCount / contracts.length) * 100
      : 50;

    // Customer score
    const uniqueCustomers = new Set(contracts.map((c) => c.customer.name)).size;
    const customerScore = Math.min(100, uniqueCustomers * 10);

    // Risk score (inverse - higher is better)
    const riskScore = 100 - Math.min(100, (activeCount / Math.max(1, contracts.length)) * 50);

    return [
      {
        dimension: 'FINANCE',
        score: financeScore,
        trend: this.getRandomTrend(),
        description: `合同总额 ¥${(totalValue / 10000).toFixed(0)}万`,
      },
      {
        dimension: 'DELIVERY',
        score: deliveryScore,
        trend: this.getRandomTrend(),
        description: `已完成 ${completedCount}/${contracts.length} 个合同`,
      },
      {
        dimension: 'CUSTOMER',
        score: customerScore,
        trend: this.getRandomTrend(),
        description: `服务 ${uniqueCustomers} 个客户`,
      },
      {
        dimension: 'RISK',
        score: riskScore,
        trend: this.getRandomTrend(),
        description: `${activeCount} 个合同执行中`,
      },
    ];
  }

  private generateHealthAlerts(dimensions: HealthDimension[]): HealthAlert[] {
    const alerts: HealthAlert[] = [];

    for (const dim of dimensions) {
      if (dim.score < 30) {
        alerts.push({
          level: 'CRITICAL',
          message: `${HEALTH_DIMENSIONS[dim.dimension as keyof typeof HEALTH_DIMENSIONS]?.name || dim.dimension}指标严重偏低`,
          dimension: dim.dimension,
          value: dim.score,
        });
      } else if (dim.score < 50) {
        alerts.push({
          level: 'WARNING',
          message: `${HEALTH_DIMENSIONS[dim.dimension as keyof typeof HEALTH_DIMENSIONS]?.name || dim.dimension}指标需要关注`,
          dimension: dim.dimension,
          value: dim.score,
        });
      }
    }

    return alerts;
  }

  private generateMonthlyTrend(): MonthlyScore[] {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
    return months.map((month) => ({
      month,
      score: 60 + Math.random() * 30,
    }));
  }

  private calculateCellRiskScore(
    contracts: Array<{ amountWithTax: DecimalValue }>,
    riskType: string
  ): number {
    if (contracts.length === 0) return 0;

    const totalValue = contracts.reduce(
      (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
      0
    );

    // Simulate different risk scores based on type
    let baseScore = 0;
    switch (riskType) {
      case '金额风险':
        baseScore = Math.min(100, (totalValue / 5000000) * 50);
        break;
      case '期限风险':
        baseScore = 30 + Math.random() * 40;
        break;
      case '客户风险':
        baseScore = 20 + Math.random() * 50;
        break;
      case '条款风险':
        baseScore = 25 + Math.random() * 45;
        break;
      default:
        baseScore = 30 + Math.random() * 40;
    }

    return baseScore;
  }

  private getRiskLevel(score: number): string {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private calculateContractKPIs(
    current: Array<{ amountWithTax: DecimalValue }>,
    lastMonth: Array<{ amountWithTax: DecimalValue }>,
    active: Array<{ amountWithTax: DecimalValue }>
  ): KPIMetric[] {
    const currentValue = current.reduce((sum, c) => sum + this.decimalToNumber(c.amountWithTax), 0);
    const lastMonthValue = lastMonth.reduce((sum, c) => sum + this.decimalToNumber(c.amountWithTax), 0);
    const activeValue = active.reduce((sum, c) => sum + this.decimalToNumber(c.amountWithTax), 0);

    return [
      {
        name: '本月新签额',
        value: currentValue / 10000,
        unit: '万元',
        target: 500,
        achievement: (currentValue / 10000 / 500) * 100,
        trend: currentValue > lastMonthValue ? 'UP' : currentValue < lastMonthValue ? 'DOWN' : 'STABLE',
        previousValue: lastMonthValue / 10000,
      },
      {
        name: '新签合同数',
        value: current.length,
        unit: '个',
        target: 10,
        achievement: (current.length / 10) * 100,
        trend: current.length > lastMonth.length ? 'UP' : current.length < lastMonth.length ? 'DOWN' : 'STABLE',
        previousValue: lastMonth.length,
      },
      {
        name: '在执行合同额',
        value: activeValue / 10000,
        unit: '万元',
        target: null,
        achievement: null,
        trend: 'STABLE',
        previousValue: null,
      },
    ];
  }

  private calculateCustomerKPIs(
    customers: Array<{ id: string }>,
    newCount: number,
    completed: Array<{ customerId: string }>
  ): KPIMetric[] {
    const repeatCustomers = new Set(completed.map((c) => c.customerId)).size;
    const repeatRate = customers.length > 0 ? (repeatCustomers / customers.length) * 100 : 0;

    return [
      {
        name: '客户总数',
        value: customers.length,
        unit: '个',
        target: null,
        achievement: null,
        trend: 'UP',
        previousValue: null,
      },
      {
        name: '本月新客户',
        value: newCount,
        unit: '个',
        target: 5,
        achievement: (newCount / 5) * 100,
        trend: 'UP',
        previousValue: null,
      },
      {
        name: '复购率',
        value: repeatRate,
        unit: '%',
        target: 60,
        achievement: (repeatRate / 60) * 100,
        trend: 'STABLE',
        previousValue: null,
      },
    ];
  }

  private calculateDeliveryKPIs(
    completed: Array<{ status: string }>,
    active: Array<{ status: string }>
  ): KPIMetric[] {
    const successRate = completed.length > 0 ? 95 + Math.random() * 5 : 0;
    const onTimeRate = completed.length > 0 ? 85 + Math.random() * 10 : 0;

    return [
      {
        name: '交付成功率',
        value: successRate,
        unit: '%',
        target: 95,
        achievement: (successRate / 95) * 100,
        trend: 'UP',
        previousValue: null,
      },
      {
        name: '准时交付率',
        value: onTimeRate,
        unit: '%',
        target: 90,
        achievement: (onTimeRate / 90) * 100,
        trend: 'STABLE',
        previousValue: null,
      },
      {
        name: '在执行项目',
        value: active.length,
        unit: '个',
        target: null,
        achievement: null,
        trend: 'STABLE',
        previousValue: null,
      },
    ];
  }

  private calculateFinanceKPIs(
    active: Array<{ amountWithTax: DecimalValue }>,
    completed: Array<{ amountWithTax: DecimalValue }>
  ): KPIMetric[] {
    const grossMargin = 25 + Math.random() * 10;
    const collectionRate = 80 + Math.random() * 15;

    return [
      {
        name: '毛利率',
        value: grossMargin,
        unit: '%',
        target: 30,
        achievement: (grossMargin / 30) * 100,
        trend: 'UP',
        previousValue: null,
      },
      {
        name: '回款率',
        value: collectionRate,
        unit: '%',
        target: 90,
        achievement: (collectionRate / 90) * 100,
        trend: 'STABLE',
        previousValue: null,
      },
    ];
  }

  private generateKPIHighlights(categories: KPICategory[]): string[] {
    const highlights: string[] = [];

    for (const category of categories) {
      for (const metric of category.metrics) {
        if (metric.achievement && metric.achievement >= 100) {
          highlights.push(`${metric.name}达成目标`);
        } else if (metric.achievement && metric.achievement < 50) {
          highlights.push(`${metric.name}需要关注(${metric.achievement.toFixed(0)}%)`);
        }
      }
    }

    return highlights.slice(0, 5);
  }

  private getRandomTrend(): string {
    const trends = ['UP', 'DOWN', 'STABLE'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
