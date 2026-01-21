import { Injectable, Logger } from '@nestjs/common';
import { LlmParserService } from './llm-parser.service';
import { SemanticChunkerService, SemanticChunk } from './semantic-chunker.service';
import { RagEnhancedParserService } from './rag-enhanced-parser.service';
import { ConcurrentParserService } from './concurrent-parser.service';
import { LlmConfigService } from './config/llm-config.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { ParseMode, OptimizedParseResult, SemanticChunkInfo } from './dto';
import { ParseStrategy } from './entities/completeness-score.entity';

/**
 * 优化解析服务
 *
 * 整合三种优化策略：
 * 1. SEMANTIC - 基于语义分段的解析
 * 2. RAG - 向量检索增强的解析
 * 3. CONCURRENT - 并发Map-Reduce解析
 */
@Injectable()
export class OptimizedParserService {
  private readonly logger = new Logger(OptimizedParserService.name);

  // 文档大小阈值
  private readonly SMALL_DOC_THRESHOLD = 10000;  // 10K字符
  private readonly MEDIUM_DOC_THRESHOLD = 20000; // 20K字符

  constructor(
    private llmParserService: LlmParserService,
    private semanticChunker: SemanticChunkerService,
    private ragParser: RagEnhancedParserService,
    private concurrentParser: ConcurrentParserService,
    private configService: LlmConfigService,
    private completenessChecker: CompletenessCheckerService,
  ) {}

