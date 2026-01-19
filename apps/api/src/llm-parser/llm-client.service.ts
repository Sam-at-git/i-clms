import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface LlmConfig {
  provider: 'openai' | 'ollama';
  model: string;
  baseUrl?: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface LlmCompletionOptions {
  systemPrompt: string;
  userContent: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResult {
  content: string;
  tokensUsed: number;
  model: string;
  provider: string;
}

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);
  private client: OpenAI;
  private config: LlmConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.getLlmConfig();
    this.client = new OpenAI({
      apiKey: this.config.apiKey || 'ollama',
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
    });
    this.logger.log(`LLM Client initialized with provider: ${this.config.provider}`);
  }

  /**
   * Make a completion request to the LLM
   */
  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: options.userContent },
        ],
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        ...(options.jsonMode && { response_format: { type: 'json_object' } }),
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed =
        (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0);

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `LLM completion completed in ${elapsed}ms, tokens used: ${tokensUsed}`,
      );

      return {
        content,
        tokensUsed,
        model: this.config.model,
        provider: this.config.provider,
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM completion failed after ${elapsed}ms: ${message}`);
      throw error;
    }
  }

  /**
   * Simple completion method for backward compatibility
   */
  async completeSimple(systemPrompt: string, userContent: string): Promise<string> {
    const result = await this.complete({ systemPrompt, userContent });
    return result.content;
  }

  /**
   * Get current provider name
   */
  getProvider(): 'openai' | 'ollama' {
    return this.config.provider;
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Check if LLM is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a simple test request
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      this.logger.warn(`LLM availability check failed: ${error}`);
      return false;
    }
  }

  /**
   * Get full LLM configuration
   */
  getConfig(): LlmConfig {
    return { ...this.config };
  }

  private getLlmConfig(): LlmConfig {
    const provider = this.configService.get('ACTIVE_LLM_PROVIDER', 'ollama') as
      | 'openai'
      | 'ollama';

    if (provider === 'openai') {
      return {
        provider: 'openai',
        model: this.configService.get('OPENAI_MODEL', 'gpt-4o'),
        baseUrl: this.configService.get('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        apiKey: this.configService.get('OPENAI_API_KEY'),
        temperature: parseFloat(this.configService.get('LLM_TEMPERATURE', '0.1')),
        maxTokens: parseInt(this.configService.get('LLM_MAX_TOKENS', '4000'), 10),
        timeout: parseInt(this.configService.get('LLM_TIMEOUT', '120000'), 10),
      };
    }

    return {
      provider: 'ollama',
      model: this.configService.get('OLLAMA_MODEL', 'gemma3:27b'),
      baseUrl: this.configService.get('OLLAMA_BASE_URL', 'http://localhost:11434/v1'),
      apiKey: 'ollama', // Ollama doesn't need API key but OpenAI SDK requires it
      temperature: parseFloat(this.configService.get('LLM_TEMPERATURE', '0.1')),
      maxTokens: parseInt(this.configService.get('LLM_MAX_TOKENS', '4000'), 10),
      timeout: parseInt(this.configService.get('LLM_TIMEOUT', '120000'), 10),
    };
  }
}
