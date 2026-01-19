import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmConfigService } from './llm-config.service';

describe('LlmConfigService', () => {
  let service: LlmConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LlmConfigService>(LlmConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveConfig', () => {
    it('should return OpenAI config when provider is openai', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          ACTIVE_LLM_PROVIDER: 'openai',
          OPENAI_API_KEY: 'sk-test-key',
          OPENAI_MODEL: 'gpt-4o',
          OPENAI_BASE_URL: 'https://api.openai.com/v1',
          LLM_TEMPERATURE: 0.1,
          LLM_MAX_TOKENS: 4000,
          LLM_TIMEOUT: 60000,
        };
        return config[key] ?? defaultValue;
      });

      const config = service.getActiveConfig();

      expect(config).toEqual({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 60000,
      });
    });

    it('should return Ollama config when provider is ollama', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          ACTIVE_LLM_PROVIDER: 'ollama',
          OLLAMA_BASE_URL: 'http://localhost:11434/v1',
          OLLAMA_MODEL: 'llama3.1:8b',
          LLM_TEMPERATURE: 0.1,
          LLM_MAX_TOKENS: 4000,
          LLM_TIMEOUT: 60000,
        };
        return config[key] ?? defaultValue;
      });

      const config = service.getActiveConfig();

      expect(config).toEqual({
        baseUrl: 'http://localhost:11434/v1',
        apiKey: 'ollama',
        model: 'llama3.1:8b',
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 60000,
      });
    });

    it('should use default values when env vars are not set', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          ACTIVE_LLM_PROVIDER: 'openai',
        };
        return config[key] ?? defaultValue;
      });

      const config = service.getActiveConfig();

      expect(config).toEqual({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 60000,
      });
    });

    it('should throw error for unsupported provider', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          ACTIVE_LLM_PROVIDER: 'unsupported',
        };
        return config[key] ?? defaultValue;
      });

      expect(() => service.getActiveConfig()).toThrow('Unsupported LLM provider: unsupported');
    });
  });

  describe('getProviderName', () => {
    it('should return provider name from config', () => {
      jest.spyOn(configService, 'get').mockReturnValue('openai');

      const provider = service.getProviderName();

      expect(provider).toBe('openai');
    });

    it('should return default provider when not set', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: any) => defaultValue);

      const provider = service.getProviderName();

      expect(provider).toBe('openai');
    });
  });
});
