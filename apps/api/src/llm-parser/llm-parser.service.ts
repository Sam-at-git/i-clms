import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmConfigService } from './config/llm-config.service';
import { ParserService } from '../parser/parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { ChunkingStrategyService, TextChunk } from './chunking-strategy.service';
import { ParseProgressService } from './parse-progress.service';
import { TaskBasedParserService } from './task-based-parser.service';
import { LlmParseResult } from './dto/llm-parse-result.dto';
import { ContractExtractedData } from './dto/contract-extracted-data.dto';
import {
  SYSTEM_PROMPT,
  USER_PROMPT_TEMPLATE,
  CONTRACT_JSON_SCHEMA,
  VALIDATION_PROMPT_TEMPLATE,
} from './prompts/contract-extraction.prompt';
import { LlmValidationResult } from './dto/validation-result.dto';
import { ParseStrategy } from './entities/completeness-score.entity';
import * as fs from 'fs';

@Injectable()
export class LlmParserService implements OnModuleInit {
  private readonly logger = new Logger(LlmParserService.name);
  private openai: OpenAI | null = null;
  private currentSessionId: string | null = null; // 当前解析会话ID
  private readonly debugLogFile = '/tmp/llm-parser-debug.log';

  // 是否使用任务化解析（默认true，效果更好）
  private readonly USE_TASK_BASED_PARSING = true;

  constructor(
    private configService: LlmConfigService,
    private parserService: ParserService,
    private completenessChecker: CompletenessCheckerService,
    private chunkingStrategy: ChunkingStrategyService,
    @Optional() private progressService: ParseProgressService,
    @Optional() private taskBasedParser: TaskBasedParserService,
  ) {
    // Client will be initialized in onModuleInit after database config is loaded
  }

  /**
   * Initialize OpenAI client after database config is loaded
   */
  async onModuleInit() {
    // Ensure LlmConfigService has loaded database config before we create the client
    await this.configService.refreshCache();
    this.refreshClient();
    this.logger.log(`Initialized with LLM provider: ${this.configService.getProviderName()}`);
  }

