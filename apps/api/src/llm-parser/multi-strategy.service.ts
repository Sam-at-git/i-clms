import { Injectable, Logger } from '@nestjs/common';
import { DoclingStrategyService } from './strategies/docling-strategy.service';
import { VotingService } from './voting.service';
import { LLMEvaluatorService } from './evaluation/llm-evaluator.service';
import {
  VoteConfig,
  DEFAULT_VOTE_CONFIG,
  MultiStrategyParseResult,
  VotingStrategyResult,
  ResolveConflictsInput,
} from './dto/voting.dto';
import { ParseStrategyType } from './dto/parse-strategy.dto';

/**
 * Multi-Strategy Service
 *
 * Coordinates multiple parsing strategies and implements voting mechanism.
 * Provides conflict detection and resolution for multi-strategy parsing results.
 *
 * @see Spec 29 - Multi-Strategy Comparison and Voting Mechanism
 */
@Injectable()
export class MultiStrategyService {
  private readonly logger = new Logger(MultiStrategyService.name);

  // Store running parse sessions
  private readonly parseSessions = new Map<string, MultiStrategyParseResult>();

  constructor(
    private readonly doclingStrategy: DoclingStrategyService,
    private readonly voting: VotingService,
    private readonly llmEvaluator: LLMEvaluatorService,
  ) {}

