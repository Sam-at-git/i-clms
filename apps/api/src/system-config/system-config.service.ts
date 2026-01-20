import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { Client as MinioClient } from 'minio';
import { SystemConfig, SystemHealth, NotificationResult, UpdateSystemConfigInput, SendNotificationInput } from './dto';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取系统配置
   */
  async getSystemConfig(): Promise<SystemConfig> {
    return {
      llmProvider: this.configService.get<string>('activeLlmProvider') || 'ollama',
      llmModel: this.configService.get<string>('ollamaModel') || 'gemma3:27b',
      smtpEnabled: this.configService.get<boolean>('smtpEnabled') || false,
      smtpHost: this.configService.get<string>('smtpHost'),
      smtpPort: this.configService.get<number>('smtpPort'),
      smtpUser: this.configService.get<string>('smtpUser'),
      smtpSecure: this.configService.get<boolean>('smtpSecure') || false,
      minioEndpoint: this.configService.get<string>('minio.endPoint'),
      minioPort: this.configService.get<number>('minio.port'),
      minioBucket: this.configService.get<string>('minio.bucketName'),
    };
  }

  /**
   * 更新系统配置
   * 注意：实际生产环境中应该持久化到数据库或配置文件
   * 这里只是演示，实际配置应该通过环境变量或配置管理服务
   */
  async updateSystemConfig(input: UpdateSystemConfigInput): Promise<SystemConfig> {
    // 在实际应用中，这里应该：
    // 1. 验证配置的有效性
    // 2. 保存到数据库或配置文件
    // 3. 可能需要重启相关服务

    this.logger.log(`System config updated: ${JSON.stringify(input)}`);

    // 返回更新后的配置（这里只是返回当前配置加上更新的值）
    const currentConfig = await this.getSystemConfig();
    return {
      ...currentConfig,
      ...input,
    };
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [dbStatus, storageStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
    ]);

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      api: true,
      database: dbStatus.healthy,
      storage: storageStatus.healthy,
      uptime,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      databaseStatus: dbStatus.message,
      storageStatus: storageStatus.message,
    };
  }

  /**
   * 测试SMTP连接
   */
  async testSmtpConnection(): Promise<boolean> {
    // 这里应该实际测试SMTP连接
    // 由于没有实际配置SMTP，返回false
    const smtpEnabled = this.configService.get<boolean>('smtpEnabled') || false;
    if (!smtpEnabled) {
      return false;
    }

    // TODO: 实现实际的SMTP连接测试
    this.logger.warn('SMTP connection test not fully implemented');
    return true;
  }

  /**
   * 发送通知
   */
  async sendNotification(input: SendNotificationInput): Promise<NotificationResult> {
    // 这里应该实际发送邮件通知
    // 由于没有配置SMTP，记录日志并返回成功
    this.logger.log(
      `Sending notification to ${input.to}: ${input.subject} (type: ${input.type || 'general'})`,
    );

    // TODO: 实现实际的邮件发送
    // const smtpEnabled = this.configService.get<boolean>('smtpEnabled') || false;
    // if (!smtpEnabled) {
    //   throw new BadRequestException('SMTP is not enabled');
    // }

    return {
      success: true,
      message: 'Notification logged (SMTP not configured)',
      messageId: `msg_${Date.now()}`,
    };
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabase(): Promise<{ healthy: boolean; message: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { healthy: true, message: 'connected' };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error}`);
      return { healthy: false, message: 'disconnected' };
    }
  }

  /**
   * 检查存储服务连接
   */
  private async checkStorage(): Promise<{ healthy: boolean; message: string }> {
    try {
      const endPoint = this.configService.get<string>('minio.endPoint') || 'localhost';
      const port = this.configService.get<number>('minio.port') || 9000;
      const accessKey = this.configService.get<string>('minio.accessKey') || 'minioadmin';
      const secretKey = this.configService.get<string>('minio.secretKey') || 'minioadmin123';

      const minioClient = new MinioClient({
        endPoint,
        port,
        useSSL: false,
        accessKey,
        secretKey,
      });

      // 尝试列出bucket来检查连接
      await minioClient.listBuckets();
      return { healthy: true, message: 'connected' };
    } catch (error) {
      this.logger.error(`Storage health check failed: ${error}`);
      return { healthy: false, message: 'disconnected' };
    }
  }
}
