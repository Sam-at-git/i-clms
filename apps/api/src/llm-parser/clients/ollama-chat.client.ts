import { Injectable, Logger } from '@nestjs/common';
import { LlmConfigService } from '../config/llm-config.service';

/**
 * Ollama Chat 请求选项
 */
export interface OllamaChatOptions {
  /** 系统提示词 */
  systemPrompt: string;
  /** 用户输入内容 */
  userContent: string;
  /** JSON Schema 约束格式 (Ollama 原生 format 参数) */
  format?: object;
  /** 温度参数 (0-1)，默认使用配置值 */
  temperature?: number;
  /** 最大生成 token 数，默认使用配置值 */
  maxTokens?: number;
}

/**
 * Ollama Chat 响应
 */
export interface OllamaChatResponse {
  /** 生成的内容 */
  content: string;
  /** 消耗的 token 数量 (prompt + completion) */
  tokensUsed: number;
  /** 使用的模型名称 */
  model: string;
}

/**
 * Ollama 原生 API 响应格式
 */
interface OllamaApiResponse {
  message?: {
    role: string;
    content: string;
  };
  prompt_eval_count?: number;
  eval_count?: number;
  model?: string;
  done?: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

/**
 * OllamaChatClient
 *
 * 原生 Ollama API 客户端，支持 `format` 参数进行结构化输出约束。
 *
 * 与 OpenAI SDK 兼容端点 (/v1) 不同，此客户端直接使用 Ollama 原生 API (/api/chat)，
 * 支持 `format` 参数传递 JSON Schema，在 token 生成时即约束输出格式。
 *
 * @see https://ollama.com/blog/structured-outputs
 * @see https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion
 */
@Injectable()
export class OllamaChatClient {
  private readonly logger = new Logger(OllamaChatClient.name);

  constructor(private readonly configService: LlmConfigService) {}

  /**
   * 发送聊天请求到 Ollama 原生 API
   *
   * @param options 聊天选项
   * @returns 聊天响应
   * @throws Error 当 API 调用失败或超时时
   */
  async chat(options: OllamaChatOptions): Promise<OllamaChatResponse> {
    const config = this.configService.getActiveConfig();

    // 移除 /v1 后缀，使用原生 Ollama API
    const baseUrl = this.normalizeBaseUrl(config.baseUrl);
    const endpoint = `${baseUrl}/api/chat`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    const startTime = Date.now();
    const hasFormat = !!options.format;

    // ========== Ollama Format 调用开始 ==========
    this.logger.log(
      `[OllamaChatClient] ========== 调用开始 ==========`
    );
    this.logger.log(
      `[OllamaChatClient] 端点: ${endpoint}`
    );
    this.logger.log(
      `[OllamaChatClient] 模型: ${config.model}`
    );
    this.logger.log(
      `[OllamaChatClient] 使用 format 参数: ${hasFormat ? '✓ 是' : '✗ 否'}`
    );

    if (hasFormat) {
      // 打印 format schema 的结构概览
      const formatObj = options.format as { type: string; properties?: Record<string, unknown> };
      const propertyCount = formatObj.properties ? Object.keys(formatObj.properties).length : 0;
      this.logger.log(
        `[OllamaChatClient] Format Schema: type="${formatObj.type}", properties=${propertyCount}`
      );

      // 打印完整的 format schema (便于调试)
      this.logger.debug(
        `[OllamaChatClient] Format Schema: ${JSON.stringify(options.format, null, 2)}`
      );

      // 统计 schema 中的字段信息
      if (formatObj.properties) {
        const fieldInfo = Object.entries(formatObj.properties).map(([name, def]: [string, unknown]) => {
          const defObj = def as { type?: string | string[]; description?: string };
          const type = Array.isArray(defObj.type) ? defObj.type.join('|') : defObj.type;
          const desc = defObj.description ? `"${defObj.description}"` : '';
          return `  - ${name}: ${type} ${desc}`;
        }).join('\n');
        this.logger.debug(
          `[OllamaChatClient] Format 字段详情:\n${fieldInfo}`
        );
      }
    }

    this.logger.log(
      `[OllamaChatClient] 输入长度: system=${options.systemPrompt.length} chars, user=${options.userContent.length} chars`
    );

    try {
      // 构建请求体
      const requestBody: Record<string, unknown> = {
        model: config.model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userContent },
        ],
        options: {
          temperature: options.temperature ?? config.temperature,
          num_predict: options.maxTokens ?? config.maxTokens,
        },
        stream: false,
      };

