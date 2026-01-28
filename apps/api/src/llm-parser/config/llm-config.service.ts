import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma';
import {
  LlmConfig,
  LLM_CONFIG_KEYS,
  ENV_VARS,
  PROVIDER_DEFAULTS,
  DEFAULT_LLM_PARAMS,
  normalizeOllamaBaseUrl,
  cleanBaseUrl,
  isEmpty,
  getConfigDescription,
} from '../../llm-config.constants';

// 配置缓存（模块级别，所有请求共享）
let cachedProvider: string | null = null;
let cachedModel: string | null = null;
let cachedBaseUrl: string | null = null;
let cachedApiKey: string | null = null;
let cachedTemperature: number | null = null;
let cachedMaxTokens: number | null = null;
let cachedTimeout: number | null = null;

/**
 * LLM配置服务
 *
 * 配置优先级：
 * 1. 数据库配置（SystemConfig表）- 用户通过UI修改的配置
 * 2. 环境变量 - .env文件中的配置
 * 3. 默认值 - PROVIDER_DEFAULTS中的硬编码默认值
 */
@Injectable()
export class LlmConfigService implements OnModuleInit {
  private readonly logger = new Logger(LlmConfigService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // 模块初始化时加载配置
    await this.loadConfigFromDatabase();
  }

  /**
   * 从数据库加载配置到缓存
   */
  async loadConfigFromDatabase(): Promise<void> {
    this.logger.log(`========== LlmConfigService 加载配置 ==========`);
    try {
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

      // 更新缓存
      cachedProvider = provider;
      cachedModel = model;
      cachedBaseUrl = baseUrl;
      cachedApiKey = apiKey;
      cachedTemperature = temperature ? parseFloat(temperature) : null;
      cachedMaxTokens = maxTokens ? parseInt(maxTokens, 10) : null;
      cachedTimeout = timeout ? parseInt(timeout, 10) : null;

      this.logConfigState('数据库加载完成');
    } catch (error) {
      this.logger.warn(`[LlmConfigService] 数据库读取失败，将使用环境变量`, error);
    }
  }

  /**
   * 刷新配置缓存（供外部调用）
   */
  async refreshCache(): Promise<void> {
    await this.loadConfigFromDatabase();
  }

  /**
   * 获取单个配置值（优先从数据库，回退到环境变量）
   */
  private async getConfigValue(key: string): Promise<string | null> {
    // 先尝试从数据库读取
    try {
      const dbConfig = await this.prisma.systemConfig.findUnique({
        where: { key },
      });

      if (dbConfig?.value && dbConfig.value.trim() !== '') {
        if (key === LLM_CONFIG_KEYS.API_KEY) {
          this.logger.log(`[DB] ${key}="***"`);
        } else {
          this.logger.log(`[DB] ${key}="${dbConfig.value}"`);
        }
        return dbConfig.value;
      }
    } catch (error) {
      // 数据库查询失败，继续使用环境变量
      this.logger.debug(`Database query failed for ${key}, using env vars`);
    }

    // 回退到环境变量
    return this.getEnvValue(key);
  }

  /**
   * 从环境变量获取配置值
   * 根据当前provider选择正确的环境变量
   */
  private getEnvValue(key: string): string | null {
    // 首先获取当前的provider（用于选择正确的环境变量）
    const currentProvider = this.configService.get<string>(ENV_VARS.ACTIVE_LLM_PROVIDER, 'ollama');

    switch (key) {
      case LLM_CONFIG_KEYS.PROVIDER:
        return this.configService.get<string>(ENV_VARS.ACTIVE_LLM_PROVIDER) || 'ollama';

      case LLM_CONFIG_KEYS.MODEL:
        if (currentProvider === 'ollama') {
          return this.getNonEmptyEnvVar(ENV_VARS.OLLAMA_MODEL) || PROVIDER_DEFAULTS.ollama.model;
        } else {
          return this.getNonEmptyEnvVar(ENV_VARS.OPENAI_MODEL) || PROVIDER_DEFAULTS.openai.model;
        }

      case LLM_CONFIG_KEYS.BASE_URL:
        if (currentProvider === 'ollama') {
          // Ollama: 优先 OLLAMA_BASE_URL，回退到通用 LLM_BASE_URL，最后用默认值
          return (
            this.getNonEmptyEnvVar(ENV_VARS.OLLAMA_BASE_URL) ||
            this.getNonEmptyEnvVar(ENV_VARS.LLM_BASE_URL) ||
            ''
          );
        } else {
          // OpenAI: 优先 OPENAI_BASE_URL，回退到通用 LLM_BASE_URL，最后用默认值
          return (
            this.getNonEmptyEnvVar(ENV_VARS.OPENAI_BASE_URL) ||
            this.getNonEmptyEnvVar(ENV_VARS.LLM_BASE_URL) ||
            ''
          );
        }

      case LLM_CONFIG_KEYS.API_KEY:
        return this.getNonEmptyEnvVar(ENV_VARS.OPENAI_API_KEY) || '';

      case LLM_CONFIG_KEYS.TEMPERATURE:
        return String(this.configService.get<number>(ENV_VARS.LLM_TEMPERATURE, DEFAULT_LLM_PARAMS.temperature));

      case LLM_CONFIG_KEYS.MAX_TOKENS:
        return String(this.configService.get<number>(ENV_VARS.LLM_MAX_TOKENS, DEFAULT_LLM_PARAMS.maxTokens));

      case LLM_CONFIG_KEYS.TIMEOUT:
        return String(this.configService.get<number>(ENV_VARS.LLM_TIMEOUT, DEFAULT_LLM_PARAMS.timeout));

      default:
        return null;
    }
  }

