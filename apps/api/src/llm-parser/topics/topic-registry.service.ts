import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ExtractTopicDefinition,
  FieldDefinition,
  TopicExtractResult,
  CompletenessScoreBreakdown,
  TopicScoreBreakdown,
  TopicFieldValue,
  TopicBatch,
} from './topic.interface';
import {
  EXTRACT_TOPICS,
  ExtractTopic,
  ExtractTopicNames,
  getTopicBatchForContractType,
} from './topics.const';

/**
 * Placeholder values that indicate a field is empty
 */
const PLACEHOLDER_VALUES = [
  'N/A',
  'n/a',
  'null',
  'undefined',
  '-',
  '无',
  '未知',
  '待定',
  'TBD',
  'tbd',
];

/**
 * Topic Registry Service
 *
 * Central registry for all extraction topics. Handles topic registration,
 * retrieval, and completeness score calculation.
 *
 * @see Spec 21 - Topic Architecture
 */
@Injectable()
export class TopicRegistryService {
  private readonly logger = new Logger(TopicRegistryService.name);
  private readonly topics = new Map<string, ExtractTopicDefinition>();

  constructor() {
    // Auto-register all default topics on initialization
    this.registerDefaultTopics();
    this.logger.log(`TopicRegistry initialized with ${this.topics.size} topics`);
  }

  /**
   * Register default topics from EXTRACT_TOPICS constant
   */
  private registerDefaultTopics(): void {
    for (const topic of EXTRACT_TOPICS) {
      this.topics.set(topic.name, topic);
    }
  }

  /**
   * Register a single topic
   *
   * @throws Error if topic already exists
   */
  register(topic: ExtractTopicDefinition): void {
    if (this.topics.has(topic.name)) {
      throw new Error(`Topic ${topic.name} is already registered`);
    }
    this.topics.set(topic.name, topic);
    this.logger.log(`Registered topic: ${topic.name} (${topic.displayName})`);
  }

