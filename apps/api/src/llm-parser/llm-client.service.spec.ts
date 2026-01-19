// Mock OpenAI BEFORE any imports
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

// Import after mocks
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmClientService, LlmConfig } from './llm-client.service';

describe('LlmClientService', () => {
  let service: LlmClientService;

  const mockConfigValues: Record<string, string> = {
    ACTIVE_LLM_PROVIDER: 'openai',
    OPENAI_MODEL: 'gpt-4o',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_API_KEY: 'sk-test-key',
    LLM_TEMPERATURE: '0.1',
    LLM_MAX_TOKENS: '4000',
    LLM_TIMEOUT: '120000',
  };

  beforeEach(async () => {
    mockCreate.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return mockConfigValues[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LlmClientService>(LlmClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('OpenAI configuration', () => {
    // TEST-011: OpenAI configuration loading
    it('should load OpenAI configuration correctly', () => {
      const config = service.getConfig();

      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4o');
      expect(config.temperature).toBe(0.1);
      expect(config.maxTokens).toBe(4000);
      expect(config.timeout).toBe(120000);
    });
  });

  describe('Ollama configuration', () => {
    // TEST-012: Ollama configuration loading
    it('should load Ollama configuration when provider is ollama', async () => {
      const ollamaConfig: Record<string, string> = {
        ACTIVE_LLM_PROVIDER: 'ollama',
        OLLAMA_MODEL: 'llama3.1:8b',
        OLLAMA_BASE_URL: 'http://localhost:11434/v1',
        LLM_TEMPERATURE: '0.2',
        LLM_MAX_TOKENS: '2000',
        LLM_TIMEOUT: '60000',
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LlmClientService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                return ollamaConfig[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const ollamaService = module.get<LlmClientService>(LlmClientService);
      const config = ollamaService.getConfig();

      expect(config.provider).toBe('ollama');
      expect(config.model).toBe('llama3.1:8b');
      expect(config.baseUrl).toBe('http://localhost:11434/v1');
      expect(config.apiKey).toBe('ollama');
    });

    // TEST-013: Default configuration
    it('should use default Ollama configuration when no env vars set', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LlmClientService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((_key: string, defaultValue?: string) => defaultValue),
            },
          },
        ],
      }).compile();

      const defaultService = module.get<LlmClientService>(LlmClientService);
      const config = defaultService.getConfig();

      expect(config.provider).toBe('ollama');
      expect(config.model).toBe('gemma3:27b');
      expect(config.baseUrl).toBe('http://localhost:11434/v1');
    });
  });

  describe('complete', () => {
    // TEST-014: Successful completion
    it('should return LLM generated content on successful call', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"result": "success"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      });

      const result = await service.complete({
        systemPrompt: 'You are a helpful assistant',
        userContent: 'Hello',
      });

      expect(result.content).toBe('{"result": "success"}');
      expect(result.tokensUsed).toBe(150);
      expect(result.model).toBe('gpt-4o');
      expect(result.provider).toBe('openai');
    });

    // TEST-015: Timeout handling
    it('should throw error on timeout', async () => {
      mockCreate.mockRejectedValue(new Error('Request timed out'));

      await expect(
        service.complete({
          systemPrompt: 'System prompt',
          userContent: 'User content',
        }),
      ).rejects.toThrow('Request timed out');
    });

    // TEST-016: Empty response handling
    it('should return empty string for empty response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
        },
      });

      const result = await service.complete({
        systemPrompt: 'System prompt',
        userContent: 'User content',
      });

      expect(result.content).toBe('');
    });

    // TEST-017: API error handling
    it('should throw error on API error', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(
        service.complete({
          systemPrompt: 'System prompt',
          userContent: 'User content',
        }),
      ).rejects.toThrow('API rate limit exceeded');
    });

    it('should use JSON mode when specified', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{}' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      await service.complete({
        systemPrompt: 'System',
        userContent: 'Content',
        jsonMode: true,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        }),
      );
    });

    it('should allow custom temperature and maxTokens', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'result' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      await service.complete({
        systemPrompt: 'System',
        userContent: 'Content',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 1000,
        }),
      );
    });
  });

  describe('completeSimple', () => {
    it('should return content string directly', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Hello world' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const result = await service.completeSimple('System prompt', 'User content');

      expect(result).toBe('Hello world');
    });
  });

  describe('getProvider', () => {
    // TEST-018: Provider check
    it('should return current provider name', () => {
      expect(service.getProvider()).toBe('openai');
    });
  });

  describe('getModel', () => {
    it('should return current model name', () => {
      expect(service.getModel()).toBe('gpt-4o');
    });
  });

  describe('isAvailable', () => {
    it('should return true when LLM is available', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Hi' } }],
      });

      const result = await service.isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when LLM is not available', async () => {
      mockCreate.mockRejectedValue(new Error('Connection refused'));

      const result = await service.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of config', () => {
      const config1 = service.getConfig();
      const config2 = service.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });
});
