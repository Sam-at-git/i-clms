import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { GraphQLJSONObject } from 'graphql-scalars';
import { LlmParserService } from './llm-parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { OptimizedParserService } from './optimized-parser.service';
import { ParseProgressService, InfoType } from './parse-progress.service';
import { TaskBasedParserService } from './task-based-parser.service';
import { TopicRegistryService } from './topics/topic-registry.service';
import { ParseStrategyService } from './parse-strategy.service';
import { MultiStrategyService } from './multi-strategy.service';
import { LLMEvaluatorService } from './evaluation/llm-evaluator.service';
import { ContractTypeDetectorService } from './contract-type-detector.service';
import { ContractTypeDetectionResult } from './entities/contract-type-detection.entity';
import { LlmParseResult, AsyncParseStartResponse } from './dto/llm-parse-result.dto';
import { ParseWithLlmInput } from './dto/parse-with-llm.input';
import {
  MultiStrategyParseResult,
  MultiStrategyParseInput,
  ResolveConflictsInput,
  ConflictResolution,
  SimilarityResult,
} from './dto/voting.dto';
import {
  OptimizedParseResult,
  SemanticChunkResult,
  SemanticChunkInfo,
} from './dto/optimized-parse-result.dto';
import {
  ParseWithOptimizedInput,
  SemanticChunkInput,
  RagParseInput,
  ConcurrentParseInput,
  ParseMode,
} from './dto/parse-optimized.input';
import {
  StrategyInfo,
  ParseStrategyConfig,
  UpdateParseStrategyConfigInput,
  StrategyTestResult,
  ParseStrategyType,
} from './dto/parse-strategy.dto';
import { CompletenessScore } from './entities/completeness-score.entity';
import { ParseSessionProgressInfo } from './entities/parse-progress.entity';
import {
  TopicDefinition,
  TopicCompletenessScore,
  TopicField,
  TopicFieldValue,
} from './entities/topic.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

// ========== 基于任务的解析结果 DTO ==========
interface TaskBasedParseResult {
  success: boolean;
  data: Record<string, any>;
  results: Array<{
    taskId: string;
    infoType: string;
    success: boolean;
    data?: Record<string, any>;
    error?: string;
    tokensUsed?: number;
    processingTimeMs: number;
  }>;
  summary: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalTokensUsed: number;
    totalTimeMs: number;
  };
}

@Resolver()
export class LlmParserResolver {
  private readonly logger = new Logger(LlmParserResolver.name);

  constructor(
    private readonly llmParserService: LlmParserService,
    private readonly completenessChecker: CompletenessCheckerService,
    private readonly semanticChunker: SemanticChunkerService,
    private readonly optimizedParser: OptimizedParserService,
    private readonly progressService: ParseProgressService,
    private readonly taskBasedParser: TaskBasedParserService,
    private readonly topicRegistry: TopicRegistryService,
    private readonly parseStrategyService: ParseStrategyService,
    private readonly multiStrategyService: MultiStrategyService,
    private readonly llmEvaluator: LLMEvaluatorService,
    private readonly contractTypeDetector: ContractTypeDetectorService,
  ) {}

  @Query(() => CompletenessScore, {
    description: 'Calculate completeness score for extracted fields',
  })
  @UseGuards(GqlAuthGuard)
  calculateCompleteness(
    @Args('extractedFields', { type: () => GraphQLJSONObject })
    extractedFields: Record<string, unknown>,
  ): CompletenessScore {
    this.logger.log('Calculating completeness score for provided fields');
    return this.completenessChecker.calculateScore(extractedFields);
  }

