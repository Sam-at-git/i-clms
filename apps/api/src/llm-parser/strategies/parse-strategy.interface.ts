import { ExtractTopic } from '../topics/topics.const';

/**
 * Parse Strategy Types
 */
export enum ParseStrategy {
  RULE = 'rule',
  LLM = 'llm',
  DOCLING = 'docling',
  RAG = 'rag',
}

/**
 * Parse Options
 */
export interface ParseOptions {
  strategy?: ParseStrategy | 'multi';
  strategies?: ParseStrategy[];
  topics?: ExtractTopic[];
  enableCache?: boolean;
  filePath?: string;
  ocr?: boolean;
  contractId?: number;
}

/**
 * Parse Result
 */
export interface ParseResult {
  strategy: ParseStrategy;
  fields: Record<string, unknown>;
  completeness: number;
  confidence: number;
  warnings: string[];
  duration: number;
  timestamp: Date;
}

/**
 * Parse Strategy Executor Interface
 *
 * All parse strategies must implement this interface.
 */
export interface ParseStrategyExecutor {
  /**
   * Strategy name
   */
  readonly name: ParseStrategy;

  /**
   * Execute parsing
   */
  parse(content: string, options: ParseOptions): Promise<ParseResult>;

  /**
   * Check if strategy is available
   */
  isAvailable(): boolean;

  /**
   * Get strategy priority (higher = more preferred)
   */
  getPriority(): number;
}
