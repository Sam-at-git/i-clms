import { Injectable, Logger } from '@nestjs/common';
import { RAGService, TopicQuery, RAGExtractResult } from './rag.service';
import { TopicRegistryService } from '../llm-parser/topics/topic-registry.service';
import {
  ParseStrategyExecutor,
  ParseStrategy,
  ParseOptions,
  ParseResult,
} from '../llm-parser/strategies/parse-strategy.interface';
import { ExtractTopic } from '../llm-parser/topics/topics.const';

/**
 * RAG Parse Strategy
 *
 * Implements the ParseStrategyExecutor interface using RAG (Retrieval-Augmented Generation).
 * Provides semantic search-based field extraction by vectorizing document chunks
 * and retrieving relevant passages for each topic.
 *
 * @see Spec 26 - RAG Vector Search Strategy
 */
@Injectable()
export class RAGParseStrategy implements ParseStrategyExecutor {
  readonly name = ParseStrategy.RAG;
  private readonly logger = new Logger(RAGParseStrategy.name);

  // Topic query templates for RAG extraction
  private readonly topicQueries: Partial<Record<ExtractTopic, string[]>> = {
    [ExtractTopic.BASIC_INFO]: [
      '合同编号、合同名称、签约方信息',
      '甲方乙方公司名称',
    ],
    [ExtractTopic.FINANCIAL]: [
      '合同金额、价款、费用',
      '付款方式、结算方式',
      '税率、发票',
    ],
    [ExtractTopic.TIME_INFO]: [
      '合同期限、履行时间',
      '签订日期、生效日期',
    ],
    [ExtractTopic.MILESTONES]: [
      '里程碑、付款节点、交付阶段',
      '里程碑金额和期限',
    ],
    [ExtractTopic.RATE_ITEMS]: [
      '人员费率、角色单价',
      '工时费率标准',
    ],
    [ExtractTopic.LINE_ITEMS]: [
      '产品清单、商品明细',
      '产品单价和数量',
    ],
  };

  constructor(
    private readonly rag: RAGService,
    private readonly topicRegistry: TopicRegistryService,
  ) {}

  async parse(content: string, options: ParseOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const extractedFields: Record<string, unknown> = {};

    try {
      // Check if RAG is available
      if (!this.rag.isAvailable()) {
        return {
          strategy: this.name,
          fields: {},
          completeness: 0,
          confidence: 0,
          warnings: ['RAG service not available (embedding model not configured)'],
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      // First, index the contract for RAG
      const contractId = options.contractId as number | undefined;
      const tempContractId = contractId || Date.now(); // Use timestamp as temp ID

      try {
        await this.rag.indexContract(tempContractId, content);
      } catch (error) {
        this.logger.warn(`Failed to index contract: ${this.errorMessage(error)}`);
        warnings.push(`Indexing failed: ${this.errorMessage(error)}`);
      }

      // Get topics to extract
      const topics = options.topics || this.topicRegistry.getTopicNames();

      // Build queries for RAG extraction
      const queries: TopicQuery[] = [];
      for (const topic of topics) {
        const topicQueryList = this.topicQueries[topic as ExtractTopic];
        if (topicQueryList && topicQueryList.length > 0) {
          for (const query of topicQueryList) {
            queries.push({ topic, query, topK: 3, threshold: 0.7 });
          }
        } else {
          // Fallback query for topics without templates
          queries.push({
            topic,
            query: `提取${this.topicRegistry.getTopicDisplayName(topic)}相关信息`,
            topK: 3,
            threshold: 0.7,
          });
        }
      }

      // Execute RAG extraction
      const results: RAGExtractResult[] = await this.rag.extractByTopic(
        tempContractId,
        queries,
      );

      // Merge results, taking the first match for each field
      for (const result of results) {
        for (const [field, value] of Object.entries(result.extractedData)) {
          // Only set if not already set (first match wins)
          if (!(field in extractedFields)) {
            extractedFields[field] = value;
          }
        }
      }

      // Calculate completeness and confidence
      const completeness = this.calculateCompleteness(extractedFields, topics);
      const confidence = this.calculateConfidence(results);

      // Add warnings for low completeness
      if (completeness < 70) {
        warnings.push('RAG解析完整性较低，建议使用其他策略验证');
      }

      this.logger.log(
        `RAG parse complete: ${results.length} topics, ${Object.keys(extractedFields).length} fields extracted`,
      );

      return {
        strategy: this.name,
        fields: extractedFields,
        completeness,
        confidence,
        warnings,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`RAG parse error: ${this.errorMessage(error)}`);
      return {
        strategy: this.name,
        fields: {},
        completeness: 0,
        confidence: 0,
        warnings: [this.errorMessage(error)],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  isAvailable(): boolean {
    return this.rag.isAvailable();
  }

  getPriority(): number {
    return 1; // Lowest priority (slowest, requires indexing)
  }

  /**
   * Calculate completeness score based on extracted fields
   */
  private calculateCompleteness(
    fields: Record<string, unknown>,
    topics: string[],
  ): number {
    let totalWeight = 0;
    let completedWeight = 0;

    for (const topicName of topics) {
      const topic = this.topicRegistry.getTopicSafe(topicName);
      if (!topic) continue;

      const weight = topic.weight || 1;

      const completedFields = topic.fields.filter(
        (f) => fields[f.name] !== null && fields[f.name] !== undefined,
      ).length;

      const completion = completedFields / topic.fields.length;
      totalWeight += weight;
      completedWeight += weight * completion;
    }

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  }

  /**
   * Calculate confidence based on retrieval similarities
   */
  private calculateConfidence(results: RAGExtractResult[]): number {
    if (results.length === 0) return 0;

    const similarities = results.flatMap((r) =>
      r.retrievedChunks.map((c) => c.similarity),
    );

    if (similarities.length === 0) return 0;

    const avgSimilarity =
      similarities.reduce((a, b) => a + b, 0) / similarities.length;

    // Convert similarity (0-1) to confidence (0-100)
    return Math.round(avgSimilarity * 100);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
