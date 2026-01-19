import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

@Injectable()
export class LlmConfigService {
  constructor(private configService: ConfigService) {}

  getActiveConfig(): LlmConfig {
    const provider = this.configService.get<string>('ACTIVE_LLM_PROVIDER', 'openai');

    if (provider === 'openai') {
      return {
        baseUrl: this.configService.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        apiKey: this.configService.get<string>('OPENAI_API_KEY', ''),
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o'),
        temperature: this.configService.get<number>('LLM_TEMPERATURE', 0.1),
        maxTokens: this.configService.get<number>('LLM_MAX_TOKENS', 4000),
        timeout: this.configService.get<number>('LLM_TIMEOUT', 60000),
      };
    } else if (provider === 'ollama') {
      return {
        baseUrl: this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434/v1'),
        apiKey: 'ollama', // Ollama不需要key，但OpenAI SDK要求
        model: this.configService.get<string>('OLLAMA_MODEL', 'llama3.1:8b'),
        temperature: this.configService.get<number>('LLM_TEMPERATURE', 0.1),
        maxTokens: this.configService.get<number>('LLM_MAX_TOKENS', 4000),
        timeout: this.configService.get<number>('LLM_TIMEOUT', 60000),
      };
    }

    throw new Error(`Unsupported LLM provider: ${provider}`);
  }

  getProviderName(): string {
    return this.configService.get<string>('ACTIVE_LLM_PROVIDER', 'openai');
  }
}
