import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmConfigService } from './config/llm-config.service';
import { ParserService } from '../parser/parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { ChunkingStrategyService, TextChunk } from './chunking-strategy.service';
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

@Injectable()
export class LlmParserService {
  private readonly logger = new Logger(LlmParserService.name);
  private openai: OpenAI;

  constructor(
    private configService: LlmConfigService,
    private parserService: ParserService,
    private completenessChecker: CompletenessCheckerService,
    private chunkingStrategy: ChunkingStrategyService,
  ) {
    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
    this.logger.log(`Initialized with LLM provider: ${this.configService.getProviderName()}`);
  }

  async parseContractWithLlm(objectName: string): Promise<LlmParseResult> {
    const startTime = Date.now();

    try {
      // ========== 阶段1: 程序解析 ==========
      this.logger.log(`[Hybrid Strategy] Starting document parse: ${objectName}`);
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

      this.logger.log(
        `[Completeness Check] Score=${completenessResult.score}/100, ` +
        `needsLlm=${completenessResult.needsLlm}, ` +
        `missing=${completenessResult.missingFields.length} fields`
      );

      // 如果信息已经足够完整，直接返回程序解析结果
      if (!completenessResult.needsLlm) {
        this.logger.log('[Hybrid Strategy] Program parse sufficient, skipping LLM');
        return {
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
      }

      // ========== 阶段3: 智能分支 - 验证模式 vs 完整提取 ==========

      // 如果得分在50-69之间，使用验证模式（更省成本）
      if (completenessResult.score >= 50 && completenessResult.score < 70) {
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

          return {
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
        } catch (error) {
          this.logger.warn('[Hybrid Strategy] Validation failed, falling back to full extraction', error);
          // 验证失败，继续使用完整提取模式
        }
      }

      // ========== 阶段4: LLM完整提取（得分<50或验证失败） ==========
      this.logger.log('[Hybrid Strategy] Using LLM full extraction mode (score < 50 or validation failed)');

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

      // 调用LLM提取
      let llmExtractedData: Partial<ContractExtractedData>;

      if (chunkingResult.strategy === 'single') {
        // 单次LLM调用
        llmExtractedData = await this.callLlmForFullExtraction(
          chunkingResult.chunks[0].text,
          priorityFields
        );
      } else {
        // 多段LLM调用并合并
        llmExtractedData = await this.callLlmForSegmentedExtraction(
          chunkingResult.chunks,
          priorityFields
        );
      }

      // ========== 阶段4: 合并结果 ==========
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

      return {
        success: true,
        extractedData: mergedData,
        rawText: parseResult.text,
        pageCount: parseResult.pageCount,
        llmModel: this.configService.getActiveConfig().model,
        llmProvider: this.configService.getProviderName(),
        processingTimeMs,
        hybridStrategy: {
          usedLlm: true,
          usedValidation: false,
          reason: completenessResult.reason,
          programParseScore: completenessResult.score,
          llmChunks: chunkingResult.chunks.length,
          enhancedFields: priorityFields,
        },
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`[Hybrid Strategy] Parsing failed: ${errorMessage}`, errorStack);

      return {
        success: false,
        error: errorMessage,
        processingTimeMs,
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

    const completion = await this.openai.chat.completions.create({
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

    const completion = await this.openai.chat.completions.create({
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

    return {
      data: JSON.parse(content),
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

    // Fill missing fields from LLM result
    for (const [key, value] of Object.entries(llmFields)) {
      if (missingSet.has(key) || merged[key] === undefined || merged[key] === null) {
        if (value !== undefined && value !== null) {
          merged[key] = value;
        }
      }
    }

    return merged;
  }

  private validateAndTransform(data: any): ContractExtractedData {
    // 基本验证
    if (!data.contractType || !data.basicInfo) {
      throw new Error('Missing required fields: contractType or basicInfo');
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
      typeSpecificDetails: data.typeSpecificDetails,
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

    const completion = await this.openai.chat.completions.create({
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

    const extracted = JSON.parse(content);
    return this.validateAndTransform(extracted);
  }

  /**
   * 多段LLM提取并合并
   */
  private async callLlmForSegmentedExtraction(
    chunks: TextChunk[],
    priorityFields: string[]
  ): Promise<Partial<ContractExtractedData>> {
    this.logger.log(`[LLM] Processing ${chunks.length} chunks in sequence`);

    const config = this.configService.getActiveConfig();
    const partialResults: Partial<ContractExtractedData>[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.logger.log(
        `[LLM] Processing chunk ${i + 1}/${chunks.length}: ${chunk.purpose} ` +
        `(${chunk.text.length} chars, targeting: ${chunk.targetFields.join(', ')})`
      );

      // 为每个chunk构建针对性的prompt
      const targetedPrompt = this.buildTargetedPrompt(chunk, priorityFields);

      const completion = await this.openai.chat.completions.create({
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
          const extracted = JSON.parse(content);
          partialResults.push(extracted);
          this.logger.log(`[LLM] Chunk ${i + 1} extracted successfully`);
        } catch (error) {
          this.logger.warn(`[LLM] Failed to parse chunk ${i + 1} response`, error);
        }
      }
    }

    // 合并所有分段结果
    return this.mergePartialResults(partialResults);
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

    const completion = await this.openai.chat.completions.create({
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

    return base;
  }

  /**
   * 将ExtractedFields转换为ContractExtractedData
   */
  private convertToContractData(fields: any): ContractExtractedData {
    return {
      contractType: fields.type || 'PROJECT_OUTSOURCING',
      basicInfo: {
        contractNo: fields.contractNo,
        contractName: fields.name,
        ourEntity: fields.ourEntity,
        customerName: fields.customerName,
        status: fields.status || 'DRAFT',
      },
      financialInfo: {
        amountWithTax: fields.amountWithTax,
        amountWithoutTax: fields.amountWithoutTax,
        taxRate: fields.taxRate,
        currency: fields.currency || 'CNY',
        paymentMethod: fields.paymentMethod,
        paymentTerms: fields.paymentTerms,
      },
      timeInfo: {
        signedAt: fields.signedAt,
        effectiveAt: fields.effectiveAt,
        expiresAt: fields.expiresAt,
        duration: fields.duration,
      },
      otherInfo: {
        salesPerson: fields.salesPerson,
        industry: fields.industry,
        signLocation: fields.signLocation,
        copies: fields.copies,
      },
    };
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
