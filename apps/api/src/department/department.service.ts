import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, EntityType } from '../audit/dto/audit.dto';
import {
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DepartmentDto,
  DeleteResultDto,
} from './dto/department.dto';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Get all departments
   */
  async getDepartments(includeInactive = false): Promise<DepartmentDto[]> {
    const where = includeInactive ? {} : { isActive: true };

    const departments = await this.prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => this.toDto(d));
  }

  /**
   * Get a single department by ID
   */
  async getDepartment(id: string): Promise<DepartmentDto | null> {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    return department ? this.toDto(department) : null;
  }

  /**
   * Create a new department
   */
  async createDepartment(
    input: CreateDepartmentInput,
    operatorId: string,
    ipAddress?: string
  ): Promise<DepartmentDto> {
    // Check if name already exists
    const existingName = await this.prisma.department.findUnique({
      where: { name: input.name },
    });

    if (existingName) {
      throw new ConflictException('Department name already exists');
    }

    // Check if code already exists
    const existingCode = await this.prisma.department.findUnique({
      where: { code: input.code },
    });

    if (existingCode) {
      throw new ConflictException('Department code already exists');
    }

    const department = await this.prisma.department.create({
      data: {
        name: input.name,
        code: input.code,
        isActive: true,
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.CREATE_DEPARTMENT,
      entityType: EntityType.DEPARTMENT,
      entityId: department.id,
      entityName: department.name,
      newValue: {
        name: department.name,
        code: department.code,
      },
      operatorId,
      ipAddress,
    });

    this.logger.log(`Department created: ${department.name} (${department.code})`);
    return this.toDto(department);
  }

  /**
   * Update a department
   */
  async updateDepartment(
    id: string,
    input: UpdateDepartmentInput,
    operatorId: string,
    ipAddress?: string
  ): Promise<DepartmentDto> {
    const existing = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    // If name is being changed, check it doesn't conflict
    if (input.name && input.name !== existing.name) {
      const nameConflict = await this.prisma.department.findUnique({
        where: { name: input.name },
      });
      if (nameConflict) {
        throw new ConflictException('Department name already exists');
      }
    }

    // If code is being changed, check it doesn't conflict
    if (input.code && input.code !== existing.code) {
      const codeConflict = await this.prisma.department.findUnique({
        where: { code: input.code },
      });
      if (codeConflict) {
        throw new ConflictException('Department code already exists');
      }
    }

    const oldValue = {
      name: existing.name,
      code: existing.code,
    };

    const department = await this.prisma.department.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.UPDATE_DEPARTMENT,
      entityType: EntityType.DEPARTMENT,
      entityId: department.id,
      entityName: department.name,
      oldValue,
      newValue: {
        name: department.name,
        code: department.code,
      },
      operatorId,
      ipAddress,
    });

    return this.toDto(department);
  }

  /**
   * Delete a department (soft delete)
   */
  async deleteDepartment(
    id: string,
    operatorId: string,
    ipAddress?: string
  ): Promise<DeleteResultDto> {
    const existing = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Department not found');
    }

    // Check if department has users
    if (existing._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete department with ${existing._count.users} associated users. Please reassign users first.`
      );
    }

    await this.prisma.department.update({
      where: { id },
      data: { isActive: false },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.DELETE_DEPARTMENT,
      entityType: EntityType.DEPARTMENT,
      entityId: existing.id,
      entityName: existing.name,
      oldValue: { isActive: true },
      newValue: { isActive: false },
      operatorId,
      ipAddress,
    });

    this.logger.log(`Department soft deleted: ${existing.name}`);
    return {
      success: true,
      message: 'Department deleted successfully',
    };
  }

  /**
   * Transform Prisma department to DTO
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDto(department: any): DepartmentDto {
    return {
      id: department.id,
      name: department.name,
      code: department.code,
      isActive: department.isActive,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
    };
  }
}
