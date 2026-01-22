import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { Client as MinioClient } from 'minio';
import {
  SystemConfig,
  SystemHealth,
  NotificationResult,
  UpdateSystemConfigInput,
  SendNotificationInput,
  LLMConfig,
  EmbeddingConfig,
  ModelTestResult,
} from './dto';

// 配置键常量
const CONFIG_KEYS = {
  LLM_PROVIDER: 'llm.provider',
  LLM_MODEL: 'llm.model',
  LLM_BASE_URL: 'llm.baseUrl',
  LLM_API_KEY: 'llm.apiKey',
  LLM_TEMPERATURE: 'llm.temperature',
  LLM_MAX_TOKENS: 'llm.maxTokens',
  LLM_TIMEOUT: 'llm.timeout',
  EMBEDDING_PROVIDER: 'embedding.provider',
  EMBEDDING_MODEL: 'embedding.model',
  EMBEDDING_BASE_URL: 'embedding.baseUrl',
  EMBEDDING_API_KEY: 'embedding.apiKey',
  EMBEDDING_DIMENSIONS: 'embedding.dimensions',
  SMTP_ENABLED: 'smtp.enabled',
  SMTP_HOST: 'smtp.host',
  SMTP_PORT: 'smtp.port',
  SMTP_USER: 'smtp.user',
  SMTP_SECURE: 'smtp.secure',
  MINIO_ENDPOINT: 'minio.endpoint',
  MINIO_PORT: 'minio.port',
  MINIO_BUCKET: 'minio.bucket',
};

