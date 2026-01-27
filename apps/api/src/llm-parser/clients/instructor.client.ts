import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Instructor from '@instructor-ai/instructor';
import OpenAI from 'openai';
import { z } from 'zod';
import { LlmConfigService } from '../config/llm-config.service';

/**
 * Instructor 提取选项
 */
export interface InstructorExtractOptions<T extends z.ZodType> {
  /** Zod Schema 定义 */
  schema: T;
  /** Schema 名称（用于日志和调试） */
  schemaName: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户输入内容 */
  userContent: string;
  /** 最大重试次数（验证失败时自动重试） */
  maxRetries?: number;
  /** 温度参数 */
  temperature?: number;
}

/**
 * Instructor 提取响应
 */
export interface InstructorExtractResponse<T> {
  /** 提取的数据（类型安全） */
  data: T;
  /** 是否成功 */
  success: boolean;
  /** 重试次数 */
  retryCount: number;
}

/**
 * Instructor 模式
 */
type InstructorMode = 'FUNCTIONS' | 'TOOLS' | 'MD_JSON' | 'JSON' | 'JSON_SCHEMA';

/**
 * InstructorClient
 *
 * 封装 @instructor-ai/instructor 库，提供类型安全的 LLM 结构化输出提取。
 *
 * 特性：
 * - 使用 Zod Schema 定义输出结构
 * - 自动验证和重试机制
 * - 编译时 + 运行时类型安全
 * - 支持 OpenAI 和 Ollama provider
 *
 * @see https://js.useinstructor.com/
 */
@Injectable()
export class InstructorClient implements OnModuleInit {
  private readonly logger = new Logger(InstructorClient.name);
  private client: ReturnType<typeof Instructor> | null = null;
  private currentMode: InstructorMode = 'JSON';

  constructor(private readonly configService: LlmConfigService) {}

  async onModuleInit() {
    await this.initClient();
  }

  /**
   * 初始化 Instructor 客户端
   */
  private async initClient(): Promise<void> {
    const config = this.configService.getActiveConfig();
    const provider = this.configService.getProviderName();

    const openaiClient = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey || 'ollama',
      timeout: config.timeout,
      maxRetries: 0, // 让 Instructor 处理重试
    });

    // 根据 provider 选择最佳模式
    // OpenAI: TOOLS 模式（更可靠，支持 function calling）
    // Ollama: JSON 模式（原生 JSON 输出）
    this.currentMode = provider === 'openai' ? 'TOOLS' : 'JSON';

    this.client = Instructor({
      client: openaiClient,
      mode: this.currentMode,
    });

    this.logger.log(
      `[InstructorClient] Initialized with mode: ${this.currentMode}, provider: ${provider}`
    );
  }

  /**
   * 刷新客户端（配置变更时调用）
   */
  async refreshClient(): Promise<void> {
    await this.initClient();
  }

  /**
   * 使用 Zod Schema 提取结构化数据
   *
   * @param options 提取选项
   * @returns 类型安全的提取结果
   *
   * @example
   * ```typescript
   * const result = await client.extract({
   *   schema: BasicInfoZodSchema,
   *   schemaName: 'BASIC_INFO',
   *   systemPrompt: '请提取合同基本信息',
   *   userContent: contractText,
   * });
   * // result.data 是 BasicInfoZod 类型
   * ```
   */
  async extract<T extends z.ZodType>(
    options: InstructorExtractOptions<T>
  ): Promise<InstructorExtractResponse<z.infer<T>>> {
    if (!this.client) {
      await this.initClient();
    }

    const config = this.configService.getActiveConfig();
    const maxRetries = options.maxRetries ?? 3;
    const startTime = Date.now();

    this.logger.debug(
      `[InstructorClient] Extracting ${options.schemaName}, maxRetries: ${maxRetries}`
    );

    try {
      const result = await this.client!.chat.completions.create({
        model: config.model,
        temperature: options.temperature ?? 0.1,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userContent },
        ],
        response_model: {
          schema: options.schema,
          name: options.schemaName,
        },
        max_retries: maxRetries,
      });

      const elapsed = Date.now() - startTime;
      this.logger.debug(
        `[InstructorClient] Extracted ${options.schemaName} in ${elapsed}ms`
      );

      return {
        data: result as z.infer<T>,
        success: true,
        retryCount: 0, // Instructor 不暴露重试计数
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `[InstructorClient] Extraction failed for ${options.schemaName} after ${elapsed}ms: ${errorMessage}`
      );

      throw error;
    }
  }

  /**
   * 安全提取（失败时返回 null 而不是抛出异常）
   *
   * @param options 提取选项
   * @returns 提取结果或 null
   */
  async safeExtract<T extends z.ZodType>(
    options: InstructorExtractOptions<T>
  ): Promise<z.infer<T> | null> {
    try {
      const response = await this.extract(options);
      return response.data;
    } catch (error) {
      this.logger.warn(
        `[InstructorClient] Safe extract failed for ${options.schemaName}, returning null`
      );
      return null;
    }
  }

  /**
   * 测试 Instructor 兼容性
   *
   * 发送一个简单的测试请求，验证当前 LLM 配置是否支持 Instructor。
   *
   * @returns 测试结果
   */
  async testCompatibility(): Promise<{
    success: boolean;
    message: string;
    latency: number;
    mode: string;
  }> {
    const startTime = Date.now();

    // 简单的测试 Schema
    const TestSchema = z.object({
      name: z.string().describe('提取的名称'),
      value: z.number().describe('提取的数值'),
    });

    try {
      const result = await this.extract({
        schema: TestSchema,
        schemaName: 'InstructorCompatibilityTest',
        systemPrompt: '请从文本中提取产品名称和价格。',
        userContent: '产品名称是"测试产品"，价格是99元。',
        maxRetries: 1,
        temperature: 0.1,
      });

      const latency = Date.now() - startTime;

      // 验证结果
      if (
        result.data &&
        typeof result.data.name === 'string' &&
        typeof result.data.value === 'number'
      ) {
        return {
          success: true,
          message: `兼容性测试通过: name="${result.data.name}", value=${result.data.value}`,
          latency,
          mode: this.currentMode,
        };
      } else {
        return {
          success: false,
          message: '返回结果格式不符合预期',
          latency,
          mode: this.currentMode,
        };
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: `Instructor 不兼容: ${message}`,
        latency,
        mode: this.currentMode,
      };
    }
  }

  /**
   * 获取当前使用的模式
   */
  getMode(): InstructorMode {
    return this.currentMode;
  }

  /**
   * 检查客户端是否已初始化
   */
  isInitialized(): boolean {
    return this.client !== null;
  }
}