      // 关键：添加 format 参数实现结构化输出
      if (options.format) {
        requestBody.format = options.format;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(
          `[OllamaChatClient] ========== 调用失败 ==========`
        );
        this.logger.error(
          `[OllamaChatClient] HTTP ${response.status}: ${errorText}`
        );
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data: OllamaApiResponse = await response.json();

      const content = data.message?.content || '';
      const tokensUsed = (data.prompt_eval_count || 0) + (data.eval_count || 0);
      const elapsed = Date.now() - startTime;

      // ========== Ollama Format 调用成功 ==========
      this.logger.log(
        `[OllamaChatClient] ========== 调用成功 ==========`
      );
      this.logger.log(
        `[OllamaChatClient] 耗时: ${elapsed}ms`
      );
      this.logger.log(
        `[OllamaChatClient] Token 使用: prompt=${data.prompt_eval_count}, completion=${data.eval_count}, total=${tokensUsed}`
      );
      this.logger.log(
        `[OllamaChatClient] 响应长度: ${content.length} chars`
      );

      // 如果使用了 format，验证响应是否为有效 JSON
      if (hasFormat) {
        try {
          JSON.parse(content);
          this.logger.log(
            `[OllamaChatClient] Format 验证: ✓ JSON 格式正确`
          );
        } catch (e) {
          this.logger.warn(
            `[OllamaChatClient] Format 验证: ✗ JSON 格式错误 - ${(e as Error).message}`
          );
        }
      }

      // 打印性能指标
      if (data.total_duration) {
        this.logger.debug(
          `[OllamaChatClient] 总耗时: ${Math.round(data.total_duration / 1_000_000)}ms`
        );
      }
      if (data.load_duration) {
        this.logger.debug(
          `[OllamaChatClient] 模型加载: ${Math.round(data.load_duration / 1_000_000)}ms`
        );
      }
      if (data.prompt_eval_duration) {
        this.logger.debug(
          `[OllamaChatClient] Prompt 计算: ${Math.round(data.prompt_eval_duration / 1_000_000)}ms`
        );
      }
      if (data.eval_duration) {
        this.logger.debug(
          `[OllamaChatClient] Completion 计算: ${Math.round(data.eval_duration / 1_000_000)}ms`
        );
      }

      return {
        content,
        tokensUsed,
        model: data.model || config.model,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(
          `[OllamaChatClient] ========== 调用超时 ==========`
        );
        this.logger.error(
          `[OllamaChatClient] 超时时间: ${config.timeout}ms, 实际耗时: ${elapsed}ms`
        );
        throw new Error(`Ollama API timeout after ${config.timeout}ms`);
      }

      this.logger.error(
        `[OllamaChatClient] ========== 调用异常 ==========`
      );
      this.logger.error(
        `[OllamaChatClient] 耗时: ${elapsed}ms`
      );
      this.logger.error(
        `[OllamaChatClient] 错误: ${error instanceof Error ? error.message : String(error)}`
      );

      throw error;
    }
  }

  /**
   * 规范化 Base URL，移除 /v1 后缀
   *
   * OpenAI SDK 兼容端点使用 /v1 后缀，但原生 Ollama API 不需要。
   * 例如: http://localhost:11434/v1 -> http://localhost:11434
   */
  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/v1\/?$/, '').replace(/\/$/, '');
  }

  /**
   * 测试连接是否正常
   *
   * @returns true 如果连接正常
   */
  async testConnection(): Promise<boolean> {
    try {
      const config = this.configService.getActiveConfig();
      const baseUrl = this.normalizeBaseUrl(config.baseUrl);

      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
