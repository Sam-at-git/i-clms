import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

// 配置键常量（与 SystemConfigService 中的保持一致）
const CONFIG_KEYS = {
  LLM_PROVIDER: 'llm.provider',
  LLM_MODEL: 'llm.model',
  LLM_BASE_URL: 'llm.baseUrl',
  LLM_API_KEY: 'llm.apiKey',
  LLM_TEMPERATURE: 'llm.temperature',
  LLM_MAX_TOKENS: 'llm.maxTokens',
  LLM_TIMEOUT: 'llm.timeout',
};

// 默认配置值
const DEFAULT_CONFIG = {
  llmProvider: 'ollama',
  llmModel: 'gemma3:27b',
  llmBaseUrl: '',
  llmApiKey: '',
  llmTemperature: 0.1,
  llmMaxTokens: 8000,  // 增加到8000以支持typeSpecificDetails提取
  llmTimeout: 120000,
};

// 缓存配置
let cachedProvider: string | null = null;
let cachedModel: string | null = null;
let cachedBaseUrl: string | null = null;
let cachedApiKey: string | null = null;
let cachedTemperature: number | null = null;
let cachedMaxTokens: number | null = null;
let cachedTimeout: number | null = null;

@Injectable()
export class LlmConfigService implements OnModuleInit {
  private readonly logger = new Logger(LlmConfigService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // 模块初始化时加载配置
    await this.refreshCache();
  }

  /**
   * 从数据库刷新配置缓存
   */
  async refreshCache(): Promise<void> {
    try {
      const newProvider = await this.getConfigValue(CONFIG_KEYS.LLM_PROVIDER);
      const newModel = await this.getConfigValue(CONFIG_KEYS.LLM_MODEL);
      const newBaseUrl = await this.getConfigValue(CONFIG_KEYS.LLM_BASE_URL);
      const newApiKey = await this.getConfigValue(CONFIG_KEYS.LLM_API_KEY);
      const newTemperatureStr = await this.getConfigValue(CONFIG_KEYS.LLM_TEMPERATURE);
      const newMaxTokensStr = await this.getConfigValue(CONFIG_KEYS.LLM_MAX_TOKENS);
      const newTimeoutStr = await this.getConfigValue(CONFIG_KEYS.LLM_TIMEOUT);

      // 更新缓存
      cachedProvider = newProvider;
      cachedModel = newModel;
      cachedBaseUrl = newBaseUrl;
      cachedApiKey = newApiKey;
      cachedTemperature = newTemperatureStr ? parseFloat(newTemperatureStr) : null;
      cachedMaxTokens = newMaxTokensStr ? parseInt(newMaxTokensStr, 10) : null;
      cachedTimeout = newTimeoutStr ? parseInt(newTimeoutStr, 10) : null;

      this.logger.log(`[LlmConfigService] Refreshed config from database: provider="${cachedProvider}", model="${cachedModel}", baseUrl="${cachedBaseUrl}", apiKey="***"`);
    } catch (error) {
      console.warn('[LlmConfigService] Failed to refresh config from database, using defaults', error);
      // 保持原有缓存不变，不清空
    }
  }