  /**
   * Register multiple topics at once
   */
  registerAll(topics: ExtractTopicDefinition[]): void {
    for (const topic of topics) {
      try {
        this.register(topic);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to register topic ${topic.name}: ${message}`);
        throw err;
      }
    }
  }

  /**
   * Get topic definition by name
   *
   * @throws NotFoundException if topic not found
   */
  getTopic(name: string): ExtractTopicDefinition {
    const topic = this.topics.get(name);
    if (!topic) {
      throw new NotFoundException(`Topic ${name} not found`);
    }
    return topic;
  }

  /**
   * Get topic definition without throwing
   */
  getTopicSafe(name: string): ExtractTopicDefinition | undefined {
    return this.topics.get(name);
  }

  /**
   * Get all topics, sorted by order
   */
  getAllTopics(): ExtractTopicDefinition[] {
    return Array.from(this.topics.values()).sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
  }

  /**
   * Get field definitions for a specific topic
   */
  getTopicFields(topicName: string): FieldDefinition[] {
    return this.getTopic(topicName).fields;
  }

  /**
   * Get a single field definition
   */
  getField(topicName: string, fieldName: string): FieldDefinition | undefined {
    const topic = this.getTopicSafe(topicName);
    return topic?.fields.find((f) => f.name === fieldName);
  }

  /**
   * Calculate completeness score from extraction results
   *
   * @param results - Array of topic extraction results
   * @returns Completeness score with breakdown
   */
  calculateCompleteness(
    results: TopicExtractResult[],
  ): CompletenessScoreBreakdown {
    let totalScore = 0;
    let maxScore = 0;
    const topicScores: TopicScoreBreakdown[] = [];

    for (const result of results) {
      const topic = this.getTopicSafe(result.topicName);
      if (!topic) {
        this.logger.warn(`Unknown topic in results: ${result.topicName}`);
        continue;
      }

      const weight = topic.weight || 1;
      const topicBreakdown = this.calculateTopicScore(topic, result.data);

      totalScore += topicBreakdown.score;
      maxScore += weight;

      topicScores.push({
        topicName: topic.name,
        displayName: topic.displayName,
        weight,
        completedFields: topicBreakdown.completedFields,
        totalFields: topicBreakdown.totalFields,
        percentage: topicBreakdown.percentage,
        score: topicBreakdown.score,
      });
    }

    // Also include topics that weren't in results (score = 0)
    for (const topic of this.getAllTopics()) {
      if (!topicScores.find((ts) => ts.topicName === topic.name)) {
        const weight = topic.weight || 1;
        maxScore += weight;
        topicScores.push({
          topicName: topic.name,
          displayName: topic.displayName,
          weight,
          completedFields: 0,
          totalFields: topic.fields.length,
          percentage: 0,
          score: 0,
        });
      }
    }

    const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    this.logger.debug(
      `Completeness: ${score}/100 (total=${totalScore.toFixed(2)}, max=${maxScore.toFixed(2)})`,
    );

    return {
      score,
      total: Math.round(totalScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      topicScores: topicScores.sort((a, b) => b.weight - a.weight),
    };
  }

  /**
   * Calculate score for a single topic
   */
  private calculateTopicScore(
    topic: ExtractTopicDefinition,
    data: Record<string, any>,
  ): {
    score: number;
    completedFields: number;
    totalFields: number;
    percentage: number;
  } {
    let completedFields = 0;
    const totalFields = topic.fields.length;

    for (const field of topic.fields) {
      if (this.hasValidValue(data[field.name])) {
        completedFields++;
      }
    }

    const percentage = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
    const weight = topic.weight || 1;
    const score = (completedFields / totalFields) * weight;

    return {
      score: Math.round(score * 100) / 100,
      completedFields,
      totalFields,
      percentage: Math.round(percentage),
    };
  }

  /**
   * Check if a topic exists
   */
  hasTopic(name: string): boolean {
    return this.topics.has(name);
  }

  /**
   * Get all topic names
   */
  getTopicNames(): string[] {
    return Array.from(this.topics.keys());
  }

  /**
   * Get topics by order range
   */
  getTopicsByOrder(minOrder: number, maxOrder: number): ExtractTopicDefinition[] {
    return this.getAllTopics().filter(
      (t) => (t.order || 0) >= minOrder && (t.order || 0) <= maxOrder,
    );
  }

  /**
   * Get topic field values with metadata
   */
  getTopicFieldValues(topicName: string, data: Record<string, any>): TopicFieldValue[] {
    const topic = this.getTopic(topicName);
    return topic.fields.map((field) => ({
      name: field.name,
      type: field.type,
      value: data[field.name],
      hasValue: this.hasValidValue(data[field.name]),
      description: field.description,
    }));
  }

  /**
   * Get missing required fields for a topic
   */
  getMissingFields(topicName: string, data: Record<string, any>): string[] {
    const topic = this.getTopic(topicName);
    return topic.fields
      .filter((f) => f.required && !this.hasValidValue(data[f.name]))
      .map((f) => f.name);
  }

  /**
   * Get missing fields across all topics
   */
  getAllMissingFields(
    results: TopicExtractResult[],
  ): Map<string, string[]> {
    const missing = new Map<string, string[]>();

    for (const result of results) {
      const topicMissing = this.getMissingFields(result.topicName, result.data);
      if (topicMissing.length > 0) {
        missing.set(result.topicName, topicMissing);
      }
    }

    return missing;
  }

  /**
   * Check if a value is valid (not empty/placeholder)
   */
  private hasValidValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) return false;
      if (PLACEHOLDER_VALUES.includes(trimmed)) return false;
      return true;
    }

    if (typeof value === 'number') {
      return !isNaN(value);
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value as object).length > 0;
    }

    return true;
  }

  /**
   * Convert InfoType to ExtractTopic (backward compatibility)
   */
  infoTypeToTopic(infoType: string): ExtractTopic | undefined {
    if (this.hasTopic(infoType)) {
      return infoType as ExtractTopic;
    }
    return undefined;
  }

  /**
   * Get ExtractTopic enum values
   */
  getExtractTopics(): typeof ExtractTopic {
    return ExtractTopic;
  }

  /**
   * Get topic display name
   */
  getTopicDisplayName(name: string): string {
    const topic = this.getTopicSafe(name);
    return topic?.displayName || ExtractTopicNames[name as ExtractTopic] || name;
  }

  /**
   * Get total number of topics
   */
  getTopicCount(): number {
    return this.topics.size;
  }

  /**
   * Get total weight of all topics
   */
  getTotalWeight(): number {
    return Array.from(this.topics.values()).reduce(
      (sum, topic) => sum + (topic.weight || 0),
      0,
    );
  }

  /**
   * 获取合同类型的主题批次配置
   *
   * @param contractType 合同类型 (STAFF_AUGMENTATION, PROJECT_OUTSOURCING, PRODUCT_SALES)
   * @returns 主题批次配置，未找到返回 undefined
   */
  getTopicBatchForContractType(contractType: string): TopicBatch | undefined {
    return getTopicBatchForContractType(contractType);
  }

  /**
   * 获取合同类型需要执行的主题列表
   *
   * @param contractType 合同类型
   * @returns 主题定义数组，按执行顺序排序
   */
  getTopicsForContractType(contractType: string): ExtractTopicDefinition[] {
    const batch = this.getTopicBatchForContractType(contractType);
    if (!batch) {
      this.logger.warn(`No topic batch found for contract type: ${contractType}`);
      return [];
    }

    const topicDefinitions: ExtractTopicDefinition[] = [];
    for (const topicName of batch.topics) {
      const topic = this.getTopicSafe(topicName);
      if (topic) {
        topicDefinitions.push(topic);
      } else {
        this.logger.warn(`Topic ${topicName} not found in registry`);
      }
    }

    return topicDefinitions.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * 获取合同类型需要执行的主题名称列表
   *
   * @param contractType 合同类型
   * @returns 主题名称数组
   */
  getTopicNamesForContractType(contractType: string): string[] {
    const batch = this.getTopicBatchForContractType(contractType);
    return batch?.topics || [];
  }

  /**
   * 计算合同类型主题批次的完整性分数
   *
   * 与 calculateCompleteness 的区别在于：只计算该合同类型相关的主题
   *
   * @param results 提取结果数组
   * @param contractType 合同类型
   * @returns 完整性分数
   */
  calculateCompletenessForContractType(
    results: TopicExtractResult[],
    contractType: string,
  ): CompletenessScoreBreakdown {
    const topicNames = this.getTopicNamesForContractType(contractType);

    // 过滤出属于该合同类型的结果
    const filteredResults = results.filter(r => topicNames.includes(r.topicName));

    let totalScore = 0;
    let maxScore = 0;
    const topicScores: TopicScoreBreakdown[] = [];

    for (const result of filteredResults) {
      const topic = this.getTopicSafe(result.topicName);
      if (!topic) {
        this.logger.warn(`Unknown topic in results: ${result.topicName}`);
        continue;
      }

      const weight = topic.weight || 1;
      const topicBreakdown = this.calculateTopicScore(topic, result.data);

      totalScore += topicBreakdown.score;
      maxScore += weight;

      topicScores.push({
        topicName: topic.name,
        displayName: topic.displayName,
        weight,
        completedFields: topicBreakdown.completedFields,
        totalFields: topicBreakdown.totalFields,
        percentage: topicBreakdown.percentage,
        score: topicBreakdown.score,
      });
    }

    // 包含该合同类型下未提取的主题（分数为0）
    for (const topicName of topicNames) {
      if (!topicScores.find((ts) => ts.topicName === topicName)) {
        const topic = this.getTopicSafe(topicName);
        if (topic) {
          const weight = topic.weight || 1;
          maxScore += weight;
          topicScores.push({
            topicName: topic.name,
            displayName: topic.displayName,
            weight,
            completedFields: 0,
            totalFields: topic.fields.length,
            percentage: 0,
            score: 0,
          });
        }
      }
    }

    const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    this.logger.debug(
      `[${contractType}] Completeness: ${score}/100 (total=${totalScore.toFixed(2)}, max=${maxScore.toFixed(2)})`,
    );

    return {
      score,
      total: Math.round(totalScore * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      topicScores: topicScores.sort((a, b) => b.weight - a.weight),
    };
  }
}
