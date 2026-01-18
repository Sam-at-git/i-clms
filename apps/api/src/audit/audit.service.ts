import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, EntityType, AuditLogConnectionDto } from './dto/audit.dto';

export interface AuditLogInput {
  action: AuditAction | string;
  entityType: EntityType | string;
  entityId: string;
  entityName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  operatorId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  action?: string;
  entityType?: string;
  operatorId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit log entry
   */
  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          oldValue: input.oldValue as Prisma.InputJsonValue | undefined,
          newValue: input.newValue as Prisma.InputJsonValue | undefined,
          operatorId: input.operatorId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
      this.logger.debug(
        `Audit log created: ${input.action} on ${input.entityType}:${input.entityId} by ${input.operatorId}`
      );
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error}`);
      // Don't throw - audit logging should not break the main operation
    }
  }

  /**
   * Get paginated audit logs with filters
   */
  async getAuditLogs(
    page = 1,
    pageSize = 50,
    filter?: AuditLogFilter
  ): Promise<AuditLogConnectionDto> {
    const where: Record<string, unknown> = {};

    if (filter?.action) {
      where.action = filter.action;
    }

    if (filter?.entityType) {
      where.entityType = filter.entityType;
    }

    if (filter?.operatorId) {
      where.operatorId = filter.operatorId;
    }

    if (filter?.startDate || filter?.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        (where.createdAt as Record<string, Date>).gte = filter.startDate;
      }
      if (filter.endDate) {
        (where.createdAt as Record<string, Date>).lte = filter.endDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          operator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        entityName: item.entityName ?? undefined,
        oldValue: item.oldValue as Record<string, unknown> | undefined,
        newValue: item.newValue as Record<string, unknown> | undefined,
        operator: item.operator,
        ipAddress: item.ipAddress ?? undefined,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get distinct actions for filter dropdown
   */
  async getDistinctActions(): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return result.map((r: { action: string }) => r.action);
  }

  /**
   * Get distinct entity types for filter dropdown
   */
  async getDistinctEntityTypes(): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      select: { entityType: true },
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
    });
    return result.map((r: { entityType: string }) => r.entityType);
  }
}
