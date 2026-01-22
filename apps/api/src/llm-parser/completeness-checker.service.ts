import { Injectable, Logger } from '@nestjs/common';
import {
  CompletenessScore,
  CategoryScores,
  FieldScoreDetail,
  ParseStrategy,
} from './entities/completeness-score.entity';

export interface FieldWeight {
  field: string;
  weight: number;
  category: 'basic' | 'financial' | 'temporal' | 'other';
}

// Field weights configuration following Spec 18 (total = 100)
export const FIELD_WEIGHTS: FieldWeight[] = [
  // Basic information - 40 points
  { field: 'contractNumber', weight: 8, category: 'basic' },
  { field: 'title', weight: 6, category: 'basic' },
  { field: 'contractType', weight: 8, category: 'basic' },
  { field: 'firstPartyName', weight: 10, category: 'basic' },
  { field: 'secondPartyName', weight: 8, category: 'basic' },

  // Financial information - 30 points
  { field: 'totalAmount', weight: 12, category: 'financial' },
  { field: 'currency', weight: 4, category: 'financial' },
  { field: 'taxRate', weight: 4, category: 'financial' },
  { field: 'paymentTerms', weight: 10, category: 'financial' },

  // Temporal information - 20 points
  { field: 'signDate', weight: 6, category: 'temporal' },
  { field: 'startDate', weight: 5, category: 'temporal' },
  { field: 'endDate', weight: 5, category: 'temporal' },
  { field: 'duration', weight: 4, category: 'temporal' },

  // Other information - 10 points
  { field: 'industry', weight: 3, category: 'other' },
  { field: 'governingLaw', weight: 3, category: 'other' },
  { field: 'signLocation', weight: 2, category: 'other' },
  { field: 'salesPerson', weight: 2, category: 'other' },
];

// Field mapping from legacy format to new format
export const FIELD_MAPPING: Record<string, string> = {
  contractNo: 'contractNumber',
  name: 'title',
  type: 'contractType',
  customerName: 'firstPartyName',
  ourEntity: 'secondPartyName',
  amountWithTax: 'totalAmount',
  signedAt: 'signDate',
  effectiveAt: 'startDate',
  expiresAt: 'endDate',
};

// Strategy thresholds
const DIRECT_USE_THRESHOLD = 70;
const LLM_VALIDATION_THRESHOLD = 50;

/**
 * Completeness Checker Service
 * Evaluates the completeness of programmatic extraction results
 * and determines the appropriate parsing strategy
 */
@Injectable()
export class CompletenessCheckerService {
  private readonly logger = new Logger(CompletenessCheckerService.name);

  /**
   * Calculate completeness score from extracted fields
   */
  calculateScore(extractedFields: Record<string, unknown>): CompletenessScore {
    // Normalize field names using mapping
    const normalizedFields = this.normalizeFields(extractedFields);

    let totalScore = 0;
    const details: FieldScoreDetail[] = [];

    for (const fw of FIELD_WEIGHTS) {
      const hasValue = this.hasValidValue(normalizedFields[fw.field]);
      const actualScore = hasValue ? fw.weight : 0;
      totalScore += actualScore;

      details.push({
        field: fw.field,
        category: fw.category,
        maxScore: fw.weight,
        actualScore,
        hasValue,
      });
    }

    const maxScore = 100;
    const percentage = totalScore;
    const categoryScores = this.calculateCategoryScores(details);
    const strategy = this.determineStrategy(totalScore);

    this.logger.log(
      `Completeness: ${totalScore}/100, strategy: ${strategy}, ` +
        `categories: basic=${categoryScores.basic}, financial=${categoryScores.financial}, ` +
        `temporal=${categoryScores.temporal}, other=${categoryScores.other}`,
    );

    return {
      totalScore,
      maxScore,
      percentage,
      strategy,
      categoryScores,
      details,
    };
  }

  /**
   * Get category score from details
   */
  getCategoryScore(
    category: 'basic' | 'financial' | 'temporal' | 'other',
    details: FieldScoreDetail[],
  ): number {
    return details
      .filter((d) => d.category === category)
      .reduce((sum, d) => sum + d.actualScore, 0);
  }

