import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { RAGService } from '../rag/rag.service';
import { AuditService } from '../audit/audit.service';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { FieldMetadataService } from './field-metadata.service';
import { CorrectionProgressService } from './correction-progress.service';
import {
  CorrectionSuggestionDto,
  EvaluateResultDto,
  LlmCorrectionResponse,
} from './dto/correction-suggestion.dto';
import { BatchCorrectionProgressDto } from './dto/batch-correction-progress.dto';
import {
  FIELD_CORRECTION_SYSTEM_PROMPT,
  FIELD_CORRECTION_USER_PROMPT,
  EVALUATE_SUSPICIOUS_SYSTEM_PROMPT,
  EVALUATE_SUSPICIOUS_USER_PROMPT,
  FIELD_DESCRIPTIONS,
} from './constants/correction-prompts.const';

/**
 * LLM评估响应接口
 */
interface LlmEvaluateResponse {
  suspiciousFields: string[];
  reasoning?: string;
}

/**
 * RAG字段修正服务
 * 基于RAG检索和LLM分析，为合同字段提供修正建议
 */
@Injectable()
export class RagCorrectionService {
  private readonly logger = new Logger(RagCorrectionService.name);
  private openai: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RAGService,
    private readonly auditService: AuditService,
    private readonly llmConfig: LlmConfigService,
    private readonly fieldMetadata: FieldMetadataService,
    private readonly progressService: CorrectionProgressService
  ) {}

  /**
   * 获取或创建OpenAI客户端
   */
  private getClient(): OpenAI {
    if (!this.openai) {
      const config = this.llmConfig.getActiveConfig();
      this.openai = new OpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
        timeout: config.timeout,
      });
    }
    return this.openai;
  }

  /**
   * 刷新OpenAI客户端（配置变更后调用）
   */
  refreshClient(): void {
    this.openai = null;
  }

  /**
   * 单字段RAG修正
   * @param contractId 合同ID
   * @param fieldName 字段名称
   * @returns 修正建议
   */
  async correctField(
    contractId: string,
    fieldName: string
  ): Promise<CorrectionSuggestionDto> {
    this.logger.log(`[RAG Correction] Starting correction for ${fieldName} on contract ${contractId}`);

    // 1. 验证字段是否支持RAG修正
    if (!this.fieldMetadata.isRagSupported(fieldName)) {
      throw new Error(`字段 ${fieldName} 不支持RAG修正`);
    }

    // 2. 获取合同信息
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { customer: true },
    });

    if (!contract) {
      throw new Error(`合同 ${contractId} 不存在`);
    }

    if (!contract.isVectorized) {
      throw new Error(`合同 ${contractId} 尚未向量化，无法使用RAG修正`);
    }

    // 3. 获取字段当前值
    const originalValue = this.getContractFieldValue(contract, fieldName);

    // 4. 使用RAG检索相关文本片段
    const ragQuery = this.fieldMetadata.getRagQuery(fieldName) || fieldName;
    const ragResults = await this.ragService.questionAnswer(ragQuery, 5, 0.5);

    // 过滤只保留当前合同的片段
    const contractChunks = ragResults
      .filter((r) => r.contractId === contractId)
      .map((r) => r.chunkContent);

    if (contractChunks.length === 0) {
      // 没有找到相关片段，返回保持原值
      return {
        fieldName,
        fieldDisplayName: this.fieldMetadata.getDisplayName(fieldName),
        originalValue: originalValue ?? undefined,
        suggestedValue: originalValue ?? undefined,
        shouldChange: false,
        confidence: 0.5,
        evidence: '未找到相关的合同原文片段',
        reasoning: '由于未检索到相关内容，建议保持原值不变',
      };
    }

    // 5. 调用LLM分析
    const llmResult = await this.callLlmForCorrection(
      fieldName,
      originalValue,
      contractChunks
    );

    // 6. 应用保守阈值
    const threshold = this.fieldMetadata.getConservativeThreshold(fieldName);
    const shouldChange = llmResult.shouldChange && llmResult.confidence >= threshold;

    this.logger.log(
      `[RAG Correction] Field ${fieldName}: ` +
        `shouldChange=${llmResult.shouldChange}, confidence=${llmResult.confidence}, ` +
        `threshold=${threshold}, finalShouldChange=${shouldChange}`
    );

    return {
      fieldName: llmResult.fieldName,
      fieldDisplayName: llmResult.fieldDisplayName,
      originalValue: llmResult.originalValue ?? undefined,
      suggestedValue: shouldChange
        ? (llmResult.suggestedValue ?? undefined)
        : (llmResult.originalValue ?? undefined),
      shouldChange,
      confidence: llmResult.confidence,
      evidence: llmResult.evidence,
      reasoning: llmResult.reasoning,
    };
  }

  /**
   * 评估合同中的可疑字段
   * @param contractId 合同ID
   * @returns 可疑字段列表
   */
  async evaluateSuspiciousFields(contractId: string): Promise<EvaluateResultDto> {
    this.logger.log(`[RAG Correction] Evaluating suspicious fields for contract ${contractId}`);

    // 获取合同数据
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { customer: true },
    });

    if (!contract) {
      throw new Error(`合同 ${contractId} 不存在`);
    }

    // 获取支持RAG的字段列表
    const ragSupportedFields = this.fieldMetadata.getRagSupportedFields();
    const ragFieldNames = ragSupportedFields.map((f) => f.fieldName);

    // 构建合同数据展示
    const contractData: Record<string, unknown> = {};
    for (const field of ragSupportedFields) {
      contractData[field.displayName] = this.getContractFieldValue(contract, field.fieldName);
    }

    // 调用LLM评估
    const config = this.llmConfig.getActiveConfig();
    const userPrompt = EVALUATE_SUSPICIOUS_USER_PROMPT.replace(
      '{{contractData}}',
      JSON.stringify(contractData, null, 2)
    ).replace(
      '{{ragSupportedFields}}',
      ragFieldNames.join(', ')
    );

    const completion = await this.getClient().chat.completions.create({
      model: config.model,
      temperature: 0.1,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: EVALUATE_SUSPICIOUS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM返回空响应');
    }

    const result = this.extractJson(content) as unknown as LlmEvaluateResponse;

    // 过滤只保留支持RAG的字段
    const suspiciousFields = (result.suspiciousFields || []).filter((f: string) =>
      ragFieldNames.includes(f)
    );

    this.logger.log(
      `[RAG Correction] Found ${suspiciousFields.length} suspicious fields: ${suspiciousFields.join(', ')}`
    );

    return {
      suspiciousFields,
      reasoning: result.reasoning,
    };
  }

  /**
   * 启动批量修正
   * @param contractId 合同ID
   * @returns 会话ID
   */
  async startBatchCorrection(contractId: string): Promise<string> {
    this.logger.log(`[RAG Correction] Starting batch correction for contract ${contractId}`);

    // 验证合同
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`合同 ${contractId} 不存在`);
    }

    if (!contract.isVectorized) {
      throw new Error(`合同 ${contractId} 尚未向量化，无法使用RAG修正`);
    }

    // 评估可疑字段
    const evaluation = await this.evaluateSuspiciousFields(contractId);

    if (evaluation.suspiciousFields.length === 0) {
      // 创建一个空会话并立即完成
      const sessionId = this.progressService.createSession(contractId, 0);
      this.progressService.completeSession(sessionId);
      return sessionId;
    }

    // 创建修正会话
    const sessionId = this.progressService.createSession(
      contractId,
      evaluation.suspiciousFields.length
    );

    // 异步执行批量修正
    this.executeBatchCorrection(sessionId, contractId, evaluation.suspiciousFields).catch(
      (error) => {
        this.logger.error(
          `[RAG Correction] Batch correction failed: ${error.message}`
        );
        this.progressService.failSession(sessionId, error.message);
      }
    );

    return sessionId;
  }

  /**
   * 执行批量修正（异步）
   */
  private async executeBatchCorrection(
    sessionId: string,
    contractId: string,
    fields: string[]
  ): Promise<void> {
    this.progressService.updateStatus(sessionId, 'correcting');

    for (const fieldName of fields) {
      this.progressService.setCurrentField(sessionId, fieldName);

      try {
        const result = await this.correctField(contractId, fieldName);

        this.progressService.addResult(sessionId, {
          fieldName: result.fieldName,
          fieldDisplayName: result.fieldDisplayName,
          originalValue: result.originalValue,
          suggestedValue: result.suggestedValue,
          shouldChange: result.shouldChange,
          confidence: result.confidence,
          evidence: result.evidence,
          reasoning: result.reasoning,
        });

        // 添加延迟，避免请求过快
        await this.delay(500);
      } catch (error) {
        this.logger.warn(
          `[RAG Correction] Failed to correct field ${fieldName}: ${error}`
        );
        // 继续处理其他字段
      }
    }

    this.progressService.completeSession(sessionId);
  }

  /**
   * 获取批量修正进度
   */
  getCorrectionProgress(sessionId: string): BatchCorrectionProgressDto | null {
    return this.progressService.getProgress(sessionId);
  }

  /**
   * 应用修正 - 更新合同字段
   * @param contractId 合同ID
   * @param fieldName 字段名称
   * @param newValue 新值
   * @param operatorId 操作者ID
   */
  async applyCorrection(
    contractId: string,
    fieldName: string,
    newValue: string,
    operatorId: string
  ): Promise<Record<string, unknown>> {
    this.logger.log(
      `[RAG Correction] Applying correction: contract=${contractId}, ` +
        `field=${fieldName}, newValue=${newValue}`
    );

    // 获取合同当前值
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error(`合同 ${contractId} 不存在`);
    }

    const oldValue = this.getContractFieldValue(contract, fieldName);

    // 构建更新数据
    const updateData = this.buildUpdateData(fieldName, newValue);

    // 更新合同
    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: { customer: true, department: true },
    });

    // 记录审计日志
    await this.auditService.log({
      action: 'RAG_FIELD_CORRECTION',
      entityType: 'CONTRACT',
      entityId: contractId,
      entityName: contract.name,
      oldValue: { [fieldName]: oldValue },
      newValue: { [fieldName]: newValue },
      operatorId,
    });

    this.logger.log(
      `[RAG Correction] Applied correction: ${fieldName} changed from "${oldValue}" to "${newValue}"`
    );

    return updated as unknown as Record<string, unknown>;
  }

  /**
   * 调用LLM进行字段修正分析
   */
  private async callLlmForCorrection(
    fieldName: string,
    originalValue: string | null,
    ragChunks: string[]
  ): Promise<LlmCorrectionResponse> {
    const config = this.llmConfig.getActiveConfig();
    const displayName = this.fieldMetadata.getDisplayName(fieldName);
    const description = FIELD_DESCRIPTIONS[fieldName] || `${displayName}字段`;

    // 构建提示词
    const userPrompt = FIELD_CORRECTION_USER_PROMPT.replace(
      /\{\{fieldDisplayName\}\}/g,
      displayName
    )
      .replace(/\{\{fieldName\}\}/g, fieldName)
      .replace(/\{\{originalValue\}\}/g, originalValue || '(空)')
      .replace('{{ragChunks}}', ragChunks.join('\n\n---\n\n'))
      .replace('{{fieldDescription}}', description);

    const completion = await this.getClient().chat.completions.create({
      model: config.model,
      temperature: 0.1,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: FIELD_CORRECTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM返回空响应');
    }

    return this.extractJson(content) as unknown as LlmCorrectionResponse;
  }

  /**
   * 从合同对象中获取字段值
   */
  private getContractFieldValue(contract: Record<string, unknown>, fieldName: string): string | null {
    const value = contract[fieldName];

    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * 构建更新数据
   */
  private buildUpdateData(fieldName: string, newValue: string): Record<string, unknown> {
    const fieldConfig = this.fieldMetadata.getFieldConfig(fieldName);
    if (!fieldConfig) {
      return { [fieldName]: newValue };
    }

    switch (fieldConfig.fieldType) {
      case 'number':
        return { [fieldName]: parseInt(newValue, 10) };
      case 'decimal':
        return { [fieldName]: parseFloat(newValue) };
      case 'date':
        return { [fieldName]: new Date(newValue) };
      default:
        return { [fieldName]: newValue };
    }
  }

  /**
   * 从LLM响应中提取JSON
   * 处理Ollama可能返回的markdown包裹格式
   */
  private extractJson(content: string): Record<string, unknown> {
    // 尝试直接解析
    try {
      return JSON.parse(content);
    } catch {
      // 尝试提取markdown代码块中的JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // 尝试查找第一个{到最后一个}之间的内容
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(content.substring(start, end + 1));
      }

      throw new Error(`无法从LLM响应中提取JSON: ${content.substring(0, 200)}`);
    }
  }

  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
