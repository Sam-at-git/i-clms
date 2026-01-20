import { Resolver, Query, Mutation, Args, ArgsType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';
import { SystemConfigService } from './system-config.service';
import { SystemConfig, SystemHealth, NotificationResult, UpdateSystemConfigInput, SendNotificationInput } from './dto';

@Resolver()
export class SystemConfigResolver {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  /**
   * 获取系统配置
   */
  @Query(() => SystemConfig, { description: '获取系统配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async systemConfig(): Promise<SystemConfig> {
    return this.systemConfigService.getSystemConfig();
  }

  /**
   * 获取系统健康状态
   */
  @Query(() => SystemHealth, { description: '获取系统健康状态' })
  async systemHealth(): Promise<SystemHealth> {
    return this.systemConfigService.getSystemHealth();
  }

  /**
   * 更新系统配置
   */
  @Mutation(() => SystemConfig, { description: '更新系统配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateSystemConfig(
    @Args('config', { type: () => UpdateSystemConfigInput })
    config: UpdateSystemConfigInput,
  ): Promise<SystemConfig> {
    return this.systemConfigService.updateSystemConfig(config);
  }

  /**
   * 发送通知
   */
  @Mutation(() => NotificationResult, { description: '发送通知' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async sendNotification(
    @Args('input', { type: () => SendNotificationInput })
    input: SendNotificationInput,
  ): Promise<NotificationResult> {
    return this.systemConfigService.sendNotification(input);
  }

  /**
   * 测试SMTP连接
   */
  @Mutation(() => Boolean, { description: '测试SMTP连接' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async testSmtpConnection(): Promise<boolean> {
    return this.systemConfigService.testSmtpConnection();
  }
}
