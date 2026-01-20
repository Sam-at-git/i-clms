import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma';
import { RegisterInput, ChangePasswordInput, ChangePasswordResult } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuditService } from '../audit/audit.service';
import { AuditAction, EntityType } from '../audit/dto/audit.dto';

const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

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

  async login(user: { id: string; email: string; role: string }, ipAddress?: string, userAgent?: string) {
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

    // Record login history
    await this.recordLoginHistory(user.id, ipAddress, userAgent, true);

    return {
      accessToken: this.jwtService.sign(payload),
      user: this.transformUser(fullUser),
    };
  }

  /**
   * Record login attempt
   */
  async recordLoginHistory(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    success = true,
    failureReason?: string,
  ): Promise<void> {
    try {
      await this.prisma.loginRecord.create({
        data: {
          userId,
          ipAddress,
          userAgent,
          success,
          failureReason,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record login history: ${error}`);
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return true;
    }

    // Generate a reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

    // Delete any existing tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // In production, send email with reset link
    // For now, just log the token (in production, this should be sent via email)
    this.logger.log(`Password reset token for ${email}: ${token}`);

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, token);

    return true;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Find valid token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Check if token was already used
    if (resetToken.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        lastPasswordChangedAt: new Date(),
      },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`Password reset completed for user ${resetToken.user.email}`);

    return true;
  }

  /**
   * Get login history for a user
   */
  async getLoginHistory(userId: string, limit = 10) {
    const records = await this.prisma.loginRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((record: { id: string; ipAddress: string | null; userAgent: string | null; success: boolean; failureReason: string | null; createdAt: Date }) => ({
      id: record.id,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      success: record.success,
      failureReason: record.failureReason,
      createdAt: record.createdAt,
    }));
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
