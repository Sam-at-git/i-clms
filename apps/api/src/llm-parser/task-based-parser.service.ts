import { Injectable, Logger, Optional, OnModuleInit } from '@nestjs/common';
import { LlmConfigService } from './config/llm-config.service';
import { SemanticChunkerService, SemanticChunk } from './semantic-chunker.service';
import { ParseProgressService, InfoType } from './parse-progress.service';
import { TopicRegistryService } from './topics/topic-registry.service';
import { RuleEnhancedParserService } from './rule-enhanced-parser.service';
import { ResultValidatorService } from './result-validator.service';
import { ContractTypeDetectorService } from './contract-type-detector.service';
import { ChunkTaskTaggerService, TaggedChunk } from './chunk-task-tagger.service';
import { OllamaChatClient } from './clients/ollama-chat.client';
import { getTopicSchema } from './schemas/topic-json-schemas';
import { ExtractTopic, infoTypeToExtractTopic } from './topics/topics.const';
import { BASIC_INFO_CHUNK_PROMPT_TEMPLATE } from './prompts/contract-extraction.prompt';
import { MarkdownCleaner } from '../llm-utils/markdown-cleaner.util';
import { JsonTolerantParser } from '../llm-utils/json-tolerant-parser.util';
import OpenAI from 'openai';
import * as fs from 'fs';

/**
 * 提取任务定义
 */
interface ExtractionTask {
  id: string;
  infoType: InfoType;
  description: string;
  promptBuilder: (text: string, chunks?: any[]) => string;
  targetFields: string[];
  requiresChunks?: boolean;  // 是否需要分段处理
}

/**
 * 任务执行结果
 */
interface TaskResult {
  taskId: string;
  infoType: InfoType;
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  tokensUsed?: number;
  processingTimeMs: number;
  /** 是否使用了 Ollama format 参数 */
  usedOllamaFormat?: boolean;
}

/**
 * 任务配置
 */
interface TaskConfig {
  enabled: boolean;
  priority: number;  // 优先级，数字越小优先级越高
  maxRetries: number;
}

/**
 * 基于任务的合同解析服务
 *
 * 核心思想：将合同信息提取分解为多个独立任务
 * - 每个任务专注于提取某一类信息
 * - 每个任务有专门的prompt模板
 * - 任务可以并行执行
 * - 某一类信息提取失败不影响其他类
 */
@Injectable()
export class TaskBasedParserService implements OnModuleInit {
  private readonly logger = new Logger(TaskBasedParserService.name);
  private openai: OpenAI | null = null;
  private readonly debugLogFile = '/tmp/task-based-parser-debug.log';

  // 任务配置（可从数据库或配置文件读取）
  private readonly taskConfigs: Record<InfoType, TaskConfig> = {
    [InfoType.BASIC_INFO]: { enabled: true, priority: 1, maxRetries: 2 },
    [InfoType.FINANCIAL]: { enabled: true, priority: 2, maxRetries: 2 },
    [InfoType.MILESTONES]: { enabled: true, priority: 3, maxRetries: 2 },
    [InfoType.RATE_ITEMS]: { enabled: true, priority: 4, maxRetries: 2 },
    [InfoType.LINE_ITEMS]: { enabled: true, priority: 5, maxRetries: 2 },
    [InfoType.RISK_CLAUSES]: { enabled: true, priority: 6, maxRetries: 1 },
    [InfoType.DELIVERABLES]: { enabled: true, priority: 7, maxRetries: 1 },
    [InfoType.TIME_INFO]: { enabled: true, priority: 8, maxRetries: 2 },
  };

  constructor(
    private configService: LlmConfigService,
    private semanticChunker: SemanticChunkerService,
    private topicRegistry: TopicRegistryService,
    @Optional() private progressService: ParseProgressService,
    @Optional() private ruleEnhancedParser: RuleEnhancedParserService,
    @Optional() private resultValidator: ResultValidatorService,
    @Optional() private contractTypeDetector: ContractTypeDetectorService,
    @Optional() private chunkTaskTagger: ChunkTaskTaggerService,
    @Optional() private ollamaChatClient: OllamaChatClient,
  ) {
    // Don't refreshClient here - wait for onModuleInit
    this.logger.log(`[TaskBasedParser] RuleEnhancedParser: ${!!this.ruleEnhancedParser}, ResultValidator: ${!!this.resultValidator}, ContractTypeDetector: ${!!this.contractTypeDetector}, ChunkTaskTagger: ${!!this.chunkTaskTagger}, OllamaChatClient: ${!!this.ollamaChatClient}`);
  }

  async onModuleInit() {
    // Wait for config to be loaded from database
    await this.configService.refreshCache();
    this.refreshClient();

    // 详细的初始化日志
    const config = this.configService.getActiveConfig();
    this.logger.log(`========== TaskBasedParserService 初始化 ==========`);
    this.logger.log(`LLM Provider: ${this.configService.getProviderName()}`);
    this.logger.log(`LLM Model: ${config.model}`);
    this.logger.log(`LLM Base URL: ${config.baseUrl}`);
    this.logger.log(`LLM Timeout: ${config.timeout}ms`);
    this.logger.log(`SemanticChunker: ${this.semanticChunker ? '✓' : '✗'}`);
    this.logger.log(`TopicRegistry: ${this.topicRegistry ? '✓' : '✗'}`);
    this.logger.log(`ProgressService: ${this.progressService ? '✓' : '✗'}`);
    this.logger.log(`RuleEnhancedParser: ${this.ruleEnhancedParser ? '✓' : '✗'}`);
    this.logger.log(`ResultValidator: ${this.resultValidator ? '✓' : '✗'}`);
    this.logger.log(`ContractTypeDetector: ${this.contractTypeDetector ? '✓' : '✗'}`);
    this.logger.log(`ChunkTaskTagger: ${this.chunkTaskTagger ? '✓' : '✗'}`);
    this.logger.log(`OllamaChatClient: ${this.ollamaChatClient ? '✓' : '✗'}`);
    this.logger.log(`OpenAI Client: ${this.openai ? '✓' : '✗'}`);
    this.logger.log(`===================================================`);

    this.debugLog('[TaskBasedParser] Initialized', {
      provider: this.configService.getProviderName(),
      model: config.model,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      hasOpenaiClient: !!this.openai,
      dependencies: {
        semanticChunker: !!this.semanticChunker,
        topicRegistry: !!this.topicRegistry,
        progressService: !!this.progressService,
        ruleEnhancedParser: !!this.ruleEnhancedParser,
        resultValidator: !!this.resultValidator,
        contractTypeDetector: !!this.contractTypeDetector,
        chunkTaskTagger: !!this.chunkTaskTagger,
        ollamaChatClient: !!this.ollamaChatClient,
      }
    });
  }

