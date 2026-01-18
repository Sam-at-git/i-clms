import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProjectOverview,
  StatusCount,
  CustomerProjects,
} from './dto/project-overview.dto';
import {
  MilestoneOverview,
  MilestoneItem,
} from './dto/milestone-tracker.dto';
import {
  ResourceUtilization,
  RoleUtilization,
  MonthlyUtilization,
} from './dto/resource-utilization.dto';
import { ContractStatus, MilestoneStatus } from '../graphql/types/enums';

// Type for Prisma Decimal values
type DecimalValue = { toString(): string } | null | undefined;

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectOverview(): Promise<ProjectOverview> {
    // Get all project outsourcing contracts
    const projects = await this.prisma.contract.findMany({
      where: {
        type: 'PROJECT_OUTSOURCING',
      },
      include: {
        customer: true,
      },
    });

    const totalProjects = projects.length;

    // Count by status
    const statusMap = new Map<string, number>();
    for (const project of projects) {
      const count = statusMap.get(project.status) || 0;
      statusMap.set(project.status, count + 1);
    }

    const byStatus: StatusCount[] = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status: status as ContractStatus,
        count,
      })
    );

    // Group by customer
    const customerMap = new Map<
      string,
      { name: string; total: number; active: number }
    >();
    for (const project of projects) {
      const existing = customerMap.get(project.customerId) || {
        name: project.customer.name,
        total: 0,
        active: 0,
      };
      existing.total += 1;
      if (
        project.status === 'ACTIVE' ||
        project.status === 'EXECUTING'
      ) {
        existing.active += 1;
      }
      customerMap.set(project.customerId, existing);
    }

    const byCustomer: CustomerProjects[] = Array.from(
      customerMap.entries()
    ).map(([customerId, data]) => ({
      customerId,
      customerName: data.name,
      projectCount: data.total,
      activeCount: data.active,
    }));

    // Calculate completion rate
    const completedCount = projects.filter(
      (p) => p.status === 'COMPLETED'
    ).length;
    const completionRate =
      totalProjects > 0 ? (completedCount / totalProjects) * 100 : 0;

    return {
      totalProjects,
      byStatus,
      byCustomer,
      completionRate,
    };
  }

  async getMilestoneOverview(): Promise<MilestoneOverview> {
    const now = new Date();

    // Get all milestones with contract info
    const milestones = await this.prisma.projectMilestone.findMany({
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
      orderBy: {
        plannedDate: 'asc',
      },
    });

    const totalMilestones = milestones.length;
    const completedCount = milestones.filter(
      (m) => m.status === 'ACCEPTED'
    ).length;
    const pendingCount = milestones.filter(
      (m) => m.status === 'PENDING' || m.status === 'IN_PROGRESS'
    ).length;

    // Find overdue milestones
    const overdueMilestones: MilestoneItem[] = [];
    const upcomingMilestones: MilestoneItem[] = [];

    for (const milestone of milestones) {
      const contract = milestone.detail.contract;
      const item: MilestoneItem = {
        id: milestone.id,
        name: milestone.name,
        contractNo: contract.contractNo,
        customerName: contract.customer.name,
        plannedDate: milestone.plannedDate,
        actualDate: milestone.actualDate,
        status: milestone.status as MilestoneStatus,
        amount: this.decimalToNumber(milestone.amount),
        daysOverdue: null,
      };

      if (
        milestone.plannedDate &&
        milestone.plannedDate < now &&
        milestone.status !== 'ACCEPTED'
      ) {
        const daysOverdue = Math.floor(
          (now.getTime() - milestone.plannedDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        item.daysOverdue = daysOverdue;
        overdueMilestones.push(item);
      } else if (
        milestone.plannedDate &&
        milestone.plannedDate >= now &&
        milestone.status !== 'ACCEPTED'
      ) {
        upcomingMilestones.push(item);
      }
    }

    return {
      totalMilestones,
      completedCount,
      pendingCount,
      overdueCount: overdueMilestones.length,
      upcomingMilestones: upcomingMilestones.slice(0, 10), // Top 10 upcoming
      overdueMilestones: overdueMilestones.sort(
        (a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0)
      ), // Most overdue first
    };
  }

  async getResourceUtilization(): Promise<ResourceUtilization> {
    // Get all staff augmentation contracts
    const staffContracts = await this.prisma.contract.findMany({
      where: {
        type: 'STAFF_AUGMENTATION',
        status: { in: ['ACTIVE', 'EXECUTING'] },
      },
      include: {
        staffAugmentation: {
          include: {
            rateItems: true,
          },
        },
      },
    });

    const totalStaffContracts = staffContracts.length;

    // Group by role
    const roleMap = new Map<string, { count: number; value: number }>();
    for (const contract of staffContracts) {
      if (contract.staffAugmentation?.rateItems) {
        for (const item of contract.staffAugmentation.rateItems) {
          const existing = roleMap.get(item.role) || { count: 0, value: 0 };
          existing.count += 1;
          existing.value += this.decimalToNumber(item.rate);
          roleMap.set(item.role, existing);
        }
      }
    }

    const byRole: RoleUtilization[] = Array.from(roleMap.entries()).map(
      ([role, data]) => ({
        role,
        count: data.count,
        totalValue: data.value,
      })
    );

    // Monthly trend (last 6 months)
    const monthlyTrend: MonthlyUtilization[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${targetDate.getFullYear()}-${String(
        targetDate.getMonth() + 1
      ).padStart(2, '0')}`;

      // Calculate approximate hours based on contracts active in that month
      let hoursAllocated = 0;
      let value = 0;

      for (const contract of staffContracts) {
        const effectiveAt = contract.effectiveAt;
        const expiresAt = contract.expiresAt;

        // Check if contract was active during this month
        const monthEnd = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth() + 1,
          0
        );

        if (
          (!effectiveAt || effectiveAt <= monthEnd) &&
          (!expiresAt || expiresAt >= targetDate)
        ) {
          // Contract was active in this month
          const monthlyHours =
            contract.staffAugmentation?.monthlyHoursCap || 160;
          hoursAllocated += monthlyHours;
          value += this.decimalToNumber(contract.amountWithTax) / 12; // Approximate monthly value
        }
      }

      monthlyTrend.push({
        month: monthStr,
        hoursAllocated,
        value,
      });
    }

    return {
      totalStaffContracts,
      byRole,
      monthlyTrend,
    };
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
