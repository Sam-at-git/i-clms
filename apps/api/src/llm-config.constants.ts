/**
 * LLM Configuration Constants
 * Centralized configuration keys and default values for LLM services
 * Used by both LlmConfigService and SystemConfigService
 */

// Configuration key constants (stored in database SystemConfig table)
export const LLM_CONFIG_KEYS = {
  PROVIDER: 'llm.provider',
  MODEL: 'llm.model',
  BASE_URL: 'llm.baseUrl',
  API_KEY: 'llm.apiKey',
  TEMPERATURE: 'llm.temperature',
  MAX_TOKENS: 'llm.maxTokens',
  TIMEOUT: 'llm.timeout',
} as const;

// Embedding configuration keys
export const EMBEDDING_CONFIG_KEYS = {
  PROVIDER: 'embedding.provider',
  MODEL: 'embedding.model',
  BASE_URL: 'embedding.baseUrl',
  API_KEY: 'embedding.apiKey',
  DIMENSIONS: 'embedding.dimensions',
} as const;

// OCR configuration keys
export const OCR_CONFIG_KEYS = {
  ENGINE: 'ocr.engine',
} as const;

// SMTP configuration keys
export const SMTP_CONFIG_KEYS = {
  ENABLED: 'smtp.enabled',
  HOST: 'smtp.host',
  PORT: 'smtp.port',
  USER: 'smtp.user',
  SECURE: 'smtp.secure',
} as const;

// MinIO configuration keys
export const MINIO_CONFIG_KEYS = {
  ENDPOINT: 'minio.endpoint',
  PORT: 'minio.port',
  BUCKET: 'minio.bucket',
} as const;

// All config keys combined
export const CONFIG_KEYS = {
  ...LLM_CONFIG_KEYS,
  ...EMBEDDING_CONFIG_KEYS,
  ...OCR_CONFIG_KEYS,
  ...SMTP_CONFIG_KEYS,
  ...MINIO_CONFIG_KEYS,
} as const;

/**
 * Provider-specific default configurations
 * These are the fallback values when no configuration is provided
 */
export const PROVIDER_DEFAULTS = {
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'gemma3:27b',
    apiKey: 'ollama', // Ollama doesn't need a key, but OpenAI SDK requires one
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    apiKey: '', // Must be provided by user
  },
} as const;

// Default values for numeric/string parameters
export const DEFAULT_LLM_PARAMS = {
  provider: 'ollama',
  temperature: 0.1,
  maxTokens: 8000,
  timeout: 120000,
} as const;

// Default Embedding configuration values
export const DEFAULT_EMBEDDING_CONFIG = {
  provider: 'ollama',
  model: 'nomic-embed-text',
  baseUrl: 'http://localhost:11434', // Note: embedding uses /api/embed, not /v1
  apiKey: '',
  dimensions: 768,
} as const;

// Default OCR configuration values
export const DEFAULT_OCR_CONFIG = {
  engine: 'rapidocr' as const,
} as const;

// Default SMTP/MinIO configuration
export const DEFAULT_SMTP_MINIO_CONFIG = {
  smtpEnabled: false,
  smtpSecure: false,
  minioEndpoint: 'localhost',
  minioPort: 9000,
  minioBucket: 'contracts',
} as const;

/**
 * Environment variable names
 *
 * IMPORTANT: For Ollama, the user should set:
 *   ACTIVE_LLM_PROVIDER=ollama
 *   OLLAMA_BASE_URL=http://localhost:11434 (without /v1, we'll add it)
 *
 * For OpenAI:
 *   ACTIVE_LLM_PROVIDER=openai
 *   OPENAI_API_KEY=sk-xxx
 *   OPENAI_BASE_URL=https://api.openai.com (optional, has default)
 */
export const ENV_VARS = {
  // LLM Provider selection
  ACTIVE_LLM_PROVIDER: 'ACTIVE_LLM_PROVIDER',

  // Ollama configuration
  OLLAMA_BASE_URL: 'OLLAMA_BASE_URL',
  OLLAMA_MODEL: 'OLLAMA_MODEL',

  // OpenAI configuration
  OPENAI_BASE_URL: 'OPENAI_BASE_URL',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_MODEL: 'OPENAI_MODEL',

  // Legacy/Generic (kept for backward compatibility)
  LLM_BASE_URL: 'LLM_BASE_URL',
  LLM_TEMPERATURE: 'LLM_TEMPERATURE',
  LLM_MAX_TOKENS: 'LLM_MAX_TOKENS',
  LLM_TIMEOUT: 'LLM_TIMEOUT',

  // Embedding
  EMBEDDING_PROVIDER: 'EMBEDDING_PROVIDER',
  EMBEDDING_MODEL: 'EMBEDDING_MODEL',
  EMBEDDING_BASE_URL: 'EMBEDDING_BASE_URL',
  EMBEDDING_API_KEY: 'EMBEDDING_API_KEY',
  EMBEDDING_DIMENSIONS: 'EMBEDDING_DIMENSIONS',

  // OCR
  OCR_ENGINE: 'OCR_ENGINE',

  // SMTP
  SMTP_ENABLED: 'SMTP_ENABLED',
  SMTP_HOST: 'SMTP_HOST',
  SMTP_PORT: 'SMTP_PORT',
  SMTP_USER: 'SMTP_USER',
  SMTP_SECURE: 'SMTP_SECURE',

  // MinIO
  MINIO_ENDPOINT: 'MINIO_ENDPOINT',
  MINIO_PORT: 'MINIO_PORT',
  MINIO_BUCKET: 'MINIO_BUCKET',
} as const;

