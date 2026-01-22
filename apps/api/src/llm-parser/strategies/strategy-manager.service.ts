import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ParseStrategyExecutor,
  ParseStrategy,
  ParseOptions,
  ParseResult,
} from './parse-strategy.interface';

/**
 * Strategy Manager Service
 *
 * Manages all parse strategies, handles registration, execution,
 * and provides utilities for working with multiple strategies.
 *
 * @see Spec 25 - Docling Extraction Strategy
 */
@Injectable()
export class StrategyManagerService implements OnModuleInit {
  private readonly logger = new Logger(StrategyManagerService.name);
  private readonly strategies = new Map<ParseStrategy, ParseStrategyExecutor>();

  /**
   * Module initialization - log that strategy manager is ready
   */
  onModuleInit(): void {
    this.logger.log('StrategyManagerService initialized');
  }

  /**
   * Register a strategy
   */
  register(strategy: ParseStrategyExecutor): void {
    if (this.strategies.has(strategy.name)) {
      this.logger.warn(`Strategy ${strategy.name} already registered, overwriting`);
    }
    this.strategies.set(strategy.name, strategy);
    this.logger.log(`Strategy registered: ${strategy.name} (priority: ${strategy.getPriority()})`);
  }

  /**
   * Unregister a strategy
   */
  unregister(name: ParseStrategy): boolean {
    const result = this.strategies.delete(name);
    if (result) {
      this.logger.log(`Strategy unregistered: ${name}`);
    }
    return result;
  }

  /**
   * Get a specific strategy
   */
  getStrategy(name: ParseStrategy): ParseStrategyExecutor | undefined {
    return this.strategies.get(name);
  }

  /**
   * Check if a strategy is registered
   */
  hasStrategy(name: ParseStrategy): boolean {
    return this.strategies.has(name);
  }

  /**
   * Get all registered strategies
   */
  getAllStrategies(): ParseStrategyExecutor[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get available strategies (registered and isAvailable() returns true)
   * Sorted by priority (highest first)
   */
  getAvailableStrategies(): ParseStrategyExecutor[] {
    return Array.from(this.strategies.values())
      .filter((s) => s.isAvailable())
      .sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Get strategy names
   */
  getStrategyNames(): ParseStrategy[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get available strategy names
   */
  getAvailableStrategyNames(): ParseStrategy[] {
    return this.getAvailableStrategies().map((s) => s.name);
  }

  /**
   * Get the best available strategy (highest priority)
   */
  getBestStrategy(): ParseStrategyExecutor | undefined {
    const available = this.getAvailableStrategies();
    return available.length > 0 ? available[0] : undefined;
  }

  /**
   * Get the best available strategy name
   */
  getBestStrategyName(): ParseStrategy | undefined {
    const best = this.getBestStrategy();
    return best?.name;
  }

  /**
   * Execute parse with a specific strategy
   */
  async parseWith(
    strategy: ParseStrategy,
    content: string,
    options: ParseOptions = {},
  ): Promise<ParseResult> {
    const executor = this.strategies.get(strategy);

    if (!executor) {
      throw new Error(`Strategy ${strategy} not registered`);
    }

    if (!executor.isAvailable()) {
      throw new Error(`Strategy ${strategy} is not available`);
    }

    this.logger.debug(`Parsing with strategy: ${strategy}`);
    return executor.parse(content, options);
  }

  /**
   * Execute parse with multiple strategies
   */
  async parseWithMulti(
    strategies: ParseStrategy[],
    content: string,
    options: ParseOptions = {},
  ): Promise<ParseResult[]> {
    const results: ParseResult[] = [];

    for (const strategy of strategies) {
      try {
        const result = await this.parseWith(strategy, content, options);
        results.push(result);
      } catch (error) {
        this.logger.error(`Strategy ${strategy} failed: ${this.errorMessage(error)}`);
        // Continue with other strategies
      }
    }

    return results;
  }

  /**
   * Execute parse with all available strategies
   */
  async parseWithAllAvailable(
    content: string,
    options: ParseOptions = {},
  ): Promise<ParseResult[]> {
    const availableNames = this.getAvailableStrategyNames();
    return this.parseWithMulti(availableNames, content, options);
  }

  /**
   * Get the total number of registered strategies
   */
  getStrategyCount(): number {
    return this.strategies.size;
  }

  /**
   * Get the number of available strategies
   */
  getAvailableStrategyCount(): number {
    return this.getAvailableStrategies().length;
  }

  /**
   * Clear all registered strategies (mainly for testing)
   */
  clearStrategies(): void {
    this.strategies.clear();
    this.logger.log('All strategies cleared');
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