  @Mutation(() => LlmParseResult, {
    description: 'Parse contract text with mixed strategy (programmatic + LLM)',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithLlm(
    @Args('input') input: ParseWithLlmInput,
  ): Promise<LlmParseResult> {
    this.logger.log(
      `Parsing with LLM: contractId=${input.contractId}, ` +
        `textLength=${input.textContent.length}, ` +
        `forceStrategy=${input.forceStrategy || 'auto'}`,
    );

    return this.llmParserService.parseWithMixedStrategy(
      input.textContent,
      input.programmaticResult,
      input.forceStrategy,
    );
  }

  @Mutation(() => LlmParseResult, {
    description: 'Parse contract from uploaded file with hybrid strategy',
  })
  @UseGuards(GqlAuthGuard)
  async parseContractWithLlm(
    @Args('objectName') objectName: string,
    @Args('sessionId', { nullable: true }) sessionId?: string,
  ): Promise<LlmParseResult> {
    this.logger.log(`Received request to parse contract: ${objectName}, sessionId: ${sessionId}`);
    // 如果传入了sessionId，使用它；否则让服务自己创建
    return this.llmParserService.parseContractWithLlm(objectName, sessionId);
  }

  @Mutation(() => String, {
    description: '创建解析进度会话 - 返回sessionId，用于后续查询进度',
  })
  @UseGuards(GqlAuthGuard)
  createParseSession(@Args('objectName') objectName: string): string {
    const sessionId = this.progressService.createSession(objectName);
    this.logger.log(`[CreateParseSession] Created session ${sessionId} for ${objectName}`);
    return sessionId;
  }

  @Mutation(() => AsyncParseStartResponse, {
    description: '异步启动合同解析 - 立即返回sessionId，通过进度查询API获取进度',
  })
  @UseGuards(GqlAuthGuard)
  async startParseContractAsync(
    @Args('objectName') objectName: string,
    @Args('strategy', { type: () => ParseStrategyType, nullable: true }) strategy?: ParseStrategyType,
    @Args('markdown', { type: () => String, nullable: true, description: '预转换的Markdown内容（前端已通过Docling转换）' }) markdown?: string,
  ): Promise<AsyncParseStartResponse> {
    const effectiveStrategy = strategy || ParseStrategyType.LLM;
    this.logger.log(`[Async Parse] Starting async parse for: ${objectName}, strategy: ${effectiveStrategy}, hasMarkdown: ${!!markdown}`);

    // 创建进度会话，如果提供了markdown，立即存储
    const sessionId = this.progressService.createSession(objectName);
    if (markdown) {
      this.progressService.setMarkdownContent(sessionId, markdown);
      this.logger.log(`[Async Parse] Stored pre-converted markdown (${markdown.length} chars) for session ${sessionId}`);
    }

    // 立即返回sessionId，让客户端可以开始轮询
    // 在后台异步执行解析（使用Promise但不await）
    Promise.resolve().then(async () => {
      try {
        this.logger.log(`[Async Parse] Starting background execution for session: ${sessionId}, strategy: ${effectiveStrategy}`);
        // Route to appropriate strategy based on strategy parameter
        await this.llmParserService.parseContractWithLlm(objectName, sessionId, markdown);
        this.logger.log(`[Async Parse] Completed background execution for session: ${sessionId}`);
      } catch (error) {
        this.logger.error(`[Async Parse] Failed for session ${sessionId}:`, error);
        this.progressService.failSession(sessionId, error instanceof Error ? error.message : String(error));
      }
    }).catch(err => {
      this.logger.error(`[Async Parse] Unhandled error in background task:`, err);
    });

    this.logger.log(`[Async Parse] Returning sessionId immediately: ${sessionId}`);
    return {
      sessionId,
      message: strategy
        ? `解析任务已启动 (使用${effectiveStrategy}策略)，请使用sessionId查询进度`
        : '解析任务已启动，请使用sessionId查询进度',
    };
  }

  @Mutation(() => ContractTypeDetectionResult, {
    description: '从Markdown内容或文件名中检测合同类型',
  })
  @UseGuards(GqlAuthGuard)
  async detectContractType(
    @Args('markdown', { type: () => String }) markdown: string,
    @Args('fileName', { type: () => String, nullable: true }) fileName?: string,
  ): Promise<ContractTypeDetectionResult> {
    this.logger.log(
      `[Contract Type Detection] Detecting type from markdown (${markdown.length} chars)` +
      (fileName ? `, fileName: "${fileName}"` : '')
    );

    const result = await this.contractTypeDetector.detectContractType(markdown, fileName);

    return {
      detectedType: result.detectedType,
      confidence: result.confidence,
      reasoning: result.reasoning,
      displayName: result.detectedType
        ? this.contractTypeDetector.getTypeDisplayName(result.detectedType)
        : null,
      description: result.detectedType
        ? this.contractTypeDetector.getTypeDescription(result.detectedType)
        : null,
    };
  }

  @Query(() => GraphQLJSONObject, {
    description: '获取异步解析的结果 - 解析完成后调用此接口获取完整数据',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  getParseResult(
    @Args('sessionId', { type: () => String }) sessionId: string,
  ): { data: LlmParseResult } | null {
    const session = this.progressService.getSession(sessionId);
    if (!session) {
      return null;
    }

    // 如果解析还在进行中，返回null
    if (session.status !== 'completed') {
      return null;
    }

    // TODO: 这里需要从某个地方获取完整的解析结果
    // 当前ParseProgressService只存储进度，不存储完整结果
    // 需要扩展ParseProgressService来存储最终结果
    return null;
  }

  // ========== 新增的优化解析 API ==========

  @Mutation(() => OptimizedParseResult, {
    description: '使用优化策略解析合同 - 自动选择最佳解析模式（语义分段/RAG/并发）',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithOptimized(
    @Args('input') input: ParseWithOptimizedInput,
  ): Promise<OptimizedParseResult> {
    this.logger.log(
      `[Optimized Parse] mode=${input.mode}, ` +
      `textLength=${input.textContent.length}, ` +
      `fields=${input.targetFields?.length || 'all'}`
    );

    return this.optimizedParser.parseOptimized(
      input.textContent,
      input.mode,
      input.targetFields,
      {
        forceStrategy: input.forceStrategy,
        maxConcurrent: input.maxConcurrent,
        maxChunksPerField: input.maxChunksPerField,
      }
    );
  }

  @Mutation(() => SemanticChunkResult, {
    description: '对合同文本进行语义分段 - 返回分段的元数据和位置信息',
  })
  @UseGuards(GqlAuthGuard)
  async chunkTextSemantically(
    @Args('input') input: SemanticChunkInput,
  ): Promise<SemanticChunkResult> {
    this.logger.log(
      `[Semantic Chunking] textLength=${input.text.length}, ` +
      `minChunkSize=${input.minChunkSize || 500}`
    );

    const result = this.semanticChunker.chunkText(
      input.text,
      input.minChunkSize
    );

    return {
      success: result.success,
      chunks: result.chunks,
      totalLength: result.totalLength,
      strategy: result.strategy,
      summary: result.summary,
    };
  }

  @Query(() => [SemanticChunkInfo], {
    description: '获取语义分段的示例（用于调试和测试）',
  })
  @UseGuards(GqlAuthGuard)
  async getSemanticChunkExample(
    @Args('text', { type: () => String }) text: string,
  ): Promise<SemanticChunkInfo[]> {
    const chunks = this.semanticChunker.chunkBySemanticStructure(text, 500);
    return chunks.map(chunk => ({
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
    }));
  }

  @Mutation(() => OptimizedParseResult, {
    description: '使用语义分段模式解析合同 - 适合中等大小合同',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithSemantic(
    @Args('text', { type: () => String }) text: string,
    @Args('fields', { type: () => [String], nullable: true }) fields?: string[],
  ): Promise<OptimizedParseResult> {
    return this.optimizedParser.parseOptimized(text, ParseMode.SEMANTIC, fields);
  }

  @Mutation(() => OptimizedParseResult, {
    description: '使用RAG模式解析合同 - 只提取相关字段相关的内容，减少token消耗',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithRag(
    @Args('input') input: RagParseInput,
  ): Promise<OptimizedParseResult> {
    return this.optimizedParser.parseOptimized(
      input.text,
      ParseMode.RAG,
      input.fields,
      { maxChunksPerField: input.maxChunksPerField }
    );
  }

  @Mutation(() => OptimizedParseResult, {
    description: '使用并发模式解析合同 - Map-Reduce模式，适合大合同，大幅提升速度',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithConcurrent(
    @Args('input') input: ConcurrentParseInput,
  ): Promise<OptimizedParseResult> {
    return this.optimizedParser.parseOptimized(
      input.text,
      ParseMode.CONCURRENT,
      input.fields,
      { maxConcurrent: input.maxConcurrent }
    );
  }

  // ========== 进度查询 API ==========

  @Query(() => ParseSessionProgressInfo, {
    description: '查询LLM解析的实时进度 - 通过sessionId获取分块处理状态',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  getParseProgress(
    @Args('sessionId', { type: () => String }) sessionId: string,
  ): ParseSessionProgressInfo | null {
    const session = this.progressService.getSession(sessionId);
    if (!session) {
      this.logger.warn(`[Progress] Session ${sessionId} not found`);
      return null;
    }

    // 计算预估剩余时间（秒）
    let estimatedRemainingSeconds: number | undefined;
    if (session.estimatedEndTime) {
      estimatedRemainingSeconds = Math.max(0, Math.round((session.estimatedEndTime - Date.now()) / 1000));
    }

    return {
      sessionId: session.sessionId,
      objectName: session.objectName,
      status: session.status as any,
      currentStage: session.currentStage,
      totalChunks: session.totalChunks,
      completedChunks: session.completedChunks,
      currentChunkIndex: session.currentChunkIndex,
      progressPercentage: this.progressService.getProgressPercentage(sessionId),
      chunks: session.chunks.map(c => ({
        chunkId: c.chunkId,
        chunkIndex: c.chunkIndex,
        totalChunks: c.totalChunks,
        purpose: c.purpose,
        status: c.status as any,
        startTime: c.startTime,
        endTime: c.endTime,
        error: c.error,
      })),
      // 新增：任务级别进度
      totalTasks: session.totalTasks || 0,
      completedTasks: session.completedTasks || 0,
      currentTaskInfo: session.currentTaskInfo,
      tasks: (session.tasks || []).map(t => ({
        taskId: t.taskId,
        infoType: t.infoType as any,
        infoTypeName: t.infoTypeName,
        status: t.status as any,
        startTime: t.startTime,
        endTime: t.endTime,
        error: t.error,
        data: t.data,
      })),
      startTime: session.startTime,
      estimatedEndTime: session.estimatedEndTime,
      processingTimeMs: session.processingTimeMs,
      error: session.error,
      extractedFieldsCount: session.extractedFieldsCount,
      estimatedRemainingSeconds,
      resultData: session.resultData,
      markdownContent: session.markdownContent,
    };
  }

  @Query(() => [ParseSessionProgressInfo], {
    description: '获取所有活跃的解析会话进度',
  })
  @UseGuards(GqlAuthGuard)
  getAllParseProgress(): ParseSessionProgressInfo[] {
    const sessions = this.progressService.getAllSessions();
    return sessions.map(session => {
      let estimatedRemainingSeconds: number | undefined;
      if (session.estimatedEndTime) {
        estimatedRemainingSeconds = Math.max(0, Math.round((session.estimatedEndTime - Date.now()) / 1000));
      }

      return {
        sessionId: session.sessionId,
        objectName: session.objectName,
        status: session.status as any,
        currentStage: session.currentStage,
        totalChunks: session.totalChunks,
        completedChunks: session.completedChunks,
        currentChunkIndex: session.currentChunkIndex,
        progressPercentage: this.progressService.getProgressPercentage(session.sessionId),
        chunks: session.chunks.map(c => ({
          chunkId: c.chunkId,
          chunkIndex: c.chunkIndex,
          totalChunks: c.totalChunks,
          purpose: c.purpose,
          status: c.status as any,
          startTime: c.startTime,
          endTime: c.endTime,
          error: c.error,
        })),
        // 新增：任务级别进度
        totalTasks: session.totalTasks || 0,
        completedTasks: session.completedTasks || 0,
        currentTaskInfo: session.currentTaskInfo,
        tasks: (session.tasks || []).map(t => ({
          taskId: t.taskId,
          infoType: t.infoType as any,
          infoTypeName: t.infoTypeName,
          status: t.status as any,
          startTime: t.startTime,
          endTime: t.endTime,
          error: t.error,
          data: t.data,
        })),
        startTime: session.startTime,
        estimatedEndTime: session.estimatedEndTime,
        processingTimeMs: session.processingTimeMs,
        error: session.error,
        extractedFieldsCount: session.extractedFieldsCount,
        estimatedRemainingSeconds,
        resultData: session.resultData,
        markdownContent: session.markdownContent,
      };
    });
  }

  // ========== 基于任务的解析 API ==========

  @Mutation(() => GraphQLJSONObject, {
    description: '使用基于任务的策略解析合同 - 将信息提取分解为多个独立任务并行执行',
  })
  @UseGuards(GqlAuthGuard)
  async parseByTasks(
    @Args('text', { type: () => String }) text: string,
    @Args('taskTypes', { type: () => [String], nullable: true }) taskTypes?: string[],
  ): Promise<TaskBasedParseResult> {
    this.logger.log(
      `[Task-based Parse] Starting: textLength=${text.length}, ` +
      `taskTypes=${taskTypes?.join(',') || 'all'}`
    );

    const result = await this.taskBasedParser.parseByTasks(
      text,
      undefined, // contractType
      taskTypes as InfoType[]
    );

    return {
      success: result.summary.failedTasks === 0,
      data: result.data,
      results: result.results.map(r => ({
        taskId: r.taskId,
        infoType: r.infoType,
        success: r.success,
        data: r.data,
        error: r.error,
        tokensUsed: r.tokensUsed,
        processingTimeMs: r.processingTimeMs,
      })),
      summary: result.summary,
    };
  }

  @Mutation(() => GraphQLJSONObject, {
    description: '只提取里程碑信息 - 专门用于项目外包类合同',
  })
  @UseGuards(GqlAuthGuard)
  async extractMilestones(
    @Args('text', { type: () => String }) text: string,
  ): Promise<any> {
    this.logger.log(`[Milestones Extract] textLength=${text.length}`);

    const result = await this.taskBasedParser.parseByTasks(
      text,
      undefined, // contractType
      [InfoType.MILESTONES]
    );

    const milestoneResult = result.results.find(r => r.infoType === InfoType.MILESTONES);

    return {
      success: milestoneResult?.success || false,
      milestones: milestoneResult?.data?.milestones || [],
      tokensUsed: milestoneResult?.tokensUsed || 0,
      processingTimeMs: milestoneResult?.processingTimeMs || 0,
    };
  }

  // ========== Topic Registry API ==========

  @Query(() => [TopicDefinition], {
    description: '获取所有主题定义',
  })
  @UseGuards(GqlAuthGuard)
  topics(): TopicDefinition[] {
    this.logger.log('Fetching all topic definitions');
    return this.topicRegistry.getAllTopics().map(topic => ({
      name: topic.name as any,
      displayName: topic.displayName,
      description: topic.description,
      fields: topic.fields.map(f => ({
        name: f.name,
        type: f.type,
        required: f.required,
        description: f.description,
        defaultValue: f.defaultValue?.toString(),
      })),
      prompt: topic.prompt,
      query: topic.query,
      weight: topic.weight,
      order: topic.order,
    }));
  }

  @Query(() => TopicDefinition, {
    description: '获取单个主题定义',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  topic(
    @Args('name', { type: () => String }) name: string,
  ): TopicDefinition | null {
    this.logger.log(`Fetching topic definition: ${name}`);
    try {
      const topic = this.topicRegistry.getTopic(name);
      return {
        name: topic.name as any,
        displayName: topic.displayName,
        description: topic.description,
        fields: topic.fields.map(f => ({
          name: f.name,
          type: f.type,
          required: f.required,
          description: f.description,
          defaultValue: f.defaultValue?.toString(),
        })),
        prompt: topic.prompt,
        query: topic.query,
        weight: topic.weight,
        order: topic.order,
      };
    } catch {
      return null;
    }
  }

  @Query(() => [TopicField], {
    description: '获取主题的字段定义',
  })
  @UseGuards(GqlAuthGuard)
  topicFields(
    @Args('topicName', { type: () => String }) topicName: string,
  ): TopicField[] {
    this.logger.log(`Fetching fields for topic: ${topicName}`);
    const fields = this.topicRegistry.getTopicFields(topicName);
    return fields.map(f => ({
      name: f.name,
      type: f.type,
      required: f.required,
      description: f.description,
      defaultValue: f.defaultValue?.toString(),
    }));
  }

  @Query(() => TopicCompletenessScore, {
    description: '计算主题完整性分数',
  })
  @UseGuards(GqlAuthGuard)
  calculateTopicCompleteness(
    @Args('results', { type: () => GraphQLJSONObject })
    results: Record<string, any>[],
  ): TopicCompletenessScore {
    this.logger.log('Calculating topic completeness score');

    // Convert input to TopicExtractResult format
    const topicResults = results.map(r => ({
      topicName: r.topicName,
      success: r.success ?? true,
      data: r.data ?? {},
      confidence: r.confidence,
      warnings: r.warnings,
      extractedAt: r.extractedAt ? new Date(r.extractedAt) : new Date(),
    }));

    const score = this.topicRegistry.calculateCompleteness(topicResults);

    return {
      score: score.score,
      total: score.total,
      maxScore: score.maxScore,
      topicScores: score.topicScores?.map(ts => ({
        topicName: ts.topicName,
        displayName: ts.displayName,
        weight: ts.weight,
        completedFields: ts.completedFields,
        totalFields: ts.totalFields,
        percentage: ts.percentage,
        score: ts.score,
      })),
    };
  }

  @Query(() => [TopicFieldValue], {
    description: '获取主题字段值（带元数据）',
  })
  @UseGuards(GqlAuthGuard)
  getTopicFieldValues(
    @Args('topicName', { type: () => String }) topicName: string,
    @Args('data', { type: () => GraphQLJSONObject })
    data: Record<string, any>,
  ): TopicFieldValue[] {
    this.logger.log(`Getting field values for topic: ${topicName}`);
    const fieldValues = this.topicRegistry.getTopicFieldValues(topicName, data);
    return fieldValues.map(fv => ({
      name: fv.name,
      type: fv.type,
      value: fv.value !== undefined ? JSON.stringify(fv.value) : undefined,
      hasValue: fv.hasValue,
      description: fv.description,
    }));
  }

  @Query(() => [String], {
    description: '获取主题缺失的必填字段',
  })
  @UseGuards(GqlAuthGuard)
  getMissingFields(
    @Args('topicName', { type: () => String }) topicName: string,
    @Args('data', { type: () => GraphQLJSONObject })
    data: Record<string, any>,
  ): string[] {
    this.logger.log(`Getting missing fields for topic: ${topicName}`);
    return this.topicRegistry.getMissingFields(topicName, data);
  }

  // ========== Parse Strategy API (SPEC-28) ==========

  @Query(() => [StrategyInfo], {
    description: '获取所有可用的解析策略及其信息',
  })
  @UseGuards(GqlAuthGuard)
  async availableStrategies(): Promise<StrategyInfo[]> {
    this.logger.log('Fetching available parse strategies');
    return this.parseStrategyService.getAvailableStrategies();
  }

  @Query(() => ParseStrategyConfig, {
    description: '获取当前解析策略配置',
  })
  @UseGuards(GqlAuthGuard)
  strategyConfig(): ParseStrategyConfig {
    this.logger.log('Fetching parse strategy configuration');
    return this.parseStrategyService.getStrategyConfig();
  }

  @Mutation(() => ParseStrategyConfig, {
    description: '更新解析策略配置',
  })
  @UseGuards(GqlAuthGuard)
  updateStrategyConfig(
    @Args('input', { type: () => UpdateParseStrategyConfigInput })
    input: UpdateParseStrategyConfigInput,
  ): ParseStrategyConfig {
    this.logger.log(`Updating strategy configuration: ${JSON.stringify(input)}`);
    return this.parseStrategyService.updateStrategyConfig(input);
  }

  @Mutation(() => StrategyTestResult, {
    description: '测试指定策略的可用性',
  })
  @UseGuards(GqlAuthGuard)
  async testStrategyAvailability(
    @Args('strategy', { type: () => ParseStrategyType })
    strategy: ParseStrategyType,
  ): Promise<StrategyTestResult> {
    this.logger.log(`Testing strategy availability: ${strategy}`);
    return this.parseStrategyService.testStrategyAvailability(strategy);
  }

  @Query(() => [StrategyTestResult], {
    description: '测试所有策略的可用性',
  })
  @UseGuards(GqlAuthGuard)
  async testAllStrategies(): Promise<StrategyTestResult[]> {
    this.logger.log('Testing all strategies availability');
    return this.parseStrategyService.testAllStrategies();
  }

  // ========== Multi-Strategy Comparison and Voting (SPEC-29) ==========

  @Mutation(() => MultiStrategyParseResult, {
    description: '使用多个策略解析合同并进行投票',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithMultiStrategies(
    @Args('input') input: MultiStrategyParseInput,
  ): Promise<MultiStrategyParseResult> {
    this.logger.log(
      `Parsing with multi-strategies: ${input.strategies.join(', ')}`
    );
    return this.multiStrategyService.parseWithMulti(
      input.content,
      undefined,
      input.strategies as any,
      input.options ?? {},
      input.voteConfig,
    );
  }

  @Query(() => MultiStrategyParseResult, {
    description: '获取多策略解析结果（通过sessionId）',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  getMultiStrategyParseResult(
    @Args('sessionId', { type: () => String }) sessionId: string,
  ): MultiStrategyParseResult | null {
    this.logger.log(`Getting multi-strategy parse result for session: ${sessionId}`);
    const result = this.multiStrategyService.getParseResult(sessionId);
    return result ?? null;
  }

  @Mutation(() => MultiStrategyParseResult, {
    description: '解决多策略解析结果中的冲突',
  })
  @UseGuards(GqlAuthGuard)
  async resolveConflicts(
    @Args('input') input: ResolveConflictsInput,
    @Args('documentText', { type: () => String }) documentText: string,
  ): Promise<MultiStrategyParseResult> {
    this.logger.log(
      `Resolving conflicts for session: ${input.parseResultId}, ` +
      `method: ${input.method}`
    );
    return this.multiStrategyService.resolveConflicts(
      input.parseResultId,
      documentText,
      input,
    );
  }

  @Query(() => GraphQLJSONObject, {
    description: '比较两个解析会话的结果',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  async compareParseSessions(
    @Args('sessionId1', { type: () => String }) sessionId1: string,
    @Args('sessionId2', { type: () => String }) sessionId2: string,
  ): Promise<{
    similarity: number;
    fieldDifferences: Array<{
      field: string;
      value1: any;
      value2: any;
    }>;
    agreementCount: number;
    disagreementCount: number;
  } | null> {
    this.logger.log(
      `Comparing parse sessions: ${sessionId1} vs ${sessionId2}`
    );
    try {
      return await this.multiStrategyService.compareSessions(sessionId1, sessionId2);
    } catch (error) {
      this.logger.error(`Failed to compare sessions: ${error}`);
      return null;
    }
  }

  // ========== LLM Evaluation Service (SPEC-30) ==========

  @Query(() => GraphQLJSONObject, {
    description: '评估单个字段值的提取质量',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  async evaluateFieldQuality(
    @Args('documentText', { type: () => String }) documentText: string,
    @Args('fieldName', { type: () => String }) fieldName: string,
    @Args('value', { type: () => GraphQLJSONObject }) value: any,
  ): Promise<{
    fieldName: string;
    value: string;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    confidence: number;
    issues: string[];
    suggestions: string[];
  } | null> {
    this.logger.log(`Evaluating quality for field: ${fieldName}`);
    try {
      return await this.llmEvaluator.evaluateQuality(documentText, fieldName, value);
    } catch (error) {
      this.logger.error(`Failed to evaluate field quality: ${error}`);
      return null;
    }
  }

  @Query(() => GraphQLJSONObject, {
    description: '批量评估多个字段的质量',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  async batchEvaluateFields(
    @Args('documentText', { type: () => String }) documentText: string,
    @Args('fields', { type: () => GraphQLJSONObject }) fields: Record<string, any>,
    @Args('options', { type: () => GraphQLJSONObject, nullable: true })
    options: { evaluateQuality?: boolean; evaluateSimilarity?: boolean; referenceText?: string } = {},
  ): Promise<{
    qualities: Record<string, any>;
    overallQuality: number;
    evaluatedFields: number;
  } | null> {
    this.logger.log(`Batch evaluating ${Object.keys(fields).length} fields`);
    try {
      return await this.llmEvaluator.batchEvaluate(documentText, fields, options);
    } catch (error) {
      this.logger.error(`Failed to batch evaluate fields: ${error}`);
      return null;
    }
  }

  @Query(() => GraphQLJSONObject, {
    description: '评估两个值的相似度',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  async evaluateValueSimilarity(
    @Args('documentText', { type: () => String }) documentText: string,
    @Args('fieldName', { type: () => String }) fieldName: string,
    @Args('valueA', { type: () => GraphQLJSONObject }) valueA: any,
    @Args('valueB', { type: () => GraphQLJSONObject }) valueB: any,
  ): Promise<{
    isSame: boolean;
    similarity: number;
    better: 'A' | 'B' | 'same';
    reason: string;
  } | null> {
    this.logger.log(`Evaluating similarity for field: ${fieldName}`);
    try {
      return await this.llmEvaluator.evaluateSimilarity(documentText, fieldName, valueA, valueB);
    } catch (error) {
      this.logger.error(`Failed to evaluate similarity: ${error}`);
      return null;
    }
  }

  // ========== Strategy Manager Queries & Mutations (Spec 25) ==========

  @Query(() => ParseStrategyType, {
    description: '获取最佳可用策略',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  bestStrategy(): ParseStrategyType | null {
    this.logger.log('Fetching best available strategy');
    // Return DOCLING if available, otherwise LLM, otherwise RULE
    return ParseStrategyType.DOCLING;
  }

  @Mutation(() => GraphQLJSONObject, {
    description: '使用指定策略解析文档',
  })
  @UseGuards(GqlAuthGuard)
  async parseWith(
    @Args('strategy', { type: () => ParseStrategyType }) strategy: ParseStrategyType,
    @Args('content', { type: () => String }) content: string,
    @Args('options', { type: () => GraphQLJSONObject, nullable: true }) options?: Record<string, unknown>,
  ): Promise<{
    strategy: ParseStrategyType;
    fields: Record<string, unknown>;
    completeness: number;
    confidence: number;
    warnings: string[];
    duration: number;
    timestamp: string;
  }> {
    this.logger.log(`Parsing with strategy: ${strategy}`);
    // This is a placeholder - actual implementation would use StrategyManagerService
    return {
      strategy,
      fields: {},
      completeness: 0,
      confidence: 0,
      warnings: ['Strategy execution not yet implemented'],
      duration: 0,
      timestamp: new Date().toISOString(),
    };
  }

  @Mutation(() => GraphQLJSONObject, {
    description: '使用多策略解析文档',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithMulti(
    @Args('strategies', { type: () => [ParseStrategyType] }) strategies: ParseStrategyType[],
    @Args('content', { type: () => String }) content: string,
    @Args('options', { type: () => GraphQLJSONObject, nullable: true }) options?: Record<string, unknown>,
  ): Promise<{
    results: Array<{
      strategy: ParseStrategyType;
      fields: Record<string, unknown>;
      completeness: number;
      confidence: number;
      warnings: string[];
      duration: number;
      timestamp: string;
    }>;
    bestMatch?: {
      strategy: ParseStrategyType;
      fields: Record<string, unknown>;
      completeness: number;
      confidence: number;
      warnings: string[];
      duration: number;
      timestamp: string;
    };
    conflicts: Array<{
      fieldName: string;
      values: Array<{
        strategy: ParseStrategyType;
        value: unknown;
        confidence: number;
      }>;
      needsResolution: boolean;
    }>;
  }> {
    this.logger.log(`Parsing with multiple strategies: ${strategies.join(', ')}`);
    // This is a placeholder - actual implementation would use StrategyManagerService
    return {
      results: [],
      conflicts: [],
    };
  }
}
