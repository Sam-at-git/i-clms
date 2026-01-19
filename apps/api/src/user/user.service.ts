import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, EntityType } from '../audit/dto/audit.dto';
import {
  CreateUserInput,
  UpdateUserInput,
  UserFilterInput,
  UserConnectionDto,
  UserDto,
  ResetPasswordResultDto,
} from './dto/user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * Get paginated users with filters
   */
  async getUsers(
    page = 1,
    pageSize = 20,
    filter?: UserFilterInput
  ): Promise<UserConnectionDto> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (filter?.departmentId) {
      where.departmentId = filter.departmentId;
    }

    if (filter?.role) {
      where.role = filter.role;
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { department: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => this.toDto(u)),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    return user ? this.toDto(user) : null;
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(
    input: CreateUserInput,
    operatorId: string,
    ipAddress?: string
  ): Promise<UserDto> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // Check if department exists
    const department = await this.prisma.department.findUnique({
      where: { id: input.departmentId },
    });

    if (!department) {
      throw new BadRequestException('Department not found');
    }

    // Use a fixed initial password (user must change on first login)
    const initialPassword = 'password123';
    const hashedPassword = await bcrypt.hash(initialPassword, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: input.role,
        departmentId: input.departmentId,
        isActive: true,
        mustChangePassword: true,
        createdById: operatorId,
      },
      include: { department: true },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.CREATE_USER,
      entityType: EntityType.USER,
      entityId: user.id,
      entityName: user.name,
      newValue: {
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
      },
      operatorId,
      ipAddress,
    });

    this.logger.log(`User created: ${user.email} (temp password: ${initialPassword})`);
    return this.toDto(user);
  }

  /**
   * Update a user
   */
  async updateUser(
    id: string,
    input: UpdateUserInput,
    operatorId: string,
    ipAddress?: string
  ): Promise<UserDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // If email is being changed, check it doesn't conflict
    if (input.email && input.email !== existing.email) {
      const emailConflict = await this.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (emailConflict) {
        throw new ConflictException('Email already exists');
      }
    }

    // If department is being changed, check it exists
    if (input.departmentId && input.departmentId !== existing.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: input.departmentId },
      });
      if (!department) {
        throw new BadRequestException('Department not found');
      }
    }

    const oldValue = {
      email: existing.email,
      name: existing.name,
      role: existing.role,
      departmentId: existing.departmentId,
    };

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        departmentId: input.departmentId,
      },
      include: { department: true },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.UPDATE_USER,
      entityType: EntityType.USER,
      entityId: user.id,
      entityName: user.name,
      oldValue,
      newValue: {
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
      },
      operatorId,
      ipAddress,
    });

    return this.toDto(user);
  }

  /**
   * Toggle user active status (enable/disable)
   */
  async toggleUserStatus(
    id: string,
    operatorId: string,
    ipAddress?: string
  ): Promise<UserDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Don't allow disabling yourself
    if (id === operatorId) {
      throw new BadRequestException('Cannot disable your own account');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: { department: true },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.TOGGLE_USER_STATUS,
      entityType: EntityType.USER,
      entityId: user.id,
      entityName: user.name,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive: user.isActive },
      operatorId,
      ipAddress,
    });

    this.logger.log(`User ${user.email} status toggled to ${user.isActive ? 'active' : 'inactive'}`);
    return this.toDto(user);
  }

  /**
   * Reset user password (generate temporary password)
   */
  async resetUserPassword(
    id: string,
    operatorId: string,
    ipAddress?: string
  ): Promise<ResetPasswordResultDto> {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: true,
        lastPasswordChangedAt: null,
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.RESET_USER_PASSWORD,
      entityType: EntityType.USER,
      entityId: existing.id,
      entityName: existing.name,
      operatorId,
      ipAddress,
    });

    this.logger.log(`Password reset for user ${existing.email}`);
    return {
      success: true,
      temporaryPassword,
    };
  }

  /**
   * Generate a random temporary password
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Transform Prisma user to DTO
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDto(user: any): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: {
        id: user.department.id,
        name: user.department.name,
        code: user.department.code,
      },
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastPasswordChangedAt: user.lastPasswordChangedAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
