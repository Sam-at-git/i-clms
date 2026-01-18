import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RevenueStats,
  MonthlyRevenue,
  TypeRevenue,
  CustomerRevenue,
  RevenueFilterInput,
} from './dto/revenue-stats.dto';
import { CashFlowForecast } from './dto/cash-flow.dto';
import { OverdueAlert, OverdueLevel } from './dto/overdue-alert.dto';
import { ContractType } from '../graphql/types/enums';

// Type for Prisma Decimal values
type DecimalValue = { toString(): string } | null | undefined;

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueStats(filter?: RevenueFilterInput): Promise<RevenueStats> {
    const where = this.buildDateFilter(filter);

    // Get all contracts matching the filter
    const contracts = await this.prisma.contract.findMany({
      where: {
        ...where,
        status: { in: ['ACTIVE', 'EXECUTING', 'COMPLETED'] },
      },
      include: {
        customer: true,
      },
    });

    // Calculate total revenue
    const totalRevenue = contracts.reduce(
      (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
      0
    );

    // Calculate by month
    const byMonth = this.calculateMonthlyRevenue(contracts);

    // Calculate by contract type
    const byContractType = this.calculateTypeRevenue(contracts, totalRevenue);

    // Calculate by customer
    const byCustomer = this.calculateCustomerRevenue(contracts);

    return {
      totalRevenue,
      byMonth,
      byContractType,
      byCustomer,
    };
  }

  async getCashFlowForecast(months = 6): Promise<CashFlowForecast[]> {
    const forecasts: CashFlowForecast[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = `${targetDate.getFullYear()}-${String(
        targetDate.getMonth() + 1
      ).padStart(2, '0')}`;

      const startOfMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        1
      );
      const endOfMonth = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0
      );

      // Get contracts with milestones due in this month
      const milestonesInMonth = await this.prisma.projectMilestone.findMany({
        where: {
          plannedDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        include: {
          detail: {
            include: {
              contract: true,
            },
          },
        },
      });

      // Calculate expected income from milestones
      let expectedIncome = 0;
      let receivedAmount = 0;

      for (const milestone of milestonesInMonth) {
        const amount = this.decimalToNumber(milestone.amount);
        expectedIncome += amount;
        if (milestone.status === 'ACCEPTED') {
          receivedAmount += amount;
        }
      }

      // Also include contracts with payment terms in this month
      const contractsInMonth = await this.prisma.contract.findMany({
        where: {
          effectiveAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          status: { in: ['ACTIVE', 'EXECUTING'] },
        },
      });

      for (const contract of contractsInMonth) {
        // Assuming first payment on effective date
        const amount = this.decimalToNumber(contract.amountWithTax) * 0.3; // 30% initial payment
        expectedIncome += amount;
        if (contract.status === 'EXECUTING') {
          receivedAmount += amount;
        }
      }

      forecasts.push({
        month: monthStr,
        expectedIncome,
        receivedAmount,
        pendingAmount: expectedIncome - receivedAmount,
      });
    }

    return forecasts;
  }

  async getOverdueAlerts(): Promise<OverdueAlert[]> {
    const now = new Date();
    const alerts: OverdueAlert[] = [];

    // Get overdue milestones
    const overdueMilestones = await this.prisma.projectMilestone.findMany({
      where: {
        plannedDate: { lt: now },
        status: { in: ['PENDING', 'IN_PROGRESS', 'DELIVERED'] },
      },
      include: {
        detail: {
          include: {
            contract: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
    });

    for (const milestone of overdueMilestones) {
      const contract = milestone.detail.contract;
      const plannedDate = milestone.plannedDate;

      if (!plannedDate) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        contractId: contract.id,
        contractNo: contract.contractNo,
        customerName: contract.customer.name,
        expectedDate: plannedDate,
        daysOverdue,
        amount: this.decimalToNumber(milestone.amount),
        level: this.calculateOverdueLevel(daysOverdue),
      });
    }

    // Get contracts past expiry without completion
    const expiredContracts = await this.prisma.contract.findMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ['ACTIVE', 'EXECUTING'] },
      },
      include: {
        customer: true,
      },
    });

    for (const contract of expiredContracts) {
      if (!contract.expiresAt) continue;

      const daysOverdue = Math.floor(
        (now.getTime() - contract.expiresAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        contractId: contract.id,
        contractNo: contract.contractNo,
        customerName: contract.customer.name,
        expectedDate: contract.expiresAt,
        daysOverdue,
        amount: this.decimalToNumber(contract.amountWithTax),
        level: this.calculateOverdueLevel(daysOverdue),
      });
    }

    // Sort by days overdue (most overdue first)
    return alerts.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  private buildDateFilter(filter?: RevenueFilterInput): Record<string, unknown> {
    if (!filter) return {};

    const where: Record<string, unknown> = {};

    if (filter.year) {
      const startOfYear = new Date(filter.year, 0, 1);
      const endOfYear = new Date(filter.year, 11, 31, 23, 59, 59);
      where.signedAt = {
        gte: startOfYear,
        lte: endOfYear,
      };
    } else if (filter.startDate || filter.endDate) {
      where.signedAt = {};
      if (filter.startDate) {
        (where.signedAt as Record<string, Date>).gte = filter.startDate;
      }
      if (filter.endDate) {
        (where.signedAt as Record<string, Date>).lte = filter.endDate;
      }
    }

    return where;
  }

  private calculateMonthlyRevenue(
    contracts: Array<{ signedAt: Date | null; amountWithTax: DecimalValue }>
  ): MonthlyRevenue[] {
    const monthlyMap = new Map<string, { amount: number; count: number }>();

    for (const contract of contracts) {
      if (!contract.signedAt) continue;

      const month = `${contract.signedAt.getFullYear()}-${String(
        contract.signedAt.getMonth() + 1
      ).padStart(2, '0')}`;

      const existing = monthlyMap.get(month) || { amount: 0, count: 0 };
      existing.amount += this.decimalToNumber(contract.amountWithTax);
      existing.count += 1;
      monthlyMap.set(month, existing);
    }

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateTypeRevenue(
    contracts: Array<{ type: string; amountWithTax: DecimalValue }>,
    totalRevenue: number
  ): TypeRevenue[] {
    const typeMap = new Map<string, number>();

    for (const contract of contracts) {
      const existing = typeMap.get(contract.type) || 0;
      typeMap.set(
        contract.type,
        existing + this.decimalToNumber(contract.amountWithTax)
      );
    }

    return Array.from(typeMap.entries()).map(([type, amount]) => ({
      type: type as ContractType,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
    }));
  }

  private calculateCustomerRevenue(
    contracts: Array<{
      customerId: string;
      customer: { name: string };
      amountWithTax: DecimalValue;
    }>
  ): CustomerRevenue[] {
    const customerMap = new Map<
      string,
      { name: string; amount: number; count: number }
    >();

    for (const contract of contracts) {
      const existing = customerMap.get(contract.customerId) || {
        name: contract.customer.name,
        amount: 0,
        count: 0,
      };
      existing.amount += this.decimalToNumber(contract.amountWithTax);
      existing.count += 1;
      customerMap.set(contract.customerId, existing);
    }

    return Array.from(customerMap.entries())
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        amount: data.amount,
        contractCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private calculateOverdueLevel(daysOverdue: number): OverdueLevel {
    if (daysOverdue <= 30) return OverdueLevel.LOW;
    if (daysOverdue <= 60) return OverdueLevel.MEDIUM;
    if (daysOverdue <= 90) return OverdueLevel.HIGH;
    return OverdueLevel.CRITICAL;
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