// 默认配置值
const DEFAULT_CONFIG = {
  llmProvider: 'ollama',
  llmModel: 'gemma3:27b',
  llmBaseUrl: '',
  llmApiKey: '',
  llmTemperature: 0.1,
  llmMaxTokens: 4000,
  llmTimeout: 120000,
  embeddingProvider: 'ollama',
  embeddingModel: 'nomic-embed-text',
  embeddingBaseUrl: '',
  embeddingApiKey: '',
  embeddingDimensions: 768,
  smtpEnabled: false,
  smtpSecure: false,
  minioEndpoint: 'localhost',
  minioPort: 9000,
  minioBucket: 'contracts',
};

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取单个配置值（优先从数据库读取，回退到环境变量）
   */
  private async getConfigValue(key: string): Promise<string | null> {
    // 从数据库读取
    const dbConfig = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (dbConfig) {
      return dbConfig.value;
    }

    // 回退到环境变量
    return this.getEnvValue(key);
  }

  /**
   * 从环境变量获取配置值
   */
  private getEnvValue(key: string): string | null {
    switch (key) {
      case CONFIG_KEYS.LLM_PROVIDER:
        return this.configService.get<string>('ACTIVE_LLM_PROVIDER') || DEFAULT_CONFIG.llmProvider;
      case CONFIG_KEYS.LLM_MODEL:
        return this.configService.get<string>('OLLAMA_MODEL') || DEFAULT_CONFIG.llmModel;
      case CONFIG_KEYS.LLM_BASE_URL:
        return this.configService.get<string>('LLM_BASE_URL') || '';
      case CONFIG_KEYS.LLM_API_KEY:
        return this.configService.get<string>('OPENAI_API_KEY') || '';
      case CONFIG_KEYS.LLM_TEMPERATURE:
        return String(this.configService.get<number>('LLM_TEMPERATURE', DEFAULT_CONFIG.llmTemperature));
      case CONFIG_KEYS.LLM_MAX_TOKENS:
        return String(this.configService.get<number>('LLM_MAX_TOKENS', DEFAULT_CONFIG.llmMaxTokens));
      case CONFIG_KEYS.LLM_TIMEOUT:
        return String(this.configService.get<number>('LLM_TIMEOUT', DEFAULT_CONFIG.llmTimeout));
      case CONFIG_KEYS.SMTP_ENABLED:
        return String(this.configService.get<boolean>('SMTP_ENABLED', DEFAULT_CONFIG.smtpEnabled));
      case CONFIG_KEYS.SMTP_HOST:
        return this.configService.get<string>('SMTP_HOST') || '';
      case CONFIG_KEYS.SMTP_PORT:
        return String(this.configService.get<number>('SMTP_PORT') || 587);
      case CONFIG_KEYS.SMTP_USER:
        return this.configService.get<string>('SMTP_USER') || '';
      case CONFIG_KEYS.SMTP_SECURE:
        return String(this.configService.get<boolean>('SMTP_SECURE', DEFAULT_CONFIG.smtpSecure));
      case CONFIG_KEYS.MINIO_ENDPOINT:
        return this.configService.get<string>('MINIO_ENDPOINT') || DEFAULT_CONFIG.minioEndpoint;
      case CONFIG_KEYS.MINIO_PORT:
        return String(this.configService.get<number>('MINIO_PORT') || DEFAULT_CONFIG.minioPort);
      case CONFIG_KEYS.MINIO_BUCKET:
        return this.configService.get<string>('MINIO_BUCKET') || DEFAULT_CONFIG.minioBucket;
      default:
        return null;
    }
  }

  /**
   * 设置配置值到数据库
   */
  private async setConfigValue(
    key: string,
    value: string,
    category: string,
    userId?: string,
  ): Promise<void> {
    await this.prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value,
        category,
        description: this.getConfigDescription(key),
        updatedBy: userId,
      },
      update: {
        value,
        updatedBy: userId,
      },
    });
    // 敏感信息不记录日志
    if (key === CONFIG_KEYS.LLM_API_KEY) {
      this.logger.log(`Config saved: ${key}="***" (hidden)`);
    } else if (key === CONFIG_KEYS.LLM_BASE_URL || key === CONFIG_KEYS.LLM_MODEL) {
      // 只记录部分信息
      const maskedValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
      this.logger.log(`Config saved: ${key}="${maskedValue}"`);
    } else {
      this.logger.log(`Config saved: ${key}="${value}"`);
    }
  }

  /**
   * 删除配置值
   */
  private async deleteConfigValue(key: string): Promise<void> {
    await this.prisma.systemConfig.deleteMany({
      where: { key },
    });
    this.logger.log(`Config deleted: ${key}`);
  }

  /**
   * 获取配置描述
   */
  private getConfigDescription(key: string): string {
    const descriptions: Record<string, string> = {
      [CONFIG_KEYS.LLM_PROVIDER]: 'LLM服务提供商 (openai/ollama)',
      [CONFIG_KEYS.LLM_MODEL]: 'LLM模型名称',
      [CONFIG_KEYS.LLM_BASE_URL]: 'LLM API Base URL',
      [CONFIG_KEYS.LLM_API_KEY]: 'LLM API Key (密钥)',
      [CONFIG_KEYS.LLM_TEMPERATURE]: 'LLM Temperature参数',
      [CONFIG_KEYS.LLM_MAX_TOKENS]: 'LLM Max Tokens参数',
      [CONFIG_KEYS.LLM_TIMEOUT]: 'LLM 请求超时时间(毫秒)',
      [CONFIG_KEYS.SMTP_ENABLED]: '是否启用SMTP邮件服务',
      [CONFIG_KEYS.SMTP_HOST]: 'SMTP服务器地址',
      [CONFIG_KEYS.SMTP_PORT]: 'SMTP服务器端口',
      [CONFIG_KEYS.SMTP_USER]: 'SMTP用户名',
      [CONFIG_KEYS.SMTP_SECURE]: '是否使用SSL/TLS',
      [CONFIG_KEYS.MINIO_ENDPOINT]: 'MinIO服务地址',
      [CONFIG_KEYS.MINIO_PORT]: 'MinIO服务端口',
      [CONFIG_KEYS.MINIO_BUCKET]: 'MinIO存储桶名称',
    };
    return descriptions[key] || '';
  }

  /**
   * 获取系统配置
   */
  async getSystemConfig(): Promise<SystemConfig> {
    const [
      llmProvider,
      llmModel,
      llmBaseUrl,
      llmApiKey,
      llmTemperature,
      llmMaxTokens,
      llmTimeout,
      smtpEnabled,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpSecure,
      minioEndpoint,
      minioPort,
      minioBucket,
    ] = await Promise.all([
      this.getConfigValue(CONFIG_KEYS.LLM_PROVIDER),
      this.getConfigValue(CONFIG_KEYS.LLM_MODEL),
      this.getConfigValue(CONFIG_KEYS.LLM_BASE_URL),
      this.getConfigValue(CONFIG_KEYS.LLM_API_KEY),
      this.getConfigValue(CONFIG_KEYS.LLM_TEMPERATURE),
      this.getConfigValue(CONFIG_KEYS.LLM_MAX_TOKENS),
      this.getConfigValue(CONFIG_KEYS.LLM_TIMEOUT),
      this.getConfigValue(CONFIG_KEYS.SMTP_ENABLED),
      this.getConfigValue(CONFIG_KEYS.SMTP_HOST),
      this.getConfigValue(CONFIG_KEYS.SMTP_PORT),
      this.getConfigValue(CONFIG_KEYS.SMTP_USER),
      this.getConfigValue(CONFIG_KEYS.SMTP_SECURE),
      this.getConfigValue(CONFIG_KEYS.MINIO_ENDPOINT),
      this.getConfigValue(CONFIG_KEYS.MINIO_PORT),
      this.getConfigValue(CONFIG_KEYS.MINIO_BUCKET),
    ]);

    return {
      llmProvider: llmProvider || DEFAULT_CONFIG.llmProvider,
      llmModel: llmModel || DEFAULT_CONFIG.llmModel,
      llmBaseUrl: llmBaseUrl || undefined,
      llmApiKey: llmApiKey || undefined,
      llmTemperature: llmTemperature ? parseFloat(llmTemperature) : undefined,
      llmMaxTokens: llmMaxTokens ? parseInt(llmMaxTokens, 10) : undefined,
      llmTimeout: llmTimeout ? parseInt(llmTimeout, 10) : undefined,
      smtpEnabled: smtpEnabled === 'true',
      smtpHost: smtpHost || undefined,
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : undefined,
      smtpUser: smtpUser || undefined,
      smtpSecure: smtpSecure === 'true',
      minioEndpoint: minioEndpoint || DEFAULT_CONFIG.minioEndpoint,
      minioPort: minioPort ? parseInt(minioPort, 10) : DEFAULT_CONFIG.minioPort,
      minioBucket: minioBucket || DEFAULT_CONFIG.minioBucket,
    };
  }

  /**
   * 更新系统配置（持久化到数据库）
   */
  async updateSystemConfig(
    input: UpdateSystemConfigInput,
    userId?: string,
  ): Promise<SystemConfig> {
    this.logger.log(`System config update requested by user: ${userId}`);

    // 更新LLM配置
    if (input.llmProvider !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.LLM_PROVIDER,
        input.llmProvider,
        'llm',
        userId,
      );
    }
    if (input.llmModel !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.LLM_MODEL,
        input.llmModel,
        'llm',
        userId,
      );
    }
    if (input.llmBaseUrl !== undefined) {
      // 如果是空字符串，删除现有配置；否则保存新值
      if (input.llmBaseUrl === '') {
        await this.deleteConfigValue(CONFIG_KEYS.LLM_BASE_URL);
      } else {
        await this.setConfigValue(
          CONFIG_KEYS.LLM_BASE_URL,
          input.llmBaseUrl,
          'llm',
          userId,
        );
      }
    }
    if (input.llmApiKey !== undefined) {
      // 如果是空字符串，删除现有配置；否则保存新值
      if (input.llmApiKey === '') {
        await this.deleteConfigValue(CONFIG_KEYS.LLM_API_KEY);
      } else {
        await this.setConfigValue(
          CONFIG_KEYS.LLM_API_KEY,
          input.llmApiKey,
          'llm',
          userId,
        );
      }
    }
    if (input.llmTemperature !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.LLM_TEMPERATURE,
        String(input.llmTemperature),
        'llm',
        userId,
      );
    }
    if (input.llmMaxTokens !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.LLM_MAX_TOKENS,
        String(input.llmMaxTokens),
        'llm',
        userId,
      );
    }
    if (input.llmTimeout !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.LLM_TIMEOUT,
        String(input.llmTimeout),
        'llm',
        userId,
      );
    }

    // 更新SMTP配置
    if (input.smtpEnabled !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.SMTP_ENABLED,
        String(input.smtpEnabled),
        'smtp',
        userId,
      );
    }
    if (input.smtpHost !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.SMTP_HOST,
        input.smtpHost,
        'smtp',
        userId,
      );
    }
    if (input.smtpPort !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.SMTP_PORT,
        String(input.smtpPort),
        'smtp',
        userId,
      );
    }
    if (input.smtpUser !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.SMTP_USER,
        input.smtpUser,
        'smtp',
        userId,
      );
    }
    if (input.smtpSecure !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.SMTP_SECURE,
        String(input.smtpSecure),
        'smtp',
        userId,
      );
    }

    // 更新存储配置
    if (input.minioEndpoint !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.MINIO_ENDPOINT,
        input.minioEndpoint,
        'storage',
        userId,
      );
    }
    if (input.minioPort !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.MINIO_PORT,
        String(input.minioPort),
        'storage',
        userId,
      );
    }
    if (input.minioBucket !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.MINIO_BUCKET,
        input.minioBucket,
        'storage',
        userId,
      );
    }

    // 返回更新后的完整配置
    return this.getSystemConfig();
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
    const smtpEnabled = (await this.getConfigValue(CONFIG_KEYS.SMTP_ENABLED)) === 'true';
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
    this.logger.log(
      `Sending notification to ${input.to}: ${input.subject} (type: ${input.type || 'general'})`,
    );

    // TODO: 实现实际的邮件发送
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
      const endPoint = await this.getConfigValue(CONFIG_KEYS.MINIO_ENDPOINT) || 'localhost';
      const port = parseInt((await this.getConfigValue(CONFIG_KEYS.MINIO_PORT)) || '9000', 10);
      const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin';
      const secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin123';

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

  /**
   * Get LLM configuration
   */
  async getLLMConfig(): Promise<LLMConfig> {
    const [provider, model, baseUrl, apiKey, temperature, maxTokens, timeout] =
      await Promise.all([
        this.getConfigValue(CONFIG_KEYS.LLM_PROVIDER),
        this.getConfigValue(CONFIG_KEYS.LLM_MODEL),
        this.getConfigValue(CONFIG_KEYS.LLM_BASE_URL),
        this.getConfigValue(CONFIG_KEYS.LLM_API_KEY),
        this.getConfigValue(CONFIG_KEYS.LLM_TEMPERATURE),
        this.getConfigValue(CONFIG_KEYS.LLM_MAX_TOKENS),
        this.getConfigValue(CONFIG_KEYS.LLM_TIMEOUT),
      ]);

    return {
      provider: provider || DEFAULT_CONFIG.llmProvider,
      model: model || DEFAULT_CONFIG.llmModel,
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      temperature: temperature ? parseFloat(temperature) : DEFAULT_CONFIG.llmTemperature,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : DEFAULT_CONFIG.llmMaxTokens,
      timeout: timeout ? parseInt(timeout, 10) : DEFAULT_CONFIG.llmTimeout,
    };
  }

  /**
   * Get Embedding model configuration
   */
  async getEmbeddingConfig(): Promise<EmbeddingConfig> {
    const [provider, model, baseUrl, apiKey, dimensions] = await Promise.all([
      this.getConfigValue(CONFIG_KEYS.EMBEDDING_PROVIDER),
      this.getConfigValue(CONFIG_KEYS.EMBEDDING_MODEL),
      this.getConfigValue(CONFIG_KEYS.EMBEDDING_BASE_URL),
      this.getConfigValue(CONFIG_KEYS.EMBEDDING_API_KEY),
      this.getConfigValue(CONFIG_KEYS.EMBEDDING_DIMENSIONS),
    ]);

    return {
      provider: provider || DEFAULT_CONFIG.embeddingProvider,
      model: model || DEFAULT_CONFIG.embeddingModel,
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      dimensions: dimensions ? parseInt(dimensions, 10) : DEFAULT_CONFIG.embeddingDimensions,
    };
  }

  /**
   * Save LLM configuration
   */
  async saveLLMConfig(
    config: Partial<LLMConfig>,
    userId?: string,
  ): Promise<LLMConfig> {
    if (config.provider !== undefined) {
      await this.setConfigValue(CONFIG_KEYS.LLM_PROVIDER, config.provider, 'llm', userId);
    }
    if (config.model !== undefined) {
      await this.setConfigValue(CONFIG_KEYS.LLM_MODEL, config.model, 'llm', userId);
    }
    if (config.baseUrl !== undefined) {
      if (config.baseUrl === '') {
        await this.deleteConfigValue(CONFIG_KEYS.LLM_BASE_URL);
      } else {
        await this.setConfigValue(CONFIG_KEYS.LLM_BASE_URL, config.baseUrl, 'llm', userId);
      }
    }
    if (config.apiKey !== undefined) {
      if (config.apiKey === '') {
        await this.deleteConfigValue(CONFIG_KEYS.LLM_API_KEY);
      } else {
        await this.setConfigValue(CONFIG_KEYS.LLM_API_KEY, config.apiKey, 'llm', userId);
      }
    }
    if (config.temperature !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.LLM_TEMPERATURE,
        String(config.temperature),
        'llm',
        userId,
      );
    }
    if (config.maxTokens !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.LLM_MAX_TOKENS,
        String(config.maxTokens),
        'llm',
        userId,
      );
    }
    if (config.timeout !== undefined) {
      await this.setConfigValue(CONFIG_KEYS.LLM_TIMEOUT, String(config.timeout), 'llm', userId);
    }

    return this.getLLMConfig();
  }

  /**
   * Save Embedding configuration
   */
  async saveEmbeddingConfig(
    config: Partial<EmbeddingConfig>,
    userId?: string,
  ): Promise<EmbeddingConfig> {
    if (config.provider !== undefined) {
      await this.setConfigValue(CONFIG_KEYS.EMBEDDING_PROVIDER, config.provider, 'embedding', userId);
    }
    if (config.model !== undefined) {
      await this.setConfigValue(CONFIG_KEYS.EMBEDDING_MODEL, config.model, 'embedding', userId);
    }
    if (config.baseUrl !== undefined) {
      if (config.baseUrl === '') {
        await this.deleteConfigValue(CONFIG_KEYS.EMBEDDING_BASE_URL);
      } else {
        await this.setConfigValue(CONFIG_KEYS.EMBEDDING_BASE_URL, config.baseUrl, 'embedding', userId);
      }
    }
    if (config.apiKey !== undefined) {
      if (config.apiKey === '') {
        await this.deleteConfigValue(CONFIG_KEYS.EMBEDDING_API_KEY);
      } else {
        await this.setConfigValue(CONFIG_KEYS.EMBEDDING_API_KEY, config.apiKey, 'embedding', userId);
      }
    }
    if (config.dimensions !== undefined) {
      await this.setConfigValue(
        CONFIG_KEYS.EMBEDDING_DIMENSIONS,
        String(config.dimensions),
        'embedding',
        userId,
      );
    }

    return this.getEmbeddingConfig();
  }

  /**
   * Test LLM connection
   */
  async testLLMConnection(): Promise<ModelTestResult> {
    const startTime = Date.now();
    try {
      const config = await this.getLLMConfig();

      // Simple validation - in a full implementation, this would make an actual API call
      const hasProvider = !!config.provider;
      const hasModel = !!config.model;
      const hasValidConfig =
        config.provider === 'ollama' || (config.provider === 'openai' && !!config.apiKey);

      const valid = hasProvider && hasModel && hasValidConfig;
      const latency = Date.now() - startTime;

      return {
        success: valid ? true : false,
        message: valid
          ? `Configuration is valid for ${config.provider}/${config.model}`
          : 'Invalid configuration',
        latency,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Test Embedding connection
   */
  async testEmbeddingConnection(): Promise<ModelTestResult> {
    const startTime = Date.now();
    try {
      const embeddingConfig = await this.getEmbeddingConfig();

      // Validate the config
      if (!embeddingConfig.provider || !embeddingConfig.model) {
        return {
          success: false,
          message: 'Invalid embedding configuration',
          latency: Date.now() - startTime,
        };
      }

      // For now, just validate the config is well-formed
      // In a full implementation, this would call RAGService.testConnection()
      return {
        success: true,
        message: 'Embedding model configuration is valid',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Reset LLM config to defaults
   */
  async resetLLMConfig(userId?: string): Promise<LLMConfig> {
    const defaultConfig: LLMConfig = {
      provider: DEFAULT_CONFIG.llmProvider,
      model: DEFAULT_CONFIG.llmModel,
      baseUrl: undefined,
      apiKey: undefined,
      temperature: DEFAULT_CONFIG.llmTemperature,
      maxTokens: DEFAULT_CONFIG.llmMaxTokens,
      timeout: DEFAULT_CONFIG.llmTimeout,
    };

    return this.saveLLMConfig(defaultConfig, userId);
  }

  /**
   * Reset Embedding config to defaults
   */
  async resetEmbeddingConfig(userId?: string): Promise<EmbeddingConfig> {
    const defaultConfig: EmbeddingConfig = {
      provider: DEFAULT_CONFIG.embeddingProvider,
      model: DEFAULT_CONFIG.embeddingModel,
      baseUrl: undefined,
      apiKey: undefined,
      dimensions: DEFAULT_CONFIG.embeddingDimensions,
    };

    return this.saveEmbeddingConfig(defaultConfig, userId);
  }
}
