import { Injectable, Logger, Optional, OnModuleInit } from '@nestjs/common';
import { LlmConfigService } from './config/llm-config.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { ParseProgressService, InfoType } from './parse-progress.service';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

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
    @Optional() private progressService: ParseProgressService,
  ) {
    // Don't refreshClient here - wait for onModuleInit
  }

  async onModuleInit() {
    // Wait for config to be loaded from database
    await this.configService.refreshCache();
    this.refreshClient();
    this.logger.log(`TaskBasedParserService initialized with LLM: ${this.configService.getProviderName()}`);
  }

  refreshClient() {
    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: 60000,
    });
    this.logger.log(
      `[TaskBasedParser] OpenAI client refreshed: provider="${this.configService.getProviderName()}", ` +
      `model="${config.model}", baseUrl="${config.baseUrl}"`
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
   * 主入口：基于任务解析合同
   * @param text 合同全文
   * @param enabledTaskTypes 要执行的任务类型（可选，默认全部）
   * @param sessionId 进度会话ID（可选，用于报告进度）
   */
  async parseByTasks(
    text: string,
    enabledTaskTypes?: InfoType[],
    sessionId?: string
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

    this.debugLog(`[Task-based Parser] Starting`, { textLength: text.length, sessionId, enabledTaskTypes });
    this.logger.log(`[Task-based Parser] Starting: text length=${text.length}, sessionId=${sessionId}`);

    // Step 1: 对合同进行语义分段
    const chunks = this.semanticChunker.chunkBySemanticStructure(text);
    this.logger.log(`[Task-based Parser] Created ${chunks.length} semantic chunks`);

    // Step 2: 获取要执行的任务
    const tasks = this.getTasksToExecute(enabledTaskTypes);
    this.logger.log(`[Task-based Parser] Executing ${tasks.length} tasks: ${tasks.map(t => t.infoType).join(', ')}`);

    // 设置任务到进度服务
    if (sessionId && this.progressService) {
      const taskInfoTypes = tasks.map(t => t.infoType);
      this.logger.log(`[Task-based Parser] Setting ${taskInfoTypes.length} tasks to progress service for session ${sessionId}`);
      this.progressService.setTasks(sessionId, taskInfoTypes);
    } else {
      this.logger.warn(`[Task-based Parser] No sessionId or progressService available. sessionId=${sessionId}, progressService=${!!this.progressService}`);
    }

    // Step 3: 并行执行所有任务
    const results = await this.executeTasksParallel(text, chunks, tasks, sessionId);

    // Step 4: 合并结果
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
      // 构建prompt
      const prompt = task.requiresChunks
        ? task.promptBuilder(text, chunks)
        : task.promptBuilder(text);

      this.logger.log(`[Task ${task.infoType}] Prompt built, length=${prompt.length}, requiresChunks=${task.requiresChunks}`);

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
      const data = JSON.parse(jsonContent);
      this.logger.log(`[Task ${task.infoType}] JSON parsed successfully, keys=${Object.keys(data).join(',')}`);

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
   */
  private getSystemPrompt(infoType: InfoType): string {
    switch (infoType) {
      case InfoType.BASIC_INFO:
        return `你是一个专业的合同信息提取助手，专门提取合同基本信息。

请从合同文本中提取以下字段：
- contractNo: 合同编号
- contractName: 合同名称
- customerName: 客户名称（甲方）
- ourEntity: 我方主体（乙方）
- contractType: 合同类型（必须是: STAFF_AUGMENTATION/PROJECT_OUTSOURCING/PRODUCT_SALES之一）

严格按照JSON格式输出，未找到的字段设为null。`;

      case InfoType.FINANCIAL:
        return `你是一个专业的合同财务信息提取助手。

请从合同文本中提取财务信息：
- amountWithTax: 含税金额（纯数字字符串，如"1200000"）
- amountWithoutTax: 不含税金额（纯数字字符串）
- taxRate: 税率（如"0.06"表示6%）
- currency: 币种（默认CNY）
- paymentMethod: 付款方式（如：银行转账）
- paymentTerms: 付款条件描述

严格按照JSON格式输出，未找到的字段设为null。`;

      case InfoType.MILESTONES:
        return `你是一个专业的项目里程碑提取助手。

你的任务：从合同文本中提取所有里程碑信息。

【重要】里程碑通常在"付款条款"或"付款方式"章节中，表现为"分期支付"：
- "第一期支付XX%" → 第1个里程碑
- "第二期支付XX%" → 第2个里程碑
- "第三期支付XX%" → 第3个里程碑
- ...

对于每期付款，提取：
- sequence: 顺序号（从1开始）
- name: 里程碑名称（从付款条件中提取关键事件，如"合同生效"、"原型系统开发完成"）
- amount: 金额（纯数字字符串）
- paymentPercentage: 付款百分比（纯数字字符串，如"30"）

【关键】name字段的提取方法：
找到"支付"前面的条件描述，提取关键事件词：
- "合同生效后2个工作日内...30%" → name="合同生效"
- "原型系统开发完成后...30%" → name="原型系统开发完成"
- "系统上线后...30%" → name="系统上线"
- "验收合格后...10%" → name="验收合格"

输出格式（JSON）：
{
  "milestones": [
    { "sequence": 1, "name": "合同生效", "amount": "468000", "paymentPercentage": "30" },
    { "sequence": 2, "name": "原型系统开发完成", "amount": "468000", "paymentPercentage": "30" }
  ]
}

如果找不到里程碑，返回 { "milestones": [] }`;

      case InfoType.RATE_ITEMS:
        return `你是一个专业的人力费率提取助手。

从合同文本中提取人力费率表（rateItems）。

每个费率项包含：
- role: 人员级别/角色（如：高级工程师、项目经理）
- rateType: 费率类型（HOURLY=按小时/DAILY=按天/MONTHLY=按人月）
- rate: 费率金额（纯数字字符串）

输出格式（JSON）：
{
  "rateItems": [
    { "role": "高级工程师", "rateType": "HOURLY", "rate": "800" },
    { "role": "项目经理", "rateType": "MONTHLY", "rate": "45000" }
  ]
}`;

      case InfoType.LINE_ITEMS:
        return `你是一个专业的产品清单提取助手。

从合同文本中提取产品清单（lineItems）。

每个产品项包含：
- productName: 产品名称
- quantity: 数量
- unit: 单位
- unitPriceWithTax: 含税单价（纯数字字符串）

输出格式（JSON）：
{
  "lineItems": [
    { "productName": "管理软件V1.0", "quantity": 100, "unit": "用户", "unitPriceWithTax": "500" }
  ]
}`;

      case InfoType.TIME_INFO:
        return `你是一个专业的合同时间信息提取助手。

从合同文本中提取时间信息：
- signedAt: 签订日期（YYYY-MM-DD格式）
- effectiveAt: 生效日期（YYYY-MM-DD格式）
- expiresAt: 终止日期（YYYY-MM-DD格式）
- duration: 合同期限描述

严格按照JSON格式输出，未找到的字段设为null。`;

      case InfoType.DELIVERABLES:
        return `你是一个专业的交付物提取助手。

从合同文本中提取：
- deliverables: 交付物清单（必须是String类型，用逗号分隔或文本描述，不要返回数组）
- sowSummary: 工作范围摘要（String类型）

输出格式（JSON）：
{
  "deliverables": "合同签署完成, 需求规格说明书, 系统设计文档, ...",
  "sowSummary": "工作范围的文本摘要"
}

严格按照JSON格式输出，deliverables必须是字符串，不要返回数组。`;

      case InfoType.RISK_CLAUSES:
        return `你是一个专业的风险条款提取助手。

从合同文本中提取风险条款：
- riskClauses: 风险条款数组
- penaltyClauses: 违约金条款
- terminationClauses: 终止合同条款

严格按照JSON格式输出。`;

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