  /**
   * 获取单个配置值（优先从数据库读取，回退到环境变量）
   */
  private async getConfigValue(key: string): Promise<string | null> {
    try {
      // 从数据库读取
      const dbConfig = await this.prisma.systemConfig.findUnique({
        where: { key },
      });

      if (dbConfig && dbConfig.value !== undefined && dbConfig.value !== null) {
        // 敏感信息不记录日志
        if (key === CONFIG_KEYS.LLM_API_KEY) {
          this.logger.log(`[LlmConfigService] Found in database: ${key}="***" (hidden)`);
        } else {
          this.logger.log(`[LlmConfigService] Found in database: ${key}="${dbConfig.value}"`);
        }
        return dbConfig.value;
      }
    } catch (error) {
      // 如果数据库查询失败（如表不存在），回退到环境变量
      console.warn(`[LlmConfigService] Failed to read from database, falling back to env: ${key}`, error);
    }

    // 回退到环境变量
    const envValue = this.getEnvValue(key);
    if (envValue && key !== CONFIG_KEYS.LLM_API_KEY) {
      this.logger.log(`[LlmConfigService] Using env value for ${key}: "${envValue}"`);
    }
    return envValue;
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
        return this.configService.get<string>('LLM_BASE_URL') || DEFAULT_CONFIG.llmBaseUrl;
      case CONFIG_KEYS.LLM_API_KEY:
        const key = this.configService.get<string>('OPENAI_API_KEY') || DEFAULT_CONFIG.llmApiKey;
        return key;
      case CONFIG_KEYS.LLM_TEMPERATURE:
        return String(this.configService.get<number>('LLM_TEMPERATURE', DEFAULT_CONFIG.llmTemperature));
      case CONFIG_KEYS.LLM_MAX_TOKENS:
        return String(this.configService.get<number>('LLM_MAX_TOKENS', DEFAULT_CONFIG.llmMaxTokens));
      case CONFIG_KEYS.LLM_TIMEOUT:
        return String(this.configService.get<number>('LLM_TIMEOUT', DEFAULT_CONFIG.llmTimeout));
      default:
        return null;
    }
  }

  getActiveConfig(): LlmConfig {
    // 优先使用缓存的配置（从数据库读取），否则使用环境变量
    const provider = cachedProvider || this.configService.get<string>('ACTIVE_LLM_PROVIDER', DEFAULT_CONFIG.llmProvider);

    // 对于baseUrl，需要特别处理空字符串的情况
    // 如果缓存的值是空字符串，应该使用环境变量或默认值
    const baseUrl = (cachedBaseUrl && cachedBaseUrl.trim() !== '')
      ? cachedBaseUrl
      : (this.configService.get<string>('LLM_BASE_URL') ||
         this.configService.get<string>('OLLAMA_BASE_URL') ||
         DEFAULT_CONFIG.llmBaseUrl);

    const apiKey = cachedApiKey || this.configService.get<string>('OPENAI_API_KEY', DEFAULT_CONFIG.llmApiKey);
    const temperature = cachedTemperature ?? this.configService.get<number>('LLM_TEMPERATURE', DEFAULT_CONFIG.llmTemperature);
    const maxTokens = cachedMaxTokens ?? this.configService.get<number>('LLM_MAX_TOKENS', DEFAULT_CONFIG.llmMaxTokens);
    const timeout = cachedTimeout ?? this.configService.get<number>('LLM_TIMEOUT', DEFAULT_CONFIG.llmTimeout);

    this.logger.log(`[LlmConfigService] getActiveConfig: provider="${provider}", baseUrl="${baseUrl}", apiKey="***", using cached: ${cachedProvider !== null}`);

    // 规范化baseUrl：确保以 /v1 结尾（Ollama需要）
    const normalizeBaseUrl = (url: string): string => {
      if (!url) return url;
      const trimmed = url.trim();
      // 如果已经以 /v1 或 /v1/ 结尾，直接返回
      if (trimmed.endsWith('/v1') || trimmed.endsWith('/v1/')) {
        return trimmed.replace(/\/$/, ''); // 移除尾部斜杠
      }
      // 如果以 / 结尾，添加 v1
      if (trimmed.endsWith('/')) {
        return trimmed + 'v1';
      }
      // 否则添加 /v1
      return trimmed + '/v1';
    };

    if (provider === 'openai') {
      // OpenAI 使用 OPENAI_MODEL 或 gpt-4o 作为默认值
      const model = cachedModel || this.configService.get<string>('OPENAI_MODEL', 'gpt-4o');
      return {
        baseUrl: normalizeBaseUrl(baseUrl || 'https://api.openai.com/v1'),
        apiKey: apiKey || '',
        model: model,
        temperature,
        maxTokens,
        timeout,
      };
    } else if (provider === 'ollama') {
      // Ollama 使用 OLLAMA_MODEL 或 gemma3:27b 作为默认值
      const model = cachedModel || this.configService.get<string>('OLLAMA_MODEL', DEFAULT_CONFIG.llmModel);
      // 确保 Ollama 有有效的 baseUrl（使用默认值如果为空）
      const ollamaBaseUrl = (baseUrl && baseUrl.trim() !== '')
        ? baseUrl
        : this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434/v1');

      return {
        baseUrl: normalizeBaseUrl(ollamaBaseUrl),
        apiKey: 'ollama', // Ollama不需要key，但OpenAI SDK要求
        model: model,
        temperature,
        maxTokens,
        timeout,
      };
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  getProviderName(): string {
    const provider = cachedProvider || this.configService.get<string>('ACTIVE_LLM_PROVIDER', DEFAULT_CONFIG.llmProvider);
    this.logger.log(`[LlmConfigService] getProviderName: returning "${provider}"`);
    return provider;
  }
}
