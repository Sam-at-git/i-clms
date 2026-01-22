import { Injectable, Logger } from '@nestjs/common';
import { LlmClientService } from '../llm-client.service';
import {
  ConflictResolution,
  SimilarityResult,
} from '../dto/voting.dto';
import {
  SimilarityEvaluationResult,
  QualityEvaluationResult,
  ConflictResolutionResult,
  BatchEvaluationOptions,
  BatchEvaluationResult,
} from './evaluation.interface';

/**
 * LLM Evaluator Service
 *
 * Provides LLM-based conflict resolution and similarity evaluation
 * for multi-strategy parsing results.
 *
 * @see Spec 29 - Multi-Strategy Comparison and Voting Mechanism
 * @see Spec 30 - LLM评估服务
 */
@Injectable()
export class LLMEvaluatorService {
  private readonly logger = new Logger(LLMEvaluatorService.name);

  constructor(private readonly llm: LlmClientService) {}

  /**
   * Evaluate conflict and select best value
   */
  async evaluateConflict(
    documentText: string,
    fieldName: string,
    values: any[],
  ): Promise<ConflictResolution | null> {
    const prompt = this.buildConflictPrompt(documentText, fieldName, values);

    try {
      const response = await this.llm.complete({
        systemPrompt: '你是合同信息提取质量评估专家。请从合同原文中选择最准确的字段值。',
        userContent: prompt,
        jsonMode: true,
        temperature: 0.1,
        maxTokens: 500,
      });

      const result = this.parseResponse(response.content);

      this.logger.log(
        `Conflict evaluation completed for field: ${fieldName}, ` +
        `selected value: ${JSON.stringify(result.value)}`
      );

      return result;
    } catch (error) {
      this.logger.error(`LLM evaluation failed for field ${fieldName}: ${error}`);
      return {
        value: null,
        confidence: 0,
        reason: '评估失败',
      };
    }
  }

  /**
   * Evaluate similarity between two values
   */
  async evaluateSimilarity(
    documentText: string,
    fieldName: string,
    valueA: any,
    valueB: any,
  ): Promise<SimilarityResult> {
    const prompt = `
你是合同信息提取质量评估专家。请比较两个提取结果的相似度。

字段名: ${fieldName}

合同原文（片段）:
${documentText.slice(0, 1000)}

结果A: ${JSON.stringify(valueA)}
结果B: ${JSON.stringify(valueB)}

请评估：
1. 两个结果语义是否相同？（考虑数值格式、日期格式、同义词等）
2. 如果不同，哪个结果更准确？

输出JSON格式：
{
  "is_same": boolean,
  "similarity": number,  // 0-1
  "better": "A" | "B" | "same",
  "reason": string
}
`;

    try {
      const response = await this.llm.complete({
        systemPrompt: '你是合同信息提取质量评估专家。',
        userContent: prompt,
        jsonMode: true,
        temperature: 0.1,
        maxTokens: 500,
      });

      const parsed = JSON.parse(this.extractJson(response.content));

      return {
        isSame: parsed.is_same ?? false,
        similarity: parsed.similarity ?? 0,
        better: parsed.better ?? 'same',
        reason: parsed.reason ?? '',
      };
    } catch (error) {
      this.logger.error(`Similarity evaluation failed: ${error}`);
      return {
        isSame: false,
        similarity: 0,
        better: 'same',
        reason: '评估失败',
      };
    }
  }

  /**
   * Build conflict resolution prompt
   */
  private buildConflictPrompt(
    documentText: string,
    fieldName: string,
    values: any[],
  ): string {
    const valuesText = values
      .map((v, i) => `选项${String.fromCharCode(65 + i)}: ${JSON.stringify(v)}`)
      .join('\n');

    return `
请从合同原文中提取字段"${fieldName}"的正确值。

合同原文（片段）:
${documentText.slice(0, 2000)}

${valuesText}

请从上述选项中选择最准确的值，或从原文中提取正确的值。

输出JSON格式：
{
  "value": any,
  "confidence": number,  // 0-1
  "reason": string  // 选择理由
}
`;
  }

