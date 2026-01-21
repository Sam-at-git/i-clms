import { Injectable, Logger } from '@nestjs/common';
import { SemanticChunkerService, SemanticChunk } from './semantic-chunker.service';
import { LlmConfigService } from './config/llm-config.service';
import OpenAI from 'openai';

/**
 * 并发提取任务
 */
interface ExtractionTask {
  chunkId: string;
  chunk: SemanticChunk;
  targetFields: string[];
  prompt: string;
}

/**
 * 并发提取结果
 */
interface ExtractionResult {
  chunkId: string;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  tokensUsed?: number;
  processingTimeMs: number;
}

/**
 * 合并策略配置
 */
interface MergeStrategy {
  // 字段优先级：后面的覆盖前面的
  fieldPriority: string[];
  // 对于某些字段，取第一个非空值
  firstNonEmpty: string[];
  // 对于某些字段，取最完整的值（最长）
  longest: string[];
  // 对于某些字段，需要聚合（如数组）
  aggregate: string[];
}

/**
 * 并发解析服务
 *
 * 使用Map-Reduce模式：
 * 1. Map：将chunks分成多个任务，并发处理
 * 2. Reduce：合并所有任务的提取结果
 */
@Injectable()
export class ConcurrentParserService {
  private readonly logger = new Logger(ConcurrentParserService.name);
  private openai: OpenAI | null = null;

  // 并发配置
  private readonly MAX_CONCURRENT_REQUESTS = 3; // 限制并发数，防止API限流
  private readonly REQUEST_TIMEOUT = 60000; // 60秒超时

  // 默认合并策略
  private readonly DEFAULT_MERGE_STRATEGY: MergeStrategy = {
    fieldPriority: ['contractNo', 'name', 'customerName', 'ourEntity', 'contractType'],
    firstNonEmpty: [
      'amountWithTax', 'amountWithoutTax', 'taxRate', 'currency', 'paymentMethod', 'paymentTerms',
      'signedAt', 'effectiveAt', 'expiresAt', 'signLocation', 'salesPerson', 'industry'
    ],
    longest: ['duration'],
    aggregate: ['milestones', 'rateItems', 'lineItems', 'deliverables'],
  };

  constructor(
    private semanticChunker: SemanticChunkerService,
    private configService: LlmConfigService,
  ) {
    this.refreshClient();
  }