// LlmConfig interface for runtime use
export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

/**
 * Normalize Ollama baseUrl to ensure it ends with /v1
 * Ollama's OpenAI-compatible endpoint requires /v1 suffix
 *
 * @example
 * normalizeOllamaBaseUrl('http://localhost:11434') // 'http://localhost:11434/v1'
 * normalizeOllamaBaseUrl('http://localhost:11434/') // 'http://localhost:11434/v1'
 * normalizeOllamaBaseUrl('http://localhost:11434/v1') // 'http://localhost:11434/v1'
 */
export function normalizeOllamaBaseUrl(url: string): string {
  if (!url || url.trim() === '') return url;
  const trimmed = url.trim();

  // If already ends with /v1, just remove trailing slash
  if (trimmed.endsWith('/v1') || trimmed.endsWith('/v1/')) {
    return trimmed.replace(/\/$/, '');
  }
  // If ends with /, add v1
  if (trimmed.endsWith('/')) {
    return trimmed + 'v1';
  }
  // Otherwise add /v1
  return trimmed + '/v1';
}

/**
 * Clean baseUrl by removing trailing slashes
 * For OpenAI-compatible APIs where we don't want to modify the path
 */
export function cleanBaseUrl(url: string): string {
  if (!url || url.trim() === '') return url;
  return url.trim().replace(/\/+$/, '');
}

/**
 * Check if a value is empty (undefined, null, or empty string)
 */
export function isEmpty(value: string | null | undefined): boolean {
  return value === undefined || value === null || value.trim() === '';
}

/**
 * Get the config description for a given key
 */
export function getConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    [LLM_CONFIG_KEYS.PROVIDER]: 'LLM服务提供商 (openai/ollama)',
    [LLM_CONFIG_KEYS.MODEL]: 'LLM模型名称',
    [LLM_CONFIG_KEYS.BASE_URL]: 'LLM API Base URL',
    [LLM_CONFIG_KEYS.API_KEY]: 'LLM API Key (密钥)',
    [LLM_CONFIG_KEYS.TEMPERATURE]: 'LLM Temperature参数',
    [LLM_CONFIG_KEYS.MAX_TOKENS]: 'LLM Max Tokens参数',
    [LLM_CONFIG_KEYS.TIMEOUT]: 'LLM 请求超时时间(毫秒)',
    [EMBEDDING_CONFIG_KEYS.PROVIDER]: 'Embedding服务提供商 (openai/ollama)',
    [EMBEDDING_CONFIG_KEYS.MODEL]: 'Embedding模型名称',
    [EMBEDDING_CONFIG_KEYS.BASE_URL]: 'Embedding API Base URL',
    [EMBEDDING_CONFIG_KEYS.API_KEY]: 'Embedding API Key (密钥)',
    [EMBEDDING_CONFIG_KEYS.DIMENSIONS]: 'Embedding向量维度',
    [OCR_CONFIG_KEYS.ENGINE]: 'OCR引擎 (rapidocr/easyocr/tesseract)',
    [SMTP_CONFIG_KEYS.ENABLED]: '是否启用SMTP邮件服务',
    [SMTP_CONFIG_KEYS.HOST]: 'SMTP服务器地址',
    [SMTP_CONFIG_KEYS.PORT]: 'SMTP服务器端口',
    [SMTP_CONFIG_KEYS.USER]: 'SMTP用户名',
    [SMTP_CONFIG_KEYS.SECURE]: '是否使用SSL/TLS',
    [MINIO_CONFIG_KEYS.ENDPOINT]: 'MinIO服务地址',
    [MINIO_CONFIG_KEYS.PORT]: 'MinIO服务端口',
    [MINIO_CONFIG_KEYS.BUCKET]: 'MinIO存储桶名称',
  };
  return descriptions[key] || '';
}
