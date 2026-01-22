import { Injectable, Logger } from '@nestjs/common';
import {
  VoteConfig,
  VoteResult,
  DEFAULT_VOTE_CONFIG,
  VotingStrategyResult,
} from './dto/voting.dto';

/**
 * Voting Service
 *
 * Implements weighted voting mechanism for multi-strategy parsing results.
 * Handles conflict detection and resolution coordination.
 *
 * @see Spec 29 - Multi-Strategy Comparison and Voting Mechanism
 */
@Injectable()
export class VotingService {
  private readonly logger = new Logger(VotingService.name);

  /**
   * Vote on multiple strategy results
   */
  async vote(
    results: VotingStrategyResult[],
    config: VoteConfig = DEFAULT_VOTE_CONFIG,
  ): Promise<VoteResult[]> {
    const voteResults: VoteResult[] = [];

    // Collect all fields
    const allFields = new Set<string>();
    for (const result of results) {
      if (result.fields) {
        Object.keys(result.fields).forEach(f => allFields.add(f));
      }
    }

    // Vote on each field
    for (const fieldName of Array.from(allFields)) {
      const voteResult = await this.voteForField(fieldName, results, config);
      voteResults.push(voteResult);
    }

    this.logger.log(
      `Voting completed: ${voteResults.length} fields, ` +
      `${voteResults.filter(r => r.needsResolution).length} conflicts detected`
    );

    return voteResults;
  }

  /**
   * Vote on a single field
   */
  private async voteForField(
    fieldName: string,
    results: VotingStrategyResult[],
    config: VoteConfig,
  ): Promise<VoteResult> {
    const votes: {
      strategy: string;
      value: any;
      weight: number;
    }[] = [];

    // Collect votes for this field
    for (const result of results) {
      if (!result.fields) continue;

      const value = result.fields[fieldName];
      if (value !== null && value !== undefined) {
        const strategyConfig = config.strategies[result.strategy];
        if (strategyConfig?.enabled) {
          votes.push({
            strategy: result.strategy,
            value,
            weight: strategyConfig.weight,
          });
        }
      }
    }

    if (votes.length === 0) {
      return {
        fieldName,
        agreedValue: null,
        confidence: 0,
        votes: [],
        needsResolution: true,
      };
    }

    // Group votes by value
    const valueGroups = this.groupByValue(votes);

    // Calculate weighted total for each value
    const weightedValues = Array.from(valueGroups.entries()).map(([value, v]) => ({
      value: JSON.parse(value),
      totalWeight: v.reduce((sum, vote) => sum + vote.weight, 0),
      count: v.length,
    }));

    // Sort by weight (descending)
    weightedValues.sort((a, b) => b.totalWeight - a.totalWeight);

    const winner = weightedValues[0];
    const totalWeight = votes.reduce((sum, vote) => sum + vote.weight, 0);
    const confidence = totalWeight > 0 ? winner.totalWeight / totalWeight : 0;

    // Determine if resolution is needed
    const needsResolution = confidence < config.threshold;

    return {
      fieldName,
      agreedValue: winner.value,
      confidence,
      votes: votes.map(v => ({
        strategy: v.strategy,
        value: v.value,
        weight: v.weight,
      })),
      needsResolution,
      resolutionMethod: needsResolution ? undefined : 'vote',
    };
  }

  /**
   * Resolve voting conflicts using LLM evaluation
   * Note: This delegates to LLMEvaluatorService
   */
  async resolveConflicts(
    voteResults: VoteResult[],
    documentText: string,
    resolveMethod: 'llm' | 'vote' | 'user' = 'llm',
    userChoices?: Record<string, any>,
  ): Promise<VoteResult[]> {
    const conflicts = voteResults.filter(r => r.needsResolution);

    if (conflicts.length === 0) {
      return voteResults;
    }

    this.logger.log(
      `Resolving ${conflicts.length} conflicts using ${resolveMethod} method`
    );

    // Handle user choice resolution
    if (resolveMethod === 'user' && userChoices) {
      for (const conflict of conflicts) {
        if (userChoices[conflict.fieldName] !== undefined) {
          conflict.agreedValue = userChoices[conflict.fieldName];
          conflict.confidence = 1.0; // User choice = full confidence
          conflict.resolutionMethod = 'user';
        }
      }
    }

    // Remaining conflicts would be handled by LLM evaluator
    // This is a placeholder - actual LLM evaluation is in LLMEvaluatorService
    return voteResults;
  }

  /**
   * Calculate overall confidence from vote results
   */
  calculateOverallConfidence(voteResults: VoteResult[]): number {
    if (voteResults.length === 0) return 0;

    const totalConfidence = voteResults.reduce(
      (sum, r) => sum + r.confidence,
      0
    );

    return totalConfidence / voteResults.length;
  }

  /**
   * Get list of conflicted field names
   */
  getConflicts(voteResults: VoteResult[]): string[] {
    return voteResults
      .filter(r => r.needsResolution)
      .map(r => r.fieldName);
  }

  /**
   * Group votes by value for comparison
   */
  private groupByValue(
    votes: Array<{ strategy: string; value: any; weight: number }>
  ): Map<string, Array<{ strategy: string; value: any; weight: number }>> {
    const groups = new Map<string, Array<{ strategy: string; value: any; weight: number }>>();

    for (const vote of votes) {
      const key = JSON.stringify(vote.value);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(vote);
    }

    return groups;
  }

  /**
   * Compare two values for semantic equality
   * Useful for detecting when strategies extracted the same value in different formats
   */
  compareValues(valueA: any, valueB: any): { isSame: boolean; similarity: number } {
    // Exact match
    if (valueA === valueB) {
      return { isSame: true, similarity: 1 };
    }

    // Handle null/undefined
    if (valueA === null || valueA === undefined || valueB === null || valueB === undefined) {
      return { isSame: false, similarity: 0 };
    }

    // String comparison after normalization
    const strA = String(valueA).trim().toLowerCase();
    const strB = String(valueB).trim().toLowerCase();

    if (strA === strB) {
      return { isSame: true, similarity: 1 };
    }

    // Calculate similarity ratio (Levenshtein-like)
    const similarity = this.calculateStringSimilarity(strA, strB);

    return {
      isSame: similarity > 0.9,
      similarity,
    };
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(str1, str2);
    const maxLen = Math.max(str1.length, str2.length);

    return 1 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] =
            1 +
            Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }
}
