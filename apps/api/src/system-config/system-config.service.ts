import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { Client as MinioClient } from 'minio';
import OpenAI from 'openai';
import {
  SystemConfig,
  SystemHealth,
  NotificationResult,
  UpdateSystemConfigInput,
  SendNotificationInput,
  LLMConfig,
  EmbeddingConfig,
  ModelTestResult,
  OCRConfig,
} from './dto';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { RAGService } from '../rag/rag.service';
import { EMBEDDING_MODELS, EmbeddingProvider } from '../rag/dto/embedding-config.dto';
import {
  CONFIG_KEYS,
  LLM_CONFIG_KEYS,
  EMBEDDING_CONFIG_KEYS,
  OCR_CONFIG_KEYS,
  SMTP_CONFIG_KEYS,
  MINIO_CONFIG_KEYS,
  PROVIDER_DEFAULTS,
  DEFAULT_EMBEDDING_CONFIG,
  DEFAULT_OCR_CONFIG,
  DEFAULT_SMTP_MINIO_CONFIG,
  DEFAULT_LLM_PARAMS,
  ENV_VARS,
  normalizeOllamaBaseUrl,
  cleanBaseUrl,
  getConfigDescription,
  isEmpty,
  LlmConfig as RuntimeLlmConfig,
} from '../llm-config.constants';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() private readonly llmConfigService?: LlmConfigService,
    @Optional() private readonly ragService?: RAGService,
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
   * 使用统一的环境变量映射逻辑
   */
  private getEnvValue(key: string): string | null {
    switch (key) {
      // LLM 配置
      case LLM_CONFIG_KEYS.PROVIDER:
        return this.configService.get<string>(ENV_VARS.ACTIVE_LLM_PROVIDER) || 'ollama';

      case LLM_CONFIG_KEYS.MODEL:
        return (
          this.getNonEmptyEnvVar(ENV_VARS.OLLAMA_MODEL) ||
          this.getNonEmptyEnvVar(ENV_VARS.OPENAI_MODEL) ||
          PROVIDER_DEFAULTS.ollama.model
        );

      case LLM_CONFIG_KEYS.BASE_URL:
        return (
          this.getNonEmptyEnvVar(ENV_VARS.OLLAMA_BASE_URL) ||
          this.getNonEmptyEnvVar(ENV_VARS.OPENAI_BASE_URL) ||
          this.getNonEmptyEnvVar(ENV_VARS.LLM_BASE_URL) ||
          ''
        );

      case LLM_CONFIG_KEYS.API_KEY:
        return this.getNonEmptyEnvVar(ENV_VARS.OPENAI_API_KEY) || '';

      case LLM_CONFIG_KEYS.TEMPERATURE:
        return String(this.configService.get<number>(ENV_VARS.LLM_TEMPERATURE, DEFAULT_LLM_PARAMS.temperature));

      case LLM_CONFIG_KEYS.MAX_TOKENS:
        return String(this.configService.get<number>(ENV_VARS.LLM_MAX_TOKENS, DEFAULT_LLM_PARAMS.maxTokens));

      case LLM_CONFIG_KEYS.TIMEOUT:
        return String(this.configService.get<number>(ENV_VARS.LLM_TIMEOUT, DEFAULT_LLM_PARAMS.timeout));

      // SMTP 配置
      case SMTP_CONFIG_KEYS.ENABLED:
        return String(this.configService.get<boolean>(ENV_VARS.SMTP_ENABLED, DEFAULT_SMTP_MINIO_CONFIG.smtpEnabled));
      case SMTP_CONFIG_KEYS.HOST:
        return this.configService.get<string>(ENV_VARS.SMTP_HOST) || '';
      case SMTP_CONFIG_KEYS.PORT:
        return String(this.configService.get<number>(ENV_VARS.SMTP_PORT) || 587);
      case SMTP_CONFIG_KEYS.USER:
        return this.configService.get<string>(ENV_VARS.SMTP_USER) || '';
      case SMTP_CONFIG_KEYS.SECURE:
        return String(this.configService.get<boolean>(ENV_VARS.SMTP_SECURE, DEFAULT_SMTP_MINIO_CONFIG.smtpSecure));

      // MinIO 配置
      case MINIO_CONFIG_KEYS.ENDPOINT:
        return this.configService.get<string>(ENV_VARS.MINIO_ENDPOINT) || DEFAULT_SMTP_MINIO_CONFIG.minioEndpoint;
      case MINIO_CONFIG_KEYS.PORT:
        return String(this.configService.get<number>(ENV_VARS.MINIO_PORT) || DEFAULT_SMTP_MINIO_CONFIG.minioPort);
      case MINIO_CONFIG_KEYS.BUCKET:
        return this.configService.get<string>(ENV_VARS.MINIO_BUCKET) || DEFAULT_SMTP_MINIO_CONFIG.minioBucket;

      // Embedding 配置
      case EMBEDDING_CONFIG_KEYS.PROVIDER:
        return this.configService.get<string>(ENV_VARS.EMBEDDING_PROVIDER) || DEFAULT_EMBEDDING_CONFIG.provider;
      case EMBEDDING_CONFIG_KEYS.MODEL:
        return this.configService.get<string>(ENV_VARS.EMBEDDING_MODEL) || DEFAULT_EMBEDDING_CONFIG.model;
      case EMBEDDING_CONFIG_KEYS.BASE_URL:
        return this.configService.get<string>(ENV_VARS.EMBEDDING_BASE_URL) || DEFAULT_EMBEDDING_CONFIG.baseUrl;
      case EMBEDDING_CONFIG_KEYS.API_KEY:
        return this.configService.get<string>(ENV_VARS.EMBEDDING_API_KEY) || DEFAULT_EMBEDDING_CONFIG.apiKey;
      case EMBEDDING_CONFIG_KEYS.DIMENSIONS:
        return String(this.configService.get<number>(ENV_VARS.EMBEDDING_DIMENSIONS) || DEFAULT_EMBEDDING_CONFIG.dimensions);

      default:
        return null;
    }
  }

  /**
   * 获取环境变量值，过滤空字符串
   */
  private getNonEmptyEnvVar(varName: string): string | null {
    const value = this.configService.get<string>(varName);
    return isEmpty(value) ? null : (value ?? null);
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
    if (key === LLM_CONFIG_KEYS.API_KEY) {
      this.logger.log(`Config saved: ${key}="***" (hidden)`);
    } else if (key === LLM_CONFIG_KEYS.BASE_URL || key === LLM_CONFIG_KEYS.MODEL) {
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
   * 使用统一常量中的描述
   */
  private getConfigDescription(key: string): string {
    return getConfigDescription(key);
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
      this.getConfigValue(LLM_CONFIG_KEYS.PROVIDER),
      this.getConfigValue(LLM_CONFIG_KEYS.MODEL),
      this.getConfigValue(LLM_CONFIG_KEYS.BASE_URL),
      this.getConfigValue(LLM_CONFIG_KEYS.API_KEY),
      this.getConfigValue(LLM_CONFIG_KEYS.TEMPERATURE),
      this.getConfigValue(LLM_CONFIG_KEYS.MAX_TOKENS),
      this.getConfigValue(LLM_CONFIG_KEYS.TIMEOUT),
      this.getConfigValue(SMTP_CONFIG_KEYS.ENABLED),
      this.getConfigValue(SMTP_CONFIG_KEYS.HOST),
      this.getConfigValue(SMTP_CONFIG_KEYS.PORT),
      this.getConfigValue(SMTP_CONFIG_KEYS.USER),
      this.getConfigValue(SMTP_CONFIG_KEYS.SECURE),
      this.getConfigValue(MINIO_CONFIG_KEYS.ENDPOINT),
      this.getConfigValue(MINIO_CONFIG_KEYS.PORT),
      this.getConfigValue(MINIO_CONFIG_KEYS.BUCKET),
    ]);

    return {
      llmProvider: llmProvider || DEFAULT_LLM_PARAMS.provider,
      llmModel: llmModel || PROVIDER_DEFAULTS.ollama.model,
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
      minioEndpoint: minioEndpoint || DEFAULT_SMTP_MINIO_CONFIG.minioEndpoint,
      minioPort: minioPort ? parseInt(minioPort, 10) : DEFAULT_SMTP_MINIO_CONFIG.minioPort,
      minioBucket: minioBucket || DEFAULT_SMTP_MINIO_CONFIG.minioBucket,
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
      await this.setConfigValue(LLM_CONFIG_KEYS.PROVIDER, input.llmProvider, 'llm', userId);
    }
    if (input.llmModel !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.MODEL, input.llmModel, 'llm', userId);
    }
    if (input.llmBaseUrl !== undefined) {
      if (input.llmBaseUrl === '') {
        await this.deleteConfigValue(LLM_CONFIG_KEYS.BASE_URL);
      } else {
        await this.setConfigValue(LLM_CONFIG_KEYS.BASE_URL, input.llmBaseUrl, 'llm', userId);
      }
    }
    if (input.llmApiKey !== undefined) {
      if (input.llmApiKey === '') {
        await this.deleteConfigValue(LLM_CONFIG_KEYS.API_KEY);
      } else {
        await this.setConfigValue(LLM_CONFIG_KEYS.API_KEY, input.llmApiKey, 'llm', userId);
      }
    }
    if (input.llmTemperature !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.TEMPERATURE, String(input.llmTemperature), 'llm', userId);
    }
    if (input.llmMaxTokens !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.MAX_TOKENS, String(input.llmMaxTokens), 'llm', userId);
    }
    if (input.llmTimeout !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.TIMEOUT, String(input.llmTimeout), 'llm', userId);
    }

    // 更新SMTP配置
    if (input.smtpEnabled !== undefined) {
      await this.setConfigValue(SMTP_CONFIG_KEYS.ENABLED, String(input.smtpEnabled), 'smtp', userId);
    }
    if (input.smtpHost !== undefined) {
      await this.setConfigValue(SMTP_CONFIG_KEYS.HOST, input.smtpHost, 'smtp', userId);
    }
    if (input.smtpPort !== undefined) {
      await this.setConfigValue(SMTP_CONFIG_KEYS.PORT, String(input.smtpPort), 'smtp', userId);
    }
    if (input.smtpUser !== undefined) {
      await this.setConfigValue(SMTP_CONFIG_KEYS.USER, input.smtpUser, 'smtp', userId);
    }
    if (input.smtpSecure !== undefined) {
      await this.setConfigValue(SMTP_CONFIG_KEYS.SECURE, String(input.smtpSecure), 'smtp', userId);
    }

    // 更新存储配置
    if (input.minioEndpoint !== undefined) {
      await this.setConfigValue(MINIO_CONFIG_KEYS.ENDPOINT, input.minioEndpoint, 'storage', userId);
    }
    if (input.minioPort !== undefined) {
      await this.setConfigValue(MINIO_CONFIG_KEYS.PORT, String(input.minioPort), 'storage', userId);
    }
    if (input.minioBucket !== undefined) {
      await this.setConfigValue(MINIO_CONFIG_KEYS.BUCKET, input.minioBucket, 'storage', userId);
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
    const smtpEnabled = (await this.getConfigValue(SMTP_CONFIG_KEYS.ENABLED)) === 'true';
    if (!smtpEnabled) {
      return false;
    }

    // GitHub Issue: Implement actual SMTP connection testing with nodemailer
    // Should verify SMTP host, port, authentication, and TLS configuration
    this.logger.warn('SMTP connection test not fully implemented - returning true');
    return true;
  }

  /**
   * 发送通知
   */
  async sendNotification(input: SendNotificationInput): Promise<NotificationResult> {
    this.logger.log(
      `Sending notification to ${input.to}: ${input.subject} (type: ${input.type || 'general'})`,
    );

    // GitHub Issue: Implement actual email sending with nodemailer
    // Should use SMTP configuration from database to send emails
    return {
      success: true,
      message: 'Notification logged (SMTP not configured - backend needs nodemailer integration)',
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
      const endPoint = await this.getConfigValue(MINIO_CONFIG_KEYS.ENDPOINT) || 'localhost';
      const port = parseInt((await this.getConfigValue(MINIO_CONFIG_KEYS.PORT)) || '9000', 10);
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
        this.getConfigValue(LLM_CONFIG_KEYS.PROVIDER),
        this.getConfigValue(LLM_CONFIG_KEYS.MODEL),
        this.getConfigValue(LLM_CONFIG_KEYS.BASE_URL),
        this.getConfigValue(LLM_CONFIG_KEYS.API_KEY),
        this.getConfigValue(LLM_CONFIG_KEYS.TEMPERATURE),
        this.getConfigValue(LLM_CONFIG_KEYS.MAX_TOKENS),
        this.getConfigValue(LLM_CONFIG_KEYS.TIMEOUT),
      ]);

    return {
      provider: provider || DEFAULT_LLM_PARAMS.provider,
      model: model || PROVIDER_DEFAULTS.ollama.model,
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      temperature: temperature ? parseFloat(temperature) : DEFAULT_LLM_PARAMS.temperature,
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : DEFAULT_LLM_PARAMS.maxTokens,
      timeout: timeout ? parseInt(timeout, 10) : DEFAULT_LLM_PARAMS.timeout,
    };
  }

  /**
   * Get Embedding model configuration
   */
  async getEmbeddingConfig(): Promise<EmbeddingConfig> {
    const [provider, model, baseUrl, apiKey, dimensions] = await Promise.all([
      this.getConfigValue(EMBEDDING_CONFIG_KEYS.PROVIDER),
      this.getConfigValue(EMBEDDING_CONFIG_KEYS.MODEL),
      this.getConfigValue(EMBEDDING_CONFIG_KEYS.BASE_URL),
      this.getConfigValue(EMBEDDING_CONFIG_KEYS.API_KEY),
      this.getConfigValue(EMBEDDING_CONFIG_KEYS.DIMENSIONS),
    ]);

    return {
      provider: provider || DEFAULT_EMBEDDING_CONFIG.provider,
      model: model || DEFAULT_EMBEDDING_CONFIG.model,
      baseUrl: baseUrl || DEFAULT_EMBEDDING_CONFIG.baseUrl,
      apiKey: apiKey || undefined,
      dimensions: dimensions ? parseInt(dimensions, 10) : DEFAULT_EMBEDDING_CONFIG.dimensions,
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
      await this.setConfigValue(LLM_CONFIG_KEYS.PROVIDER, config.provider, 'llm', userId);
    }
    if (config.model !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.MODEL, config.model, 'llm', userId);
    }
    if (config.baseUrl !== undefined) {
      if (!config.baseUrl) {
        await this.deleteConfigValue(LLM_CONFIG_KEYS.BASE_URL);
      } else {
        await this.setConfigValue(LLM_CONFIG_KEYS.BASE_URL, config.baseUrl, 'llm', userId);
      }
    }
    if (config.apiKey !== undefined) {
      if (!config.apiKey) {
        await this.deleteConfigValue(LLM_CONFIG_KEYS.API_KEY);
      } else {
        await this.setConfigValue(LLM_CONFIG_KEYS.API_KEY, config.apiKey, 'llm', userId);
      }
    }
    if (config.temperature !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.TEMPERATURE, String(config.temperature), 'llm', userId);
    }
    if (config.maxTokens !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.MAX_TOKENS, String(config.maxTokens), 'llm', userId);
    }
    if (config.timeout !== undefined) {
      await this.setConfigValue(LLM_CONFIG_KEYS.TIMEOUT, String(config.timeout), 'llm', userId);
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
      await this.setConfigValue(EMBEDDING_CONFIG_KEYS.PROVIDER, config.provider, 'embedding', userId);
    }
    if (config.model !== undefined) {
      await this.setConfigValue(EMBEDDING_CONFIG_KEYS.MODEL, config.model, 'embedding', userId);
    }
    if (config.baseUrl !== undefined) {
      if (!config.baseUrl) {
        await this.deleteConfigValue(EMBEDDING_CONFIG_KEYS.BASE_URL);
      } else {
        await this.setConfigValue(EMBEDDING_CONFIG_KEYS.BASE_URL, config.baseUrl, 'embedding', userId);
      }
    }
    if (config.apiKey !== undefined) {
      if (!config.apiKey) {
        await this.deleteConfigValue(EMBEDDING_CONFIG_KEYS.API_KEY);
      } else {
        await this.setConfigValue(EMBEDDING_CONFIG_KEYS.API_KEY, config.apiKey, 'embedding', userId);
      }
    }
    if (config.dimensions !== undefined) {
      await this.setConfigValue(EMBEDDING_CONFIG_KEYS.DIMENSIONS, String(config.dimensions), 'embedding', userId);
    }

    return this.getEmbeddingConfig();
  }

  /**
   * Test LLM connection with a real API call
   * @param overrideConfig - Optional config to test with instead of database config
   */
  async testLLMConnection(overrideConfig?: {
    provider?: string;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
  }): Promise<ModelTestResult> {
    const startTime = Date.now();
    try {
      let activeConfig: RuntimeLlmConfig, providerName: string;

      // Check if we have override config with provider and model (baseUrl may be empty for OpenAI)
      if (overrideConfig && overrideConfig.provider && overrideConfig.model) {
        providerName = overrideConfig.provider;
        const isOpenAI = providerName === 'openai';

        // For OpenAI, apiKey is required
        if (isOpenAI && !overrideConfig.apiKey) {
          return {
            success: false,
            message: 'OpenAI requires an API Key',
            latency: Date.now() - startTime,
          };
        }

        // Use override config for testing (from UI form values)
        activeConfig = {
          baseUrl: overrideConfig.baseUrl || (isOpenAI ? 'https://api.openai.com/v1' : ''),
          model: overrideConfig.model,
          apiKey: overrideConfig.apiKey || (isOpenAI ? '' : 'ollama'),
          temperature: 0.1,
          maxTokens: 100,
          timeout: 30000,
        };
      } else {
        // Get config from database via LlmConfigService
        if (!this.llmConfigService) {
          return {
            success: false,
            message: 'LLM config service not available',
            latency: Date.now() - startTime,
          };
        }
        activeConfig = this.llmConfigService.getActiveConfig();
        providerName = this.llmConfigService.getProviderName();
      }

      // Normalize baseUrl (add /v1 suffix if needed for Ollama)
      let normalizedBaseUrl = activeConfig.baseUrl;
      if (providerName === 'ollama' && normalizedBaseUrl) {
        normalizedBaseUrl = normalizeOllamaBaseUrl(normalizedBaseUrl);
      } else if (normalizedBaseUrl) {
        normalizedBaseUrl = cleanBaseUrl(normalizedBaseUrl);
      }

      this.logger.log(`[testLLMConnection] Testing: provider=${providerName}, model=${activeConfig.model}, baseUrl=${normalizedBaseUrl || '(default)'}, hasApiKey=${!!activeConfig.apiKey}`);

      // Create a test client with the config
      const client = new OpenAI({
        baseURL: normalizedBaseUrl || undefined,
        apiKey: activeConfig.apiKey || 'ollama',
        timeout: Math.min(activeConfig.timeout || 30000, 30000), // Max 30s for test
      });

      // Make a simple test request
      const response = await client.chat.completions.create({
        model: activeConfig.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });

      const latency = Date.now() - startTime;
      const content = response.choices[0]?.message?.content || '';

      return {
        success: true,
        message: `Connected successfully to ${providerName}/${activeConfig.model}. Response: "${content}"`,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[testLLMConnection] Failed: ${message}`);
      return {
        success: false,
        message,
        latency,
      };
    }
  }

  /**
   * Test Embedding connection with a real API call
   * @param overrideConfig - Optional config to test with instead of database config
   */
  async testEmbeddingConnection(overrideConfig?: {
    provider?: string;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
  }): Promise<ModelTestResult> {
    const startTime = Date.now();
    try {
      let embeddingConfig: Partial<EmbeddingConfig>;

      if (overrideConfig && overrideConfig.provider && overrideConfig.model) {
        // Use override config for testing (from UI form values)
        embeddingConfig = {
          provider: overrideConfig.provider as EmbeddingProvider,
          model: overrideConfig.model,
          baseUrl: overrideConfig.baseUrl,
          apiKey: overrideConfig.apiKey,
          dimensions: 768, // Default, not used for test
        };
      } else {
        // Get config from database
        embeddingConfig = await this.getEmbeddingConfig();
      }

      // Validate the config
      if (!embeddingConfig.provider || !embeddingConfig.model) {
        return {
          success: false,
          message: 'Invalid embedding configuration',
          latency: Date.now() - startTime,
        };
      }

      // Use RAGService to test connection if available
      if (this.ragService) {
        // Find the model config from EMBEDDING_MODELS
        const modelKey = Object.keys(EMBEDDING_MODELS).find(
          key => EMBEDDING_MODELS[key].model === embeddingConfig.model,
        );

        if (!modelKey) {
          return {
            success: false,
            message: `Unknown embedding model: ${embeddingConfig.model}`,
            latency: Date.now() - startTime,
          };
        }

        const modelConfig = {
          ...EMBEDDING_MODELS[modelKey],
          provider: embeddingConfig.provider as EmbeddingProvider,
          // Only override baseUrl if it has a value, otherwise use default from EMBEDDING_MODELS
          baseUrl: embeddingConfig.baseUrl || EMBEDDING_MODELS[modelKey].baseUrl,
          apiKey: embeddingConfig.apiKey,
        };

        this.logger.log(`[testEmbeddingConnection] Testing with config: provider=${modelConfig.provider}, model=${modelConfig.model}, baseUrl=${modelConfig.baseUrl}`);

        const connected = await this.ragService.testConnection(modelConfig);

        return {
          success: connected,
          message: connected
            ? `Connected successfully to ${embeddingConfig.provider}/${embeddingConfig.model}`
            : `Failed to connect to ${embeddingConfig.provider}/${embeddingConfig.model}`,
          latency: Date.now() - startTime,
        };
      }

      // Fallback: just validate config structure
      return {
        success: true,
        message: 'Embedding model configuration is valid (RAGService not available for real test)',
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
      provider: 'ollama',
      model: PROVIDER_DEFAULTS.ollama.model,
      baseUrl: undefined,
      apiKey: undefined,
      temperature: DEFAULT_LLM_PARAMS.temperature,
      maxTokens: DEFAULT_LLM_PARAMS.maxTokens,
      timeout: DEFAULT_LLM_PARAMS.timeout,
    };

    return this.saveLLMConfig(defaultConfig, userId);
  }

  /**
   * Reset Embedding config to defaults
   */
  async resetEmbeddingConfig(userId?: string): Promise<EmbeddingConfig> {
    const defaultConfig: EmbeddingConfig = {
      provider: DEFAULT_EMBEDDING_CONFIG.provider,
      model: DEFAULT_EMBEDDING_CONFIG.model,
      baseUrl: undefined,
      apiKey: undefined,
      dimensions: DEFAULT_EMBEDDING_CONFIG.dimensions,
    };

    return this.saveEmbeddingConfig(defaultConfig, userId);
  }

  /**
   * Get OCR configuration
   */
  async getOCRConfig(): Promise<OCRConfig> {
    const engine = await this.getConfigValue(OCR_CONFIG_KEYS.ENGINE);

    return {
      engine: (engine as OCRConfig['engine']) || DEFAULT_OCR_CONFIG.engine,
    };
  }

  /**
   * Save OCR configuration
   */
  async saveOCRConfig(
    config: Partial<OCRConfig>,
    userId?: string,
  ): Promise<OCRConfig> {
    if (config.engine !== undefined) {
      await this.setConfigValue(OCR_CONFIG_KEYS.ENGINE, config.engine, 'ocr', userId);
    }

    return this.getOCRConfig();
  }

  /**
   * Reset OCR config to defaults
   */
  async resetOCRConfig(userId?: string): Promise<OCRConfig> {
    const defaultConfig: OCRConfig = {
      engine: DEFAULT_OCR_CONFIG.engine,
    };

    return this.saveOCRConfig(defaultConfig, userId);
  }

  /**
   * Test Instructor compatibility with current LLM config
   *
   * This tests whether the current OpenAI-compatible API supports
   * the Instructor library for structured output extraction.
   *
   * @param overrideConfig - Optional config to test with instead of database config
   * @returns Test result with success status and message
   */
  async testInstructorSupport(overrideConfig?: {
    provider?: string;
    model?: string;
    baseUrl?: string;
    apiKey?: string;
  }): Promise<ModelTestResult> {
    const startTime = Date.now();

    try {
      // Dynamic import to avoid loading Instructor if not needed
      const { default: Instructor } = await import('@instructor-ai/instructor');
      const { z } = await import('zod');

      let activeConfig: RuntimeLlmConfig, providerName: string;

      if (overrideConfig && overrideConfig.provider && overrideConfig.model) {
        providerName = overrideConfig.provider;
        const isOpenAI = providerName === 'openai';

        activeConfig = {
          baseUrl: overrideConfig.baseUrl || (isOpenAI ? 'https://api.openai.com/v1' : ''),
          model: overrideConfig.model,
          apiKey: overrideConfig.apiKey || (isOpenAI ? '' : 'ollama'),
          temperature: 0.1,
          maxTokens: 100,
          timeout: 30000,
        };
      } else {
        if (!this.llmConfigService) {
          return {
            success: false,
            message: 'LLM config service not available',
            latency: Date.now() - startTime,
          };
        }
        activeConfig = this.llmConfigService.getActiveConfig();
        providerName = this.llmConfigService.getProviderName();
      }

      // Normalize baseUrl
      let normalizedBaseUrl = activeConfig.baseUrl;
      if (providerName === 'ollama' && normalizedBaseUrl) {
        normalizedBaseUrl = normalizeOllamaBaseUrl(normalizedBaseUrl);
      } else if (normalizedBaseUrl) {
        normalizedBaseUrl = cleanBaseUrl(normalizedBaseUrl);
      }

      this.logger.log(
        `[testInstructorSupport] Testing: provider=${providerName}, model=${activeConfig.model}`
      );

      // Create OpenAI client
      const openaiClient = new OpenAI({
        baseURL: normalizedBaseUrl || undefined,
        apiKey: activeConfig.apiKey || 'ollama',
        timeout: 30000,
      });

      // Create Instructor client
      // Use TOOLS mode for OpenAI (more reliable), JSON mode for others
      const mode = providerName === 'openai' ? 'TOOLS' : 'JSON';
      const instructorClient = Instructor({
        client: openaiClient,
        mode,
      });

      // Test Schema
      const TestSchema = z.object({
        name: z.string().describe('提取的名称'),
        value: z.number().describe('提取的数值'),
      });

      // Test extraction
      const result = await instructorClient.chat.completions.create({
        model: activeConfig.model,
        temperature: 0.1,
        max_tokens: 100,
        messages: [
          { role: 'system', content: '请从文本中提取产品名称和价格。' },
          { role: 'user', content: '产品名称是"测试产品"，价格是99元。' },
        ],
        response_model: {
          schema: TestSchema,
          name: 'InstructorTest',
        },
        max_retries: 1,
      });

      const latency = Date.now() - startTime;

      // Validate result
      if (result && typeof result.name === 'string' && typeof result.value === 'number') {
        // Save test result to config
        await this.setConfigValue('llm.instructorSupported', 'true', 'llm');

        return {
          success: true,
          message: `Instructor 兼容性测试通过 (mode: ${mode})。提取结果: name="${result.name}", value=${result.value}`,
          latency,
        };
      } else {
        await this.setConfigValue('llm.instructorSupported', 'false', 'llm');
        return {
          success: false,
          message: '返回结果格式不符合预期',
          latency,
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      // Save test failure to config
      try {
        await this.setConfigValue('llm.instructorSupported', 'false', 'llm');
      } catch {
        // Ignore save errors
      }

      this.logger.error(`[testInstructorSupport] Failed: ${message}`);
      return {
        success: false,
        message: `Instructor 不兼容: ${message}`,
        latency,
      };
    }
  }

  /**
   * Check if Instructor is supported based on previous test result
   *
   * @returns true if Instructor is supported
   */
  async isInstructorSupported(): Promise<boolean> {
    const value = await this.getConfigValue('llm.instructorSupported');
    return value === 'true';
  }
}