  /**
   * Parse LLM response
   */
  private parseResponse(response: string): ConflictResolution {
    try {
      const cleaned = this.extractJson(response);
      const parsed = JSON.parse(cleaned);

      return {
        value: parsed.value,
        confidence: parsed.confidence ?? 0.5,
        reason: parsed.reason ?? '',
      };
    } catch (error) {
      this.logger.error(`Failed to parse LLM response: ${response}`);
      return {
        value: null,
        confidence: 0,
        reason: '解析失败',
      };
    }
  }

  /**
   * Extract JSON from response (handles markdown code blocks)
   */
  private extractJson(text: string): string {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return jsonMatch[1];
    }

    // Try to extract first JSON object
    const objectMatch = text.match(/\{[\s\S]*?\}/);
    if (objectMatch) {
      return objectMatch[0];
    }

    return text;
  }

  /**
   * Batch evaluate multiple conflicts
   */
  async batchEvaluateConflicts(
    documentText: string,
    conflicts: Array<{ fieldName: string; values: any[] }>,
  ): Promise<Map<string, ConflictResolution>> {
    const results = new Map<string, ConflictResolution>();

    // Process conflicts sequentially to avoid overwhelming the LLM
    for (const conflict of conflicts) {
      const result = await this.evaluateConflict(
        documentText,
        conflict.fieldName,
        conflict.values,
      );

      if (result) {
        results.set(conflict.fieldName, result);
      }

      // Small delay between requests
      await this.sleep(100);
    }

    this.logger.log(
      `Batch conflict evaluation completed: ${results.size}/${conflicts.length} resolved`
    );

    return results;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Evaluate the quality of a single field value
   * SPEC-30: Quality Evaluation
   */
  async evaluateQuality(
    documentText: string,
    fieldName: string,
    value: any
  ): Promise<QualityEvaluationResult> {
    const prompt = this.buildQualityPrompt(documentText, fieldName, value);

    try {
      const response = await this.llm.complete({
        systemPrompt: '你是合同信息提取质量评估专家。请评估提取字段值的质量。',
        userContent: prompt,
        jsonMode: true,
        temperature: 0.1,
        maxTokens: 500,
      });

      const result = this.parseQualityResponse(response.content, fieldName, value);

      this.logger.log(
        `Quality evaluation for ${fieldName}: ${result.quality} (confidence: ${result.confidence})`
      );

      return result;
    } catch (error) {
      this.logger.error(`Quality evaluation failed for ${fieldName}: ${error}`);
      return {
        fieldName,
        value: JSON.stringify(value),
        quality: 'poor',
        confidence: 0,
        issues: ['评估失败'],
        suggestions: [],
      };
    }
  }

  /**
   * Batch evaluate multiple fields
   * SPEC-30: Batch Evaluation
   */
  async batchEvaluate(
    documentText: string,
    fields: Record<string, any>,
    options: BatchEvaluationOptions = {}
  ): Promise<BatchEvaluationResult> {
    const qualities: Record<string, QualityEvaluationResult> = {};
    let totalConfidence = 0;
    let evaluatedFields = 0;

    for (const [fieldName, value] of Object.entries(fields)) {
      if (options.evaluateQuality !== false) {
        const quality = await this.evaluateQuality(documentText, fieldName, value);
        qualities[fieldName] = quality;
        totalConfidence += quality.confidence;
        evaluatedFields++;
      }

      // Small delay between requests
      if (options.evaluateQuality !== false) {
        await this.sleep(50);
      }
    }

    const overallQuality = evaluatedFields > 0 ? totalConfidence / evaluatedFields : 0;

    this.logger.log(
      `Batch evaluation completed: ${evaluatedFields} fields, overall quality: ${(overallQuality * 100).toFixed(1)}%`
    );

    return {
      qualities,
      overallQuality,
      evaluatedFields,
    };
  }

  /**
   * Resolve conflict with extended result format
   * SPEC-30: Enhanced Conflict Resolution
   */
  async resolveConflictEnhanced(
    documentText: string,
    fieldName: string,
    options: Array<{ strategy: string; value: any }>
  ): Promise<ConflictResolutionResult> {
    const prompt = this.buildConflictResolutionPrompt(documentText, fieldName, options);

    try {
      const response = await this.llm.complete({
        systemPrompt: '你是合同信息提取质量评估专家。请在多个提取结果中选择最准确的值。',
        userContent: prompt,
        jsonMode: true,
        temperature: 0.1,
        maxTokens: 500,
      });

      const result = this.parseConflictResolutionResponse(response.content, fieldName);

      this.logger.log(
        `Enhanced conflict resolution for ${fieldName}: ${result.resolutionMethod} (confidence: ${result.confidence})`
      );

      return result;
    } catch (error) {
      this.logger.error(`Enhanced conflict resolution failed for ${fieldName}: ${error}`);
      return {
        fieldName,
        resolvedValue: null,
        confidence: 0,
        resolutionMethod: 'custom',
        explanation: '评估失败',
      };
    }
  }

  /**
   * Build quality evaluation prompt
   */
  private buildQualityPrompt(
    documentText: string,
    fieldName: string,
    value: any
  ): string {
    return `
请评估字段"${fieldName}"的提取值质量。

**字段名称**: ${fieldName}
**提取值**: ${JSON.stringify(value)}

**合同原文（片段）**:
${documentText.slice(0, 2000)}

请评估：
1. 提取值是否完整？
2. 提取值是否准确？
3. 格式是否正确？
4. 是否存在明显错误？

输出JSON格式：
{
  "quality": "excellent" | "good" | "fair" | "poor",
  "confidence": number,  // 0-1
  "issues": string[],  // 存在的问题列表
  "suggestions": string[]  // 改进建议
}
`;
  }

  /**
   * Build conflict resolution prompt for enhanced format
   */
  private buildConflictResolutionPrompt(
    documentText: string,
    fieldName: string,
    options: Array<{ strategy: string; value: any }>
  ): string {
    const optionsText = options
      .map((opt, i) => `选项${String.fromCharCode(65 + i)} (${opt.strategy}): ${JSON.stringify(opt.value)}`)
      .join('\n');

    return `
请从合同原文中为字段"${fieldName}"选择最准确的值。

**合同原文（片段）**:
${documentText.slice(0, 2000)}

**候选选项**:
${optionsText}

请分析：
1. 哪个选项与原文最一致？
2. 是否需要合并多个选项的值？
3. 是否需要从原文中提取新的值？

输出JSON格式：
{
  "resolvedValue": any,
  "confidence": number,  // 0-1
  "resolutionMethod": "A" | "B" | "merged" | "custom",
  "explanation": string  // 选择理由
}
`;
  }

  /**
   * Parse quality evaluation response
   */
  private parseQualityResponse(
    response: string,
    fieldName: string,
    value: any
  ): QualityEvaluationResult {
    try {
      const cleaned = this.extractJson(response);
      const parsed = JSON.parse(cleaned);

      return {
        fieldName,
        value: JSON.stringify(value),
        quality: parsed.quality ?? 'fair',
        confidence: parsed.confidence ?? 0.5,
        issues: parsed.issues ?? [],
        suggestions: parsed.suggestions ?? [],
      };
    } catch (error) {
      this.logger.error(`Failed to parse quality response: ${response}`);
      return {
        fieldName,
        value: JSON.stringify(value),
        quality: 'fair',
        confidence: 0.5,
        issues: ['解析失败'],
        suggestions: [],
      };
    }
  }

  /**
   * Parse enhanced conflict resolution response
   */
  private parseConflictResolutionResponse(
    response: string,
    fieldName: string
  ): ConflictResolutionResult {
    try {
      const cleaned = this.extractJson(response);
      const parsed = JSON.parse(cleaned);

      return {
        fieldName,
        resolvedValue: parsed.resolvedValue !== undefined ? JSON.stringify(parsed.resolvedValue) : null,
        confidence: parsed.confidence ?? 0.5,
        resolutionMethod: parsed.resolutionMethod ?? 'custom',
        explanation: parsed.explanation ?? '',
      };
    } catch (error) {
      this.logger.error(`Failed to parse conflict resolution response: ${response}`);
      return {
        fieldName,
        resolvedValue: null,
        confidence: 0,
        resolutionMethod: 'custom',
        explanation: '解析失败',
      };
    }
  }
}