  /**
   * 获取环境变量值，过滤空字符串
   * ConfigService.get() 对未设置的变量返回 undefined，对设置为空的变量返回空字符串
   * 我们需要将两者都视为"未设置"
   */
  private getNonEmptyEnvVar(varName: string): string | null {
    const value = this.configService.get<string>(varName);
    return isEmpty(value) ? null : (value ?? null);
  }

  /**
   * 记录当前配置状态（用于调试）
   */
  private logConfigState(source: string): void {
    const provider = this.getProviderName();
    const defaults = PROVIDER_DEFAULTS[provider as keyof typeof PROVIDER_DEFAULTS] || PROVIDER_DEFAULTS.ollama;

    this.logger.log(`========== ${source} ==========`);
    this.logger.log(`Provider: ${provider}`);
    this.logger.log(`Model: ${cachedModel || '(使用默认: ' + defaults.model + ')'}`);
    this.logger.log(`BaseUrl: ${cachedBaseUrl || '(使用默认: ' + defaults.baseUrl + ')'}`);
    this.logger.log(`ApiKey: ${cachedApiKey ? '*** (已设置)' : '(未设置)'}`);
    this.logger.log(`Temperature: ${cachedTemperature ?? DEFAULT_LLM_PARAMS.temperature}`);
    this.logger.log(`MaxTokens: ${cachedMaxTokens ?? DEFAULT_LLM_PARAMS.maxTokens}`);
    this.logger.log(`Timeout: ${cachedTimeout ?? DEFAULT_LLM_PARAMS.timeout}`);
    this.logger.log(`====================================`);
  }

  /**
   * 获取当前活动的LLM配置
   * 这是实际用于调用LLM API的配置
   */
  getActiveConfig(): LlmConfig {
    const provider = this.getProviderName();
    const defaults = PROVIDER_DEFAULTS[provider as keyof typeof PROVIDER_DEFAULTS] || PROVIDER_DEFAULTS.ollama;

    // Model: 使用缓存值或默认值
    const model = !isEmpty(cachedModel) ? cachedModel! : defaults.model;

    // BaseUrl: 使用缓存值或默认值，然后根据provider规范化
    let baseUrl = !isEmpty(cachedBaseUrl) ? cachedBaseUrl! : defaults.baseUrl;

    // 根据provider规范化baseUrl
    if (provider === 'ollama') {
      baseUrl = normalizeOllamaBaseUrl(baseUrl);
    } else {
      baseUrl = cleanBaseUrl(baseUrl);
    }

    // ApiKey: OpenAI需要，Ollama使用固定值
    const apiKey = provider === 'ollama'
      ? 'ollama'
      : (!isEmpty(cachedApiKey) ? cachedApiKey! : defaults.apiKey);

    // 其他参数
    const temperature = cachedTemperature ?? DEFAULT_LLM_PARAMS.temperature;
    const maxTokens = cachedMaxTokens ?? DEFAULT_LLM_PARAMS.maxTokens;
    const timeout = cachedTimeout ?? DEFAULT_LLM_PARAMS.timeout;

    this.logger.debug(`[getActiveConfig] provider=${provider}, model=${model}, baseUrl=${baseUrl}`);

    return {
      baseUrl,
      apiKey,
      model,
      temperature,
      maxTokens,
      timeout,
    };
  }

  /**
   * 获取当前provider名称
   */
  getProviderName(): string {
    // 优先使用缓存的provider，否则使用环境变量，最后使用默认值
    let provider = cachedProvider;
    if (isEmpty(provider)) {
      provider = this.configService.get<string>(ENV_VARS.ACTIVE_LLM_PROVIDER) || 'ollama';
    }
    return provider!;
  }

  /**
   * 获取配置描述（用于UI显示）
   */
  getConfigDescription(key: string): string {
    return getConfigDescription(key);
  }
}
