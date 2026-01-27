import { Test, TestingModule } from '@nestjs/testing';
import { OllamaChatClient, OllamaChatOptions, OllamaChatResponse } from './ollama-chat.client';
import { LlmConfigService } from '../config/llm-config.service';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OllamaChatClient', () => {
  let client: OllamaChatClient;
  let mockConfigService: jest.Mocked<LlmConfigService>;

  beforeEach(async () => {
    mockFetch.mockReset();

    mockConfigService = {
      getActiveConfig: jest.fn().mockReturnValue({
        baseUrl: 'http://localhost:11434/v1',
        apiKey: 'ollama',
        model: 'gemma3:27b',
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 60000,
      }),
      getProviderName: jest.fn().mockReturnValue('ollama'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaChatClient,
        { provide: LlmConfigService, useValue: mockConfigService },
      ],
    }).compile();

    client = module.get<OllamaChatClient>(OllamaChatClient);
  });

  describe('chat', () => {
    const defaultOptions: OllamaChatOptions = {
      systemPrompt: 'You are a helpful assistant.',
      userContent: 'Extract contract info.',
    };

    it('should make a successful request without format parameter', async () => {
      const mockResponse = {
        message: { role: 'assistant', content: '{"contractNumber": "C001"}' },
        prompt_eval_count: 100,
        eval_count: 50,
        model: 'gemma3:27b',
        done: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.chat(defaultOptions);

      expect(result.content).toBe('{"contractNumber": "C001"}');
      expect(result.tokensUsed).toBe(150);
      expect(result.model).toBe('gemma3:27b');

      // Verify fetch was called with correct URL (without /v1 suffix)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Verify request body
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.model).toBe('gemma3:27b');
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.stream).toBe(false);
      expect(requestBody.format).toBeUndefined();
    });

    it('should include format parameter when provided', async () => {
      const jsonSchema = {
        type: 'object',
        properties: {
          contractNumber: { type: 'string' },
        },
        required: ['contractNumber'],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: { content: '{"contractNumber": "C002"}' },
          prompt_eval_count: 80,
          eval_count: 30,
        }),
      });

      await client.chat({
        ...defaultOptions,
        format: jsonSchema,
      });

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.format).toEqual(jsonSchema);
    });

    it('should use custom temperature and maxTokens when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: { content: '{}' },
        }),
      });

      await client.chat({
        ...defaultOptions,
        temperature: 0.5,
        maxTokens: 2000,
      });

      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.options.temperature).toBe(0.5);
      expect(requestBody.options.num_predict).toBe(2000);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(client.chat(defaultOptions)).rejects.toThrow(
        'Ollama API error: 500 Internal Server Error - Server error'
      );
    });

    it('should handle timeout', async () => {
      // Set a short timeout
      mockConfigService.getActiveConfig.mockReturnValue({
        baseUrl: 'http://localhost:11434',
        model: 'gemma3:27b',
        timeout: 100, // 100ms timeout
        temperature: 0.1,
        maxTokens: 4000,
        apiKey: 'ollama',
      });

      // Simulate a slow response that will be aborted
      mockFetch.mockImplementation(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 150);
        })
      );

      await expect(client.chat(defaultOptions)).rejects.toThrow(/timeout|abort/i);
    }, 10000); // Increase Jest timeout

    it('should handle empty response content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: { content: '' },
        }),
      });

      const result = await client.chat(defaultOptions);
      expect(result.content).toBe('');
    });

    it('should normalize base URL correctly', async () => {
      // Test with /v1/ suffix
      mockConfigService.getActiveConfig.mockReturnValue({
        baseUrl: 'http://localhost:11434/v1/',
        model: 'gemma3:27b',
        timeout: 60000,
        temperature: 0.1,
        maxTokens: 4000,
        apiKey: 'ollama',
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: { content: '{}' } }),
      });

      await client.chat(defaultOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.anything()
      );
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return false when connection fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('should return false on non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
});
