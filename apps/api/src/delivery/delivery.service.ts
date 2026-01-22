import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
import {
  MilestoneDetail,
  MilestoneStatusHistory,
  UpdateMilestoneStatusInput,
  UploadDeliverableInput,
  AcceptMilestoneInput,
  RejectMilestoneInput,
  ProjectMilestoneWithContract,
  MilestoneContractInfo,
  MilestoneCustomerInfo,
} from './dto/milestone-status.dto';
import { ContractStatus, MilestoneStatus, UserRole } from '../graphql/types/enums';

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

  // ==================== 里程碑状态管理 ====================

  /**
   * 获取里程碑详情（包含状态历史）
   */
  async getMilestoneDetail(id: string): Promise<MilestoneDetail> {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id },
      include: {
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${id} not found`);
    }

    return this.mapToMilestoneDetail(milestone);
  }

  /**
   * 更新里程碑状态
   */
  async updateMilestoneStatus(
    input: UpdateMilestoneStatusInput,
    userId: string
  ): Promise<MilestoneDetail> {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: input.id },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${input.id} not found`);
    }

    // 验证状态转换是否合法
    const currentStatus = milestone.status as MilestoneStatus;
    if (!this.isValidStatusTransition(currentStatus, input.status)) {
      throw new ForbiddenException(
        `Cannot change status from ${milestone.status} to ${input.status}`
      );
    }

    // 更新里程碑状态
    const updated = await this.prisma.projectMilestone.update({
      where: { id: input.id },
      data: {
        status: input.status,
        // 如果状态变为DELIVERED，设置实际完成时间
        actualDate:
          input.status === MilestoneStatus.DELIVERED &&
          !milestone.actualDate
            ? new Date()
            : milestone.actualDate,
      },
      include: {
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    // 记录状态变更历史
    await this.prisma.milestoneStatusHistory.create({
      data: {
        milestoneId: input.id,
        fromStatus: currentStatus,
        toStatus: input.status,
        changedBy: userId,
        notes: input.notes,
      },
    });

    return this.mapToMilestoneDetail(updated);
  }

  /**
   * 上传交付物
   */
  async uploadDeliverable(
    input: UploadDeliverableInput,
    userId: string
  ): Promise<MilestoneDetail> {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: input.milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException(
        `Milestone with ID ${input.milestoneId} not found`
      );
    }

    const updated = await this.prisma.projectMilestone.update({
      where: { id: input.milestoneId },
      data: {
        deliverableFileUrl: input.fileUrl,
        deliverableFileName: input.fileName,
        deliverableUploadedAt: new Date(),
        // 上传交付物后自动将状态设为DELIVERED
        status: 'DELIVERED',
      },
      include: {
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    // 记录状态变更历史
    await this.prisma.milestoneStatusHistory.create({
      data: {
        milestoneId: input.milestoneId,
        fromStatus: milestone.status,
        toStatus: 'DELIVERED',
        changedBy: userId,
        notes: input.description || `Uploaded deliverable: ${input.fileName}`,
      },
    });

    return this.mapToMilestoneDetail(updated);
  }

  /**
   * 验收通过里程碑
   */
  async acceptMilestone(
    input: AcceptMilestoneInput,
    userId: string
  ): Promise<MilestoneDetail> {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: input.id },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${input.id} not found`);
    }

    // 只有DELIVERED或REJECTED状态的里程碑可以被验收
    if (
      milestone.status !== 'DELIVERED' &&
      milestone.status !== 'REJECTED'
    ) {
      throw new ForbiddenException(
        `Can only accept milestones that are delivered or rejected`
      );
    }

    const updated = await this.prisma.projectMilestone.update({
      where: { id: input.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: userId,
        // 清除拒绝信息
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
      },
      include: {
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    // 记录状态变更历史
    await this.prisma.milestoneStatusHistory.create({
      data: {
        milestoneId: input.id,
        fromStatus: milestone.status,
        toStatus: 'ACCEPTED',
        changedBy: userId,
        notes: input.notes || 'Milestone accepted',
      },
    });

    return this.mapToMilestoneDetail(updated);
  }

  /**
   * 拒绝里程碑
   */
  async rejectMilestone(
    input: RejectMilestoneInput,
    userId: string
  ): Promise<MilestoneDetail> {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: input.id },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID ${input.id} not found`);
    }

    // 只有DELIVERED状态的里程碑可以被拒绝
    if (milestone.status !== 'DELIVERED') {
      throw new ForbiddenException(
        `Can only reject milestones that are delivered`
      );
    }

    const updated = await this.prisma.projectMilestone.update({
      where: { id: input.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: input.reason,
        // 清除验收信息
        acceptedAt: null,
        acceptedBy: null,
      },
      include: {
        statusHistory: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            changedAt: 'desc',
          },
        },
      },
    });

    // 记录状态变更历史
    await this.prisma.milestoneStatusHistory.create({
      data: {
        milestoneId: input.id,
        fromStatus: milestone.status,
        toStatus: 'REJECTED',
        changedBy: userId,
        notes: input.reason,
      },
    });

    return this.mapToMilestoneDetail(updated);
  }

  /**
   * 获取里程碑状态历史
   */
  async getMilestoneStatusHistory(
    milestoneId: string
  ): Promise<MilestoneStatusHistory[]> {
    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new NotFoundException(
        `Milestone with ID ${milestoneId} not found`
      );
    }

    const history = await this.prisma.milestoneStatusHistory.findMany({
      where: { milestoneId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    });

    return history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus as MilestoneStatus,
      toStatus: h.toStatus as MilestoneStatus,
      changedBy: h.changedBy,
      changedByName: h.user.name,
      changedAt: h.changedAt,
      notes: h.notes,
    }));
  }

  /**
   * 验证状态转换是否合法
   */
  private isValidStatusTransition(
    from: MilestoneStatus,
    to: MilestoneStatus
  ): boolean {
    const validTransitions: Record<MilestoneStatus, MilestoneStatus[]> = {
      [MilestoneStatus.PENDING]: [
        MilestoneStatus.IN_PROGRESS,
        MilestoneStatus.DELIVERED,
      ],
      [MilestoneStatus.IN_PROGRESS]: [MilestoneStatus.DELIVERED],
      [MilestoneStatus.DELIVERED]: [
        MilestoneStatus.ACCEPTED,
        MilestoneStatus.REJECTED,
      ],
      [MilestoneStatus.ACCEPTED]: [], // 已验收不能再变更
      [MilestoneStatus.REJECTED]: [MilestoneStatus.DELIVERED], // 拒绝后可重新交付
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * 将Prisma模型映射为MilestoneDetail DTO
   */
  private mapToMilestoneDetail(
    milestone: any
  ): MilestoneDetail {
    // 获取验收/拒绝人的姓名
    let acceptedByName: string | null = null;
    let rejectedByName: string | null = null;

    if (milestone.acceptedBy) {
      // 从statusHistory中查找对应的用户名
      const acceptedHistory = milestone.statusHistory?.find(
        (h: any) =>
          h.toStatus === MilestoneStatus.ACCEPTED &&
          h.changedBy === milestone.acceptedBy
      );
      acceptedByName = acceptedHistory?.user?.name || null;
    }

    if (milestone.rejectedBy) {
      const rejectedHistory = milestone.statusHistory?.find(
        (h: any) =>
          h.toStatus === MilestoneStatus.REJECTED &&
          h.changedBy === milestone.rejectedBy
      );
      rejectedByName = rejectedHistory?.user?.name || null;
    }

    return {
      id: milestone.id,
      sequence: milestone.sequence,
      name: milestone.name,
      deliverables: milestone.deliverables,
      amount: milestone.amount?.toString() || null,
      paymentPercentage: milestone.paymentPercentage?.toString() || null,
      plannedDate: milestone.plannedDate,
      actualDate: milestone.actualDate,
      acceptanceCriteria: milestone.acceptanceCriteria,
      status: milestone.status as MilestoneStatus,
      deliverableFileUrl: milestone.deliverableFileUrl,
      deliverableFileName: milestone.deliverableFileName,
      deliverableUploadedAt: milestone.deliverableUploadedAt,
      acceptedAt: milestone.acceptedAt,
      acceptedBy: milestone.acceptedBy,
      acceptedByName,
      rejectedAt: milestone.rejectedAt,
      rejectedBy: milestone.rejectedBy,
      rejectedByName,
      rejectionReason: milestone.rejectionReason,
      statusHistory: (milestone.statusHistory || []).map((h: any) => ({
        id: h.id,
        fromStatus: h.fromStatus as MilestoneStatus,
        toStatus: h.toStatus as MilestoneStatus,
        changedBy: h.changedBy,
        changedByName: h.user?.name || '',
        changedAt: h.changedAt,
        notes: h.notes,
      })),
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    };
  }

  /**
   * 获取所有项目里程碑（带合同信息）
   */
  async getAllProjectMilestones(): Promise<ProjectMilestoneWithContract[]> {
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

    return milestones.map((m) => this.mapToProjectMilestoneWithContract(m));
  }

  /**
   * 将Prisma模型映射为ProjectMilestoneWithContract DTO
   */
  private mapToProjectMilestoneWithContract(
    milestone: any
  ): ProjectMilestoneWithContract {
    const contract = milestone.detail.contract;
    const customerInfo: MilestoneCustomerInfo = {
      id: contract.customer.id,
      name: contract.customer.name,
    };
    const contractInfo: MilestoneContractInfo = {
      id: contract.id,
      contractNo: contract.contractNo,
      name: contract.name,
      customerId: contract.customerId,
      customer: customerInfo,
    };
    return {
      id: milestone.id,
      sequence: milestone.sequence,
      name: milestone.name,
      deliverables: milestone.deliverables,
      amount: milestone.amount?.toString() || null,
      paymentPercentage: milestone.paymentPercentage?.toString() || null,
      plannedDate: milestone.plannedDate,
      actualDate: milestone.actualDate,
      acceptanceCriteria: milestone.acceptanceCriteria,
      status: milestone.status as MilestoneStatus,
      deliverableFileUrl: milestone.deliverableFileUrl,
      deliverableFileName: milestone.deliverableFileName,
      deliverableUploadedAt: milestone.deliverableUploadedAt,
      acceptedAt: milestone.acceptedAt,
      acceptedBy: milestone.acceptedBy,
      acceptedByName: null, // Could fetch from statusHistory if needed
      rejectedAt: milestone.rejectedAt,
      rejectedBy: milestone.rejectedBy,
      rejectedByName: null, // Could fetch from statusHistory if needed
      rejectionReason: milestone.rejectionReason,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
      contract: contractInfo,
    };
  }
}
