import { Injectable, Logger, Optional, OnModuleInit } from '@nestjs/common';
import { LlmConfigService } from './config/llm-config.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { ParseProgressService, InfoType } from './parse-progress.service';
import { TopicRegistryService } from './topics/topic-registry.service';
import { RuleEnhancedParserService } from './rule-enhanced-parser.service';
import { ResultValidatorService } from './result-validator.service';
import { ContractTypeDetectorService } from './contract-type-detector.service';
import { ExtractTopic, infoTypeToExtractTopic } from './topics/topics.const';
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
  ) {
    // Don't refreshClient here - wait for onModuleInit
    this.logger.log(`[TaskBasedParser] RuleEnhancedParser: ${!!this.ruleEnhancedParser}, ResultValidator: ${!!this.resultValidator}, ContractTypeDetector: ${!!this.contractTypeDetector}`);
  }

  async onModuleInit() {
    // Wait for config to be loaded from database
    await this.configService.refreshCache();
    this.refreshClient();
    this.logger.log(`TaskBasedParserService initialized with LLM: ${this.configService.getProviderName()}`);
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
      [InfoType.BASIC_INFO]: ['contractNo', 'contractName', 'firstPartyName', 'secondPartyName'],
      [InfoType.FINANCIAL]: ['totalAmount', 'currency', 'taxRate', 'paymentMethod', 'paymentTerms'],
      [InfoType.TIME_INFO]: ['signDate', 'startDate', 'endDate', 'duration'],
      [InfoType.MILESTONES]: ['hasMilestones'],
      [InfoType.RATE_ITEMS]: ['hasRateItems'],
      [InfoType.LINE_ITEMS]: ['hasLineItems'],
      [InfoType.DELIVERABLES]: [],
      [InfoType.RISK_CLAUSES]: [],
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
    };
  }> {
    const startTime = Date.now();

    // Clear debug log file for new session
    fs.writeFileSync(this.debugLogFile, `=== NEW SESSION ${sessionId || 'unknown'} ===\n`);

    this.debugLog(`[Task-based Parser] Starting`, { textLength: text.length, sessionId, contractType, enabledTaskTypes, fileName });
    this.logger.log(`[Task-based Parser] Starting: text length=${text.length}, sessionId=${sessionId}, contractType=${contractType || 'undefined'}, fileName=${fileName || 'undefined'}`);

    // Step 1: 对合同进行语义分段
    const chunks = this.semanticChunker.chunkBySemanticStructure(text);
    this.logger.log(`[Task-based Parser] Created ${chunks.length} semantic chunks`);

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
        if (basicInfoResult.success && basicInfoResult.data?.contractType) {
          detectedContractType = basicInfoResult.data.contractType;
          this.logger.log(`[Task-based Parser] Contract type detected: ${detectedContractType}`);
        }
      }
    }

    // Step 3: 根据合同类型获取要执行的任务
    // 如果指定了合同类型，使用合同类型对应的主题批次；否则使用 enabledTaskTypes 或全部
    let tasksToUse: InfoType[] | undefined = enabledTaskTypes;
    if (detectedContractType) {
      const topicNames = this.topicRegistry.getTopicNamesForContractType(detectedContractType);
      if (topicNames.length > 0) {
        tasksToUse = topicNames as InfoType[];
        this.logger.log(`[Task-based Parser] Using contract type '${detectedContractType}' topic batch: ${topicNames.join(', ')}`);
      } else {
        this.logger.warn(`[Task-based Parser] No topic batch found for contract type '${detectedContractType}', falling back to enabledTaskTypes or all topics`);
      }
    }

    // Step 3: 获取要执行的任务
    const tasks = this.getTasksToExecute(tasksToUse);
    this.logger.log(`[Task-based Parser] Executing ${tasks.length} tasks: ${tasks.map(t => t.infoType).join(', ')}`);

    // 设置任务到进度服务
    if (sessionId && this.progressService) {
      const taskInfoTypes = tasks.map(t => t.infoType);
      this.logger.log(`[Task-based Parser] Setting ${taskInfoTypes.length} tasks to progress service for session ${sessionId}`);
      this.progressService.setTasks(sessionId, taskInfoTypes);
    } else {
      this.logger.warn(`[Task-based Parser] No sessionId or progressService available. sessionId=${sessionId}, progressService=${!!this.progressService}`);
    }

    // Step 4: 串行执行所有任务
    const results = await this.executeTasksParallel(text, chunks, tasks, sessionId);

    // Step 5: 合并结果
    const mergedData = this.mergeTaskResults(results);

    const totalTimeMs = Date.now() - startTime;
    const totalTokensUsed = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    const summary = {
      totalTasks: results.length,
      successfulTasks: results.filter(r => r.success).length,
      failedTasks: results.filter(r => !r.success).length,
      totalTokensUsed,
      totalTimeMs,
    };

    this.debugLog(`[Task-based Parser] Completed`, summary);
    this.logger.log(
      `[Task-based Parser] Completed: ${totalTimeMs}ms, ` +
      `${summary.successfulTasks}/${summary.totalTasks} tasks successful, ` +
      `${totalTokensUsed} tokens`
    );

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
   * 串行执行所有任务（避免Ollama并发连接问题）
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
      this.logger.log(`[Task ${task.infoType}] Calling LLM: model=${llmConfig.model}, timeout=${llmConfig.timeout}, baseUrl=${llmConfig.baseUrl}`);

      const completion = await this.openai!.chat.completions.create({
        model: this.configService.getActiveConfig().model,
        temperature: 0.1,
        max_tokens: this.configService.getActiveConfig().maxTokens,
        messages: [
          { role: 'system', content: this.getSystemPrompt(task.infoType) },
          { role: 'user', content: prompt },
        ],
        // Note: response_format not supported by some providers (e.g., Ollama)
        // response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      const tokensUsed = (completion.usage?.prompt_tokens || 0) +
                        (completion.usage?.completion_tokens || 0);

      this.logger.log(`[Task ${task.infoType}] LLM response received: contentLength=${content?.length || 0}, tokens=${tokensUsed}`);

      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Extract JSON from markdown code block if present
      // LLM may return: ```json\n{...}\n``` or ```\n{...}\n```
      const jsonContent = this.extractJson(content);
      let data = JSON.parse(jsonContent);
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
        return `你是一个专业的合同信息提取专家。

【任务】从合同中准确提取基本信息，严格遵循以下步骤：

步骤1：定位关键区域
- 扫描合同前30%内容，基本信息通常在合同开头
- 查找关键词："合同编号"、"编号"、"No."、"甲方"、"乙方"、"签约双方"、"签署方"

步骤2：提取每个字段
- contractNo：查找"合同编号"、"编号"、"No."、"合约编号"后的值
  ⚠️ 只提取编号本身，不要包含"合同编号："等标签文字
  ⚠️ 如果编号过长（>50字符），可能提取错误，需重新确认

- contractName：查找合同标题、"项目名称"、"合同名称"
  ⚠️ 通常在文档开头的标题行

- customerName（甲方 = 客户）：查找"甲方"、"委托方"、"发包方"、"买方"
  ⚠️⚠️⚠️ 重要：客户名称就是甲方，只提取甲方公司名！
  ⚠️⚠️⚠️ 不要把乙方公司名填入customerName！
  ⚠️⚠️⚠️ 只提取公司名，不要包含地址、电话、联系人！
  示例："甲方：北京XX科技有限公司（地址：北京市朝阳区...）" → "北京XX科技有限公司"

- ourEntity（乙方 = 供应商/我方）：查找"乙方"、"受托方"、"承包方"、"卖方"
  ⚠️⚠️⚠️ 重要：供应商就是乙方，只提取乙方公司名！
  ⚠️⚠️⚠️ 不要把甲方公司名填入ourEntity！
  ⚠️⚠️⚠️ 同样只提取公司名，不要包含其他信息

- contractType：根据合同内容判断类型
  ✓ STAFF_AUGMENTATION（人力外包/服务协议/技术人员派驻）
  ✓ PROJECT_OUTSOURCING（项目开发/系统集成/工程实施）
  ✓ PRODUCT_SALES（产品销售/设备采购/货物买卖）
  ⚠️ 必须使用完整枚举值，不可简写

步骤3：验证提取结果
- 公司名称长度应<100字符
- 合同编号长度应<50字符
- 确认没有混入地址、电话、邮箱等信息

【Few-Shot示例】
示例1：
输入："合同编号：HT-2024-001，甲方：北京XX科技有限公司（地址：北京市朝阳区XX路XX号，联系人：张三）"
输出：{"contractNo": "HT-2024-001", "customerName": "北京XX科技有限公司"}

示例2：
输入："编号：PROJ-2024-056，乙方：上海YY技术股份有限公司"
输出：{"contractNo": "PROJ-2024-056", "ourEntity": "上海YY技术股份有限公司"}

【常见错误及纠正】
❌ 错误：{"customerName": "北京XX科技有限公司（地址：北京市朝阳区）"}
✅ 正确：{"customerName": "北京XX科技有限公司"}
` + selfChecklist + prohibitions + `严格按照JSON格式输出，未找到的字段设为null。`;

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

【signDate字段】（签订日期）
- 查找"签订于"、"签署日期"、"合同日期"
- ⚠️ 转换为YYYY-MM-DD格式
- ⚠️ 处理多种格式：
  "2024年3月15日" → "2024-03-15"
  "2024.03.15" → "2024-03-15"
  "2024/3/15" → "2024-03-15"

【startDate字段】（生效日期）
- 查找"生效日期"、"开始日期"、"起始日期"、"自...起"
- ⚠️ 同样转换为YYYY-MM-DD格式

【endDate字段】（终止日期）
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
- startDate应在endDate之前
- 年份应在2000到2100之间

【Few-Shot示例】
示例1：
输入："签订日期：2024年03月15日，自2024年4月1日起至2025年3月31日止"
输出：{"signDate": "2024-03-15", "startDate": "2024-04-01", "endDate": "2025-03-31", "duration": "1年"}

示例2：
输入："合同期限3年，自2024.1.1生效"
输出：{"signDate": null, "startDate": "2024-01-01", "endDate": null, "duration": "3年"}

示例3：
输入："本合同自签署之日起生效，有效期为两年"
输出：{"startDate": "签署之日起", "duration": "两年"}

【常见错误及纠正】
❌ 错误：signDate = "2024年3月15日"（未转换格式）
✅ 正确：signDate = "2024-03-15"

❌ 错误：signDate = "2024-3-5"（月份日期未补0）
✅ 正确：signDate = "2024-03-05"
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

  private buildBasicInfoPrompt(text: string): string {
    // 只取前30%的文本，基本信息通常在前面
    const relevantText = text.substring(0, Math.min(text.length, 5000));
    return `请从以下合同文本中提取基本信息：

【合同文本】
${relevantText}

【输出格式】JSON`;
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
    return `请从以下合同文本中提取时间信息（签订日期、生效日期、到期日期等）：

【合同文本】
${text}

【输出格式】JSON`;
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
}