  /**
   * Determine parsing strategy based on score
   */
  determineStrategy(score: number): ParseStrategy {
    if (score >= DIRECT_USE_THRESHOLD) {
      return ParseStrategy.DIRECT_USE;
    }
    if (score >= LLM_VALIDATION_THRESHOLD) {
      return ParseStrategy.LLM_VALIDATION;
    }
    return ParseStrategy.LLM_FULL_EXTRACTION;
  }

  /**
   * Identify missing fields that need to be extracted
   */
  getMissingFields(extractedFields: Record<string, unknown>): string[] {
    const normalizedFields = this.normalizeFields(extractedFields);
    return FIELD_WEIGHTS.filter((fw) => !this.hasValidValue(normalizedFields[fw.field])).map(
      (fw) => fw.field,
    );
  }

  /**
   * Identify priority fields for LLM extraction (sorted by weight)
   */
  identifyPriorityFields(missingFields: string[]): string[] {
    const missingSet = new Set(missingFields);
    const priorityFields = FIELD_WEIGHTS.filter((fw) => missingSet.has(fw.field)).sort(
      (a, b) => b.weight - a.weight,
    );

    // Return top 10 priority fields
    return priorityFields.slice(0, 10).map((fw) => fw.field);
  }

  /**
   * Check if strategy needs LLM
   */
  needsLlm(score: number): boolean {
    return score < DIRECT_USE_THRESHOLD;
  }

  /**
   * Get explanation for the chosen strategy
   */
  getStrategyReason(score: number, strategy: ParseStrategy): string {
    switch (strategy) {
      case ParseStrategy.DIRECT_USE:
        return `Completeness score ${score}/100 >= ${DIRECT_USE_THRESHOLD}, using programmatic result directly`;
      case ParseStrategy.LLM_VALIDATION:
        return `Completeness score ${score}/100 between ${LLM_VALIDATION_THRESHOLD}-${DIRECT_USE_THRESHOLD - 1}, using LLM validation mode`;
      case ParseStrategy.LLM_FULL_EXTRACTION:
        return `Completeness score ${score}/100 < ${LLM_VALIDATION_THRESHOLD}, using LLM full extraction mode`;
      case ParseStrategy.RAG:
        return `Using RAG (Retrieval-Augmented Generation) vector search strategy`;
      case ParseStrategy.DOCLING:
        return `Using Docling document parsing strategy`;
      default:
        return `Using ${strategy} strategy`;
    }
  }

  // Legacy method for backward compatibility
  checkCompleteness(extractedFields: Record<string, unknown>): {
    score: number;
    missingFields: string[];
    needsLlm: boolean;
    reason: string;
  } {
    const result = this.calculateScore(extractedFields);
    const missingFields = this.getMissingFields(extractedFields);

    return {
      score: result.totalScore,
      missingFields,
      needsLlm: this.needsLlm(result.totalScore),
      reason: this.getStrategyReason(result.totalScore, result.strategy),
    };
  }

  private calculateCategoryScores(details: FieldScoreDetail[]): CategoryScores {
    return {
      basic: this.getCategoryScore('basic', details),
      financial: this.getCategoryScore('financial', details),
      temporal: this.getCategoryScore('temporal', details),
      other: this.getCategoryScore('other', details),
    };
  }

  private normalizeFields(fields: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...fields };

    // Apply field mapping
    for (const [oldKey, newKey] of Object.entries(FIELD_MAPPING)) {
      if (fields[oldKey] !== undefined && normalized[newKey] === undefined) {
        normalized[newKey] = fields[oldKey];
      }
    }

    return normalized;
  }

  private hasValidValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) return false;
      // Check for placeholder values
      const placeholders = ['N/A', 'n/a', 'null', 'undefined', '-', '无', '未知'];
      if (placeholders.includes(trimmed)) return false;
      return true;
    }

    if (typeof value === 'number') {
      return !isNaN(value);
    }

    // Arrays need at least one element
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // Objects need at least one property
    if (typeof value === 'object') {
      return Object.keys(value as object).length > 0;
    }

    return true;
  }
}