  /**
   * 主入口：优化的合同解析
   *
   * @param text 合同文本
   * @param mode 解析模式
   * @param targetFields 目标字段（可选）
   * @param options 其他选项
   */
  async parseOptimized(
    text: string,
    mode: ParseMode = ParseMode.AUTO,
    targetFields?: string[],
    options?: {
      forceStrategy?: ParseStrategy;
      maxConcurrent?: number;
      maxChunksPerField?: number;
    }
  ): Promise<OptimizedParseResult> {
    const startTime = Date.now();
    const textLength = text.length;

    this.logger.log(
      `[Optimized Parser] Starting: mode=${mode}, length=${textLength}, ` +
      `fields=${targetFields?.length || 'all'}`
    );

    // 自动选择模式
    if (mode === ParseMode.AUTO) {
      mode = this.selectOptimalMode(textLength);
      this.logger.log(`[Optimized Parser] Auto-selected mode: ${mode}`);
    }

    try {
      switch (mode) {
        case ParseMode.LEGACY:
          return await this.parseWithLegacy(text, targetFields, options, startTime);

        case ParseMode.SEMANTIC:
          return await this.parseWithSemantic(text, targetFields, options, startTime);

        case ParseMode.RAG:
          return await this.parseWithRag(text, targetFields, options, startTime);

        case ParseMode.CONCURRENT:
          return await this.parseWithConcurrent(text, targetFields, options, startTime);

        default:
          throw new Error(`Unknown parse mode: ${mode}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Optimized Parser] Failed:`, errorMessage);

      return {
        success: false,
        mode,
        processingTimeMs: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 仅语义分段（不提取数据）
   */
  chunkText(text: string, minChunkSize = 500): {
    success: boolean;
    chunks: SemanticChunkInfo[];
    totalLength: number;
    strategy: string;
    summary: string;
  } {
    try {
      const chunks = this.semanticChunker.chunkBySemanticStructure(text, minChunkSize);

      return {
        success: true,
        chunks: chunks.map(this.convertChunkInfo),
        totalLength: text.length,
        strategy: 'semantic-structure',
        summary: `Created ${chunks.length} semantic chunks from ${text.length} characters`,
      };
    } catch (error) {
      this.logger.error('[Optimized Parser] Chunking failed:', error);
      throw error;
    }
  }

  /**
   * 选择最优解析模式
   */
  private selectOptimalMode(textLength: number): ParseMode {
    if (textLength <= this.SMALL_DOC_THRESHOLD) {
      return ParseMode.LEGACY; // 小文档用原策略
    } else if (textLength <= this.MEDIUM_DOC_THRESHOLD) {
      return ParseMode.SEMANTIC; // 中文档用语义分段
    } else {
      return ParseMode.CONCURRENT; // 大文档用并发处理
    }
  }

  /**
   * 原有策略（兼容）
   */
  private async parseWithLegacy(
    text: string,
    targetFields: string[] | undefined,
    options: any,
    startTime: number
  ): Promise<OptimizedParseResult> {
    this.logger.log('[Optimized Parser] Using LEGACY mode');

    const result = await this.llmParserService.parseWithMixedStrategy(
      text,
      undefined,
      options?.forceStrategy
    );

    return {
      success: result.success,
      mode: ParseMode.LEGACY,
      extractedDataJson: result.extractedDataJson,
      confidence: result.confidence,
      processingTimeMs: Date.now() - startTime,
      llmModel: result.llmModel,
      llmProvider: result.llmProvider,
      warnings: result.warnings,
      error: result.error,
      strategy: result.strategyUsed,
    };
  }

  /**
   * 语义分段模式
   */
  private async parseWithSemantic(
    text: string,
    targetFields: string[] | undefined,
    options: any,
    startTime: number
  ): Promise<OptimizedParseResult> {
    this.logger.log('[Optimized Parser] Using SEMANTIC mode');

    // Step 1: 语义分段
    const chunks = this.semanticChunker.chunkBySemanticStructure(text);

    // Step 2: 确定目标字段
    const fields = targetFields || this.getAllFields();

    // Step 3: 顺序处理chunks（使用原有LLM调用）
    const mergedData: Record<string, any> = {};
    const taskResults: any[] = [];
    let totalTokensUsed = 0;

    // 只处理相关的chunks
    const relevantChunks = this.semanticChunker.getRelevantChunksForFields(chunks, fields);

    this.logger.log(
      `[Optimized Parser] Processing ${relevantChunks.length} relevant chunks ` +
      `out of ${chunks.length} total`
    );

    for (const chunk of relevantChunks) {
      const chunkStart = Date.now();

      // 调用LLM提取这个chunk
      try {
        const chunkData = await this.extractFromChunk(chunk, fields);

        if (chunkData) {
          // 合并结果
          Object.assign(mergedData, chunkData);

          taskResults.push({
            chunkId: chunk.id,
            success: true,
            data: chunkData,
            processingTimeMs: Date.now() - chunkStart,
          });
        }
      } catch (error) {
        this.logger.warn(`[Optimized Parser] Failed to extract from chunk ${chunk.id}:`, error);
        taskResults.push({
          chunkId: chunk.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          processingTimeMs: Date.now() - chunkStart,
        });
      }
    }

    return {
      success: true,
      mode: ParseMode.SEMANTIC,
      extractedDataJson: mergedData,
      chunks: chunks.map(this.convertChunkInfo),
      totalChunks: chunks.length,
      totalTokensUsed,
      processingTimeMs: Date.now() - startTime,
      confidence: this.calculateConfidence(taskResults),
      llmModel: this.configService.getActiveConfig().model,
      llmProvider: this.configService.getProviderName(),
      strategy: 'semantic-chunking',
    };
  }

  /**
   * RAG模式
   */
  private async parseWithRag(
    text: string,
    targetFields: string[] | undefined,
    options: any,
    startTime: number
  ): Promise<OptimizedParseResult> {
    this.logger.log('[Optimized Parser] Using RAG mode');

    const fields = targetFields || this.getAllFields();
    const maxChunks = options?.maxChunksPerField || 3;

    // 调用RAG解析器
    const data = await this.ragParser.parseWithRag(text, fields, maxChunks);

    return {
      success: true,
      mode: ParseMode.RAG,
      extractedDataJson: data,
      processingTimeMs: Date.now() - startTime,
      llmModel: this.configService.getActiveConfig().model,
      llmProvider: this.configService.getProviderName(),
      strategy: 'rag-enhanced',
    };
  }

  /**
   * 并发模式
   */
  private async parseWithConcurrent(
    text: string,
    targetFields: string[] | undefined,
    options: any,
    startTime: number
  ): Promise<OptimizedParseResult> {
    this.logger.log('[Optimized Parser] Using CONCURRENT mode');

    const fields = targetFields || this.getAllFields();
    const maxConcurrent = options?.maxConcurrent || 3;

    // 调用并发解析器
    const result = await this.concurrentParser.parseConcurrently(text, fields, maxConcurrent);

    // 转换结果格式
    return {
      success: true,
      mode: ParseMode.CONCURRENT,
      extractedDataJson: result.data,
      taskResults: result.results.map(r => ({
        chunkId: r.chunkId,
        success: r.success,
        data: r.data,
        error: r.error,
        tokensUsed: r.tokensUsed,
        processingTimeMs: r.processingTimeMs,
      })),
      totalChunks: result.results.length,
      totalTokensUsed: result.totalTokensUsed,
      processingTimeMs: result.totalTimeMs,
      llmModel: this.configService.getActiveConfig().model,
      llmProvider: this.configService.getProviderName(),
      strategy: 'map-reduce-concurrent',
    };
  }

  /**
   * 从单个chunk提取数据
   */
  private async extractFromChunk(
    chunk: SemanticChunk,
    fields: string[]
  ): Promise<Record<string, any> | null> {
    // 构建针对该chunk的prompt
    const relevantFields = chunk.metadata.fieldRelevance.filter(f => fields.includes(f));

    if (relevantFields.length === 0) {
      return null;
    }

    const config = this.configService.getActiveConfig();
    const prompt = this.buildChunkPrompt(chunk, relevantFields);

    const completion = await this.llmParserService['getClient']().chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的合同信息提取助手。请严格按照JSON格式输出提取结果。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    return JSON.parse(content);
  }

  /**
   * 构建针对chunk的prompt
   */
  private buildChunkPrompt(chunk: SemanticChunk, fields: string[]): string {
    const header = chunk.metadata.title
      ? `【${chunk.metadata.type.toUpperCase()}】${chunk.metadata.title}`
      : `【${chunk.metadata.type.toUpperCase()}】`;

    return `你是一个专业的合同信息提取助手。

${header}

请从以下合同片段中提取指定的字段信息：

【需要提取的字段】
${fields.map(f => `- ${f}`).join('\n')}

【合同片段】
${chunk.text}

【输出要求】
1. 只提取明确存在的信息
2. 如果某个字段在片段中未找到或不确定，设为null
3. 日期格式统一为YYYY-MM-DD
4. 金额只保留数字和小数点，不包含货币符号
5. 以JSON格式输出`;
  }

  /**
   * 获取所有可能的字段
   */
  private getAllFields(): string[] {
    return [
      'contractNo',
      'name',
      'contractType',
      'customerName',
      'ourEntity',
      'amountWithTax',
      'amountWithoutTax',
      'taxRate',
      'paymentTerms',
      'paymentMethod',
      'currency',
      'signedAt',
      'effectiveAt',
      'expiresAt',
      'duration',
      'salesPerson',
      'industry',
      'signLocation',
      'copies',
    ];
  }

  /**
   * 转换chunk信息
   */
  private convertChunkInfo(chunk: SemanticChunk): SemanticChunkInfo {
    return {
      id: chunk.id,
      type: chunk.metadata.type,
      title: chunk.metadata.title,
      articleNumber: chunk.metadata.articleNumber,
      priority: chunk.metadata.priority,
      fieldRelevance: chunk.metadata.fieldRelevance,
      length: chunk.text.length,
      startIndex: chunk.position.start,
      endIndex: chunk.position.end,
      pageHint: chunk.position.pageHint,
    };
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(taskResults: any[]): number {
    if (taskResults.length === 0) return 0;

    const successCount = taskResults.filter(r => r.success).length;
    return successCount / taskResults.length;
  }
}
