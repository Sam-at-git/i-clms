import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LlmConfigService } from './llm-config.service';
import { PrismaService } from '../../prisma';

describe('LlmConfigService', () => {
  let service: LlmConfigService;
  let configService: ConfigService;
  let prismaService: PrismaService;

  // Mock PrismaService
  const mockPrismaService = {
    systemConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  // Mock ConfigService
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // 重置所有 mocks
    jest.clearAllMocks();

    // 默认返回值（使用环境变量）
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      const defaults: Record<string, any> = {
        ACTIVE_LLM_PROVIDER: 'ollama',
        OLLAMA_MODEL: 'gemma3:27b',
        LLM_BASE_URL: '',
        OPENAI_API_KEY: '',
        LLM_TEMPERATURE: 0.1,
        LLM_MAX_TOKENS: 4000,
        LLM_TIMEOUT: 120000,
      };
      return defaults[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LlmConfigService>(LlmConfigService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);

    // 初始化模块（触发 onModuleInit）
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveConfig', () => {
    it('should return OpenAI config when provider is openai', async () => {
      // Mock 数据库返回配置（OpenAI）
      mockPrismaService.systemConfig.findUnique = jest.fn().mockImplementation(({ where }) => {
        const dbConfig: Record<string, any> = {
          'llm.provider': { value: 'openai' },
          'llm.model': { value: 'gpt-4o' },
          'llm.baseUrl': { value: 'https://api.openai.com/v1' },
          'llm.apiKey': { value: 'sk-test-key' },
          'llm.temperature': { value: '0.1' },
          'llm.maxTokens': { value: '4000' },
          'llm.timeout': { value: '60000' },
        };
        return Promise.resolve(dbConfig[where.key]);
      });

      // 刷新缓存以应用数据库配置
      await service.refreshCache();

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

    it('should return Ollama config when provider is ollama', async () => {
      // Mock 数据库返回配置（Ollama）
      mockPrismaService.systemConfig.findUnique = jest.fn().mockImplementation(({ where }) => {
        const dbConfig: Record<string, any> = {
          'llm.provider': { value: 'ollama' },
          'llm.model': { value: 'llama3.1:8b' },
          'llm.baseUrl': { value: 'http://localhost:11434/v1' },
          'llm.apiKey': { value: '' },
          'llm.temperature': { value: '0.1' },
          'llm.maxTokens': { value: '4000' },
          'llm.timeout': { value: '60000' },
        };
        return Promise.resolve(dbConfig[where.key]);
      });

      // 刷新缓存以应用数据库配置
      await service.refreshCache();

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

    it('should use default values when database config is not set', async () => {
      // Mock 数据库返回 null（使用环境变量）
      mockPrismaService.systemConfig.findUnique = jest.fn().mockResolvedValue(null);

      // 设置 ConfigService mock 只返回 provider
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          ACTIVE_LLM_PROVIDER: 'openai',
        };
        return config[key] ?? defaultValue;
      });

      // 刷新缓存以应用新的 mock
      await service.refreshCache();

      const config = service.getActiveConfig();

      // 注意：当数据库没有配置时，环境变量回退总是使用 OLLAMA_MODEL
      // 这是 getEnvValue 的设计，因为它不知道当前的 provider 是什么
      // 所以模型会是 'gemma3:27b'（OLLAMA_MODEL 的默认值）
      // 但对于 OpenAI provider，baseUrl 会使用默认的 'https://api.openai.com/v1'
      expect(config).toEqual({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gemma3:27b', // 来自 OLLAMA_MODEL 默认值
        temperature: 0.1,
        maxTokens: 8000, // DEFAULT_CONFIG.llmMaxTokens (增加以支持typeSpecificDetails提取)
        timeout: 120000, // 来自 LLM_TIMEOUT 默认值
      });
    });

    it('should throw error for unsupported provider', async () => {
      // Mock 数据库返回不支持的 provider
      mockPrismaService.systemConfig.findUnique = jest.fn().mockImplementation(({ where }) => {
        if (where.key === 'llm.provider') {
          return Promise.resolve({ value: 'unsupported' });
        }
        return Promise.resolve(null);
      });

      // 刷新缓存以应用新的 mock
      await service.refreshCache();

      expect(() => service.getActiveConfig()).toThrow('Unsupported LLM provider: unsupported');
    });
  });

  describe('getProviderName', () => {
    it('should return provider name from config', async () => {
      mockPrismaService.systemConfig.findUnique = jest.fn().mockImplementation(({ where }) => {
        if (where.key === 'llm.provider') {
          return Promise.resolve({ value: 'openai' });
        }
        return Promise.resolve(null);
      });

      // 刷新缓存以应用数据库配置
      await service.refreshCache();

      const provider = service.getProviderName();

      expect(provider).toBe('openai');
    });

    it('should return default provider when not set', async () => {
      mockPrismaService.systemConfig.findUnique = jest.fn().mockResolvedValue(null);
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => defaultValue);

      // 刷新缓存以应用新的 mock
      await service.refreshCache();

      const provider = service.getProviderName();

      // 当返回 undefined 时，应使用默认值 'ollama'
      expect(provider).toBe('ollama');
    });
  });

  describe('refreshCache', () => {
    it('should refresh cache from database', async () => {
      // Mock 数据库返回配置
      mockPrismaService.systemConfig.findUnique = jest.fn().mockImplementation(({ where }) => {
        const dbConfig: Record<string, any> = {
          'llm.provider': { value: 'openai' },
          'llm.model': { value: 'gpt-4o' },
          'llm.baseUrl': { value: 'https://api.openai.com/v1' },
          'llm.apiKey': { value: 'sk-db-key' },
          'llm.temperature': { value: '0.2' },
          'llm.maxTokens': { value: '3000' },
          'llm.timeout': { value: '90000' },
        };
        return Promise.resolve(dbConfig[where.key]);
      });

      await service.refreshCache();

      const config = service.getActiveConfig();

      expect(config).toEqual({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-db-key',
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 3000,
        timeout: 90000,
      });
    });

    it('should fall back to env vars when database query fails', async () => {
      // Mock 数据库查询失败
      mockPrismaService.systemConfig.findUnique = jest.fn().mockRejectedValue(new Error('Database error'));

      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          ACTIVE_LLM_PROVIDER: 'openai',
          OPENAI_API_KEY: 'sk-env-key',
          OPENAI_MODEL: 'gpt-4o',
          LLM_TEMPERATURE: 0.1,
          LLM_MAX_TOKENS: 4000,
          LLM_TIMEOUT: 60000,
        };
        return config[key] ?? defaultValue;
      });

      await service.refreshCache();

      const config = service.getActiveConfig();

      expect(config.apiKey).toBe('sk-env-key');
    });
  });
});