  /**
   * Parse with multiple strategies and vote on results
   */
  async parseWithMulti(
    content: string,
    filePath?: string,
    strategies: ParseStrategyType[] = [
      ParseStrategyType.RULE,
      ParseStrategyType.LLM,
    ],
    options: {
      extractTopics?: string[];
      enableOcr?: boolean;
    } = {},
    voteConfig?: Partial<VoteConfig>,
  ): Promise<MultiStrategyParseResult> {
    const sessionId = `multi-${Date.now()}`;
    const startTime = Date.now();
    const warnings: string[] = [];

    this.logger.log(
      `Parsing with ${strategies.length} strategies: ${strategies.join(', ')}`
    );

    // Execute all available strategies in parallel
    const strategyPromises = strategies.map(strategy =>
      this.executeStrategy(strategy, content, filePath, options)
    );

    const results = await Promise.allSettled(strategyPromises);

    // Collect successful results
    const successResults: VotingStrategyResult[] = [];
    const failedStrategies: Array<{ strategy: string; error: string }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successResults.push(result.value);
      } else {
        failedStrategies.push({
          strategy: strategies[index],
          error: result.status === 'rejected'
            ? (result.reason as Error)?.message || 'Unknown error'
            : 'No result returned',
        });
      }
    });

    if (failedStrategies.length > 0) {
      warnings.push(
        `Failed strategies: ${failedStrategies.map(f => `${f.strategy}(${f.error})`).join(', ')}`
      );
    }

    if (successResults.length === 0) {
      throw new Error('All strategies failed');
    }

    // Execute voting
    const voteResults = await this.voting.vote(successResults, {
      ...DEFAULT_VOTE_CONFIG,
      ...voteConfig,
    } as VoteConfig);

    // Get conflict fields
    const conflicts = this.voting.getConflicts(voteResults);

    if (conflicts.length > 0) {
      warnings.push(
        `${conflicts.length} fields have conflicts: ${conflicts.join(', ')}`
      );
    }

    // Merge final fields
    const finalFields: Record<string, any> = {};
    for (const voteResult of voteResults) {
      if (voteResult.agreedValue !== null) {
        finalFields[voteResult.fieldName] = voteResult.agreedValue;
      }
    }

    // Calculate overall confidence
    const overallConfidence = this.voting.calculateOverallConfidence(voteResults);

    const multiResult: MultiStrategyParseResult = {
      results: successResults,
      finalFields,
      voteResults,
      overallConfidence,
      conflicts,
      warnings,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    // Store session for later conflict resolution
    this.parseSessions.set(sessionId, multiResult);

    this.logger.log(
      `Multi-strategy parsing completed: ${successResults.length} strategies succeeded, ` +
      `${conflicts.length} conflicts, overall confidence: ${(overallConfidence * 100).toFixed(1)}%`
    );

    return multiResult;
  }

  /**
   * Resolve conflicts in a parse result
   */
  async resolveConflicts(
    sessionId: string,
    documentText: string,
    input: ResolveConflictsInput,
  ): Promise<MultiStrategyParseResult> {
    const existingResult = this.parseSessions.get(sessionId);
    if (!existingResult) {
      throw new Error(`Parse result session not found: ${sessionId}`);
    }

    const conflicts = existingResult.voteResults.filter(r =>
      input.fields.includes(r.fieldName) && r.needsResolution
    );

    if (conflicts.length === 0) {
      this.logger.log('No conflicts to resolve');
      return existingResult;
    }

    this.logger.log(
      `Resolving ${conflicts.length} conflicts using ${input.method} method`
    );

    // Resolve based on method
    if (input.method === 'llm') {
      // Use LLM to resolve conflicts
      for (const conflict of conflicts) {
        const values = conflict.votes.map(v => v.value);
        const resolution = await this.llmEvaluator.evaluateConflict(
          documentText,
          conflict.fieldName,
          values
        );

        if (resolution && resolution.value !== null) {
          // Update the vote result
          conflict.agreedValue = resolution.value;
          conflict.confidence = resolution.confidence;
          conflict.resolutionMethod = 'llm';
          conflict.needsResolution = false;

          // Update final fields
          existingResult.finalFields[conflict.fieldName] = resolution.value;

          this.logger.log(
            `Resolved conflict for ${conflict.fieldName} with LLM: ` +
            `${JSON.stringify(resolution.value)}`
          );
        }
      }

      // Update conflicts list
      const remainingConflicts = this.voting.getConflicts(existingResult.voteResults);
      existingResult.conflicts = remainingConflicts;
      existingResult.overallConfidence = this.voting.calculateOverallConfidence(
        existingResult.voteResults
      );

      // Update session
      this.parseSessions.set(sessionId, existingResult);

    } else if (input.method === 'user') {
      // Apply user choices
      if (input.userChoices) {
        for (const [fieldName, value] of Object.entries(input.userChoices)) {
          const voteResult = existingResult.voteResults.find(
            r => r.fieldName === fieldName
          );

          if (voteResult) {
            voteResult.agreedValue = value;
            voteResult.confidence = 1.0;
            voteResult.resolutionMethod = 'user';
            voteResult.needsResolution = false;

            existingResult.finalFields[fieldName] = value;
          }
        }

        // Update conflicts list
        const remainingConflicts = this.voting.getConflicts(existingResult.voteResults);
        existingResult.conflicts = remainingConflicts;
        existingResult.overallConfidence = this.voting.calculateOverallConfidence(
          existingResult.voteResults
        );

        this.parseSessions.set(sessionId, existingResult);
      }
    }

    return existingResult;
  }

  /**
   * Get stored parse result by session ID
   */
  getParseResult(sessionId: string): MultiStrategyParseResult | undefined {
    return this.parseSessions.get(sessionId);
  }

  /**
   * Execute a single parsing strategy
   */
  private async executeStrategy(
    strategy: ParseStrategyType,
    content: string,
    filePath: string | undefined,
    options: any,
  ): Promise<VotingStrategyResult> {
    const startTime = Date.now();

    try {
      let fields: Record<string, any> = {};

      switch (strategy) {
        case ParseStrategyType.DOCLING:
          if (filePath) {
            const doclingResult = await this.doclingStrategy.parseWithDocling(
              filePath,
              options
            );
            if (doclingResult.success && doclingResult.fields) {
              fields = doclingResult.fields;
            } else {
              throw new Error(doclingResult.error || 'Docling parsing failed');
            }
          } else {
            throw new Error('File path required for Docling strategy');
          }
          break;

        case ParseStrategyType.LLM:
          // LLM parsing would be handled by LlmParserService
          // For now, return a placeholder
          throw new Error('LLM strategy should use LlmParserService directly');

        case ParseStrategyType.RULE:
          // Rule-based parsing would be handled by FieldExtractor
          // For now, return a placeholder
          throw new Error('RULE strategy should use ParserService directly');

        case ParseStrategyType.RAG:
          // RAG parsing would be handled by RAGService
          // For now, return a placeholder
          throw new Error('RAG strategy should use RAGService directly');

        case ParseStrategyType.MULTI:
          throw new Error('MULTI strategy cannot be executed directly');

        default:
          throw new Error(`Unknown strategy: ${strategy}`);
      }

      return {
        strategy,
        success: true,
        fields,
        confidence: 0.8, // Placeholder confidence
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Strategy ${strategy} failed: ${message}`);

      return {
        strategy,
        success: false,
        fields: {},
        error: message,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Compare results from two parse sessions
   */
  async compareSessions(
    sessionId1: string,
    sessionId2: string,
  ): Promise<{
    similarity: number;
    fieldDifferences: Array<{
      field: string;
      value1: any;
      value2: any;
    }>;
    agreementCount: number;
    disagreementCount: number;
  }> {
    const result1 = this.parseSessions.get(sessionId1);
    const result2 = this.parseSessions.get(sessionId2);

    if (!result1 || !result2) {
      throw new Error('One or both parse sessions not found');
    }

    const fields1 = result1.finalFields;
    const fields2 = result2.finalFields;

    // Get all unique fields
    const allFields = new Set([
      ...Object.keys(fields1),
      ...Object.keys(fields2),
    ]);

    const fieldDifferences: Array<{
      field: string;
      value1: any;
      value2: any;
    }> = [];
    let agreementCount = 0;
    let disagreementCount = 0;

    for (const field of allFields) {
      const value1 = fields1[field];
      const value2 = fields2[field];

      const comparison = this.voting.compareValues(value1, value2);

      if (comparison.isSame) {
        agreementCount++;
      } else {
        disagreementCount++;
        fieldDifferences.push({
          field,
          value1,
          value2,
        });
      }
    }

    const totalFields = allFields.size;
    const similarity = totalFields > 0 ? agreementCount / totalFields : 0;

    return {
      similarity,
      fieldDifferences,
      agreementCount,
      disagreementCount,
    };
  }

  /**
   * Clean up old parse sessions
   */
  cleanupOldSessions(maxAgeMs = 3600000): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, result] of this.parseSessions.entries()) {
      const resultTime = result.timestamp ? new Date(result.timestamp).getTime() : 0;
      if (now - resultTime > maxAgeMs) {
        this.parseSessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old parse sessions`);
    }
  }
}
