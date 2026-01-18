import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma';
import { RegisterInput, ChangePasswordInput, ChangePasswordResult } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuditService } from '../audit/audit.service';
import { AuditAction, EntityType } from '../audit/dto/audit.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
      },
    });

    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: true,
      },
    });

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.transformUser(fullUser),
    };
  }

  async register(input: RegisterInput) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if department exists
    const department = await this.prisma.department.findUnique({
      where: { id: input.departmentId },
    });

    if (!department) {
      throw new ConflictException('Department not found');
    }

    const hashedPassword = await this.hashPassword(input.password);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        departmentId: input.departmentId,
        role: 'USER',
      },
      include: {
        department: true,
      },
    });

    this.logger.log(`User registered: ${user.email}`);
    return this.transformUser(user);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });

    if (!user) {
      return null;
    }

    return this.transformUser(user);
  }

  /**
   * Change user's password
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    ipAddress?: string
  ): Promise<ChangePasswordResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate current password
    const isCurrentValid = await this.comparePassword(input.currentPassword, user.password);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password is different
    if (input.currentPassword === input.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Validate new password length
    if (input.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    const hashedPassword = await this.hashPassword(input.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        lastPasswordChangedAt: new Date(),
      },
    });

    // Log the audit
    await this.auditService.log({
      action: AuditAction.CHANGE_PASSWORD,
      entityType: EntityType.USER,
      entityId: userId,
      entityName: user.name,
      operatorId: userId,
      ipAddress,
    });

    this.logger.log(`Password changed for user ${user.email}`);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastPasswordChangedAt: user.lastPasswordChangedAt ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