  refreshClient() {
    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: this.REQUEST_TIMEOUT,
    });
  }

  /**
   * 主方法：并发解析合同
   *
   * @param text 合同全文
   * @param targetFields 需要提取的字段
   * @param maxConcurrent 最大并发数
   * @returns 提取结果
   */
  async parseConcurrently(
    text: string,
    targetFields: string[],
    maxConcurrent = this.MAX_CONCURRENT_REQUESTS
  ): Promise<{
    data: Record<string, any>;
    results: ExtractionResult[];
    totalTokensUsed: number;
    totalTimeMs: number;
  }> {
    const startTime = Date.now();

    this.logger.log(
      `[Concurrent Parser] Starting: ${text.length} chars, ` +
      `${targetFields.length} fields, concurrency=${maxConcurrent}`
    );

    // Step 1: 语义分段
    const chunks = this.semanticChunker.chunkBySemanticStructure(text);
    this.logger.log(`[Concurrent Parser] Created ${chunks.length} chunks`);

    // Step 2: 为每个chunk创建提取任务
    const tasks = this.createExtractionTasks(chunks, targetFields);
    this.logger.log(`[Concurrent Parser] Created ${tasks.length} extraction tasks`);

    // Step 3: 并发执行任务
    const results = await this.executeTasksConcurrently(tasks, maxConcurrent);

    // Step 4: 合并结果
    const mergedData = this.mergeResults(results, this.DEFAULT_MERGE_STRATEGY);

    const totalTimeMs = Date.now() - startTime;
    const totalTokensUsed = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    this.logger.log(
      `[Concurrent Parser] Completed: ${totalTimeMs}ms, ` +
      `${totalTokensUsed} tokens, ${results.filter(r => r.success).length}/${results.length} successful`
    );

    return {
      data: mergedData,
      results,
      totalTokensUsed,
      totalTimeMs,
    };
  }

  /**
   * 创建提取任务
   */
  private createExtractionTasks(
    chunks: SemanticChunk[],
    targetFields: string[]
  ): ExtractionTask[] {
    return chunks
      .filter(chunk => chunk.text.trim().length > 100) // 过滤过短的chunk
      .map(chunk => {
        // 确定这个chunk应该提取哪些字段
        const relevantFields = this.getRelevantFieldsForChunk(chunk, targetFields);

        return {
          chunkId: chunk.id,
          chunk,
          targetFields: relevantFields,
          prompt: this.buildPromptForChunk(chunk, relevantFields),
        };
      })
      .filter(task => task.targetFields.length > 0); // 过滤没有相关字段的任务
  }

  /**
   * 获取chunk相关的字段
   */
  private getRelevantFieldsForChunk(chunk: SemanticChunk, allFields: string[]): string[] {
    // 基于metadata的fieldRelevance
    const metadataRelevant = chunk.metadata.fieldRelevance.filter(f => allFields.includes(f));

    if (metadataRelevant.length > 0) {
      return metadataRelevant;
    }

    // 对于header和party类型，默认返回基本信息字段
    if (chunk.metadata.type === 'header' || chunk.metadata.type === 'party') {
      const basicFields = ['contractNo', 'name', 'customerName', 'ourEntity'];
      return basicFields.filter(f => allFields.includes(f));
    }

    // 对于financial类型，返回财务字段
    if (chunk.metadata.type === 'financial') {
      const financialFields = ['amountWithTax', 'amountWithoutTax', 'taxRate', 'paymentTerms', 'paymentMethod'];
      return financialFields.filter(f => allFields.includes(f));
    }

    // 对于schedule类型，返回时间字段
    if (chunk.metadata.type === 'schedule') {
      const scheduleFields = ['signedAt', 'effectiveAt', 'expiresAt', 'duration'];
      return scheduleFields.filter(f => allFields.includes(f));
    }

    // 默认返回所有字段（让LLM自己决定）
    return allFields;
  }

  /**
   * 为单个chunk构建prompt
   */
  private buildPromptForChunk(chunk: SemanticChunk, fields: string[]): string {
    const context = chunk.metadata.title
      ? `【${chunk.metadata.type.toUpperCase()}】${chunk.metadata.title}`
      : `【${chunk.metadata.type.toUpperCase()}】`;

    return `你是一个专业的合同信息提取助手。

${context}

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
   * 并发执行任务（带限流）
   */
  private async executeTasksConcurrently(
    tasks: ExtractionTask[],
    maxConcurrent: number
  ): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    const executing: Array<{ promise: Promise<ExtractionResult>; task: ExtractionTask }> = [];

    for (const task of tasks) {
      const taskPromise = this.executeSingleTask(task);
      const promise = taskPromise.then(result => {
        this.logger.debug(
          `[Concurrent Parser] Task ${task.chunkId} completed: ` +
          `${result.success ? 'success' : 'failed'}, ${result.processingTimeMs}ms`
        );
        return result;
      });

      executing.push({ promise, task });

      // 控制并发数
      if (executing.length >= maxConcurrent) {
        // 等待第一个完成的任务
        const [{ promise: completedPromise, task: completedTask }] = await this.waitFirst(executing);
        results.push(await completedPromise);

        // 移除已完成的任务
        const index = executing.findIndex(e => e.task.chunkId === completedTask.chunkId);
        if (index > -1) {
          executing.splice(index, 1);
        }
      }
    }

    // 等待所有剩余任务完成
    const remainingResults = await Promise.all(executing.map(e => e.promise));
    results.push(...remainingResults);

    return results;
  }

  /**
   * 等待第一个promise完成并返回对应的项
   */
  private async waitFirst<T>(
    items: Array<{ promise: Promise<T>; task: ExtractionTask }>
  ): Promise<Array<{ promise: Promise<T>; task: ExtractionTask }>> {
    const wrapped = items.map(async (item) => {
      const result = await item.promise;
      return { item, result };
    });

    const first = await Promise.race(wrapped);
    return [first.item];
  }

  /**
   * 执行单个提取任务
   */
  private async executeSingleTask(task: ExtractionTask): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const config = this.configService.getActiveConfig();

      const completion = await this.openai!.chat.completions.create({
        model: config.model,
        temperature: 0.1,
        max_tokens: config.maxTokens,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的合同信息提取助手。请严格按照JSON格式输出提取结果。',
          },
          {
            role: 'user',
            content: task.prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      const tokensUsed = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

      if (!content) {
        throw new Error('Empty response from LLM');
      }

      const data = JSON.parse(content);

      // 只保留目标字段
      const filteredData: Record<string, any> = {};
      for (const field of task.targetFields) {
        if (data[field] !== undefined && data[field] !== null) {
          filteredData[field] = data[field];
        }
      }

      return {
        chunkId: task.chunkId,
        success: true,
        data: filteredData,
        tokensUsed,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Concurrent Parser] Task ${task.chunkId} failed:`, errorMessage);

      return {
        chunkId: task.chunkId,
        success: false,
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 合并所有提取结果
   */
  private mergeResults(
    results: ExtractionResult[],
    strategy: MergeStrategy
  ): Record<string, any> {
    const merged: Record<string, any> = {};

    // 收集所有成功的提取数据
    const successfulResults = results.filter(r => r.success && r.data);

    for (const field of strategy.fieldPriority) {
      // 优先级高的字段，从第一个非空值开始取
      for (const result of successfulResults) {
        if (result.data![field] !== undefined && result.data![field] !== null) {
          merged[field] = result.data![field];
          break;
        }
      }
    }

    for (const field of strategy.firstNonEmpty) {
      if (merged[field]) continue; // 已经设置过了
      for (const result of successfulResults) {
        if (result.data![field] !== undefined && result.data![field] !== null) {
          merged[field] = result.data![field];
          break;
        }
      }
    }

    for (const field of strategy.longest) {
      if (merged[field]) continue;
      let longestValue: any = null;
      let longestLength = 0;

      for (const result of successfulResults) {
        const value = result.data![field];
        if (value && String(value).length > longestLength) {
          longestValue = value;
          longestLength = String(value).length;
        }
      }

      merged[field] = longestValue;
    }

    for (const field of strategy.aggregate) {
      // 聚合字段：收集所有值到数组
      const values: any[] = [];
      for (const result of successfulResults) {
        if (result.data![field]) {
          if (Array.isArray(result.data![field])) {
            values.push(...result.data![field]);
          } else {
            values.push(result.data![field]);
          }
        }
      }

      if (values.length > 0) {
        merged[field] = values;
      }
    }

    return merged;
  }
}