  refreshClient() {
    const config = this.configService.getActiveConfig();
    const timeout = config.timeout || 300000; // Default to 5 minutes

    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: timeout,
      // Set maxRetries to 0 to avoid retry logic interfering with timeout
      maxRetries: 0,
    });
    this.logger.log(
      `[TaskBasedParser] OpenAI client refreshed: provider="${this.configService.getProviderName()}", ` +
      `model="${config.model}", baseUrl="${config.baseUrl}", timeout=${timeout}ms`
    );

    // 同时刷新 ContractTypeDetectorService 的客户端
    if (this.contractTypeDetector && typeof this.contractTypeDetector.refreshClient === 'function') {
      this.contractTypeDetector.refreshClient();
      this.logger.log(`[TaskBasedParser] ContractTypeDetectorService client also refreshed`);
    }

    // 同时刷新 ChunkTaskTaggerService 的客户端
    if (this.chunkTaskTagger && typeof this.chunkTaskTagger.refreshClient === 'function') {
      this.chunkTaskTagger.refreshClient();
      this.logger.log(`[TaskBasedParser] ChunkTaskTaggerService client also refreshed`);
    }
  }

  /**
   * 写调试日志到文件
   */
  private debugLog(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
    fs.appendFileSync(this.debugLogFile, logMessage);
    this.logger.debug(message);
  }

  /**
   * Phase 2: 带超时和重试的任务执行包装器
   * 包装异步函数，提供超时检测和自动重试功能
   *
   * @param fn 要执行的异步函数
   * @param taskName 任务名称（用于日志）
   * @param timeoutMs 超时时间（毫秒），默认120秒
   * @param maxRetries 最大重试次数，默认1次
   * @returns 任务执行结果
   */
  private async executeWithTimeoutAndRetry<T>(
    fn: () => Promise<T>,
    taskName: string,
    timeoutMs: number = 120000,
    maxRetries: number = 1
  ): Promise<{
    result?: T;
    success: boolean;
    error?: string;
    retries: number;
    timedOut: boolean;
  }> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      let timedOut = false;

      try {
        this.debugLog(`[TimeoutWrapper] ${taskName} - Attempt ${attempt + 1}/${maxRetries + 1} starting`, {
          timeoutMs,
          maxRetries,
        });

        // 创建超时Promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            timedOut = true;
            reject(new Error(`Task timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        // 执行任务，与超时Promise竞争
        const result = await Promise.race([fn(), timeoutPromise]);

        const processingTime = Date.now() - startTime;

        this.debugLog(`[TimeoutWrapper] ${taskName} - Attempt ${attempt + 1} succeeded`, {
          processingTimeMs: processingTime,
          retries: attempt,
        });

        return {
          result,
          success: true,
          retries: attempt,
          timedOut: false,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const processingTime = Date.now() - startTime;

        this.debugLog(`[TimeoutWrapper] ${taskName} - Attempt ${attempt + 1} failed`, {
          errorMessage: lastError.message,
          processingTimeMs: processingTime,
          timedOut,
          attempt: attempt + 1,
          willRetry: attempt < maxRetries,
        });

        // 如果不是最后一次尝试，等待一段时间后重试
        if (attempt < maxRetries) {
          const retryDelay = 1000 * (attempt + 1); // 递增延迟：1s, 2s, 3s...
          this.logger.log(`[TimeoutWrapper] ${taskName} - Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 所有尝试都失败了
    this.debugLog(`[TimeoutWrapper] ${taskName} - All attempts failed`, {
      finalError: lastError?.message,
      totalAttempts: maxRetries + 1,
    });

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retries: maxRetries,
      timedOut: lastError?.message.includes('timeout') || false,
    };
  }

  /**
   * 从LLM响应中提取JSON内容
   * 处理markdown代码块包裹的情况
   */
  private extractJson(content: string): string {
    let jsonContent = content.trim();

    // Remove markdown code blocks: ```json ... ``` or ``` ... ```
    const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
    const match = jsonContent.match(codeBlockRegex);
    if (match && match[1]) {
      jsonContent = match[1].trim();
      this.logger.debug(`[extractJson] Removed markdown code block, extracted ${jsonContent.length} chars`);
    }

    return jsonContent;
  }

  /**
   * Phase 5: 检测内容是否包含二进制数据
   * 本地模型（如gemma3:27b）在某些情况下会返回包含null字节的数据
   *
   * @param content 要检测的内容
   * @returns 如果包含二进制数据返回true
   */
  private containsBinaryData(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    // 检测null字节（二进制数据的典型标志）
    if (content.includes('\u0000')) {
      return true;
    }

    // 检测其他非打印字符（ASCII 0-31，除了常见的\t\n\r）
    // 允许的字符：\t (9), \n (10), \r (13)
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        // 发现非打印字符
        this.logger.warn(`[containsBinaryData] Non-printable character at position ${i}: code=${code}`);
        return true;
      }
    }

    // 检测异常高的连续相同字符（可能是数据损坏）
    let sameCharCount = 0;
    for (let i = 1; i < content.length; i++) {
      if (content[i] === content[i - 1]) {
        sameCharCount++;
        if (sameCharCount > 100) {
          this.logger.warn(`[containsBinaryData] Too many repeated characters at position ${i}`);
          return true;
        }
      } else {
        sameCharCount = 0;
      }
    }

    return false;
  }

  /**
   * 映射 InfoType 到 ExtractTopic
   */
  private mapInfoTypeToExtractTopic(infoType: InfoType): ExtractTopic | undefined {
    // InfoType 和 ExtractTopic 的值完全匹配
    const topic = infoTypeToExtractTopic(infoType);
    if (topic) {
      return topic;
    }
    this.logger.warn(`[mapInfoTypeToExtractTopic] No mapping found for ${infoType}`);
    return undefined;
  }

  /**
   * 获取 InfoType 对应的目标字段
   */
  private getTargetFieldsForInfoType(infoType: InfoType): string[] {
    const fieldMap: Record<InfoType, string[]> = {
      [InfoType.BASIC_INFO]: ['contractNo', 'contractName', 'customerName', 'ourEntity', 'contractType'],
      [InfoType.FINANCIAL]: ['amountWithTax', 'amountWithoutTax', 'currency', 'taxRate', 'paymentMethod', 'paymentTerms'],
      [InfoType.TIME_INFO]: ['signedAt', 'effectiveAt', 'expiresAt', 'duration'],
      [InfoType.MILESTONES]: ['milestones'],
      [InfoType.RATE_ITEMS]: ['rateItems'],
      [InfoType.LINE_ITEMS]: ['lineItems'],
      [InfoType.DELIVERABLES]: ['deliverables', 'sowSummary'],
      [InfoType.RISK_CLAUSES]: ['riskClauses', 'penaltyClauses', 'terminationClauses'],
    };
    return fieldMap[infoType] || [];
  }

  /**
   * 增强 prompt（规则提取 + Few-Shot 示例）
   */
  private enhancePrompt(basePrompt: string, infoType: InfoType, contractText: string): string {
    let enhanced = basePrompt;
    const topic = this.mapInfoTypeToExtractTopic(infoType);

    // 1. 添加规则提取线索
    if (this.ruleEnhancedParser && topic) {
      try {
        const targetFields = this.getTargetFieldsForInfoType(infoType);
        if (targetFields.length > 0) {
          const ruleEnhancement = this.ruleEnhancedParser.enhancePromptWithRules(contractText, targetFields);
          if (ruleEnhancement) {
            enhanced = ruleEnhancement + '\n\n' + enhanced;
            this.logger.debug(`[${infoType}] Added rule-enhanced clues to prompt`);
          }
        }
      } catch (error) {
        this.logger.warn(`[${infoType}] Failed to add rule enhancement:`, error);
      }
    }

    // 2. 添加 Few-Shot 示例
    if (this.resultValidator && topic) {
      try {
        enhanced = this.resultValidator.enhancePromptWithFewShots(enhanced, topic);
        this.logger.debug(`[${infoType}] Added Few-Shot examples to prompt`);
      } catch (error) {
        this.logger.warn(`[${infoType}] Failed to add Few-Shot examples:`, error);
      }
    }

    return enhanced;
  }

  /**
   * 主入口：基于任务解析合同
   * @param text 合同全文
   * @param contractType 合同类型（可选，用于确定主题批次。如果不提供，将先执行BASIC_INFO获取类型）
   * @param enabledTaskTypes 要执行的任务类型（可选，默认全部。如果提供了contractType，则基于contractType确定）
   * @param sessionId 进度会话ID（可选，用于报告进度）
   * @param fileName 文件名（可选，用于优先判断合同类型）
   */
  async parseByTasks(
    text: string,
    contractType?: string,
    enabledTaskTypes?: InfoType[],
    sessionId?: string,
    fileName?: string
  ): Promise<{
    data: Record<string, any>;
    results: TaskResult[];
    summary: {
      totalTasks: number;
      successfulTasks: number;
      failedTasks: number;
      totalTokensUsed: number;
      totalTimeMs: number;
      partialSuccess: boolean; // Phase 3: 标记是否部分成功（有些任务成功，有些失败）
      successfulTaskTypes: string[]; // Phase 3: 成功的任务类型列表
      failedTaskTypes: string[]; // Phase 3: 失败的任务类型列表
    };
  }> {
    const startTime = Date.now();

    // Clear debug log file for new session
    fs.writeFileSync(this.debugLogFile, `=== NEW SESSION ${sessionId || 'unknown'} ===\n`);

    this.debugLog(`[Task-based Parser] Starting`, { textLength: text.length, sessionId, contractType, enabledTaskTypes, fileName });
    this.logger.log(`[Task-based Parser] Starting: text length=${text.length}, sessionId=${sessionId}, contractType=${contractType || 'undefined'}, fileName=${fileName || 'undefined'}`);

    // Step 1: 对合同进行语义分段（使用优化后的分块策略）
    // 短文档（< 3000字符）不分块，长文档使用语义分块
    const chunks = this.semanticChunker.chunkBySemanticStructure(text);
    this.logger.log(`[Task-based Parser] Created ${chunks.length} semantic chunks (short doc strategy: ${chunks.length === 1})`);

    // Step 1.5: 为分块添加任务标记（使用关键词匹配）
    let taggedChunks: TaggedChunk[] = [];
    if (this.chunkTaskTagger && chunks.length > 1) {
      // Step 1.5a: 关键词快速标记
      taggedChunks = this.chunkTaskTagger.tagChunksWithKeywords(chunks);
      this.logger.log(`[Task-based Parser] Tagged ${taggedChunks.length} chunks with keywords`);

      // Step 1.5b: LLM 补充标记（仅对低置信度分块）
      const lowConfidenceCount = this.chunkTaskTagger.getLowConfidenceChunkCount(taggedChunks);
      if (lowConfidenceCount > 0) {
        this.logger.log(`[Task-based Parser] ${lowConfidenceCount} chunks need LLM supplement`);

        // 更新进度状态
        if (sessionId && this.progressService) {
          this.progressService.updateStage(
            sessionId,
            'chunking',
            `LLM 补充标记中 (${lowConfidenceCount} 个分块)...`
          );
        }

        // 调用 LLM 补充
        taggedChunks = await this.chunkTaskTagger.supplementTagsWithLLM(
          taggedChunks,
          (current, total) => {
            if (sessionId && this.progressService) {
              this.progressService.updateStage(
                sessionId,
                'chunking',
                `LLM 补充标记: ${current}/${total}`
              );
            }
          }
        );
        this.logger.log(`[Task-based Parser] LLM supplement completed`);
      }

      this.debugLog(`[Task-based Parser] Final chunk tags`, taggedChunks.map(tc => ({
        chunkId: tc.id,
        relevantTasks: tc.taskTags.relevantTasks,
        llmSuggested: tc.taskTags.llmSuggested,
        confidence: tc.taskTags.confidence,
      })));
    } else {
      // 单分块或无标记服务时，所有任务都适用于该分块
      taggedChunks = chunks.map(chunk => ({
        ...chunk,
        taskTags: {
          chunkId: chunk.id,
          relevantTasks: Object.values(InfoType),
          keywordMatches: {} as Record<InfoType, string[]>,
          confidence: 1,
        },
      }));
    }

    // Step 2: 如果未提供合同类型，尝试多种方式获取
    let detectedContractType = contractType;
    if (!detectedContractType && !enabledTaskTypes) {
      // 2a. 如果提供了文件名，先尝试基于文件名判断（优先）
      if (fileName) {
        this.logger.log(`[Task-based Parser] No contractType provided, trying filename-based detection first: "${fileName}"`);
        const fileNameResult = await this.contractTypeDetector.detectContractTypeFromFileName(fileName);
        if (fileNameResult.detectedType && fileNameResult.confidence >= 0.75) {
          detectedContractType = fileNameResult.detectedType;
          this.logger.log(
            `[Task-based Parser] Contract type detected from filename: ${detectedContractType} ` +
            `(confidence: ${fileNameResult.confidence}, reasoning: ${fileNameResult.reasoning})`
          );
        } else {
          this.logger.log(
            `[Task-based Parser] Filename-based detection confidence too low (${fileNameResult.confidence}), ` +
            `falling back to BASIC_INFO task`
          );
        }
      }

      // 2b. 如果文件名判断失败或置信度不够，执行 BASIC_INFO 任务获取合同类型
      if (!detectedContractType) {
        this.logger.log(`[Task-based Parser] Executing BASIC_INFO task to detect contract type`);
        const basicInfoResult = await this.executeSingleTaskByName(
          text,
          chunks,
          InfoType.BASIC_INFO,
          sessionId
        );
        this.debugLog(`[Step 2b] BASIC_INFO result for contract type detection`, {
          success: basicInfoResult.success,
          hasContractType: !!basicInfoResult.data?.contractType,
          contractTypeValue: basicInfoResult.data?.contractType,
          allKeys: basicInfoResult.data ? Object.keys(basicInfoResult.data) : [],
        });
        if (basicInfoResult.success && basicInfoResult.data?.contractType) {
          // 规范化合同类型：处理LLM可能返回中文或非标准格式的情况
          const rawContractType = basicInfoResult.data.contractType;
          detectedContractType = this.normalizeContractType(rawContractType);
          this.logger.log(`[Task-based Parser] Contract type detected: "${rawContractType}" → normalized to "${detectedContractType}"`);
        } else {
          this.debugLog(`[Step 2b] Failed to detect contract type from BASIC_INFO task`);
        }
      }
    }

    // Step 3: 根据合同类型获取要执行的任务
    // 如果指定了合同类型，使用合同类型对应的主题批次；否则使用 enabledTaskTypes 或全部
    let tasksToUse: InfoType[] | undefined = enabledTaskTypes;
    this.debugLog(`[Step 3] Before topic selection`, {
      detectedContractType,
      enabledTaskTypes,
      tasksToUse,
    });
    if (detectedContractType) {
      // 再次确保合同类型已规范化（处理直接传入的contractType参数）
      const beforeNormalize = detectedContractType;
      detectedContractType = this.normalizeContractType(detectedContractType);
      this.debugLog(`[Step 3] Contract type normalization`, {
        before: beforeNormalize,
        after: detectedContractType,
      });
      const topicNames = this.topicRegistry.getTopicNamesForContractType(detectedContractType);
      this.debugLog(`[Step 3] Topic names from registry`, {
        contractType: detectedContractType,
        topicNames,
        topicCount: topicNames.length,
      });
      if (topicNames.length > 0) {
        tasksToUse = topicNames as InfoType[];
        this.logger.log(`[Task-based Parser] Using contract type '${detectedContractType}' topic batch: ${topicNames.join(', ')}`);
      } else {
        this.logger.warn(`[Task-based Parser] No topic batch found for contract type '${detectedContractType}', falling back to enabledTaskTypes or all topics`);
      }
    } else {
      this.debugLog(`[Step 3] No contract type detected, will use all tasks`);
    }

    // Step 3: 获取要执行的任务
    const tasks = this.getTasksToExecute(tasksToUse);
    this.logger.log(`[Task-based Parser] Executing ${tasks.length} tasks: ${tasks.map(t => t.infoType).join(', ')}`);

    // 设置任务到进度服务
    if (sessionId && this.progressService) {
      const taskInfoTypes = tasks.map(t => t.infoType);
      this.logger.log(`[Task-based Parser] Setting ${taskInfoTypes.length} tasks to progress service for session ${sessionId}`);
      this.progressService.setTasks(sessionId, taskInfoTypes);
      // Spec 40: 设置初始预估时间
      this.progressService.setInitialEstimate(sessionId, text.length, taggedChunks.length);
    } else {
      this.logger.warn(`[Task-based Parser] No sessionId or progressService available. sessionId=${sessionId}, progressService=${!!this.progressService}`);
    }

    // Step 4: 串行执行所有任务（每个任务处理相关的分块）
    const results = await this.executeTasksWithChunks(text, taggedChunks, tasks, sessionId);

    // Step 5: 合并结果
    const mergedData = this.mergeTaskResults(results);

    const totalTimeMs = Date.now() - startTime;
    const totalTokensUsed = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    // Phase 3: 计算详细的任务执行状态
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const successfulTaskTypes = successfulResults.map(r => r.infoType);
    const failedTaskTypes = failedResults.map(r => r.infoType);
    const partialSuccess = successfulResults.length > 0 && failedResults.length > 0;

    const summary = {
      totalTasks: results.length,
      successfulTasks: successfulResults.length,
      failedTasks: failedResults.length,
      totalTokensUsed,
      totalTimeMs,
      // Phase 3: 新增字段，用于部分数据保存
      partialSuccess,
      successfulTaskTypes,
      failedTaskTypes,
    };

    // Phase 3: 如果部分成功，记录详细的失败任务信息
    if (partialSuccess) {
      this.debugLog(`[Task-based Parser] Partial Success - Some tasks failed`, {
        successfulTasks: successfulTaskTypes,
        failedTasks: failedTaskTypes,
        failedTaskErrors: failedResults.map(r => ({
          infoType: r.infoType,
          error: r.error,
        })),
        dataPreserved: {
          basicInfo: !!mergedData.basicInfo && Object.keys(mergedData.basicInfo).length > 0,
          financialInfo: !!mergedData.financialInfo && Object.keys(mergedData.financialInfo).length > 0,
          timeInfo: !!mergedData.timeInfo && Object.keys(mergedData.timeInfo).length > 0,
          typeSpecificDetails: !!mergedData.typeSpecificDetails && Object.keys(mergedData.typeSpecificDetails).length > 0,
        },
      });
    }

    // ========== Ollama Format 最终汇总 ==========
    const tasksWithOllamaFormat = results.filter(r => r.usedOllamaFormat);
    const ollamaFormatTaskTypes = tasksWithOllamaFormat.map(r => r.infoType).join(', ');

    this.debugLog(`[Task-based Parser] Completed`, summary);
    this.logger.log(
      `[Task-based Parser] Completed: ${totalTimeMs}ms, ` +
      `${summary.successfulTasks}/${summary.totalTasks} tasks successful, ` +
      `${totalTokensUsed} tokens` +
      `${partialSuccess ? ' [PARTIAL SUCCESS]' : ''}`
    );

    // 打印 Ollama Format 使用统计
    if (tasksWithOllamaFormat.length > 0) {
      this.logger.log(
        `[Task-based Parser] Ollama Format: ${tasksWithOllamaFormat.length}/${results.length} 任务使用了 format 参数`
      );
      this.logger.log(
        `[Task-based Parser] Ollama Format 任务: ${ollamaFormatTaskTypes || '无'}`
      );
    } else {
      this.logger.log(
        `[Task-based Parser] Ollama Format: 没有任务使用 format 参数 (可能: provider=OpenAI 或缺少 Schema 定义)`
      );
    }

    return { data: mergedData, results, summary };
  }

  /**
   * 获取要执行的任务列表
   */
  private getTasksToExecute(enabledTypes?: InfoType[]): ExtractionTask[] {
    this.logger.log(`[getTasksToExecute] Called with enabledTypes=${enabledTypes?.join(',') || 'undefined'}`);
    const allTasks: ExtractionTask[] = [
      // ========== 基本信息 ==========
      {
        id: 'basic-info',
        infoType: InfoType.BASIC_INFO,
        description: '提取合同基本信息',
        targetFields: ['contractNo', 'contractName', 'customerName', 'ourEntity', 'contractType'],
        promptBuilder: (text: string) => this.buildBasicInfoPrompt(text),
      },

      // ========== 财务信息 ==========
      {
        id: 'financial',
        infoType: InfoType.FINANCIAL,
        description: '提取合同财务信息',
        targetFields: ['amountWithTax', 'amountWithoutTax', 'taxRate', 'currency', 'paymentMethod', 'paymentTerms'],
        promptBuilder: (text: string) => this.buildFinancialPrompt(text),
      },

      // ========== 里程碑 ==========
      {
        id: 'milestones',
        infoType: InfoType.MILESTONES,
        description: '提取项目里程碑',
        targetFields: ['milestones'],
        requiresChunks: true,
        promptBuilder: (text: string, chunks?: any[]) => this.buildMilestonesPrompt(text, chunks || []),
      },

      // ========== 人力费率 ==========
      {
        id: 'rate-items',
        infoType: InfoType.RATE_ITEMS,
        description: '提取人力费率表',
        targetFields: ['rateItems'],
        promptBuilder: (text: string) => this.buildRateItemsPrompt(text),
      },

      // ========== 产品清单 ==========
      {
        id: 'line-items',
        infoType: InfoType.LINE_ITEMS,
        description: '提取产品清单',
        targetFields: ['lineItems'],
        promptBuilder: (text: string) => this.buildLineItemsPrompt(text),
      },

      // ========== 时间信息 ==========
      {
        id: 'time-info',
        infoType: InfoType.TIME_INFO,
        description: '提取合同时间信息',
        targetFields: ['signedAt', 'effectiveAt', 'expiresAt', 'duration'],
        promptBuilder: (text: string) => this.buildTimeInfoPrompt(text),
      },

      // ========== 交付物 ==========
      {
        id: 'deliverables',
        infoType: InfoType.DELIVERABLES,
        description: '提取交付物清单',
        targetFields: ['deliverables', 'sowSummary'],
        promptBuilder: (text: string) => this.buildDeliverablesPrompt(text),
      },

      // ========== 风险条款 ==========
      {
        id: 'risk-clauses',
        infoType: InfoType.RISK_CLAUSES,
        description: '提取风险条款',
        targetFields: ['riskClauses', 'penaltyClauses', 'terminationClauses'],
        promptBuilder: (text: string) => this.buildRiskClausesPrompt(text),
      },
    ];

    // 过滤：只返回启用的任务
    let filteredTasks = allTasks.filter(task => this.taskConfigs[task.infoType]?.enabled);

    // 进一步过滤：只返回指定类型的任务
    if (enabledTypes && enabledTypes.length > 0) {
      filteredTasks = filteredTasks.filter(task => enabledTypes.includes(task.infoType));
    }

    // 按优先级排序
    const sortedTasks = filteredTasks.sort((a, b) =>
      (this.taskConfigs[a.infoType]?.priority || 999) -
      (this.taskConfigs[b.infoType]?.priority || 999)
    );

    this.logger.log(
      `[getTasksToExecute] Returning ${sortedTasks.length} tasks: ` +
      sortedTasks.map(t => `${t.infoType}(${t.id})`).join(', ')
    );

    return sortedTasks;
  }

  /**
   * 串行执行所有任务（每个任务处理相关的分块）
   * 新策略：
   * - BASIC_INFO: 遍历所有分块，每个分块独立调用LLM
   * - 其他任务: 只处理标记为相关的分块，每个分块独立调用LLM
   * - 多分块结果合并：采用"先到先得"策略（第一个有效值优先）
   */
  private async executeTasksWithChunks(
    text: string,
    taggedChunks: TaggedChunk[],
    tasks: ExtractionTask[],
    sessionId?: string
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const isShortDoc = taggedChunks.length === 1;

    this.logger.log(`[Task Execution] Starting ${tasks.length} tasks, ${taggedChunks.length} chunks, shortDoc=${isShortDoc}`);

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      this.logger.log(`[Task Execution] ========== Task ${i + 1}/${tasks.length}: ${task.infoType} ==========`);
      const startTime = Date.now();

      try {
        // 报告任务开始
        if (sessionId && this.progressService) {
          this.progressService.startTask(sessionId, task.infoType);
          // Spec 40: 重置当前任务token计数
          this.progressService.resetCurrentTaskTokens(sessionId);
        }

        let result: TaskResult;

        if (isShortDoc) {
          // 短文档：直接使用全文调用LLM（无分块）
          this.logger.log(`[Task ${task.infoType}] Short document mode - single LLM call`);
          result = await this.executeSingleChunkTask(text, task, sessionId);
        } else {
          // 长文档：根据任务类型选择分块
          const chunksForTask = this.getChunksForTask(taggedChunks, task.infoType);
          this.logger.log(`[Task ${task.infoType}] Long document mode - ${chunksForTask.length} relevant chunks`);

          if (chunksForTask.length === 0) {
            // 没有相关分块，跳过该任务
            this.logger.log(`[Task ${task.infoType}] No relevant chunks, skipping`);
            result = {
              taskId: task.id,
              infoType: task.infoType,
              success: true,
              data: {},
              processingTimeMs: Date.now() - startTime,
            };
          } else {
            // 设置任务内分块进度
            if (sessionId && this.progressService) {
              this.progressService.setTaskChunks(sessionId, task.infoType, chunksForTask.length);
            }

            // 处理每个相关分块
            result = await this.executeTaskOnMultipleChunks(chunksForTask, task, sessionId);
          }
        }

        // Phase 1: 增强调试日志 - 记录每个任务完成的详细信息
        this.debugLog(`[Task ${task.infoType}] Completed`, {
          success: result.success,
          tokensUsed: result.tokensUsed || 0,
          processingTimeMs: result.processingTimeMs,
          error: result.error || null,
          dataKeys: result.data ? Object.keys(result.data) : [],
          dataSize: result.data ? JSON.stringify(result.data).length : 0,
          dataPreview: result.data ? JSON.stringify(result.data).substring(0, 500) : null,
        });
        this.logger.log(`[Task ${task.infoType}] Finished: success=${result.success}, tokensUsed=${result.tokensUsed}`);
        results.push(result);

        // 报告任务完成或失败
        if (sessionId && this.progressService) {
          // Spec 40: 记录token使用量
          if (result.tokensUsed && result.tokensUsed > 0) {
            this.progressService.recordTokenUsage(sessionId, task.infoType, result.tokensUsed);
          }

          if (result.success) {
            this.progressService.completeTask(sessionId, task.infoType, result.data);
          } else {
            this.progressService.failTask(sessionId, task.infoType, result.error || 'Unknown error');
          }
        }

        // 任务间延迟
        if (i < tasks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const processingTime = Date.now() - startTime;

        // Phase 1: 增强调试日志 - 记录任务失败详细信息
        this.debugLog(`[Task ${task.infoType}] Failed`, {
          errorMessage,
          errorStack: errorStack?.substring(0, 1000),
          processingTimeMs: processingTime,
          isTimeout: errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorMessage.includes('ETIME'),
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          taskId: task.id,
          taskDescription: task.description,
          targetFields: task.targetFields,
        });
        this.logger.error(`[Task ${task.infoType}] Failed: ${errorMessage}`);
        results.push({
          taskId: task.id,
          infoType: task.infoType,
          success: false,
          error: errorMessage,
          processingTimeMs: Date.now() - startTime,
        });

        if (sessionId && this.progressService) {
          this.progressService.failTask(sessionId, task.infoType, errorMessage);
        }
      }

      this.logger.log(`[Task Execution] ========== Completed Task ${i + 1}/${tasks.length} ==========`);
    }

    this.logger.log(`[Task Execution] All tasks completed. Total results: ${results.length}`);

    // ========== Ollama Format 使用汇总 ==========
    const tasksWithOllamaFormat = results.filter(r => r.usedOllamaFormat);
    const tasksWithoutOllamaFormat = results.filter(r => !r.usedOllamaFormat);
    const ollamaFormatTaskTypes = tasksWithOllamaFormat.map(r => r.infoType);
    const nonOllamaFormatTaskTypes = tasksWithoutOllamaFormat.map(r => r.infoType);

    this.logger.log(`[Task Execution] ========== Ollama Format 使用汇总 ==========`);
    this.logger.log(`[Task Execution] 使用 Format: ${tasksWithOllamaFormat.length}/${results.length} 个任务`);
    if (ollamaFormatTaskTypes.length > 0) {
      this.logger.log(`[Task Execution] Format 任务: ${ollamaFormatTaskTypes.join(', ')}`);
    }
    if (nonOllamaFormatTaskTypes.length > 0) {
      this.logger.log(`[Task Execution] 非 Format 任务: ${nonOllamaFormatTaskTypes.join(', ')}`);
    }
    this.logger.log(`[Task Execution] ========== 汇总完成 ==========`);

    // Phase 1: 增强调试日志 - 记录任务执行汇总
    this.debugLog(`[Task Execution] Summary`, {
      totalTasks: results.length,
      successfulTasks: results.filter(r => r.success).length,
      failedTasks: results.filter(r => !r.success).length,
      failedTaskTypes: results.filter(r => !r.success).map(r => r.infoType),
      totalTokensUsed: results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      totalTimeMs: results.reduce((sum, r) => sum + r.processingTimeMs, 0),
      tasksWithOllamaFormat: tasksWithOllamaFormat.length,
      ollamaFormatTaskTypes,
    });

    return results;
  }

  /**
   * 获取任务相关的分块
   * - BASIC_INFO: 返回所有分块（需要遍历全文）
   * - 其他任务: 返回标记为相关的分块
   */
  private getChunksForTask(taggedChunks: TaggedChunk[], infoType: InfoType): TaggedChunk[] {
    if (infoType === InfoType.BASIC_INFO) {
      // BASIC_INFO 需要处理所有分块
      return taggedChunks;
    }

    // 其他任务只处理标记为相关的分块
    const relevantChunks = taggedChunks.filter(chunk =>
      chunk.taskTags.relevantTasks.includes(infoType)
    );

    this.logger.log(
      `[getChunksForTask] ${infoType}: ${relevantChunks.length}/${taggedChunks.length} chunks are relevant`
    );

    return relevantChunks;
  }

  /**
   * 在多个分块上执行任务，合并结果
   * 采用"先到先得"策略：第一个有效值优先
   */
  private async executeTaskOnMultipleChunks(
    chunks: TaggedChunk[],
    task: ExtractionTask,
    sessionId?: string
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const chunkResults: Record<string, any>[] = [];
    let totalTokensUsed = 0;

    this.logger.log(`[MultiChunk] Processing ${chunks.length} chunks for ${task.infoType}`);

    // Spec 41.4: 收集合同名称（从第一个有contractName的chunk）
    const contractName = chunks.find(c => c.metadata.contractName)?.metadata.contractName;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // 更新任务内分块进度
      if (sessionId && this.progressService) {
        this.progressService.updateTaskChunkProgress(sessionId, task.infoType, i + 1);
      }

      this.logger.log(`[MultiChunk] Processing chunk ${i + 1}/${chunks.length}: ${chunk.id}`);

      try {
        // Spec 41.4: 为BASIC_INFO传递分块上下文
        let result: TaskResult;
        if (task.infoType === InfoType.BASIC_INFO) {
          result = await this.executeSingleChunkTaskWithContext(
            chunk.text,
            task,
            {
              contractName: contractName || chunk.metadata.contractName,
              chunkTitle: chunk.metadata.title,
              positionHint: chunk.metadata.positionHint,
            },
            sessionId,
            false
          );
        } else {
          result = await this.executeSingleChunkTask(chunk.text, task, sessionId, false);
        }

        if (result.success && result.data) {
          chunkResults.push(result.data);
          totalTokensUsed += result.tokensUsed || 0;
        }

        // 完成一个分块
        if (sessionId && this.progressService) {
          this.progressService.completeTaskChunk(sessionId, task.infoType);
        }

        // 分块间延迟
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[MultiChunk] Chunk ${chunk.id} failed: ${errorMessage}`);
        // 单个分块失败不影响整体，继续处理其他分块
      }
    }

    // 合并多个分块的结果（先到先得策略）
    const mergedData = this.mergeChunkResults(chunkResults, task.infoType);

    return {
      taskId: task.id,
      infoType: task.infoType,
      success: chunkResults.length > 0,
      data: mergedData,
      tokensUsed: totalTokensUsed,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * 合并多个分块的提取结果
   * 策略：先到先得（第一个有效值优先）
   *
   * Phase 5: 过滤数字索引键（0-9）- 本地模型有时返回格式异常的数据
   */
  private mergeChunkResults(results: Record<string, any>[], infoType: InfoType): Record<string, any> {
    if (results.length === 0) return {};
    if (results.length === 1) return results[0];

    // Spec 41.5: BASIC_INFO使用评分加权合并策略
    if (infoType === InfoType.BASIC_INFO) {
      return this.mergeBasicInfoResults(results);
    }

    // 其他任务使用原有先到先得策略
    const merged: Record<string, any> = {};

    // 收集所有出现过的键
    const allKeys = new Set<string>();
    for (const result of results) {
      for (const key of Object.keys(result)) {
        // Phase 5: 过滤数字索引键（本地模型bug）
        if (!/^\d+$/.test(key)) {
          allKeys.add(key);
        }
      }
    }

    // Phase 5: 记录被过滤的数字索引键
    const filteredKeys: string[] = [];
    for (const result of results) {
      for (const key of Object.keys(result)) {
        if (/^\d+$/.test(key) && !filteredKeys.includes(key)) {
          filteredKeys.push(key);
        }
      }
    }
    if (filteredKeys.length > 0) {
      this.debugLog(`[mergeChunkResults] ${infoType} Filtered numeric index keys`, {
        filteredKeys,
        filteredCount: filteredKeys.length,
      });
    }

    // 对每个键，取第一个有效值
    for (const key of allKeys) {
      for (const result of results) {
        const value = result[key];
        if (this.isValidValue(value)) {
          // 特殊处理数组类型：合并所有数组
          if (Array.isArray(value) && this.isArrayField(key)) {
            if (!merged[key]) {
              merged[key] = [];
            }
            merged[key].push(...value);
          } else {
            // 非数组类型：先到先得
            if (!(key in merged)) {
              merged[key] = value;
            }
          }
          break; // 对于非数组类型，取到第一个有效值后就跳出
        }
      }
    }

    this.logger.log(`[mergeChunkResults] Merged ${results.length} results for ${infoType}, keys: ${Object.keys(merged).join(', ')}`);
    return merged;
  }

  /**
   * Spec 41.5: BASIC_INFO评分加权合并策略
   *
   * 对每个字段，收集所有候选值并评分：
   * - customerName/ourEntity: 使用公司名评分算法
   * - contractNo: 使用合同编号评分算法
   * - contractName: 使用合同名称评分算法
   * - contractType: 使用枚举值验证
   *
   * 只有得分>=30的值才被采用（过滤无关内容）
   */
  private mergeBasicInfoResults(results: Record<string, any>[]): Record<string, any> {
    const merged: Record<string, any> = {};
    const scoreThreshold = 30;

    // 定义需要评分合并的字段
    const scoredFields = ['customerName', 'ourEntity', 'contractNo', 'contractName'];
    const enumFields = ['contractType'];

    // 对每个需要评分的字段
    for (const field of scoredFields) {
      const candidates = results
        .filter(r => this.isValidValue(r[field]))
        .map(r => ({
          value: r[field],
          score: this.scoreFieldValue(field, r[field]),
        }));

      if (candidates.length === 0) {
        continue;
      }

      // 按得分排序，取最高分
      candidates.sort((a, b) => b.score - a.score);

      const best = candidates[0];
      this.logger.log(`[mergeBasicInfo] ${field}: best="${best.value}" score=${best.score} (candidates=${candidates.length})`);

      // 只有得分>=阈值的值才被采用
      if (best.score >= scoreThreshold) {
        merged[field] = best.value;
      } else {
        this.logger.warn(`[mergeBasicInfo] ${field}: all candidates below threshold (${scoreThreshold}), best was ${best.score}`);
      }
    }

    // 处理枚举字段（取最一致的值）
    for (const field of enumFields) {
      const valueCounts = new Map<any, number>();
      for (const result of results) {
        if (this.isValidValue(result[field])) {
          const value = result[field];
          valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
        }
      }

      if (valueCounts.size > 0) {
        // 找出出现次数最多的值
        let bestValue: any;
        let maxCount = 0;
        for (const [value, count] of valueCounts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            bestValue = value;
          }
        }
        merged[field] = bestValue;
        this.logger.log(`[mergeBasicInfo] ${field}: "${bestValue}" (${maxCount}/${results.length} votes)`);
      }
    }

    // 其他字段使用先到先得策略
    const allKeys = new Set<string>();
    for (const result of results) {
      for (const key of Object.keys(result)) {
        if (!scoredFields.includes(key) && !enumFields.includes(key)) {
          allKeys.add(key);
        }
      }
    }

    for (const key of allKeys) {
      for (const result of results) {
        const value = result[key];
        if (this.isValidValue(value) && !(key in merged)) {
          merged[key] = value;
          break;
        }
      }
    }

    this.logger.log(`[mergeBasicInfo] Merged ${results.length} results, keys: ${Object.keys(merged).join(', ')}`);

    // Spec 41.6: 应用后处理清理
    const cleaned = this.applyPostProcessing(merged);
    this.logger.log(`[mergeBasicInfo] After post-processing, keys: ${Object.keys(cleaned).join(', ')}`);

    return cleaned;
  }

  /**
   * Spec 41.5: 字段值评分算法
   *
   * 根据字段类型使用不同的评分策略
   */
  private scoreFieldValue(field: string, value: string): number {
    if (!value || typeof value !== 'string') {
      return 0;
    }

    const v = value.trim();

    switch (field) {
      case 'customerName':
      case 'ourEntity':
        return this.scoreCompanyName(v);

      case 'contractNo':
        return this.scoreContractNo(v);

      case 'contractName':
        return this.scoreContractName(v);

      default:
        return 50; // 默认中等分数
    }
  }

  /**
   * Spec 41.5: 公司名称评分算法
   *
   * 评分规则：
   * - 长度适中 (30分): 8-40字符
   * - 包含公司关键词 (40分): 公司/有限/股份/企业/集团/Co./Ltd
   * - 包含干扰词 (-50分): 地址/联系/电话/身份证/邮编/工程师/元/年/月
   * - 以标点结尾 (+10分): 不是逗号等（说明没被截断）
   * - 包含地名 (+10分): 常见城市名
   * - 纯数字/日期 (-100分)
   */
  private scoreCompanyName(value: string): number {
    let score = 0;
    const v = value.trim();

    // 长度检查 (30分) - 合理的公司名长度
    if (v.length >= 8 && v.length <= 40) {
      score += 30;
    } else if (v.length >= 6 && v.length <= 50) {
      score += 15;  // 6-7个字符给较低分数
    } else if (v.length < 4 || v.length > 80) {
      score -= 100;
    }

    // 必须包含公司关键词 (40分)
    const companyKeywords = ['公司', '有限', '股份', '企业', '集团', 'Co.', 'Ltd', 'LLC', 'Inc', 'Corp'];
    const hasCompanyKeyword = companyKeywords.some(k => v.includes(k));
    if (hasCompanyKeyword) {
      score += 40;
    }

    // 不能包含干扰词 (-60分，提高到确保包含地址的名称被过滤)
    const badKeywords = [
      '地址', '联系', '电话', '手机', '身份证', '邮编', '代表',
      '工程师', '元', '年', '月', '日', '支付', '期', '%',
    ];
    const weakBadKeywords = ['服务', '开发', '项目', '系统', '技术'];
    const hasBadKeyword = badKeywords.some(k => v.includes(k));
    const hasWeakBadKeyword = weakBadKeywords.some(k => v.includes(k));

    if (hasBadKeyword) {
      score -= 60;
    } else if (hasWeakBadKeyword && !hasCompanyKeyword) {
      // 弱干扰词只在没有公司关键词时才扣分
      // 这样可以排除 "提供开发服务" 但不影响 "XX科技开发有限公司"
      score -= 60;
    }

    // 包含括号说明内容不纯粹 (-30分)
    if (v.includes('（') || v.includes('(')) {
      score -= 30;
    }

    // 不能以逗号等标点结尾（说明可能被截断）
    if (v.endsWith(',') || v.endsWith('，') || v.endsWith('、') || v.endsWith('.')) {
      score -= 30;
    } else if (/^[^，。.，、？?!！]+$/.test(v)) {
      score += 10;
    }

    // 包含常见城市名增加可信度 (+10分)
    const cityKeywords = [
      '北京', '上海', '深圳', '广州', '杭州', '成都', '重庆',
      '武汉', '西安', '南京', '天津', '苏州', '长沙', '青岛'
    ];
    if (cityKeywords.some(k => v.includes(k))) {
      score += 10;
    }

    // 不能是纯数字或日期格式
    if (/^\d+$/.test(v) || /^\d{4}[-年]/.test(v)) {
      score -= 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Spec 41.5: 合同编号评分算法
   *
   * 评分规则：
   * - 长度适中 (30分): 5-30字符
   * - 字母数字组合 (40分): 如 CTR-2024-001
   * - 包含连字符 (10分): 常见格式
   * - 包含非编号字符 (-100分): 包含中文标点
   */
  private scoreContractNo(value: string): number {
    let score = 0;
    const v = value.trim();

    // 长度适中
    if (v.length >= 5 && v.length <= 30) {
      score += 30;
    } else if (v.length < 3 || v.length > 50) {
      score -= 50;
    }

    // 字母数字组合
    if (/[a-zA-Z]/.test(v) && /\d/.test(v)) {
      score += 40;
    } else if (/\d/.test(v)) {
      score += 20; // 纯数字也可以，但分数低一些
    }

    // 包含连字符
    if (v.includes('-')) {
      score += 10;
    }

    // 包含常见合同编号前缀
    const commonPrefixes = ['HT', 'CTR', 'CONTR', 'CONT', 'NO', 'No'];
    if (commonPrefixes.some(p => v.toUpperCase().startsWith(p) || v.toUpperCase().includes(p))) {
      score += 20;
    }

    // 包含中文标点，说明提取错误
    if (/[，。、；：？!！]/.test(v)) {
      score -= 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Spec 41.5: 合同名称评分算法
   *
   * 评分规则：
   * - 长度适中 (30分): 5-50字符
   * - 包含关键词 (40分): 合同/协议/项目等
   * - 单个关键词 (-100分): 只是"合同"或"协议"
   * - 长度过长 (-50分): >100字符
   */
  private scoreContractName(value: string): number {
    let score = 0;
    const v = value.trim();

    // 长度适中
    if (v.length >= 5 && v.length <= 50) {
      score += 30;
    } else if (v.length > 100) {
      score -= 50;
    }

    // 包含合同相关关键词
    const contractKeywords = ['合同', '协议', '项目', '服务', '开发', '外包', '框架'];
    const hasKeyword = contractKeywords.some(k => v.includes(k));
    if (hasKeyword) {
      score += 40;
    }

    // 只是单个关键词，太简单
    if (['合同', '协议', '项目'].includes(v)) {
      score -= 100;
    }

    // 不能是纯数字或日期
    if (/^\d+$/.test(v) || /^\d{4}[-年]/.test(v)) {
      score -= 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 判断值是否有效（非空、非null、非undefined）
   */
  private isValidValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  /**
   * 判断字段是否为数组类型（需要合并而非先到先得）
   */
  private isArrayField(fieldName: string): boolean {
    const arrayFields = ['milestones', 'rateItems', 'lineItems', 'deliverables', 'riskClauses'];
    return arrayFields.includes(fieldName);
  }

  /**
   * Spec 41.6: 后处理清理公司名称
   *
   * 移除公司名称中的：
   * - 括号中的地址信息（地址：...）
   * - 联系人信息（联系人：...）
   * - 电话信息
   * - 其他干扰信息
   *
   * 如果清理后的公司名称无效（太短、不包含关键词等），返回undefined
   *
   * @param companyName 原始公司名称
   * @returns 清理后的公司名称，或undefined（如果无效）
   */
  private postProcessCompanyName(companyName: string): string | undefined {
    if (!companyName || typeof companyName !== 'string') {
      return undefined;
    }

    let cleaned = companyName.trim();

    // 移除括号中的地址信息
    // 格式：XXX公司（地址：朝阳区XX路XX号）→ XXX公司
    cleaned = cleaned.replace(/（地址[:：]\s*.*?）/g, '');
    cleaned = cleaned.replace(/\(地址[:：]\s*.*?\)/g, '');
    cleaned = cleaned.replace(/【地址[:：]\s*.*?】/g, '');
    cleaned = cleaned.replace(/\[地址[:：]\s*.*?\]/g, '');
    // 英文地址
    cleaned = cleaned.replace(/\(Address[:：]\s*.*?\)/g, '');
    cleaned = cleaned.replace(/（Address[:：]\s*.*?）/g, '');
    cleaned = cleaned.replace(/\[Address[:：]\s*.*?\]/g, '');

    // 移除括号中的联系人信息
    cleaned = cleaned.replace(/（联系人[:：]\s*.*?）/g, '');
    cleaned = cleaned.replace(/\(联系人[:：]\s*.*?\)/g, '');
    cleaned = cleaned.replace(/【联系人[:：]\s*.*?】/g, '');
    cleaned = cleaned.replace(/\[联系人[:：]\s*.*?\]/g, '');
    // 英文联系人
    cleaned = cleaned.replace(/\(Contact[:：]\s*.*?\)/g, '');
    cleaned = cleaned.replace(/（Contact[:：]\s*.*?）/g, '');

    // 移除电话信息
    cleaned = cleaned.replace(/（电话[:：]\s*.*?）/g, '');
    cleaned = cleaned.replace(/\(电话[:：]\s*.*?\)/g, '');
    cleaned = cleaned.replace(/【电话[:：]\s*.*?】/g, '');
    cleaned = cleaned.replace(/\[电话[:：]\s*.*?\]/g, '');
    // 英文电话
    cleaned = cleaned.replace(/\(Phone[:：]\s*.*?\)/g, '');
    cleaned = cleaned.replace(/\(Tel[:：]\s*.*?\)/g, '');

    // 移除其他括号中的干扰信息
    cleaned = cleaned.replace(/（.*?=.*?）/g, '');  // 中文括号
    cleaned = cleaned.replace(/\(.*?=.*?\)/g, '');  // 英文括号

    // 移除逗号后的额外描述
    // 格式：XXX公司，联系人：张三 → XXX公司
    // 注意：只移除中文逗号或后面跟着关键词的内容，避免破坏 "Co., Ltd"
    // 先处理中文逗号后的联系人、地址等信息
    cleaned = cleaned.replace(/，\s*(?:联系人|联系|地址|电话|手机|传真|邮编)[:：].*$/g, '');
    cleaned = cleaned.replace(/，\s*(?:联系人|联系|地址|电话|手机|传真|邮编)\s*.*$/g, '');
    // 再处理中文逗号后的一般性描述（作为最后的兜底）
    // 只有当后面跟着明确的描述性词汇时才移除
    cleaned = cleaned.replace(/，\s*(?:北京市|上海市|天津市|重庆市|省|区|路|街道|大厦).*$/g, '');

    // 再移除英文分号后的内容
    cleaned = cleaned.replace(/;\s*(?:Contact|Tel|Phone|Address|Fax|Zip)[:：].*$/g, '');
    cleaned = cleaned.replace(/;\s*(?:Contact|Tel|Phone|Address|Fax|Zip)\s*.*$/g, '');

    // 最终trim，移除所有可能的空格
    cleaned = cleaned.trim();

    // 验证清理后的公司名称是否有效
    if (!this.isValidCompanyName(cleaned)) {
      this.logger.warn(`[postProcessCompanyName] Invalid company name after cleaning: "${cleaned}" (original: "${companyName}")`);
      return undefined;
    }

    return cleaned;
  }

  /**
   * Spec 41.6: 验证公司名称是否有效
   *
   * 有效条件：
   * - 长度 >= 4 且 <= 80
   * - 包含至少一个公司关键词（公司/有限/股份/企业/集团/Ltd/LLC等）
   */
  private isValidCompanyName(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }

    const trimmed = name.trim();

    // 长度检查
    if (trimmed.length < 4 || trimmed.length > 80) {
      return false;
    }

    // 必须包含公司关键词
    const companyKeywords = ['公司', '有限', '股份', '企业', '集团', 'Co.', 'Ltd', 'LLC', 'Inc', 'Corp'];
    const hasKeyword = companyKeywords.some(k => trimmed.includes(k));

    if (!hasKeyword) {
      return false;
    }

    // 不能只是关键词本身
    if (['公司', '有限公司', '股份有限公司', '企业', '集团'].includes(trimmed)) {
      return false;
    }

    return true;
  }

  /**
   * Spec 41.6: 应用后处理清理到合并结果
   *
   * 对BASIC_INFO结果中的公司名称字段进行后处理
   */
  private applyPostProcessing(result: Record<string, any>): Record<string, any> {
    const cleaned = { ...result };

    // 清理 customerName
    if (cleaned.customerName) {
      const processedCustomer = this.postProcessCompanyName(cleaned.customerName);
      if (processedCustomer) {
        cleaned.customerName = processedCustomer;
      } else {
        this.logger.warn(`[applyPostProcessing] customerName "${cleaned.customerName}" failed validation, removing`);
        delete cleaned.customerName;
      }
    }

    // 清理 ourEntity
    if (cleaned.ourEntity) {
      const processedOurEntity = this.postProcessCompanyName(cleaned.ourEntity);
      if (processedOurEntity) {
        cleaned.ourEntity = processedOurEntity;
      } else {
        this.logger.warn(`[applyPostProcessing] ourEntity "${cleaned.ourEntity}" failed validation, removing`);
        delete cleaned.ourEntity;
      }
    }

    return cleaned;
  }

  /**
   * 动态计算 max_tokens，确保不超过模型上下文窗口限制
   *
   * @param estimatedInputTokens 估计的输入 tokens 数量
   * @param modelMaxTokens 配置的最大 tokens
   * @returns 实际应该使用的 max_tokens
   */
  private calculateDynamicMaxTokens(estimatedInputTokens: number, modelMaxTokens: number): number {
    // 定义不同模型的上下文窗口大小
    // 如果实际使用的模型不同，这些值可能需要调整
    const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
      'gemma3:27b': 8192,
      'gemma3:12b': 8192,
      'gemma3:4b': 8192,
      'gemma2:27b': 8192,
      'gemma2:9b': 8192,
      'qwen2.5:32b': 32768,
      'qwen2.5:14b': 32768,
      'qwen2.5:7b': 32768,
      'llama3.3:70b': 128000,
      'llama3.1:70b': 128000,
      'llama3.1:8b': 128000,
      'llama3:70b': 8192,
      'mistral:7b': 32768,
      'gpt-4o': 128000,
      'gpt-4o-mini': 128000,
      'gpt-4-turbo': 128000,
      'gpt-3.5-turbo': 16385,
    };

    const config = this.configService.getActiveConfig();
    const modelName = config.model;

    // 查找模型的上下文窗口大小
    let contextWindow = 8192; // 默认值
    for (const [model, size] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
      if (modelName.includes(model)) {
        contextWindow = size;
        break;
      }
    }

    // 为系统消息和其他开销预留空间
    const overheadTokens = 500; // 系统消息、格式化等
    const availableForOutput = contextWindow - estimatedInputTokens - overheadTokens;

    // 确保至少有 1000 tokens 用于输出
    const minOutputTokens = 1000;
    const calculatedMaxTokens = Math.max(
      minOutputTokens,
      Math.min(modelMaxTokens, availableForOutput)
    );

    this.logger.debug(`[calculateDynamicMaxTokens] model=${modelName}, contextWindow=${contextWindow}, ` +
      `inputTokens=${estimatedInputTokens}, calculatedMax=${calculatedMaxTokens}, ` +
      `configMax=${modelMaxTokens}`);

    return calculatedMaxTokens;
  }

  /**
   * 估算文本的 tokens 数量
   * 粗略估算：中文约 1.5 字符 = 1 token，英文约 4 字符 = 1 token
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;

    // 统计中文字符数
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 统计非中文字符数
    const nonChineseChars = text.length - chineseChars;

    // 中文：约 1.5 字符 = 1 token
    // 英文：约 4 字符 = 1 token
    return Math.ceil(chineseChars / 1.5 + nonChineseChars / 4);
  }

  /**
   * 在单个文本块上执行任务（Phase 2: 增加超时和重试 + 数据质量验证）
   */
  private async executeSingleChunkTask(
    text: string,
    task: ExtractionTask,
    sessionId?: string,
    reportProgress: boolean = true
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const llmConfig = this.configService.getActiveConfig();

    // Phase 2: 使用超时和重试包装器执行LLM调用
    const taskResult = await this.executeWithTimeoutAndRetry(
      async () => {
        // 构建 prompt
        const basePrompt = task.promptBuilder(text);
        const prompt = this.enhancePrompt(basePrompt, task.infoType, text);
        const systemPrompt = this.getSystemPrompt(task.infoType);

        this.logger.log(`[SingleChunk] ${task.infoType}: prompt length=${prompt.length}`);

        // Phase 6: 动态计算 max_tokens，避免超过模型上下文窗口限制
        const estimatedInputTokens = this.estimateTokens(systemPrompt) + this.estimateTokens(prompt);
        const dynamicMaxTokens = this.calculateDynamicMaxTokens(estimatedInputTokens, llmConfig.maxTokens);

        this.logger.log(`[SingleChunk] ${task.infoType}: estimatedInputTokens=${estimatedInputTokens}, ` +
          `dynamicMaxTokens=${dynamicMaxTokens} (configMax=${llmConfig.maxTokens})`);

        // 调用 LLM
        const completion = await this.openai!.chat.completions.create({
          model: llmConfig.model,
          temperature: 0.1,
          max_tokens: dynamicMaxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        });

        const content = completion.choices[0]?.message?.content;
        const tokensUsed = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

        if (!content) {
          throw new Error('Empty response from LLM');
        }

        // Phase 5: 检测二进制数据响应（本地模型的常见问题）
        if (this.containsBinaryData(content)) {
          this.debugLog(`[SingleChunk] ${task.infoType} Binary Data Detected`, {
            contentLength: content.length,
            nullByteCount: (content.match(/\u0000/g) || []).length,
            contentPreview: content.substring(0, 200).replace(/\u0000/g, '\\x00'),
          });
          throw new Error('LLM returned binary data (null bytes detected) - this is a known issue with some local models');
        }

        // Phase 1: 增强调试日志 - 记录LLM原始响应
        this.debugLog(`[SingleChunk] ${task.infoType} LLM Response Received`, {
          contentLength: content.length,
          tokensUsed,
          processingTimeMs: Date.now() - startTime,
          contentPreview: content.substring(0, 500),
        });

        // 解析 JSON
        const jsonContent = this.extractJson(content);
        let data;
        try {
          data = JSON.parse(jsonContent);
        } catch (parseError) {
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          this.debugLog(`[SingleChunk] ${task.infoType} JSON Parse Failed`, {
            errorMessage,
            jsonContentLength: jsonContent.length,
            jsonContentPreview: jsonContent.substring(0, 500),
          });
          throw new Error(`JSON解析失败: ${errorMessage}`);
        }

        // Phase 4: 数据质量验证 - 检测并过滤明显的幻觉数据
        data = this.validateExtractedData(data, task.infoType, text);

        // Phase 1: 增强调试日志 - 记录解析后的数据
        this.debugLog(`[SingleChunk] ${task.infoType} Parsed Data (after validation)`, {
          dataKeys: Object.keys(data),
          dataSize: JSON.stringify(data).length,
          dataPreview: JSON.stringify(data).substring(0, 500),
        });

        // 验证（如果启用）
        if (this.resultValidator) {
          const topic = this.mapInfoTypeToExtractTopic(task.infoType);
          if (topic) {
            const validationResult = await this.resultValidator.validateWithRetry(data, text, topic);
            data = validationResult.result;
          }
        }

        return {
          data,
          tokensUsed,
        };
      },
      `SingleChunk-${task.infoType}`,
      llmConfig.timeout || 120000,
      this.taskConfigs[task.infoType]?.maxRetries || 1
    );

    const processingTime = Date.now() - startTime;

    if (!taskResult.success) {
      const errorMessage = taskResult.error || 'Unknown error';
      this.debugLog(`[SingleChunk] ${task.infoType} Final Result: Failed`, {
        errorMessage,
        timedOut: taskResult.timedOut,
        retries: taskResult.retries,
        processingTimeMs: processingTime,
      });

      return {
        taskId: task.id,
        infoType: task.infoType,
        success: false,
        error: `${errorMessage}${taskResult.timedOut ? ' (TIMEOUT)' : ''}${taskResult.retries > 0 ? ` (after ${taskResult.retries} retries)` : ''}`,
        processingTimeMs: processingTime,
      };
    }

    return {
      taskId: task.id,
      infoType: task.infoType,
      success: true,
      data: taskResult.result?.data,
      tokensUsed: taskResult.result?.tokensUsed || 0,
      processingTimeMs: processingTime,
    };
  }

  /**
   * Phase 4: 验证提取的数据质量，过滤明显的幻觉数据
   *
   * 检测规则：
   * 1. 公司名称不能包含"集团"、"可持续"、"政策"等通用词汇（除非是真实公司名的一部分）
   * 2. 公司名称必须包含"公司"、"有限"、"股份"等关键词
   * 3. 合同名称不能是文档中其他无关的标题
   * 4. 检测占位符如【中国 司】、[甲方公司]等
   */
  private validateExtractedData(data: Record<string, any>, infoType: InfoType, originalText: string): Record<string, any> {
    const cleaned = { ...data };

    // 检测并清理customerName
    if (cleaned.customerName) {
      if (this.isLikelyHallucinatedCompanyName(cleaned.customerName, originalText)) {
        this.debugLog(`[DataValidation] ${infoType} customerName appears hallucinated`, {
          extractedValue: cleaned.customerName,
          originalTextSnippet: originalText.substring(0, 500),
        });
        cleaned.customerName = undefined;
      }
    }

    // 检测并清理ourEntity
    if (cleaned.ourEntity) {
      if (this.isLikelyHallucinatedCompanyName(cleaned.ourEntity, originalText)) {
        this.debugLog(`[DataValidation] ${infoType} ourEntity appears hallucinated`, {
          extractedValue: cleaned.ourEntity,
          originalTextSnippet: originalText.substring(0, 500),
        });
        cleaned.ourEntity = undefined;
      }
    }

    // 检测占位符数据
    for (const key of Object.keys(cleaned)) {
      const value = cleaned[key];
      if (typeof value === 'string') {
        // 检测中文占位符：【...】、〔...〕、〈...〉等
        if (/^【[^】]+】$|^〔[^〕]+〕$|^〈[^〉]+〉$/.test(value.trim())) {
          this.debugLog(`[DataValidation] ${infoType} ${key} contains placeholder`, { extractedValue: value });
          cleaned[key] = undefined;
        }
        // 检测通用占位符
        if (['甲方公司', '乙方公司', '委托方', '受托方', '[甲方]', '[乙方]', '甲方', '乙方'].includes(value)) {
          this.debugLog(`[DataValidation] ${infoType} ${key} contains generic placeholder`, { extractedValue: value });
          cleaned[key] = undefined;
        }
      }
    }

    // 检测合同名称是否幻觉（与文档标题不匹配）
    if (cleaned.contractName && originalText.length > 0) {
      // 从原文中提取文档标题（通常是第一行或第一个#标题）
      const titleMatch = this.extractTitleFromText(originalText);
      if (titleMatch && titleMatch !== cleaned.contractName && !originalText.includes(cleaned.contractName)) {
        // 如果提取的合同名称不在文档中，且文档有明确的标题，使用文档标题
        if (Math.abs(cleaned.contractName.length - titleMatch.length) > 20) {
          this.debugLog(`[DataValidation] ${infoType} contractName appears hallucinated`, {
            extractedValue: cleaned.contractName,
            documentTitle: titleMatch,
          });
          // 不要完全删除，可能contractName是附件中的
          // cleaned.contractName = titleMatch;
        }
      }
    }

    return cleaned;
  }

  /**
   * Phase 4: 从文本中提取文档标题
   * 优先取第一个#标题，否则取第一行非空行
   */
  private extractTitleFromText(text: string): string | null {
    if (!text) return null;

    // 尝试匹配markdown标题
    const titleMatch = text.match(/^#+\s*(.+?)\s*$/m);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    // 尝试取第一行非空行
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // 如果第一行太长（超过100字符），可能不是标题
      if (firstLine.length <= 100) {
        return firstLine;
      }
    }

    return null;
  }

  /**
   * Phase 4: 检测公司名称是否为幻觉数据
   *
   * 规则：
   * - 包含"集团"、"可持续"、"政策"、"供应链"等通用词汇但缺少"公司"、"有限"等关键词
   * - 不在原文中出现
   * - 明显是文档中的某个标题而非公司名
   */
  private isLikelyHallucinatedCompanyName(extracted: string, originalText: string): boolean {
    if (!extracted || typeof extracted !== 'string') return false;

    const value = extracted.trim();

    // 规则1: 缺少公司关键词
    const companyKeywords = ['公司', '有限', '股份', '企业', '集团', 'Co.', 'Ltd', 'LLC', 'Inc', 'Corp'];
    const hasCompanyKeyword = companyKeywords.some(k => value.includes(k));
    if (!hasCompanyKeyword) {
      return true; // 没有公司关键词，很可能是幻觉
    }

    // 规则2: 包含明显的非公司词汇
    const nonCompanyPatterns = [
      '可持续', '供应链', '政策', '规定', '制度', '办法', '管理', '体系',
      '技术开发', '项目外包', '系统运营', '业务系统', '运营提升'
    ];
    const hasNonCompanyPattern = nonCompanyPatterns.some(p => value.includes(p));
    if (hasNonCompanyPattern) {
      // 如果不在原文中，很可能是幻觉
      const inOriginal = originalText.includes(value);
      if (!inOriginal) {
        return true;
      }
    }

    // 规则3: 完全匹配文档中的某个标题（去除#号）
    const cleanedForComparison = value.replace(/^#+\s*/, '').trim();
    const titlePattern = new RegExp(`^#+\\s*${cleanedForComparison.replace(/[.*+?^${}\\()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
    const titleMatch = originalText.match(titlePattern);
    if (titleMatch && !value.includes('公司')) {
      return true; // 提取的是文档标题而非公司名
    }

    return false;
  }

  /**
   * Spec 41.4: 在单个文本块上执行任务（带分块上下文，Phase 2: 增加超时和重试）
   * 用于BASIC_INFO等需要上下文信息的任务
   */
  private async executeSingleChunkTaskWithContext(
    text: string,
    task: ExtractionTask,
    chunkMetadata: {
      contractName?: string;
      chunkTitle?: string;
      positionHint?: string;
    },
    sessionId?: string,
    reportProgress: boolean = true
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const llmConfig = this.configService.getActiveConfig();

    // Phase 2: 使用超时和重试包装器执行LLM调用
    const taskResult = await this.executeWithTimeoutAndRetry(
      async () => {
        // Spec 41.4: 使用带上下文的Prompt构建器
        const basePrompt = (task as any).promptBuilderWithContext
          ? (task as any).promptBuilderWithContext(text, chunkMetadata)
          : task.promptBuilder(text);

        const prompt = this.enhancePrompt(basePrompt, task.infoType, text);

        this.logger.log(`[SingleChunkWithContext] ${task.infoType}: prompt length=${prompt.length}, context=${JSON.stringify(chunkMetadata)}`);

        // 调用 LLM
        const completion = await this.openai!.chat.completions.create({
          model: llmConfig.model,
          temperature: 0.1,
          max_tokens: llmConfig.maxTokens,
          messages: [
            { role: 'system', content: this.getSystemPrompt(task.infoType) },
            { role: 'user', content: prompt },
          ],
        });

        const content = completion.choices[0]?.message?.content;
        const tokensUsed = (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

        if (!content) {
          throw new Error('Empty response from LLM');
        }

        // Phase 1: 增强调试日志 - 记录LLM原始响应
        this.debugLog(`[SingleChunkWithContext] ${task.infoType} LLM Response Received`, {
          contentLength: content.length,
          tokensUsed,
          processingTimeMs: Date.now() - startTime,
          chunkMetadata,
          contentPreview: content.substring(0, 500),
        });

        // Spec 41.2: 使用JsonTolerantParser容错解析
        const expectedFields = (task as any).targetFields || [];
        let data: Record<string, any>;
        try {
          data = JsonTolerantParser.parse(content, expectedFields);
        } catch (parseError) {
          const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
          this.debugLog(`[SingleChunkWithContext] ${task.infoType} JsonTolerantParser Failed`, {
            errorMessage,
            expectedFields,
            contentPreview: content.substring(0, 500),
          });
          this.logger.warn(`[SingleChunkWithContext] JsonTolerantParser failed, trying extractJson: ${errorMessage}`);
          // 回退到原始extractJson方法
          const jsonContent = this.extractJson(content);
          data = JSON.parse(jsonContent);
        }

        // Phase 1: 增强调试日志 - 记录解析后的数据
        this.debugLog(`[SingleChunkWithContext] ${task.infoType} Parsed Data`, {
          dataKeys: Object.keys(data),
          dataSize: JSON.stringify(data).length,
          dataPreview: JSON.stringify(data).substring(0, 500),
        });

        // Phase 4: 数据质量验证 - 过滤幻觉数据和占位符
        data = this.validateExtractedData(data, task.infoType, text);
        this.debugLog(`[SingleChunkWithContext] ${task.infoType} After Validation`, {
          dataKeys: Object.keys(data),
          filteredKeys: Object.keys(data).filter(k => data[k] === undefined),
        });

        // 验证（如果启用）
        if (this.resultValidator) {
          const topic = this.mapInfoTypeToExtractTopic(task.infoType);
          if (topic) {
            const validationResult = await this.resultValidator.validateWithRetry(data, text, topic);
            data = validationResult.result;
          }
        }

        return {
          data,
          tokensUsed,
        };
      },
      `SingleChunkWithContext-${task.infoType}`,
      llmConfig.timeout || 120000,
      this.taskConfigs[task.infoType]?.maxRetries || 1
    );

    const processingTime = Date.now() - startTime;

    if (!taskResult.success) {
      const errorMessage = taskResult.error || 'Unknown error';
      this.debugLog(`[SingleChunkWithContext] ${task.infoType} Final Result: Failed`, {
        errorMessage,
        timedOut: taskResult.timedOut,
        retries: taskResult.retries,
        processingTimeMs: processingTime,
        chunkMetadata,
      });

      return {
        taskId: task.id,
        infoType: task.infoType,
        success: false,
        error: `${errorMessage}${taskResult.timedOut ? ' (TIMEOUT)' : ''}${taskResult.retries > 0 ? ` (after ${taskResult.retries} retries)` : ''}`,
        processingTimeMs: processingTime,
      };
    }

    return {
      taskId: task.id,
      infoType: task.infoType,
      success: true,
      data: taskResult.result?.data,
      tokensUsed: taskResult.result?.tokensUsed || 0,
      processingTimeMs: processingTime,
    };
  }

  /**
   * 串行执行所有任务（避免Ollama并发连接问题）
   * @deprecated 使用 executeTasksWithChunks 替代
   */
  private async executeTasksParallel(
    text: string,
    chunks: any[],
    tasks: ExtractionTask[],
    sessionId?: string
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];

    this.logger.log(`[Serial Execution] Starting loop with ${tasks.length} tasks`);
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      this.logger.log(`[Serial Execution] ========== Task ${i + 1}/${tasks.length}: ${task.infoType} ==========`);
      const startTime = Date.now();
      try {
        this.logger.log(`[Task ${task.infoType}] Starting execution (serial mode)`);
        const result = await this.executeSingleTask(text, chunks, task, sessionId);
        this.logger.log(`[Task ${task.infoType}] Finished with success=${result.success}, tokensUsed=${result.tokensUsed}`);
        results.push(result);

        // Add a small delay between tasks to avoid overwhelming the LLM
        if (i < tasks.length - 1) {
          this.logger.log(`[Serial Execution] Waiting 500ms before next task...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`[Task ${task.infoType}] Failed: ${errorMessage}`);
        results.push({
          taskId: task.id,
          infoType: task.infoType,
          success: false,
          error: errorMessage,
          processingTimeMs: Date.now() - startTime,
        });
        // 报告任务失败
        if (sessionId && this.progressService) {
          this.progressService.failTask(sessionId, task.infoType, errorMessage);
        }
      }
      this.logger.log(`[Serial Execution] ========== Completed Task ${i + 1}/${tasks.length} ==========`);
    }
    this.logger.log(`[Serial Execution] Loop completed. Total results: ${results.length}`);

    // ========== Ollama Format 使用汇总 (Serial Execution) ==========
    const tasksWithOllamaFormat = results.filter(r => r.usedOllamaFormat);
    const tasksWithoutOllamaFormat = results.filter(r => !r.usedOllamaFormat);
    const ollamaFormatTaskTypes = tasksWithOllamaFormat.map(r => r.infoType);

    this.logger.log(`[Serial Execution] ========== Ollama Format 使用汇总 ==========`);
    this.logger.log(`[Serial Execution] 使用 Format: ${tasksWithOllamaFormat.length}/${results.length} 个任务`);
    if (ollamaFormatTaskTypes.length > 0) {
      this.logger.log(`[Serial Execution] Format 任务: ${ollamaFormatTaskTypes.join(', ')}`);
    }
    this.logger.log(`[Serial Execution] ========== 汇总完成 ==========`);

    return results;
  }

  /**
   * 执行单个任务
   */
  private async executeSingleTask(
    text: string,
    chunks: any[],
    task: ExtractionTask,
    sessionId?: string
  ): Promise<TaskResult> {
    const startTime = Date.now();
    const taskConfig = this.taskConfigs[task.infoType];

    this.logger.log(`[Task ${task.infoType}] === Starting: ${task.description}, enabled=${taskConfig?.enabled}`);

    // 报告任务开始
    if (sessionId && this.progressService) {
      this.logger.log(`[Task ${task.infoType}] Reporting task start to progress service`);
      this.progressService.startTask(sessionId, task.infoType);
    }

    try {
      // 构建基础 prompt
      const basePrompt = task.requiresChunks
        ? task.promptBuilder(text, chunks)
        : task.promptBuilder(text);

      // 增强 prompt（规则提取 + Few-Shot 示例）
      const prompt = this.enhancePrompt(basePrompt, task.infoType, text);

      this.logger.log(`[Task ${task.infoType}] Prompt built (base=${basePrompt.length}, enhanced=${prompt.length}), requiresChunks=${task.requiresChunks}`);

      // 调用LLM
      const llmConfig = this.configService.getActiveConfig();
      this.logger.log(`[Task ${task.infoType}] ========== 调用 LLM ==========`);
      this.logger.log(`[Task ${task.infoType}] Model: ${llmConfig.model}`);
      this.logger.log(`[Task ${task.infoType}] BaseUrl: ${llmConfig.baseUrl}`);
      this.logger.log(`[Task ${task.infoType}] Timeout: ${llmConfig.timeout}ms`);
      this.logger.log(`[Task ${task.infoType}] MaxTokens: ${llmConfig.maxTokens}`);
      this.logger.log(`[Task ${task.infoType}] Prompt长度: ${prompt.length} 字符`);

      // Provider 分流逻辑 (SPEC-42)
      const provider = this.configService.getProviderName();
      const useNativeOllama = provider === 'ollama' && !!this.ollamaChatClient;
      const jsonSchema = getTopicSchema(task.infoType);

      this.debugLog(`[Task ${task.infoType}] LLM 调用参数`, {
        model: llmConfig.model,
        baseUrl: llmConfig.baseUrl,
        timeout: llmConfig.timeout,
        maxTokens: llmConfig.maxTokens,
        promptLength: prompt.length,
        provider,
        useNativeOllama,
        hasJsonSchema: !!jsonSchema,
        hasOpenaiClient: !!this.openai,
        hasOllamaChatClient: !!this.ollamaChatClient,
      });

      let content: string;
      let tokensUsed: number;
      let usedOllamaFormat = false; // 跟踪是否使用了 Ollama format 参数

      if (useNativeOllama && jsonSchema) {
        // 使用 Ollama 原生 API + format 参数 (SPEC-42)
        usedOllamaFormat = true; // 标记使用了 Ollama format
        const schemaObj = jsonSchema as { type?: string; properties?: Record<string, unknown> };
        const propertyCount = schemaObj.properties ? Object.keys(schemaObj.properties).length : 0;

        this.logger.log(`[Task ${task.infoType}] ========== 使用 Ollama Format 模式 ==========`);
        this.logger.log(`[Task ${task.infoType}] Schema 类型: ${schemaObj.type}`);
        this.logger.log(`[Task ${task.infoType}] Schema 字段数: ${propertyCount}`);

        // 打印 schema 中的字段列表
        if (schemaObj.properties) {
          const fieldNames = Object.keys(schemaObj.properties).join(', ');
          this.logger.log(`[Task ${task.infoType}] Schema 字段: ${fieldNames}`);
        }

        const taskStartTime = Date.now();

        try {
          const response = await this.ollamaChatClient!.chat({
            systemPrompt: this.getSystemPrompt(task.infoType),
            userContent: prompt,
            format: jsonSchema,
            temperature: 0.1,
            maxTokens: llmConfig.maxTokens,
          });

          content = response.content;
          tokensUsed = response.tokensUsed;
          const taskElapsed = Date.now() - taskStartTime;

          this.logger.log(`[Task ${task.infoType}] ========== Ollama Format 完成 ==========`);
          this.logger.log(`[Task ${task.infoType}] 总耗时: ${taskElapsed}ms`);
          this.logger.log(`[Task ${task.infoType}] 响应: ${content.length} chars, ${tokensUsed} tokens`);

          // 验证 JSON 格式
          try {
            const parsed = JSON.parse(content);
            const parsedKeys = Object.keys(parsed);
            this.logger.log(`[Task ${task.infoType}] 解析成功: 提取到 ${parsedKeys.length} 个字段`);
            this.logger.debug(`[Task ${task.infoType}] 提取字段: ${parsedKeys.join(', ')}`);
          } catch (e) {
            this.logger.warn(`[Task ${task.infoType}] JSON 解析失败: ${(e as Error).message}`);
            this.logger.debug(`[Task ${task.infoType}] 原始响应: ${content.substring(0, 500)}...`);
          }
        } catch (llmError) {
          const errorMsg = llmError instanceof Error ? llmError.message : String(llmError);
          const errorStack = llmError instanceof Error ? llmError.stack : '';
          this.logger.error(`[Task ${task.infoType}] ========== Ollama API 调用失败 ==========`);
          this.logger.error(`[Task ${task.infoType}] 错误信息: ${errorMsg}`);
          this.logger.error(`[Task ${task.infoType}] 错误堆栈: ${errorStack}`);
          this.debugLog(`[Task ${task.infoType}] Ollama调用失败`, {
            error: errorMsg,
            stack: errorStack,
            llmConfig: {
              model: llmConfig.model,
              baseUrl: llmConfig.baseUrl,
              timeout: llmConfig.timeout,
            }
          });
          throw llmError;
        }
      } else {
        // 使用 OpenAI SDK 兼容模式（OpenAI API 或 Ollama /v1 端点）
        this.logger.log(`[Task ${task.infoType}] Using OpenAI SDK compatibility mode`);

        let completion;
        try {
          completion = await this.openai!.chat.completions.create({
            model: this.configService.getActiveConfig().model,
            temperature: 0.1,
            max_tokens: this.configService.getActiveConfig().maxTokens,
            messages: [
              { role: 'system', content: this.getSystemPrompt(task.infoType) },
              { role: 'user', content: prompt },
            ],
            // Note: response_format not supported by Ollama /v1 endpoint
            // For native Ollama, use the OllamaChatClient with format parameter
          });
        } catch (llmError) {
          const errorMsg = llmError instanceof Error ? llmError.message : String(llmError);
          const errorStack = llmError instanceof Error ? llmError.stack : '';
          this.logger.error(`[Task ${task.infoType}] ========== OpenAI SDK 调用失败 ==========`);
          this.logger.error(`[Task ${task.infoType}] 错误信息: ${errorMsg}`);
          this.logger.error(`[Task ${task.infoType}] 错误堆栈: ${errorStack}`);
          this.debugLog(`[Task ${task.infoType}] OpenAI SDK调用失败`, {
            error: errorMsg,
            stack: errorStack,
            llmConfig: {
              model: llmConfig.model,
              baseUrl: llmConfig.baseUrl,
              timeout: llmConfig.timeout,
            }
          });
          throw llmError;
        }

        content = completion.choices[0]?.message?.content || '';
        tokensUsed = (completion.usage?.prompt_tokens || 0) +
                    (completion.usage?.completion_tokens || 0);

        this.logger.log(
          `[Task ${task.infoType}] OpenAI SDK response: ${content.length} chars, ${tokensUsed} tokens`
        );

        // OpenAI 路径需要提取 JSON（可能包含 markdown 代码块）
        content = this.extractJson(content);
      }

      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Parse JSON with dedicated error handling
      let data;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        this.logger.error(`[Task ${task.infoType}] JSON解析失败: ${errorMessage}`);
        this.logger.error(`[Task ${task.infoType}] Raw content (first 500 chars): ${content.substring(0, 500)}`);
        throw new Error(`LLM返回的JSON格式无效: ${errorMessage}`);
      }
      this.logger.log(`[Task ${task.infoType}] JSON parsed successfully, keys=${Object.keys(data).join(',')}`);

      // 验证并重试（如果启用了 ResultValidatorService）
      if (this.resultValidator) {
        const topic = this.mapInfoTypeToExtractTopic(task.infoType);
        if (topic) {
          this.logger.log(`[Task ${task.infoType}] Starting validation with retry...`);
          const validationResult = await this.resultValidator.validateWithRetry(data, text, topic);
          data = validationResult.result;
          this.logger.log(
            `[Task ${task.infoType}] Validation completed: score=${validationResult.validation.score}, ` +
            `retries=${validationResult.retryCount}, errors=${validationResult.validation.errors.length}, ` +
            `warnings=${validationResult.validation.warnings.length}`
          );
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[Task ${task.infoType}] Completed successfully: ${processingTime}ms, ${tokensUsed} tokens`
      );

      // 报告任务完成
      if (sessionId && this.progressService) {
        this.logger.log(`[Task ${task.infoType}] Reporting task completion to progress service`);
        this.progressService.completeTask(sessionId, task.infoType, data);
      }

      return {
        taskId: task.id,
        infoType: task.infoType,
        success: true,
        data,
        tokensUsed,
        processingTimeMs: processingTime,
        usedOllamaFormat, // 记录是否使用了 Ollama format 参数
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const processingTime = Date.now() - startTime;

      // Log to file for debugging
      this.debugLog(`[Task ${task.infoType}] Failed`, {
        errorMessage,
        processingTime,
        llmConfig: {
          baseUrl: this.configService.getActiveConfig().baseUrl,
          model: this.configService.getActiveConfig().model,
          hasOpenaiClient: !!this.openai,
        }
      });

      // Log full error for debugging
      this.logger.error(
        `[Task ${task.infoType}] Failed after ${processingTime}ms: ${errorMessage}`,
        errorStack || '',
      );

      // 报告任务失败
      if (sessionId && this.progressService) {
        this.logger.log(`[Task ${task.infoType}] Reporting task failure to progress service`);
        this.progressService.failTask(sessionId, task.infoType, errorMessage);
      }

      return {
        taskId: task.id,
        infoType: task.infoType,
        success: false,
        error: errorMessage,
        processingTimeMs: processingTime,
      };
    }
  }

  /**
   * 根据任务名称执行单个任务
   * 用于两阶段解析：先执行 BASIC_INFO 获取合同类型，再执行相应的主题批次
   */
  private async executeSingleTaskByName(
    text: string,
    chunks: any[],
    infoType: InfoType,
    sessionId?: string
  ): Promise<TaskResult> {
    // 获取所有任务定义
    const allTasks = this.getTasksToExecute(); // 获取所有启用的任务
    const task = allTasks.find(t => t.infoType === infoType);

    if (!task) {
      this.logger.error(`[executeSingleTaskByName] Task not found: ${infoType}`);
      return {
        taskId: infoType,
        infoType,
        success: false,
        error: `Task ${infoType} not found or not enabled`,
        processingTimeMs: 0,
      };
    }

    this.logger.log(`[executeSingleTaskByName] Executing single task: ${infoType}`);
    return this.executeSingleTask(text, chunks, task, sessionId);
  }

  /**
   * 合并所有任务结果
   */
  private mergeTaskResults(results: TaskResult[]): Record<string, any> {
    const merged: Record<string, any> = {
      basicInfo: {},
      financialInfo: {},
      timeInfo: {},
      typeSpecificDetails: {},
    };

    for (const result of results) {
      if (!result.success || !result.data) continue;

      // Phase 3: 记录成功合并的任务数据
      this.debugLog(`[mergeTaskResults] Merging successful task data`, {
        infoType: result.infoType,
        dataKeys: Object.keys(result.data),
      });

      switch (result.infoType) {
        case InfoType.BASIC_INFO:
          Object.assign(merged.basicInfo, result.data);
          if (result.data.contractType) {
            merged.contractType = result.data.contractType;
          }
          break;

        case InfoType.FINANCIAL:
          Object.assign(merged.financialInfo, result.data);
          break;

        case InfoType.TIME_INFO:
          Object.assign(merged.timeInfo, result.data);
          break;

        case InfoType.MILESTONES:
        case InfoType.RATE_ITEMS:
        case InfoType.LINE_ITEMS:
        case InfoType.DELIVERABLES:
          Object.assign(merged.typeSpecificDetails, result.data);
          break;

        case InfoType.RISK_CLAUSES:
          Object.assign(merged.typeSpecificDetails, result.data);
          break;
      }
    }

    // Phase 3: 记录合并后的数据状态
    this.debugLog(`[mergeTaskResults] Final merged data state`, {
      basicInfoKeys: Object.keys(merged.basicInfo),
      financialInfoKeys: Object.keys(merged.financialInfo),
      timeInfoKeys: Object.keys(merged.timeInfo),
      typeSpecificDetailsKeys: Object.keys(merged.typeSpecificDetails),
      hasContractType: !!merged.contractType,
      emptySections: {
        basicInfo: Object.keys(merged.basicInfo).length === 0,
        financialInfo: Object.keys(merged.financialInfo).length === 0,
        timeInfo: Object.keys(merged.timeInfo).length === 0,
        typeSpecificDetails: Object.keys(merged.typeSpecificDetails).length === 0,
      },
    });

    return merged;
  }

  /**
   * 获取系统提示词（根据任务类型）
   * 增强版：包含CoT步骤、Few-Shot示例、自检清单、负面提示
   */
  private getSystemPrompt(infoType: InfoType): string {
    // 通用自检清单
    const selfChecklist = `
【输出前自查】在输出JSON前，请检查：
1. ✓ 枚举值是否完全匹配（contractType, rateType等必须一字不差）
2. ✓ 金额是否为纯数字字符串（无货币符号、无逗号）
3. ✓ 日期格式是否为YYYY-MM-DD
4. ✓ 公司名称是否混入了地址/联系人（如有需清理）
5. ✓ 百分比是否转换为小数（6% → 0.06）
6. ✓ 数组字段结构是否正确
`;

    // 通用禁止事项
    const prohibitions = `
【禁止事项】
- ❌ 不要编造合同中不存在的字段值
- ❌ 不要混入标签文字（如"甲方："、"合同编号："等）
- ❌ 不要简化公司名（保持完整）
- ❌ 不要使用Markdown格式（如**加粗**、__下划线__）
`;

    switch (infoType) {
      case InfoType.BASIC_INFO:
        // 精简版 system prompt，减少 token 使用
        return `你是一个合同信息提取专家。从合同中提取5个字段：
1. contractNo: 合同编号（查找"编号"、"No."、文档开头的编号模式如CTR-2024-001）
2. contractName: 合同名称（文档开头的标题，通常包含"合同"、"协议"、"项目"）
3. customerName: 甲方公司名（只提取公司名，不包含地址电话，去除括号内容）
4. ourEntity: 乙方公司名（只提取公司名，不包含地址电话，去除括号内容）
5. contractType: 合同类型（必须是：STAFF_AUGMENTATION、PROJECT_OUTSOURCING、PRODUCT_SALES之一）

格式要求：
- 去除Markdown标记（**、##、书名号等）
- 公司名不含地址/电话/联系人
- 未找到的字段设为null

严格按照JSON输出。`;

      case InfoType.FINANCIAL:
        return `你是一个专业的合同财务信息提取专家。

【任务】从合同中准确提取财务信息，严格遵循以下步骤：

步骤1：定位关键区域
- 查找关键词："合同金额"、"总价"、"价款"、"费用"、"付款"、"结算"
- 通常在"财务条款"、"付款方式"章节

步骤2：提取每个字段
- amountWithTax（含税金额）：
  ⚠️ 必须是纯数字字符串，不含货币符号
  ⚠️ 处理中文数字：壹=1, 贰=2, 叁=3, 肆=4, 伍=5, 陆=6, 柒=7, 捌=8, 玖=9, 零=0
  ⚠️ 处理单位：万元需×10000，示例：123万元 → 1230000
  ⚠️ 去掉逗号：1,230,000 → 1230000

- amountWithoutTax（不含税金额）：
  同上处理规则

- taxRate（税率）：
  ⚠️ 必须转换为小数格式：6% → 0.06，13% → 0.13
  ⚠️ 常见税率：0, 0.01, 0.03, 0.04, 0.05, 0.06, 0.09, 0.11, 0.13, 0.16, 0.17

- currency（币种）：
  ✓ CNY（人民币/元/￥）
  ✓ USD（美元/$）
  ✓ EUR（欧元/€）
  ✓ HKD（港币/HK$）
  默认：CNY

- paymentMethod（付款方式）：
  银行转账、现金、承兑汇票、电汇等

- paymentTerms（付款条件）：
  描述付款条件的文字，如"分期付款"、"货到付款"、"验收合格后30日内支付"

步骤3：验证金额合理性
- 合同金额应在100到1e10之间
- 如果taxRate>1，说明格式错误，需转换为小数

【Few-Shot示例】
示例1：
输入："合同总价：人民币壹佰贰拾叁万元整（¥1,230,000.00），含6%增值税"
输出：{"amountWithTax": "1230000", "taxRate": "0.06", "currency": "CNY"}

示例2：
输入："服务费用总额为50万元（不含税），税率13%，含税金额56.5万元"
输出：{"amountWithTax": "565000", "amountWithoutTax": "500000", "taxRate": "0.13"}

示例3：
输入："合同金额：$100,000 USD"
输出：{"amountWithTax": "100000", "currency": "USD"}

【常见错误及纠正】
❌ 错误：{"amountWithTax": "¥1,230,000"}  ✅ 正确：{"amountWithTax": "1230000"}
❌ 错误：{"taxRate": "6"}  ✅ 正确：{"taxRate": "0.06"}
❌ 错误：{"taxRate": "6%"}  ✅ 正确：{"taxRate": "0.06"}
` + selfChecklist + prohibitions + `严格按照JSON格式输出，未找到的字段设为null。`;

      case InfoType.MILESTONES:
        return `你是一个专业的项目里程碑提取专家。

【任务】从合同中提取里程碑信息，这是PROJECT_OUTSOURCING类型合同的核心字段！

步骤1：定位里程碑
⚠️⚠️⚠️ 里程碑通常在"付款条款"、"付款方式"、"结算条款"章节
查找以下模式：
- "第X期支付XX%"
- "XX%支付条件：..."
- "分期支付：..."
- "节点1/2/3：..."
- "首款/中款/尾款"

步骤2：提取每个里程碑的sequence、name、amount、paymentPercentage

【sequence字段】
- 从1开始递增：1, 2, 3, ...
- 按"第X期"或付款顺序确定

【name字段提取规则】⚠️⚠️⚠️ 最关键！
方法：找到"支付"前面的完整条件描述，提取关键事件

示例分析：
原文："第一期：合同生效后2个工作日内，甲方向乙方支付30%"
     ↑                           ↑
    期次                     事件描述
→ name = "合同生效后"（去掉"2个工作日内"这类时间限制）

原文："第二期：原型系统开发完成后，阶段验收合格后5个工作日内..."
     ↑                           ↑
    期次                     事件描述
→ name = "原型系统开发完成后"

原文："第三期：系统上线后..."
→ name = "系统上线后"

原文："第四期：系统正常运行2个月后..."
→ name = "系统正常运行2个月后"

✅ 规则总结：
1. 向前搜索"支付"前面的条件
2. 提取触发事件（去掉"在...内"、"后...日内"等时间描述）
3. 保持原文表述，不要改写

【amount字段】
- 提取"支付"后面的金额
- 转换为纯数字字符串（去掉¥、万、逗号等）

【paymentPercentage字段】
- 提取百分比数字
- 输出纯数字字符串，如"30"表示30%

步骤3：验证
- 所有milestone的paymentPercentage之和应接近100%
- sequence应连续：1,2,3...

【Few-Shot示例】
示例1：
输入："（1）第一期：合同生效后7日内支付30%即¥150,000元；（2）第二期：需求确认后支付30%..."
输出：{"milestones": [
  {"sequence": 1, "name": "合同生效后", "amount": "150000", "paymentPercentage": "30"},
  {"sequence": 2, "name": "需求确认后", "amount": "150000", "paymentPercentage": "30"}
]}

示例2：
输入："分三期支付：签约时付20%，系统上线验收后付50%，正常运行3个月后付30%"
输出：{"milestones": [
  {"sequence": 1, "name": "签约时", "paymentPercentage": "20"},
  {"sequence": 2, "name": "系统上线验收后", "paymentPercentage": "50"},
  {"sequence": 3, "name": "正常运行3个月后", "paymentPercentage": "30"}
]}

【常见错误及纠正】
❌ 错误：name = "合同生效后2个工作日内"（包含时间限制）
✅ 正确：name = "合同生效后"（只提取事件）

❌ 错误：paymentPercentage = "30%"（包含百分号）
✅ 正确：paymentPercentage = "30"（纯数字）
` + selfChecklist + prohibitions + `如果找不到里程碑，返回 {"milestones": []}`;

      case InfoType.RATE_ITEMS:
        return `你是一个专业的人力费率提取专家。

【任务】从合同中提取人力费率表，这是STAFF_AUGMENTATION类型合同的核心字段！

步骤1：定位费率表
查找关键词：
- "费率"、"单价"、"工时单价"、"人月"、"人天"
- "人员配置"、"报价表"、"价格表"
- "hourly rate"、"daily rate"、"monthly rate"

步骤2：提取每个费率项

【role字段】
- 人员级别/角色名称
- 示例：高级工程师、项目经理、测试工程师、业务分析师
- ⚠️ 保留完整角色名称，不要简化

【rateType字段】⚠️ 枚举值，必须完全匹配！
- HOURLY：按小时计费（关键词：元/小时、/小时、hourly、h）
- DAILY：按天计费（关键词：元/天、/天、daily、d）
- MONTHLY：按人月计费（关键词：元/人月、/月、monthly、m）

判断规则：
- 看到"元/小时"、"¥/h"等 → HOURLY
- 看到"元/天"、"¥/d"等 → DAILY
- 看到"元/人月"、"¥/m"、"月薪"等 → MONTHLY

【rate字段】
- 纯数字字符串
- 去掉货币符号和单位
- 示例：800元/小时 → "800"，25000元/人月 → "25000"

步骤3：验证
- rate应该是合理的数字（10到100000之间）
- rateType必须是三个枚举值之一

【Few-Shot示例】
示例1：
输入："高级工程师800元/小时，项目经理45000元/人月"
输出：{"rateItems": [
  {"role": "高级工程师", "rateType": "HOURLY", "rate": "800"},
  {"role": "项目经理", "rateType": "MONTHLY", "rate": "45000"}
]}

示例2：
输入："人员配置及单价：Java开发（高级）：600元/时；测试工程师（中级）：400元/时"
输出：{"rateItems": [
  {"role": "Java开发（高级）", "rateType": "HOURLY", "rate": "600"},
  {"role": "测试工程师（中级）", "rateType": "HOURLY", "rate": "400"}
]}

示例3：
输入："商务分析师：1200元/天，架构师：30000元/月"
输出：{"rateItems": [
  {"role": "商务分析师", "rateType": "DAILY", "rate": "1200"},
  {"role": "架构师", "rateType": "MONTHLY", "rate": "30000"}
]}

【常见错误及纠正】
❌ 错误：rateType = "hour"（枚举值错误）
✅ 正确：rateType = "HOURLY"

❌ 错误：rate = "800元/小时"（包含单位）
✅ 正确：rate = "800"
` + selfChecklist + prohibitions + `严格按照JSON格式输出。`;

      case InfoType.LINE_ITEMS:
        return `你是一个专业的产品清单提取专家。

【任务】从合同中提取产品清单，这是PRODUCT_SALES类型合同的核心字段！

步骤1：定位产品清单
查找关键词：
- "产品清单"、"采购清单"、"设备清单"
- "产品名称"、"规格型号"、"数量"
- "清单列表"、"报价单"

步骤2：提取每个产品项

【productName字段】
- 产品名称/描述
- ⚠️ 保留完整名称，包括型号信息

【quantity字段】
- 数量
- ⚠️ 必须是数字，不要包含单位

【unit字段】
- 计量单位
- 示例：台、套、个、用户、 licenses

【unitPriceWithTax字段】
- 含税单价
- ⚠️ 纯数字字符串，去掉货币符号

【totalAmount字段】（如有）
- 该产品项的总金额
- 纯数字字符串

步骤3：验证
- 数量应该>0
- 单价应该>0

【Few-Shot示例】
示例1：
输入："管理软件V1.0，100用户，500元/用户，总价50000元"
输出：{"lineItems": [
  {"productName": "管理软件V1.0", "quantity": 100, "unit": "用户", "unitPriceWithTax": "500"}
]}

示例2：
输入："产品名称：服务器（型号Dell R740），数量：2台，单价：35000元"
输出：{"lineItems": [
  {"productName": "服务器（型号Dell R740）", "quantity": 2, "unit": "台", "unitPriceWithTax": "35000"}
]}

【常见错误及纠正】
❌ 错误：quantity = "100用户"（包含单位）
✅ 正确：quantity = 100

❌ 错误：unitPriceWithTax = "¥500"（包含货币符号）
✅ 正确：unitPriceWithTax = "500"
` + selfChecklist + prohibitions + `严格按照JSON格式输出。`;

      case InfoType.TIME_INFO:
        return `你是一个专业的合同时间信息提取专家。

【任务】从合同中提取时间信息，严格遵循以下步骤：

步骤1：定位时间信息
查找关键词：
- "签订日期"、"签署日期"、"合同日期"
- "生效日期"、"开始日期"、"起始日期"
- "终止日期"、"结束日期"、"到期日"
- "合同期限"、"有效期"、"履行期限"

步骤2：提取每个字段

【signedAt字段】（签订日期）
- 查找"签订于"、"签署日期"、"合同日期"
- ⚠️ 转换为YYYY-MM-DD格式
- ⚠️ 处理多种格式：
  "2024年3月15日" → "2024-03-15"
  "2024.03.15" → "2024-03-15"
  "2024/3/15" → "2024-03-15"

【effectiveAt字段】（生效日期）
- 查找"生效日期"、"开始日期"、"起始日期"、"自...起"
- ⚠️ 同样转换为YYYY-MM-DD格式

【expiresAt字段】（终止日期）
- 查找"终止日期"、"结束日期"、"到期日"、"至..."
- ⚠️ 同样转换为YYYY-MM-DD格式

【duration字段】（合同期限）
- 文字描述，如"1年"、"3个月"、"自生效日起2年"
- ⚠️ 保持原文描述

步骤3：日期格式化
所有日期必须格式化为YYYY-MM-DD：
- 月份和日期如果是个位数，前面补0
- 示例：2024-3-5 → 2024-03-05

步骤4：验证
- effectiveAt应在expiresAt之前
- 年份应在2000到2100之间

【Few-Shot示例】
示例1：
输入："签订日期：2024年03月15日，自2024年4月1日起至2025年3月31日止"
输出：{"signedAt": "2024-03-15", "effectiveAt": "2024-04-01", "expiresAt": "2025-03-31", "duration": "1年"}

示例2：
输入："合同期限3年，自2024.1.1生效"
输出：{"signedAt": null, "effectiveAt": "2024-01-01", "expiresAt": null, "duration": "3年"}

示例3：
输入："本合同自签署之日起生效，有效期为两年"
输出：{"effectiveAt": "签署之日起", "duration": "两年"}

【常见错误及纠正】
❌ 错误：signedAt = "2024年3月15日"（未转换格式）
✅ 正确：signedAt = "2024-03-15"

❌ 错误：signedAt = "2024-3-5"（月份日期未补0）
✅ 正确：signedAt = "2024-03-05"
` + selfChecklist + prohibitions + `严格按照JSON格式输出，未找到的字段设为null。`;

      case InfoType.DELIVERABLES:
        return `你是一个专业的交付物提取专家。

【任务】从合同中提取交付物信息。

步骤1：定位交付物信息
查找关键词：
- "交付物"、"交付清单"、"验收标准"
- "工作范围"、"SOW"、"服务内容"
- "成果"、"产出"

步骤2：提取字段

【deliverables字段】⚠️ 重要格式要求！
- ⚠️⚠️⚠️ 必须是String类型，不是数组！
- 用逗号分隔或文本描述
- 示例格式："需求规格说明书, 系统设计文档, 源代码, 用户手册"
- 如果原文是列表，用逗号连接

【sowSummary字段】
- 工作范围摘要（Statement of Work摘要）
- 概括合同的主要工作内容
- String类型

步骤3：验证
- deliverables必须是字符串，不要返回数组
- 如果交付物很多，可以提取主要的5-10项

【Few-Shot示例】
示例1：
输入："交付物包括：1.需求规格说明书 2.系统设计文档 3.源代码 4.用户手册 5.安装部署指南"
输出：{"deliverables": "需求规格说明书, 系统设计文档, 源代码, 用户手册, 安装部署指南"}

示例2：
输入："乙方应完成系统开发、测试、部署和培训工作"
输出：{"deliverables": "系统开发, 测试, 部署, 培训", "sowSummary": "系统开发、测试、部署和培训工作"}

示例3：
输入："工作范围：为客户提供ERP系统的定制开发服务，包括需求分析、系统设计、功能开发、数据迁移、用户培训"
输出：{"sowSummary": "为客户提供ERP系统的定制开发服务，包括需求分析、系统设计、功能开发、数据迁移、用户培训"}
` + selfChecklist + prohibitions + `严格按照JSON格式输出，deliverables必须是字符串，不要返回数组。`;

      case InfoType.RISK_CLAUSES:
        return `你是一个专业的风险条款提取专家。

【任务】从合同中提取风险条款信息。

步骤1：定位风险条款
查找关键词：
- "违约"、"赔偿"、"责任"
- "保密"、"知识产权"
- "终止"、"解除"
- "不可抗力"、"争议"

步骤2：提取字段

【riskClauses字段】
- 风险条款数组
- 包括各种风险相关条款
- 如果有多条，提取主要的2-5条

【penaltyClauses字段】
- 违约金条款
- 描述违约责任和赔偿方式
- String类型

【terminationClauses字段】
- 终止合同条款
- 描述合同终止条件
- String类型

步骤3：验证
- 如果找不到相关条款，设为null
- 提取关键内容，不要全文照搬

【Few-Shot示例】
示例1：
输入："违约责任：任何一方违反本合同约定，应向守约方支付合同总额5%的违约金"
输出：{"penaltyClauses": "任何一方违反本合同约定，应向守约方支付合同总额5%的违约金"}

示例2：
输入："保密条款：双方应对在合作过程中获悉的对方商业秘密承担保密义务，保密期限为合同终止后3年"
输出：{"riskClauses": ["双方应对在合作过程中获悉的对方商业秘密承担保密义务，保密期限为合同终止后3年"]}

示例3：
输入："合同终止：任一方可提前30日书面通知对方终止本合同"
输出：{"terminationClauses": "任一方可提前30日书面通知对方终止本合同"}
` + selfChecklist + prohibitions + `严格按照JSON格式输出，未找到的字段设为null。`;

      default:
        return '你是一个专业的合同信息提取助手。请严格按照JSON格式输出。';
    }
  }

  /**
   * ========== Prompt Builder 方法 ==========
   */

  /**
   * Spec 41.4: 构建BASIC_INFO Prompt（支持分块上下文）
   *
   * @param text 合同文本
   * @param chunkMetadata 分块元数据（可选，用于增强Prompt）
   */
  private buildBasicInfoPrompt(
    text: string,
    chunkMetadata?: {
      contractName?: string;
      chunkTitle?: string;
      positionHint?: string;
    }
  ): string {
    // Spec 41.1: 使用MarkdownCleaner清理格式
    const cleanedText = MarkdownCleaner.clean(text);

    // 如果有分块元数据，使用增强的分块Prompt
    if (chunkMetadata) {
      return BASIC_INFO_CHUNK_PROMPT_TEMPLATE(cleanedText, chunkMetadata);
    }

    // 回退到原始Prompt（向后兼容）
    const relevantText = cleanedText.substring(0, Math.min(cleanedText.length, 5000));
    return `请从以下合同文本中提取基本信息。

【需要提取的字段】
1. contractNo - 合同编号
2. contractName - 合同名称
3. customerName - 甲方/客户名称（委托方/发包方/买方）
4. ourEntity - 乙方/供应商名称（受托方/承包方/卖方）
5. taxNo - 税号
6. contractType - 合同类型，必须从以下三种中选择一个：
   - "STAFF_AUGMENTATION" - 人力框架/人力外包合同（特征：工时费率、人天、人月、角色、服务协议）
   - "PROJECT_OUTSOURCING" - 项目外包合同（特征：里程碑、交付物、验收标准、阶段性付款、SOW）
   - "PRODUCT_SALES" - 产品购销合同（特征：产品清单、单价、数量、交货、保修）

【⚠️ 重要提示】
- 只提取你明确看到的字段，不确定的字段必须返回 null
- 公司名称不要包含地址、电话、联系人等额外信息

【合同文本】
${relevantText}

【输出格式】
返回JSON对象，包含上述所有字段。contractType字段必须是英文枚举值。
示例：{"contractNo": "HT-2024-001", "contractName": "XX项目开发合同", "customerName": "甲方公司", "ourEntity": "乙方公司", "taxNo": "91110000...", "contractType": "PROJECT_OUTSOURCING"}`;
  }

  private buildFinancialPrompt(text: string): string {
    return `请从以下合同文本中提取财务信息（金额、税率、付款方式等）：

【合同文本】
${text}

【输出格式】JSON`;
  }

  private buildMilestonesPrompt(text: string, chunks: any[]): string {
    // 找到包含"支付"、"付款"、"里程碑"等关键词的chunks
    const relevantChunks = chunks.filter(c =>
      c.text.includes('支付') ||
      c.text.includes('付款') ||
      c.text.includes('里程碑') ||
      c.text.includes('分期') ||
      c.metadata.fieldRelevance.includes('milestones')
    );

    const relevantText = relevantChunks.length > 0
      ? relevantChunks.map(c => c.text).join('\n...\n')
      : text;

    return `请从以下合同文本中提取项目里程碑信息。

【合同文本】
${relevantText}

【输出格式】JSON（milestones数组）`;
  }

  private buildRateItemsPrompt(text: string): string {
    return `请从以下合同文本中提取人力费率表：

【合同文本】
${text}

【输出格式】JSON（rateItems数组）`;
  }

  private buildLineItemsPrompt(text: string): string {
    return `请从以下合同文本中提取产品清单：

【合同文本】
${text}

【输出格式】JSON（lineItems数组）`;
  }

  private buildTimeInfoPrompt(text: string): string {
    return `请从以下合同文本中提取时间信息。

【需要提取的字段】
1. signedAt - 签订日期（签订于、签署日期、合同日期）
2. effectiveAt - 生效日期（生效日期、开始日期、起始日期、自...起）
3. expiresAt - 终止日期（终止日期、结束日期、到期日、至...）
4. duration - 合同期限（文字描述，如"1年"、"3个月"）

【日期格式】所有日期必须格式化为YYYY-MM-DD（月份和日期如果是个位数，前面补0）
示例："2024年3月15日" → "2024-03-15"

【合同文本】
${text}

【输出格式】
返回JSON对象，包含上述所有字段。示例：{"signedAt": "2024-03-15", "effectiveAt": "2024-04-01", "expiresAt": "2025-03-31", "duration": "1年"}`;
  }

  private buildDeliverablesPrompt(text: string): string {
    return `请从以下合同文本中提取交付物信息：

【合同文本】
${text}

【输出格式】JSON`;
  }

  private buildRiskClausesPrompt(text: string): string {
    return `请从以下合同文本中提取风险条款（违约条款、终止条款等）：

【合同文本】
${text}

【输出格式】JSON`;
  }

  /**
   * 规范化合同类型：将各种格式映射到标准英文枚举值
   * 处理：中文合同类型名、大小写变体、缩写等
   */
  private normalizeContractType(type: string): string {
    if (!type) return 'PROJECT_OUTSOURCING'; // 默认值

    const upperType = type.toUpperCase().trim();

    // 已经是标准枚举值，直接返回
    const validTypes = ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES', 'MIXED'];
    if (validTypes.includes(upperType)) {
      return upperType;
    }

    // 缩写和别名映射
    const aliasMappings: Record<string, string> = {
      'PROJECT': 'PROJECT_OUTSOURCING',
      'STAFF': 'STAFF_AUGMENTATION',
      'PRODUCT': 'PRODUCT_SALES',
      'OUTSOURCING': 'PROJECT_OUTSOURCING',
      'AUGMENTATION': 'STAFF_AUGMENTATION',
      'SALES': 'PRODUCT_SALES',
      '混合': 'MIXED',
      '综合': 'MIXED',
    };

    if (aliasMappings[upperType]) {
      return aliasMappings[upperType];
    }

    // 中文合同类型映射
    const chineseMappings: Record<string, string> = {
      // 人力框架相关
      '人力框架': 'STAFF_AUGMENTATION',
      '人员外包': 'STAFF_AUGMENTATION',
      '劳务派遣': 'STAFF_AUGMENTATION',
      '服务协议': 'STAFF_AUGMENTATION',
      '技术服务': 'STAFF_AUGMENTATION',
      '人力外包': 'STAFF_AUGMENTATION',
      '外包服务': 'STAFF_AUGMENTATION',
      '咨询服务': 'STAFF_AUGMENTATION',

      // 项目外包相关
      '项目外包': 'PROJECT_OUTSOURCING',
      '项目开发': 'PROJECT_OUTSOURCING',
      '系统集成': 'PROJECT_OUTSOURCING',
      '软件开发': 'PROJECT_OUTSOURCING',
      '工程实施': 'PROJECT_OUTSOURCING',
      '工程建设': 'PROJECT_OUTSOURCING',
      '技术开发': 'PROJECT_OUTSOURCING',
      '项目': 'PROJECT_OUTSOURCING',

      // 产品购销相关
      '产品购销': 'PRODUCT_SALES',
      '产品销售': 'PRODUCT_SALES',
      '货物买卖': 'PRODUCT_SALES',
      '设备采购': 'PRODUCT_SALES',
      '采购合同': 'PRODUCT_SALES',
      '销售合同': 'PRODUCT_SALES',
      '供货协议': 'PRODUCT_SALES',
    };

    // 精确匹配
    if (chineseMappings[type]) {
      return chineseMappings[type];
    }

    // 模糊匹配
    for (const [chinese, english] of Object.entries(chineseMappings)) {
      if (type.includes(chinese)) {
        return english;
      }
    }

    // 无法识别时的默认值
    this.logger.warn(`[normalizeContractType] Unknown contract type: "${type}", defaulting to PROJECT_OUTSOURCING`);
    return 'PROJECT_OUTSOURCING';
  }
}