  /**
   * Refresh the OpenAI client with current configuration
   * Call this when configuration is updated
   */
  refreshClient() {
    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
    this.logger.log(
      `OpenAI client refreshed: provider="${this.configService.getProviderName()}", ` +
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
   * Get the current OpenAI client, initializing if needed
   */
  private getClient(): OpenAI {
    if (!this.openai) {
      this.refreshClient();
    }
    // At this point, openai is guaranteed to be non-null
    return this.openai!;
  }

  async parseContractWithLlm(objectName: string, externalSessionId?: string): Promise<LlmParseResult> {
    const startTime = Date.now();

    // 使用外部传入的sessionId或创建新的
    let sessionId: string | null = externalSessionId || null;
    if (!sessionId && this.progressService) {
      sessionId = this.progressService.createSession(objectName);
      this.currentSessionId = sessionId;
    }

    try {
      // ========== 阶段1: 程序解析 ==========
      this.logger.log(`[Hybrid Strategy] Starting document parse: ${objectName}`);
      sessionId && this.progressService?.updateStage(sessionId, 'parsing', '正在提取文档内容');
      const parseResult = await this.parserService.parseDocument(objectName);

      if (!parseResult.success || !parseResult.text) {
        throw new Error(parseResult.error || 'Failed to extract text from document');
      }

      this.logger.log(`[Program Parse] Extracted ${parseResult.text.length} chars, ` +
        `fields found: ${Object.keys(parseResult.extractedFields || {}).length}`);

      // ========== 阶段2: 完整性检查 ==========
      const fields = parseResult.extractedFields || {
        contractNo: undefined,
        name: undefined,
        customerName: undefined,
        ourEntity: undefined,
        type: undefined,
        status: undefined,
        amountWithTax: undefined,
        amountWithoutTax: undefined,
        taxRate: undefined,
        paymentTerms: undefined,
        paymentMethod: undefined,
        signedAt: undefined,
        effectiveAt: undefined,
        expiresAt: undefined,
        duration: undefined,
        salesPerson: undefined,
        industry: undefined,
        signLocation: undefined,
        copies: undefined,
        currency: undefined,
        rawMatches: [],
      };

      const completenessResult = this.completenessChecker.checkCompleteness(fields as Record<string, unknown>);

      this.debugLog('[Completeness Check]', {
        score: completenessResult.score,
        needsLlm: completenessResult.needsLlm,
        missingFields: completenessResult.missingFields,
        reason: completenessResult.reason,
        sessionId
      });

      this.logger.log(
        `[Completeness Check] Score=${completenessResult.score}/100, ` +
        `needsLlm=${completenessResult.needsLlm}, ` +
        `missing=${completenessResult.missingFields.length} fields`
      );

      // 如果信息已经足够完整，直接返回程序解析结果
      if (!completenessResult.needsLlm) {
        this.debugLog('[Hybrid Strategy] Program parse sufficient, skipping LLM', { score: completenessResult.score });
        this.logger.log('[Hybrid Strategy] Program parse sufficient, skipping LLM');

        const result = {
          success: true,
          extractedData: this.convertToContractData(parseResult.extractedFields!),
          rawText: parseResult.text,
          pageCount: parseResult.pageCount,
          llmModel: undefined,
          llmProvider: undefined,
          processingTimeMs: Date.now() - startTime,
          hybridStrategy: {
            usedLlm: false,
            usedValidation: false,
            reason: completenessResult.reason,
            programParseScore: completenessResult.score,
          },
        };

        // 存储结果到进度服务（用于异步模式）
        if (sessionId && this.progressService) {
          this.progressService.setSessionResult(sessionId, result);
          this.progressService.completeSession(sessionId, result);
        }

        return result;
      }

      // ========== 阶段3: 智能分支 - 验证模式 vs 完整提取 ==========

      // 如果得分在50-69之间，使用验证模式（更省成本）
      if (completenessResult.score >= 50 && completenessResult.score < 70) {
        this.debugLog('[Hybrid Strategy] Using LLM validation mode (score 50-69)', { score: completenessResult.score });
        this.logger.log('[Hybrid Strategy] Using LLM validation mode (score 50-69)');

        try {
          // 调用LLM验证程序解析结果
          const validationResult = await this.callLlmForValidation(
            parseResult.text,
            parseResult.extractedFields!
          );

          // 应用修正
          const correctedFields = this.applyValidationCorrections(
            parseResult.extractedFields!,
            validationResult
          );

          const correctedCount = validationResult.validationResults?.filter(r => !r.isCorrect).length || 0;

          const processingTimeMs = Date.now() - startTime;
          this.logger.log(
            `[Hybrid Strategy] Validation completed in ${processingTimeMs}ms, ` +
            `corrected ${correctedCount} field(s)`
          );

          const result = {
            success: true,
            extractedData: this.convertToContractData(correctedFields),
            rawText: parseResult.text,
            pageCount: parseResult.pageCount,
            llmModel: this.configService.getActiveConfig().model,
            llmProvider: this.configService.getProviderName(),
            processingTimeMs,
            hybridStrategy: {
              usedLlm: true,
              usedValidation: true,
              reason: `程序解析得分${completenessResult.score}分（中等），使用LLM验证模式检查并修正`,
              programParseScore: completenessResult.score,
              validationResult,
              correctedFieldsCount: correctedCount,
            },
          };

          // 存储结果到进度服务（用于异步模式）
          if (sessionId && this.progressService) {
            this.progressService.setSessionResult(sessionId, result);
            this.progressService.completeSession(sessionId, result);
          }

          return result;
        } catch (error) {
          this.logger.warn('[Hybrid Strategy] Validation failed, falling back to full extraction', error);
          // 验证失败，继续使用完整提取模式
        }
      }

      // ========== 阶段4: LLM完整提取（得分<50或验证失败） ==========
      this.debugLog('[Hybrid Strategy] Using LLM full extraction mode (score < 50 or validation failed)', {
        score: completenessResult.score,
        USE_TASK_BASED_PARSING: this.USE_TASK_BASED_PARSING,
        hasTaskBasedParser: !!this.taskBasedParser,
        sessionId
      });
      this.logger.log('[Hybrid Strategy] Using LLM full extraction mode (score < 50 or validation failed)');
      sessionId && this.progressService?.updateStage(sessionId, 'llm_processing', 'LLM正在提取合同信息');

      // 确定优先提取的字段
      const priorityFields = this.completenessChecker.identifyPriorityFields(
        completenessResult.missingFields
      );

      this.logger.log(`[LLM Enhancement] Priority fields: ${priorityFields.join(', ')}`);

      // 确定分段策略
      const chunkingResult = this.chunkingStrategy.determineStrategy(
        parseResult.text,
        priorityFields
      );

      this.logger.log(
        `[Chunking Strategy] ${chunkingResult.strategy}, ` +
        `${chunkingResult.chunks.length} chunks, reason: ${chunkingResult.reason}`
      );

      // 设置分块信息到进度服务
      if (sessionId && chunkingResult.chunks.length > 1) {
        this.progressService?.setChunks(
          sessionId,
          chunkingResult.chunks.map(c => ({ id: c.id, purpose: c.purpose }))
        );
      }

      // 调用LLM提取
      let llmExtractedData: Partial<ContractExtractedData>;

      // 优先使用任务化解析（效果更好）
      if (this.USE_TASK_BASED_PARSING && this.taskBasedParser) {
        this.debugLog('[LLM Extraction] Using task-based parsing strategy', { sessionId });
        this.logger.log('[LLM Extraction] Using task-based parsing strategy');
        this.logger.log(`[LLM Extraction] sessionId for task-based parsing: ${sessionId}`);
        sessionId && this.progressService?.updateStage(sessionId, 'llm_processing', 'AI正在分类提取信息');

        const taskResult = await this.taskBasedParser.parseByTasks(parseResult.text, undefined, sessionId ?? undefined);
        this.logger.log(
          `[Task-based Parsing] Completed: ${taskResult.summary.successfulTasks}/${taskResult.summary.totalTasks} tasks successful, ` +
          `${taskResult.summary.totalTokensUsed} tokens, ${taskResult.summary.totalTimeMs}ms`
        );

        // 转换为ContractExtractedData格式
        llmExtractedData = this.convertTaskBasedResultToContractData(taskResult.data);
      } else if (chunkingResult.strategy === 'single') {
        // 单次LLM调用
        this.debugLog('[LLM Extraction] Using single LLM call (task-based parser not available)', {
          USE_TASK_BASED_PARSING: this.USE_TASK_BASED_PARSING,
          hasTaskBasedParser: !!this.taskBasedParser,
          chunkingStrategy: chunkingResult.strategy
        });
        sessionId && this.progressService?.updateStage(sessionId, 'llm_processing', 'LLM正在提取合同信息 (单次处理)');
        llmExtractedData = await this.callLlmForFullExtraction(
          chunkingResult.chunks[0].text,
          priorityFields
        );
      } else {
        // 多段LLM调用并合并
        this.debugLog('[LLM Extraction] Using segmented LLM calls (task-based parser not available)', {
          USE_TASK_BASED_PARSING: this.USE_TASK_BASED_PARSING,
          hasTaskBasedParser: !!this.taskBasedParser,
          chunkingStrategy: chunkingResult.strategy
        });
        sessionId && this.progressService?.updateStage(sessionId, 'llm_processing', 'LLM正在分段提取信息');
        llmExtractedData = await this.callLlmForSegmentedExtraction(
          chunkingResult.chunks,
          priorityFields,
          sessionId
        );
      }

      // ========== 阶段4: 合并结果 ==========
      sessionId && this.progressService?.updateStage(sessionId, 'merging', '正在合并解析结果');
      const mergedData = this.mergeResults(
        parseResult.extractedFields!,
        llmExtractedData,
        completenessResult.missingFields
      );

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(
        `[Hybrid Strategy] Completed in ${processingTimeMs}ms, ` +
        `used ${chunkingResult.chunks.length} LLM call(s)`
      );

      // 完成进度会话
      if (sessionId) {
        this.progressService?.completeSession(sessionId, { chunksProcessed: chunkingResult.chunks.length });
      }

      const result = {
        success: true,
        extractedData: mergedData,
        rawText: parseResult.text,
        pageCount: parseResult.pageCount,
        llmModel: this.configService.getActiveConfig().model,
        llmProvider: this.configService.getProviderName(),
        processingTimeMs,
        sessionId: sessionId ?? undefined, // 返回会话ID，前端可用于查询进度
        hybridStrategy: {
          usedLlm: true,
          usedValidation: false,
          reason: completenessResult.reason,
          programParseScore: completenessResult.score,
          llmChunks: chunkingResult.chunks.length,
          enhancedFields: priorityFields,
        },
      };

      // 保存结果到进度服务
      if (sessionId && this.progressService) {
        this.progressService.setSessionResult(sessionId, result);
        this.progressService.completeSession(sessionId, result);
      }

      return result;
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`[Hybrid Strategy] Parsing failed: ${errorMessage}`, errorStack);

      // 标记会话失败
      if (sessionId) {
        this.progressService?.failSession(sessionId, errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
        processingTimeMs,
        sessionId: sessionId ?? undefined,
      };
    }
  }

  /**
   * Parse contract with mixed strategy (programmatic + LLM)
   * This is the new API conforming to Spec 18
   */
  async parseWithMixedStrategy(
    textContent: string,
    programmaticResult?: Record<string, unknown>,
    forceStrategy?: ParseStrategy,
  ): Promise<LlmParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let llmTokensUsed = 0;

    try {
      // 1. Calculate completeness score
      const extractedFields = programmaticResult || {};
      const completenessScore = this.completenessChecker.calculateScore(extractedFields);

      // Determine strategy (allow override)
      const strategy = forceStrategy || completenessScore.strategy;

      this.logger.log(
        `[Mixed Strategy] Score=${completenessScore.totalScore}, ` +
          `auto-strategy=${completenessScore.strategy}, using=${strategy}`,
      );

      // 2. Execute based on strategy
      if (strategy === ParseStrategy.DIRECT_USE) {
        // High score: use programmatic result directly
        const processingTimeMs = Date.now() - startTime;
        this.logger.log('[Mixed Strategy] Using DIRECT_USE - no LLM call');

        return {
          success: true,
          extractedDataJson: extractedFields,
          completenessScore,
          strategyUsed: ParseStrategy.DIRECT_USE,
          confidence: completenessScore.percentage / 100,
          processingTimeMs,
          llmTokensUsed: 0,
          warnings: warnings.length > 0 ? warnings : undefined,
          hybridStrategy: {
            usedLlm: false,
            usedValidation: false,
            reason: this.completenessChecker.getStrategyReason(
              completenessScore.totalScore,
              ParseStrategy.DIRECT_USE,
            ),
            programParseScore: completenessScore.totalScore,
          },
        };
      }

      if (strategy === ParseStrategy.LLM_VALIDATION) {
        // Medium score: validate with LLM
        this.logger.log('[Mixed Strategy] Using LLM_VALIDATION mode');

        try {
          const validationResult = await this.callLlmForTextValidation(
            textContent,
            extractedFields,
          );

          // Apply corrections
          const correctedFields = this.applyTextValidationCorrections(
            extractedFields,
            validationResult,
          );

          // 验证并规范化 contractType（防止 GraphQL 枚举验证失败）
          const validTypes = ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'];
          if (correctedFields.contractType) {
            const originalType = String(correctedFields.contractType);
            correctedFields.contractType = this.normalizeContractType(originalType);
            if (originalType !== correctedFields.contractType) {
              this.logger.log(`[LLM Validation] Normalized contractType: "${originalType}" → "${correctedFields.contractType}"`);
            }
          }
          if (correctedFields.contractType && !validTypes.includes(correctedFields.contractType as string)) {
            this.logger.warn(`[LLM Validation] Invalid contractType: "${correctedFields.contractType}", defaulting to PROJECT_OUTSOURCING`);
            correctedFields.contractType = 'PROJECT_OUTSOURCING';
          }

          const correctedCount =
            validationResult.validationResults?.filter((r) => !r.isCorrect).length || 0;

          const processingTimeMs = Date.now() - startTime;

          return {
            success: true,
            extractedDataJson: correctedFields,
            completenessScore,
            strategyUsed: ParseStrategy.LLM_VALIDATION,
            confidence: (completenessScore.percentage + 10) / 100, // Boost confidence after validation
            processingTimeMs,
            llmTokensUsed,
            llmModel: this.configService.getActiveConfig().model,
            llmProvider: this.configService.getProviderName(),
            warnings: warnings.length > 0 ? warnings : undefined,
            hybridStrategy: {
              usedLlm: true,
              usedValidation: true,
              reason: this.completenessChecker.getStrategyReason(
                completenessScore.totalScore,
                ParseStrategy.LLM_VALIDATION,
              ),
              programParseScore: completenessScore.totalScore,
              validationResult,
              correctedFieldsCount: correctedCount,
            },
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          warnings.push(`Validation failed, falling back: ${errorMsg}`);
          this.logger.warn('[Mixed Strategy] Validation failed, falling back to full extraction');
          // Continue to full extraction below
        }
      }

      // LLM_FULL_EXTRACTION or fallback from failed validation
      this.logger.log('[Mixed Strategy] Using LLM_FULL_EXTRACTION mode');

      const missingFields = this.completenessChecker.getMissingFields(extractedFields);
      const priorityFields = this.completenessChecker.identifyPriorityFields(missingFields);

      // Call LLM for extraction
      const llmResult = await this.callLlmForTextExtraction(textContent, priorityFields);
      llmTokensUsed = llmResult.tokensUsed || 0;

      // Merge results
      const mergedFields = this.mergeExtractedFields(
        extractedFields,
        llmResult.data,
        missingFields,
      );

      // 规范化合同类型（关键修复：处理 LLM 返回的枚举值）
      if (mergedFields.contractType) {
        const originalType = String(mergedFields.contractType);
        mergedFields.contractType = this.normalizeContractType(originalType);
        if (originalType !== mergedFields.contractType) {
          this.logger.log(`[LLM] Normalized contractType in mergedFields: "${originalType}" → "${mergedFields.contractType}"`);
        }
      }

      // 验证最终 contractType 是否为有效枚举值（防止 GraphQL 枚举验证失败）
      const validTypes = ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'];
      if (mergedFields.contractType && !validTypes.includes(mergedFields.contractType as string)) {
        this.logger.warn(`[LLM] Invalid contractType after normalization: "${mergedFields.contractType}", defaulting to PROJECT_OUTSOURCING`);
        mergedFields.contractType = 'PROJECT_OUTSOURCING';
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        extractedDataJson: mergedFields,
        completenessScore,
        strategyUsed: ParseStrategy.LLM_FULL_EXTRACTION,
        confidence: 0.85, // Moderate confidence for LLM extraction
        processingTimeMs,
        llmTokensUsed,
        llmModel: this.configService.getActiveConfig().model,
        llmProvider: this.configService.getProviderName(),
        warnings: warnings.length > 0 ? warnings : undefined,
        hybridStrategy: {
          usedLlm: true,
          usedValidation: false,
          reason: this.completenessChecker.getStrategyReason(
            completenessScore.totalScore,
            ParseStrategy.LLM_FULL_EXTRACTION,
          ),
          programParseScore: completenessScore.totalScore,
          enhancedFields: priorityFields,
        },
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`[Mixed Strategy] Failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        processingTimeMs,
        warnings:
          warnings.length > 0
            ? warnings
            : undefined,
      };
    }
  }

  /**
   * Call LLM for text validation (new method for parseWithMixedStrategy)
   */
  private async callLlmForTextValidation(
    text: string,
    fields: Record<string, unknown>,
  ): Promise<LlmValidationResult> {
    const config = this.configService.getActiveConfig();

    const extractedFieldsDisplay = JSON.stringify(fields, null, 2);
    const userPrompt = VALIDATION_PROMPT_TEMPLATE.replace(
      '{{contractText}}',
      text.substring(0, 15000),
    ).replace('{{extractedFields}}', extractedFieldsDisplay);

    const completion = await this.getClient().chat.completions.create({
      model: config.model,
      temperature: 0.1,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty validation response from LLM');
    }

    return JSON.parse(content);
  }

  /**
   * Apply validation corrections to fields
   */
  private applyTextValidationCorrections(
    fields: Record<string, unknown>,
    validationResult: LlmValidationResult,
  ): Record<string, unknown> {
    const corrected = { ...fields };

    for (const fieldResult of validationResult.validationResults || []) {
      if (!fieldResult.isCorrect && fieldResult.correctedValue) {
        corrected[fieldResult.field] = fieldResult.correctedValue;
      }
    }

    if (validationResult.additionalFields) {
      Object.assign(corrected, validationResult.additionalFields);
    }

    return corrected;
  }

  /**
   * Call LLM for text extraction (new method for parseWithMixedStrategy)
   */
  private async callLlmForTextExtraction(
    text: string,
    priorityFields: string[],
  ): Promise<{ data: Record<string, unknown>; tokensUsed: number }> {
    const config = this.configService.getActiveConfig();

    const userPrompt = USER_PROMPT_TEMPLATE.replace('{{contractText}}', text.substring(0, 20000))
      .replace('{{jsonSchema}}', JSON.stringify(CONTRACT_JSON_SCHEMA, null, 2))
      .replace('{{priorityFields}}', priorityFields.join(', '));

    const completion = await this.getClient().chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const tokensUsed =
      (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0);

    const parsedData = JSON.parse(content);

    // Log typeSpecificDetails for debugging milestone extraction
    if (parsedData.typeSpecificDetails) {
      const details = parsedData.typeSpecificDetails as any;
      this.logger.log(
        `[LLM] Extracted typeSpecificDetails: ` +
        `milestones=${Array.isArray(details.milestones) ? details.milestones.length : 0}, ` +
        `rateItems=${Array.isArray(details.rateItems) ? details.rateItems.length : 0}, ` +
        `lineItems=${Array.isArray(details.lineItems) ? details.lineItems.length : 0}`
      );
    } else {
      this.logger.warn(`[LLM] No typeSpecificDetails found in LLM response`);
    }

    return {
      data: parsedData,
      tokensUsed,
    };
  }

  /**
   * Merge programmatic and LLM extracted fields
   */
  private mergeExtractedFields(
    programFields: Record<string, unknown>,
    llmFields: Record<string, unknown>,
    missingFields: string[],
  ): Record<string, unknown> {
    const merged = { ...programFields };
    const missingSet = new Set(missingFields);

    // Log typeSpecificDetails before merge
    if (llmFields.typeSpecificDetails) {
      this.logger.log(
        `[Merge] typeSpecificDetails in LLM result before merge: ` +
        `hasMilestones=${!!(llmFields.typeSpecificDetails as any)?.milestones}`
      );
    }

    // Fill missing fields from LLM result
    for (const [key, value] of Object.entries(llmFields)) {
      if (missingSet.has(key) || merged[key] === undefined || merged[key] === null) {
        if (value !== undefined && value !== null) {
          merged[key] = value;
          if (key === 'typeSpecificDetails') {
            this.logger.log(`[Merge] Copied typeSpecificDetails from LLM to merged result`);
          }
        }
      }
    }

    // === 关键修复：typeSpecificDetails 总是从 LLM 获取 ===
    // 程序解析不会提取 typeSpecificDetails，所以总是从 LLM 结果中复制
    if (llmFields.typeSpecificDetails !== undefined && llmFields.typeSpecificDetails !== null) {
      merged.typeSpecificDetails = llmFields.typeSpecificDetails;
      this.logger.log(`[Merge] Force-copied typeSpecificDetails from LLM (program parse doesn't extract it)`);
    }

    // Log typeSpecificDetails after merge
    if (merged.typeSpecificDetails) {
      this.logger.log(
        `[Merge] typeSpecificDetails in merged result: ` +
        `hasMilestones=${!!(merged.typeSpecificDetails as any)?.milestones}`
      );
    } else {
      this.logger.warn(`[Merge] typeSpecificDetails NOT in merged result`);
    }

    return merged;
  }

  private validateAndTransform(data: any): ContractExtractedData {
    // 基本验证
    if (!data.contractType || !data.basicInfo) {
      throw new Error('Missing required fields: contractType or basicInfo');
    }

    // 记录原始contractType
    const originalContractType = data.contractType;
    this.logger.log(`[LLM] Original contractType from LLM: "${originalContractType}"`);

    // 规范化合同类型：处理中文合同类型名称
    data.contractType = this.normalizeContractType(data.contractType);

    // 记录规范化后的contractType
    if (originalContractType !== data.contractType) {
      this.logger.log(`[LLM] Normalized contractType: "${originalContractType}" → "${data.contractType}"`);
    }

    // 验证合同类型
    const validTypes = ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'];
    if (!validTypes.includes(data.contractType)) {
      throw new Error(`Invalid contract type: ${data.contractType}`);
    }

    // 数据清理和转换
    const cleaned: ContractExtractedData = {
      contractType: data.contractType,
      basicInfo: {
        contractNo: this.cleanString(data.basicInfo?.contractNo),
        contractName: this.cleanString(data.basicInfo?.contractName),
        ourEntity: this.cleanString(data.basicInfo?.ourEntity),
        customerName: this.cleanString(data.basicInfo?.customerName),
        status: data.basicInfo?.status || 'DRAFT',
      },
      financialInfo: data.financialInfo
        ? {
            amountWithTax: this.cleanAmount(data.financialInfo?.amountWithTax),
            amountWithoutTax: this.cleanAmount(data.financialInfo?.amountWithoutTax),
            taxRate: this.cleanAmount(data.financialInfo?.taxRate),
            currency: data.financialInfo?.currency || 'CNY',
            paymentMethod: this.cleanString(data.financialInfo?.paymentMethod),
            paymentTerms: this.cleanString(data.financialInfo?.paymentTerms),
          }
        : undefined,
      timeInfo: data.timeInfo
        ? {
            signedAt: this.cleanDate(data.timeInfo?.signedAt),
            effectiveAt: this.cleanDate(data.timeInfo?.effectiveAt),
            expiresAt: this.cleanDate(data.timeInfo?.expiresAt),
            duration: this.cleanString(data.timeInfo?.duration),
          }
        : undefined,
      otherInfo: data.otherInfo
        ? {
            salesPerson: this.cleanString(data.otherInfo?.salesPerson),
            industry: this.cleanString(data.otherInfo?.industry),
            signLocation: this.cleanString(data.otherInfo?.signLocation),
            copies: data.otherInfo?.copies,
          }
        : undefined,
      typeSpecificDetails: this.cleanTypeSpecificDetails(data.typeSpecificDetails, data.contractType),
      metadata: data.metadata
        ? {
            overallConfidence: data.metadata?.overallConfidence,
            fieldConfidences: data.metadata?.fieldConfidences,
          }
        : undefined,
    };

    return cleaned;
  }

  private cleanString(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private cleanAmount(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'number') return value.toString();
    if (typeof value !== 'string') return undefined;

    // 移除逗号和空格
    const cleaned = value.replace(/[,\s]/g, '');
    // 验证是否是有效的数字
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;

    return cleaned;
  }

  private cleanDate(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value !== 'string') return undefined;

    // 基本的日期格式验证（YYYY-MM-DD）
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // 尝试其他常见格式并转换
      const date = new Date(value);
      if (isNaN(date.getTime())) return undefined;

      // 转换为YYYY-MM-DD格式
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return value;
  }

  /**
   * 清理 typeSpecificDetails 中的数值字段
   * 移除货币符号、逗号、百分号等格式字符
   */
  private cleanTypeSpecificDetails(details: any, contractType: string): any {
    if (!details) return undefined;

    const cleaned: any = {};

    // 复制所有非数组字段
    for (const [key, value] of Object.entries(details)) {
      if (!Array.isArray(value)) {
        cleaned[key] = value;
      }
    }

    // 清理 milestones 数组（PROJECT_OUTSOURCING）
    if (Array.isArray(details.milestones)) {
      cleaned.milestones = details.milestones.map((m: any) => ({
        ...m,
        amount: this.cleanPercentageOrAmount(m.amount),
        paymentPercentage: this.cleanPercentageOrAmount(m.paymentPercentage),
      }));
      this.logger.log(`[Clean] Processed ${cleaned.milestones.length} milestones`);
    }

    // 清理 rateItems 数组（STAFF_AUGMENTATION）
    if (Array.isArray(details.rateItems)) {
      cleaned.rateItems = details.rateItems.map((r: any) => ({
        ...r,
        rate: this.cleanPercentageOrAmount(r.rate),
      }));
      this.logger.log(`[Clean] Processed ${cleaned.rateItems.length} rateItems`);
    }

    // 清理 lineItems 数组（PRODUCT_SALES）
    if (Array.isArray(details.lineItems)) {
      cleaned.lineItems = details.lineItems.map((l: any) => ({
        ...l,
        unitPriceWithTax: this.cleanPercentageOrAmount(l.unitPriceWithTax),
        unitPriceWithoutTax: this.cleanPercentageOrAmount(l.unitPriceWithoutTax),
        subtotal: this.cleanPercentageOrAmount(l.subtotal),
      }));
      this.logger.log(`[Clean] Processed ${cleaned.lineItems.length} lineItems`);
    }

    return cleaned;
  }

  /**
   * 清理百分比或金额字段
   * 移除 %、¥、$、逗号、空格等格式字符
   */
  private cleanPercentageOrAmount(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'number') return value.toString();
    if (typeof value !== 'string') return undefined;

    // 移除 %、¥、$、逗号、空格
    const cleaned = value.replace(/[%¥$,\s]/g, '').trim();

    // 验证是否是有效的数字
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
      this.logger.warn(`[Clean] Invalid numeric value: "${value}", cleaned to "${cleaned}"`);
      return undefined;
    }

    // 如果原值带%而清理后没有变化，记录一下
    if (value.includes('%') && cleaned === value.replace(/%/g, '').trim()) {
      // 正常情况
    }

    return cleaned;
  }

  /**
   * 规范化合同类型：处理中文合同类型名称
   * 将中文合同类型映射到英文枚举值
   */
  private normalizeContractType(type: string): string {
    if (!type) return 'PROJECT_OUTSOURCING'; // 默认值

    const upperType = type.toUpperCase().trim();

    // 已经是英文枚举值，直接返回
    const validTypes = ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'];
    if (validTypes.includes(upperType)) {
      return upperType;
    }

    // 缩写和别名映射到完整枚举值
    const aliasMappings: Record<string, string> = {
      'PROJECT': 'PROJECT_OUTSOURCING',
      'STAFF': 'STAFF_AUGMENTATION',
      'PRODUCT': 'PRODUCT_SALES',
      'OUTSOURCING': 'PROJECT_OUTSOURCING',
      'AUGMENTATION': 'STAFF_AUGMENTATION',
      'SALES': 'PRODUCT_SALES',
    };

    if (aliasMappings[upperType]) {
      return aliasMappings[upperType];
    }

    // 中文合同类型映射
    const typeMappings: Record<string, string> = {
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
    if (typeMappings[type]) {
      return typeMappings[type];
    }

    // 模糊匹配
    for (const [chinese, english] of Object.entries(typeMappings)) {
      if (type.includes(chinese)) {
        return english;
      }
    }

    // 无法识别时的默认值
    this.logger.warn(`Unknown contract type: "${type}", defaulting to PROJECT_OUTSOURCING`);
    return 'PROJECT_OUTSOURCING';
  }

  // ========== 混合策略辅助方法 ==========

  /**
   * 单次完整LLM提取
   */
  private async callLlmForFullExtraction(
    text: string,
    priorityFields: string[]
  ): Promise<Partial<ContractExtractedData>> {
    const config = this.configService.getActiveConfig();
    const userPrompt = USER_PROMPT_TEMPLATE
      .replace('{{contractText}}', text)
      .replace('{{jsonSchema}}', JSON.stringify(CONTRACT_JSON_SCHEMA, null, 2));

    this.logger.log(`[LLM] Calling API for full extraction (${config.model})`);

    const completion = await this.getClient().chat.completions.create({
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    // 记录LLM原始响应（截断长内容）
    this.logger.log(`[LLM] Raw response (${content.length} chars): ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);

    const extracted = JSON.parse(content);

    // 记录关键字段
    this.logger.log(`[LLM] Extracted contractType: "${extracted.contractType}"`);
    this.logger.log(`[LLM] Extracted contractName: "${extracted.basicInfo?.contractName}"`);
    this.logger.log(`[LLM] Extracted customerName: "${extracted.basicInfo?.customerName}"`);

    return this.validateAndTransform(extracted);
  }

  /**
   * 多段LLM提取并合并
   */
  private async callLlmForSegmentedExtraction(
    chunks: TextChunk[],
    priorityFields: string[],
    sessionId: string | null = null
  ): Promise<Partial<ContractExtractedData>> {
    this.logger.log(`[LLM] Processing ${chunks.length} chunks in sequence`);

    const config = this.configService.getActiveConfig();
    const partialResults: Partial<ContractExtractedData>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // 报告分块开始
      if (sessionId) {
        this.progressService?.startChunk(sessionId, i);
      }

      this.logger.log(
        `[LLM] Processing chunk ${i + 1}/${chunks.length}: ${chunk.purpose} ` +
        `(${chunk.text.length} chars, targeting: ${chunk.targetFields.join(', ')})`
      );

      // 为每个chunk构建针对性的prompt
      const targetedPrompt = this.buildTargetedPrompt(chunk, priorityFields);

      const completion = await this.getClient().chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: targetedPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          // 记录LLM原始响应（截断长内容）
          this.logger.log(`[LLM] Raw response (${content.length} chars): ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);

          const extracted = JSON.parse(content);

          // 记录关键字段（规范化前）
          this.logger.log(`[LLM] Raw contractType from LLM: "${extracted.contractType}"`);

          // 规范化 contractType（防止无效枚举值导致 GraphQL 错误）
          if (extracted.contractType) {
            const originalType = String(extracted.contractType);
            extracted.contractType = this.normalizeContractType(originalType);
            if (originalType !== extracted.contractType) {
              this.logger.log(`[LLM] Normalized contractType in chunk ${i + 1}: "${originalType}" → "${extracted.contractType}"`);
            }
          }

          // 验证最终 contractType 是否为有效枚举值
          const validTypes = ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'];
          if (extracted.contractType && !validTypes.includes(extracted.contractType as string)) {
            this.logger.warn(`[LLM] Invalid contractType in chunk ${i + 1}: "${extracted.contractType}", defaulting to PROJECT_OUTSOURCING`);
            extracted.contractType = 'PROJECT_OUTSOURCING';
          }

          this.logger.log(`[LLM] Extracted contractName: "${extracted.basicInfo?.contractName}"`);

          partialResults.push(extracted);

          // 计算提取的字段数量
          const extractedFieldsCount = this.countExtractedFields(extracted);

          // 报告分块完成
          if (sessionId) {
            this.progressService?.completeChunk(sessionId, i, extractedFieldsCount);
          }

          this.logger.log(`[LLM] Chunk ${i + 1} extracted successfully`);
        } catch (error) {
          // 报告分块失败
          if (sessionId) {
            this.progressService?.failChunk(sessionId, i, error instanceof Error ? error.message : String(error));
          }
          this.logger.warn(`[LLM] Failed to parse chunk ${i + 1} response`, error);
        }
      } else {
        // 空响应
        if (sessionId) {
          this.progressService?.failChunk(sessionId, i, 'Empty LLM response');
        }
      }
    }

    // 合并所有分段结果
    return this.mergePartialResults(partialResults);
  }

  /**
   * 计算提取的字段数量（用于进度报告）
   */
  private countExtractedFields(data: any): number {
    let count = 0;
    if (data.basicInfo) {
      count += Object.values(data.basicInfo).filter(v => v !== null && v !== undefined && v !== '').length;
    }
    if (data.financialInfo) {
      count += Object.values(data.financialInfo).filter(v => v !== null && v !== undefined && v !== '').length;
    }
    if (data.timeInfo) {
      count += Object.values(data.timeInfo).filter(v => v !== null && v !== undefined && v !== '').length;
    }
    if (data.otherInfo) {
      count += Object.values(data.otherInfo).filter(v => v !== null && v !== undefined && v !== '').length;
    }
    if (data.typeSpecificDetails) {
      const details = data.typeSpecificDetails;
      if (Array.isArray(details.milestones)) count += details.milestones.length;
      if (Array.isArray(details.rateItems)) count += details.rateItems.length;
      if (Array.isArray(details.lineItems)) count += details.lineItems.length;
    }
    return count;
  }

  /**
   * LLM验证模式：检查程序解析结果的正确性
   * 用于程序解析得分处于中等水平（50-69分）的情况
   */
  private async callLlmForValidation(
    text: string,
    programFields: any
  ): Promise<LlmValidationResult> {
    const config = this.configService.getActiveConfig();

    // 构建程序提取字段的展示
    const extractedFieldsDisplay = JSON.stringify({
      合同编号: programFields.contractNo || null,
      合同名称: programFields.name || null,
      客户名称: programFields.customerName || null,
      我方主体: programFields.ourEntity || null,
      合同类型: programFields.type || null,
      含税金额: programFields.amountWithTax || null,
      不含税金额: programFields.amountWithoutTax || null,
      税率: programFields.taxRate || null,
      付款方式: programFields.paymentMethod || null,
      付款条件: programFields.paymentTerms || null,
      签订日期: programFields.signedAt || null,
      生效日期: programFields.effectiveAt || null,
      到期日期: programFields.expiresAt || null,
      合同期限: programFields.duration || null,
      销售负责人: programFields.salesPerson || null,
      所属行业: programFields.industry || null,
      签订地点: programFields.signLocation || null,
      合同份数: programFields.copies || null,
    }, null, 2);

    const userPrompt = VALIDATION_PROMPT_TEMPLATE
      .replace('{{contractText}}', text.substring(0, 15000))  // 限制长度
      .replace('{{extractedFields}}', extractedFieldsDisplay);

    this.logger.log(`[LLM Validation] Calling API to validate program-parsed fields (${config.model})`);

    const completion = await this.getClient().chat.completions.create({
      model: config.model,
      temperature: 0.1,  // 低温度，提高确定性
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty validation response from LLM');
    }

    const validationResult = JSON.parse(content);
    this.logger.log(
      `[LLM Validation] Completed. ` +
      `Checked ${validationResult.validationResults?.length || 0} fields, ` +
      `found ${validationResult.validationResults?.filter((r: any) => !r.isCorrect).length || 0} incorrect`
    );

    return validationResult;
  }

  /**
   * 应用LLM验证结果，修正错误字段
   */
  private applyValidationCorrections(
    programFields: any,
    validationResult: LlmValidationResult
  ): any {
    const corrected = { ...programFields };
    let correctedCount = 0;

    for (const fieldResult of validationResult.validationResults || []) {
      if (!fieldResult.isCorrect && fieldResult.correctedValue) {
        // 字段名映射：中文 -> 英文
        const fieldMap: Record<string, string> = {
          '合同编号': 'contractNo',
          '合同名称': 'name',
          '客户名称': 'customerName',
          '我方主体': 'ourEntity',
          '合同类型': 'type',
          '含税金额': 'amountWithTax',
          '不含税金额': 'amountWithoutTax',
          '税率': 'taxRate',
          '付款方式': 'paymentMethod',
          '付款条件': 'paymentTerms',
          '签订日期': 'signedAt',
          '生效日期': 'effectiveAt',
          '到期日期': 'expiresAt',
          '合同期限': 'duration',
          '销售负责人': 'salesPerson',
          '所属行业': 'industry',
          '签订地点': 'signLocation',
          '合同份数': 'copies',
        };

        const englishField = fieldMap[fieldResult.field] || fieldResult.field;
        corrected[englishField] = fieldResult.correctedValue;
        correctedCount++;

        this.logger.log(
          `[Validation] Corrected ${fieldResult.field} (${englishField}): ` +
          `"${fieldResult.programValue}" -> "${fieldResult.correctedValue}"`
        );
      }
    }

    // 补充额外发现的字段
    if (validationResult.additionalFields) {
      Object.assign(corrected, validationResult.additionalFields);
    }

    return corrected;
  }

  /**
   * 构建针对性提取prompt
   */
  private buildTargetedPrompt(chunk: TextChunk, priorityFields: string[]): string {
    const relevantFields = chunk.targetFields.filter(f => priorityFields.includes(f));

    return `请从以下合同片段中提取信息：

【文档片段】
${chunk.text}

【提取重点】
本片段为：${chunk.purpose}
请重点提取以下字段：${relevantFields.join(', ')}

【输出格式】
请以JSON格式输出，遵循以下schema：
${JSON.stringify(CONTRACT_JSON_SCHEMA, null, 2)}

如果某个字段在本片段中未找到，设为null。只提取你有把握的信息。`;
  }

  /**
   * 合并多个分段的LLM提取结果
   */
  private mergePartialResults(
    partialResults: Partial<ContractExtractedData>[]
  ): Partial<ContractExtractedData> {
    const merged: Partial<ContractExtractedData> = {
      basicInfo: {},
      financialInfo: {},
      timeInfo: {},
      otherInfo: {},
    };

    for (const partial of partialResults) {
      // 合并基本信息
      if (partial.basicInfo) {
        merged.basicInfo = { ...merged.basicInfo, ...partial.basicInfo };
      }

      // 合并财务信息
      if (partial.financialInfo) {
        merged.financialInfo = { ...merged.financialInfo, ...partial.financialInfo };
      }

      // 合并时间信息
      if (partial.timeInfo) {
        merged.timeInfo = { ...merged.timeInfo, ...partial.timeInfo };
      }

      // 合并其他信息
      if (partial.otherInfo) {
        merged.otherInfo = { ...merged.otherInfo, ...partial.otherInfo };
      }

      // 类型和详情（取第一个有效值）
      if (!merged.contractType && partial.contractType) {
        merged.contractType = partial.contractType;
      }

      if (!merged.typeSpecificDetails && partial.typeSpecificDetails) {
        merged.typeSpecificDetails = partial.typeSpecificDetails;
      }
    }

    return merged;
  }

  /**
   * 合并程序解析和LLM结果
   * 策略：优先使用程序解析的高置信度字段，LLM填补缺失
   */
  private mergeResults(
    programFields: any,
    llmFields: Partial<ContractExtractedData>,
    missingFields: string[]
  ): ContractExtractedData {
    this.logger.log(`[Merge] Combining program and LLM results for ${missingFields.length} missing fields`);

    // 从程序解析结果构建基础数据
    const base = this.convertToContractData(programFields);

    // 用LLM结果补充缺失字段
    for (const fieldPath of missingFields) {
      const value = this.getNestedValue(llmFields, fieldPath);
      if (value !== undefined && value !== null) {
        this.setNestedValue(base, fieldPath, value);
        this.logger.debug(`[Merge] Filled field ${fieldPath} from LLM`);
      }
    }

    // === 关键修复：typeSpecificDetails 总是从 LLM 获取 ===
    // 程序解析不会提取 typeSpecificDetails，所以总是从 LLM 结果中复制
    if (llmFields.typeSpecificDetails !== undefined && llmFields.typeSpecificDetails !== null) {
      base.typeSpecificDetails = llmFields.typeSpecificDetails;
      this.logger.log(`[Merge] Force-copied typeSpecificDetails from LLM`);
    }

    return base;
  }

  /**
   * 将ExtractedFields转换为ContractExtractedData
   * 支持两种字段命名约定：
   * 1. 旧格式（FieldExtractor返回）: contractNumber, contractName, partyA, partyB, signDate, amount
   * 2. 新格式（GraphQL/LLM）: contractNo, name, customerName, ourEntity, signedAt, amountWithTax
   */
  private convertToContractData(fields: any): ContractExtractedData {
    // 规范化字段名：支持旧格式和新格式
    const normalized = this.normalizeFieldNames(fields);

    // 规范化合同类型：处理各种可能的格式（中文、缩写等）
    const normalizedContractType = this.normalizeContractType(normalized.type) as any;

    return {
      contractType: normalizedContractType,
      basicInfo: {
        contractNo: normalized.contractNo,
        contractName: normalized.name,
        ourEntity: normalized.ourEntity,
        customerName: normalized.customerName,
        status: normalized.status || 'DRAFT',
      },
      financialInfo: {
        amountWithTax: normalized.amountWithTax,
        amountWithoutTax: normalized.amountWithoutTax,
        taxRate: normalized.taxRate,
        currency: normalized.currency || 'CNY',
        paymentMethod: normalized.paymentMethod,
        paymentTerms: normalized.paymentTerms,
      },
      timeInfo: {
        signedAt: normalized.signedAt,
        effectiveAt: normalized.effectiveAt,
        expiresAt: normalized.expiresAt,
        duration: normalized.duration,
      },
      otherInfo: {
        salesPerson: normalized.salesPerson,
        industry: normalized.industry,
        signLocation: normalized.signLocation,
        copies: normalized.copies,
      },
      // === 关键修复：保留 typeSpecificDetails（如果存在）===
      typeSpecificDetails: normalized.typeSpecificDetails || fields.typeSpecificDetails || undefined,
    };
  }

  /**
   * 将任务化解析结果转换为ContractExtractedData格式
   * TaskBasedParserService返回的数据结构与ContractExtractedData略有不同
   */
  private convertTaskBasedResultToContractData(taskData: any): ContractExtractedData {
    // TaskBasedParser返回的数据结构:
    // {
    //   basicInfo: { contractNo, contractName, ... },
    //   financialInfo: { amountWithTax, ... },
    //   timeInfo: { signedAt, ... },
    //   typeSpecificDetails: { milestones, rateItems, ... },
    //   contractType?: string
    // }

    // 首先提取contractType
    const contractType = taskData.contractType || taskData.basicInfo?.contractType || 'PROJECT_OUTSOURCING';

    // 规范化typeSpecificDetails - 处理可能的数组转字符串问题
    const typeSpecificDetails = this.normalizeTypeSpecificDetails(taskData.typeSpecificDetails || {});

    return {
      contractType: contractType as any,
      basicInfo: {
        contractNo: taskData.basicInfo?.contractNo,
        contractName: taskData.basicInfo?.contractName,
        ourEntity: taskData.basicInfo?.ourEntity,
        customerName: taskData.basicInfo?.customerName,
        status: 'DRAFT',
      },
      financialInfo: {
        amountWithTax: taskData.financialInfo?.amountWithTax,
        amountWithoutTax: taskData.financialInfo?.amountWithoutTax,
        taxRate: taskData.financialInfo?.taxRate,
        currency: taskData.financialInfo?.currency || 'CNY',
        paymentMethod: taskData.financialInfo?.paymentMethod,
        paymentTerms: taskData.financialInfo?.paymentTerms,
      },
      timeInfo: {
        signedAt: taskData.timeInfo?.signedAt,
        effectiveAt: taskData.timeInfo?.effectiveAt,
        expiresAt: taskData.timeInfo?.expiresAt,
        duration: taskData.timeInfo?.duration,
      },
      otherInfo: {
        salesPerson: taskData.otherInfo?.salesPerson,
        industry: taskData.otherInfo?.industry,
        signLocation: taskData.otherInfo?.signLocation,
        copies: taskData.otherInfo?.copies,
      },
      // 使用规范化后的typeSpecificDetails
      typeSpecificDetails,
    };
  }

  /**
   * 规范化typeSpecificDetails - 处理LLM可能返回错误格式的情况
   */
  private normalizeTypeSpecificDetails(details: any): any {
    if (!details) return {};

    const normalized = { ...details };

    // 如果deliverables是数组，转换为逗号分隔的字符串
    if (Array.isArray(normalized.deliverables)) {
      normalized.deliverables = normalized.deliverables.join(', ');
    }

    // 如果milestones存在，规范化每个milestone的deliverables字段
    if (Array.isArray(normalized.milestones)) {
      normalized.milestones = normalized.milestones.map((m: any) => ({
        ...m,
        deliverables: Array.isArray(m.deliverables) ? m.deliverables.join(', ') : m.deliverables,
      }));
    }

    return normalized;
  }

  /**
   * 规范化字段名：将旧格式字段名映射到新格式
   * 用于兼容 FieldExtractor 返回的字段名和 GraphQL/LLM 使用的字段名
   */
  private normalizeFieldNames(fields: any): any {
    if (!fields) return {};

    const normalized: any = { ...fields };

    // 字段名映射：旧格式 -> 新格式
    const fieldMappings: Record<string, string[]> = {
      type: ['contractType'], // LLM returns contractType, we use type
      contractNo: ['contractNumber'],
      name: ['contractName', 'title'],
      customerName: ['partyA', 'firstPartyName'],
      ourEntity: ['partyB', 'secondPartyName'],
      amountWithTax: ['amount', 'totalAmount'],
      signedAt: ['signDate'],
    };

    // 应用映射：如果新格式字段不存在但旧格式存在，则使用旧格式的值
    for (const [newField, oldFields] of Object.entries(fieldMappings)) {
      if (normalized[newField] === undefined || normalized[newField] === null || normalized[newField] === '') {
        for (const oldField of oldFields) {
          if (fields[oldField] !== undefined && fields[oldField] !== null && fields[oldField] !== '') {
            normalized[newField] = fields[oldField];
            break;
          }
        }
      }
    }

    return normalized;
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * 设置嵌套对象的值
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || current[part] === null) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }
}
