import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerOverview,
  Customer360,
  ContractSummary,
  IndustryCount,
} from './dto/customer-360.dto';
import {
  RenewalOverview,
  RenewalItem,
  RenewalPriority,
} from './dto/renewal-board.dto';
import {
  SalesPerformance,
  SalesPersonPerformance,
  MonthlySales,
} from './dto/sales-performance.dto';
import { ContractType, ContractStatus } from '../graphql/types/enums';

// Type for Prisma Decimal values
type DecimalValue = { toString(): string } | null | undefined;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerOverview(): Promise<CustomerOverview> {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);

    // Get all customers with their contracts
    const customers = await this.prisma.customer.findMany({
      include: {
        contracts: {
          include: {
            customer: true,
          },
        },
      },
    });

    const totalCustomers = customers.length;

    // Active customers (have at least one ACTIVE or EXECUTING contract)
    const activeCustomers = customers.filter((c) =>
      c.contracts.some(
        (contract) =>
          contract.status === 'ACTIVE' || contract.status === 'EXECUTING'
      )
    ).length;

    // New customers this year (first contract signed this year)
    const newCustomersThisYear = customers.filter((c) => {
      const firstContract = c.contracts
        .filter((contract) => contract.signedAt)
        .sort(
          (a, b) =>
            (a.signedAt?.getTime() || 0) - (b.signedAt?.getTime() || 0)
        )[0];
      return firstContract?.signedAt && firstContract.signedAt >= yearStart;
    }).length;

    // Group by industry
    const industryMap = new Map<string, { count: number; value: number }>();
    for (const customer of customers) {
      const industry = customer.industry || '未分类';
      const existing = industryMap.get(industry) || { count: 0, value: 0 };
      existing.count += 1;
      existing.value += customer.contracts.reduce(
        (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
        0
      );
      industryMap.set(industry, existing);
    }

    const byIndustry: IndustryCount[] = Array.from(industryMap.entries())
      .map(([industry, data]) => ({
        industry,
        count: data.count,
        totalValue: data.value,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    // Top customers by total value
    const topCustomers = customers
      .map((customer) => this.buildCustomer360(customer))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return {
      totalCustomers,
      activeCustomers,
      newCustomersThisYear,
      byIndustry,
      topCustomers,
    };
  }

  async getCustomer360(customerId: string): Promise<Customer360 | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        contracts: {
          orderBy: { signedAt: 'desc' },
        },
      },
    });

    if (!customer) return null;

    return this.buildCustomer360(customer);
  }

  async getRenewalOverview(): Promise<RenewalOverview> {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const quarterEnd = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3 + 3,
      0
    );

    // Get contracts expiring in the next 90 days
    const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiringContracts = await this.prisma.contract.findMany({
      where: {
        expiresAt: {
          gte: now,
          lte: ninetyDaysLater,
        },
        status: { in: ['ACTIVE', 'EXECUTING'] },
      },
      include: {
        customer: true,
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    // Calculate counts
    const expiringThisMonth = expiringContracts.filter(
      (c) => c.expiresAt && c.expiresAt <= monthEnd
    ).length;

    const expiringThisQuarter = expiringContracts.filter(
      (c) => c.expiresAt && c.expiresAt <= quarterEnd
    ).length;

    const totalRenewalValue = expiringContracts.reduce(
      (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
      0
    );

    // Calculate renewal rate (completed renewals / expired contracts in past year)
    const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const expiredLastYear = await this.prisma.contract.count({
      where: {
        expiresAt: {
          gte: yearAgo,
          lt: now,
        },
      },
    });

    const renewedLastYear = await this.prisma.contract.count({
      where: {
        signedAt: {
          gte: yearAgo,
        },
        parentContractId: { not: null },
      },
    });

    const renewalRate =
      expiredLastYear > 0 ? (renewedLastYear / expiredLastYear) * 100 : 0;

    // Build renewal items
    const renewalItems: RenewalItem[] = expiringContracts.map((contract) => {
      const daysUntilExpiry = contract.expiresAt
        ? Math.ceil(
            (contract.expiresAt.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      // Simple probability calculation based on customer history
      const renewalProbability = this.calculateRenewalProbability(contract);

      return {
        contractId: contract.id,
        contractNo: contract.contractNo,
        customerName: contract.customer.name,
        amount: this.decimalToNumber(contract.amountWithTax),
        expiresAt: contract.expiresAt!,
        daysUntilExpiry,
        renewalProbability,
        priority: this.calculatePriority(
          daysUntilExpiry,
          this.decimalToNumber(contract.amountWithTax)
        ),
      };
    });

    return {
      expiringThisMonth,
      expiringThisQuarter,
      totalRenewalValue,
      renewalRate,
      renewalItems,
    };
  }

  async getSalesPerformance(year?: number): Promise<SalesPerformance> {
    const targetYear = year || new Date().getFullYear();
    const yearStart = new Date(targetYear, 0, 1);
    const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

    const contracts = await this.prisma.contract.findMany({
      where: {
        signedAt: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
    });

    // Calculate totals
    let totalSalesValue = 0;
    let newSignValue = 0;
    let renewalValue = 0;

    for (const contract of contracts) {
      const amount = this.decimalToNumber(contract.amountWithTax);
      totalSalesValue += amount;

      if (contract.parentContractId) {
        renewalValue += amount;
      } else {
        newSignValue += amount;
      }
    }

    // Monthly trend
    const monthlyMap = new Map<
      string,
      { newSign: number; renewal: number }
    >();

    for (let i = 0; i < 12; i++) {
      const month = `${targetYear}-${String(i + 1).padStart(2, '0')}`;
      monthlyMap.set(month, { newSign: 0, renewal: 0 });
    }

    for (const contract of contracts) {
      if (!contract.signedAt) continue;

      const month = `${contract.signedAt.getFullYear()}-${String(
        contract.signedAt.getMonth() + 1
      ).padStart(2, '0')}`;

      const existing = monthlyMap.get(month);
      if (existing) {
        const amount = this.decimalToNumber(contract.amountWithTax);
        if (contract.parentContractId) {
          existing.renewal += amount;
        } else {
          existing.newSign += amount;
        }
      }
    }

    const monthlyTrend: MonthlySales[] = Array.from(monthlyMap.entries()).map(
      ([month, data]) => ({
        month,
        newSignValue: data.newSign,
        renewalValue: data.renewal,
        totalValue: data.newSign + data.renewal,
      })
    );

    // By sales person
    const salesPersonMap = new Map<
      string,
      { contracts: number; total: number; newSign: number; renewal: number }
    >();

    for (const contract of contracts) {
      const salesPerson = contract.salesPerson || '未分配';
      const existing = salesPersonMap.get(salesPerson) || {
        contracts: 0,
        total: 0,
        newSign: 0,
        renewal: 0,
      };

      const amount = this.decimalToNumber(contract.amountWithTax);
      existing.contracts += 1;
      existing.total += amount;

      if (contract.parentContractId) {
        existing.renewal += amount;
      } else {
        existing.newSign += amount;
      }

      salesPersonMap.set(salesPerson, existing);
    }

    const bySalesPerson: SalesPersonPerformance[] = Array.from(
      salesPersonMap.entries()
    )
      .map(([salesPerson, data]) => ({
        salesPerson,
        totalContracts: data.contracts,
        totalValue: data.total,
        newSignValue: data.newSign,
        renewalValue: data.renewal,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    return {
      totalSalesValue,
      newSignValue,
      renewalValue,
      monthlyTrend,
      bySalesPerson,
    };
  }

  private buildCustomer360(customer: {
    id: string;
    name: string;
    industry: string | null;
    contracts: Array<{
      id: string;
      contractNo: string;
      name: string;
      type: string;
      status: string;
      amountWithTax: DecimalValue;
      signedAt: Date | null;
      expiresAt: Date | null;
    }>;
  }): Customer360 {
    const contracts = customer.contracts;
    const totalValue = contracts.reduce(
      (sum, c) => sum + this.decimalToNumber(c.amountWithTax),
      0
    );

    const activeContracts = contracts.filter(
      (c) => c.status === 'ACTIVE' || c.status === 'EXECUTING'
    ).length;

    const signedDates = contracts
      .map((c) => c.signedAt)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const contractHistory: ContractSummary[] = contracts.map((c) => ({
      id: c.id,
      contractNo: c.contractNo,
      name: c.name,
      type: c.type as ContractType,
      status: c.status as ContractStatus,
      amount: this.decimalToNumber(c.amountWithTax),
      signedAt: c.signedAt,
      expiresAt: c.expiresAt,
    }));

    return {
      customerId: customer.id,
      customerName: customer.name,
      totalContracts: contracts.length,
      totalValue,
      activeContracts,
      contractHistory,
      industry: customer.industry,
      firstContractDate: signedDates[0] || null,
      lastContractDate: signedDates[signedDates.length - 1] || null,
    };
  }

  private calculateRenewalProbability(contract: {
    customerId: string;
    amountWithTax: DecimalValue;
  }): number {
    // Simple heuristic: base probability of 70%, adjusted by contract value
    const baseProb = 70;
    const amount = this.decimalToNumber(contract.amountWithTax);

    // Higher value contracts tend to have higher renewal probability
    if (amount > 1000000) return Math.min(baseProb + 15, 95);
    if (amount > 500000) return Math.min(baseProb + 10, 90);
    if (amount > 100000) return Math.min(baseProb + 5, 85);

    return baseProb;
  }

  private calculatePriority(
    daysUntilExpiry: number,
    amount: number
  ): RenewalPriority {
    // High priority: expires within 30 days OR high value (>500k)
    if (daysUntilExpiry <= 30 || amount > 500000) {
      return RenewalPriority.HIGH;
    }

    // Medium priority: expires within 60 days OR medium value (>100k)
    if (daysUntilExpiry <= 60 || amount > 100000) {
      return RenewalPriority.MEDIUM;
    }

    return RenewalPriority.LOW;
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
