import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LegalClauseType, ContractLegalClause as PrismaContractLegalClause } from '@prisma/client';
import OpenAI from 'openai';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import {
  LEGAL_CLAUSES_SYSTEM_PROMPT,
  LEGAL_CLAUSES_EXTRACTION_PROMPT,
} from './prompts/legal-clauses-extraction.prompt';
import { ContractLegalClause, LegalClausesExtractionResult } from './dto';

/**
 * LLM提取的法务条款数据结构
 */
interface ExtractedLegalClause {
  licenseType?: string;
  licenseFee?: string;
  guarantor?: string;
  guaranteeType?: string;
  guaranteeAmount?: number;
  guaranteePeriod?: string;
  liabilityLimit?: number;
  exclusions?: string;
  compensationMethod?: string;
  terminationNotice?: string;
  breachLiability?: string;
  disputeResolution?: string;
  disputeLocation?: string;
  confidence?: number;
  originalText?: string;
}

/**
 * LLM提取结果结构
 */
interface LegalClausesLLMResult {
  intellectualProperty: ExtractedLegalClause | null;
  guarantee: ExtractedLegalClause | null;
  liabilityLimitation: ExtractedLegalClause | null;
  terminationDispute: ExtractedLegalClause | null;
}

/**
 * 搜索参数
 */
export interface SearchLegalClausesParams {
  clauseType?: LegalClauseType;
  guaranteeType?: string;
  disputeResolution?: string;
  minLiability?: number;
}

@Injectable()
export class LegalClausesService implements OnModuleInit {
  private readonly logger = new Logger(LegalClausesService.name);
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    @Optional() private configService: LlmConfigService,
  ) {}

  async onModuleInit() {
    // 初始化OpenAI客户端（如果LlmConfigService可用）
    if (this.configService) {
      try {
        await this.configService.refreshCache();
        this.refreshClient();
        this.logger.log(`Initialized with LLM provider: ${this.configService.getProviderName()}`);
      } catch (error) {
        this.logger.warn('Failed to initialize LLM client', error);
      }
    }
  }

  /**
   * Refresh the OpenAI client with current configuration
   */
  refreshClient() {
    if (!this.configService) return;

    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout || 120000,
    });
    this.logger.log(
      `OpenAI client refreshed: provider="${this.configService.getProviderName()}", ` +
      `model="${config.model}"`,
    );
  }

  /**
   * 从合同文本中提取法务条款
   */
  async extractLegalClauses(
    contractId: string,
    content: string,
  ): Promise<LegalClausesExtractionResult> {
    const startTime = Date.now();
    const results: ContractLegalClause[] = [];

    try {
      // 使用LLM提取四类条款
      const extracted = await this.extractWithLlm(content);

      // 保存到数据库
      for (const [clauseType, data] of Object.entries(extracted)) {
        if (data && this.hasValidData(data)) {
          const clause = await this.prisma.contractLegalClause.create({
            data: {
              contractId,
              clauseType: this.mapStringToClauseType(clauseType),
              ...this.mapToDbFields(data),
              confidence: data.confidence || 0.8,
              originalText: data.originalText,
            },
          });
          results.push(this.mapToEntity(clause));
        }
      }

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(
        `Extracted ${results.length} legal clauses for contract ${contractId} in ${processingTimeMs}ms`,
      );

      return {
        extracted: results,
        confidence: this.calculateOverallConfidence(results),
        llmModel: this.configService?.getActiveConfig().model,
        llmProvider: this.configService?.getProviderName(),
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error(`Failed to extract legal clauses for contract ${contractId}`, error);
      throw error;
    }
  }

  /**
   * 使用LLM从合同文本提取法务条款
   */
  private async extractWithLlm(content: string): Promise<LegalClausesLLMResult> {
    if (!this.openai) {
      throw new Error('LLM client not initialized');
    }

    const config = this.configService!.getActiveConfig();
    const userPrompt = LEGAL_CLAUSES_EXTRACTION_PROMPT.replace(
      '{{contractText}}',
      content.substring(0, 20000), // 限制长度避免超出token限制
    );

    this.logger.log(`Calling LLM for legal clauses extraction (${config.model})`);

    const completion = await this.openai.chat.completions.create({
      model: config.model,
      temperature: 0.1,
      max_tokens: config.maxTokens || 4000,
      messages: [
        { role: 'system', content: LEGAL_CLAUSES_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content_result = completion.choices[0]?.message?.content;
    if (!content_result) {
      throw new Error('Empty response from LLM');
    }

    // 处理可能的markdown代码块包裹
    let jsonText = content_result.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const result = JSON.parse(jsonText) as LegalClausesLLMResult;

    this.logger.log(
      `LLM extraction result: IP=${!!result.intellectualProperty}, ` +
      `Guarantee=${!!result.guarantee}, Liability=${!!result.liabilityLimitation}, ` +
      `Termination=${!!result.terminationDispute}`,
    );

    return result;
  }

  /**
   * 检查提取的数据是否有效
   */
  private hasValidData(data: ExtractedLegalClause): boolean {
    // 检查是否有任何非空字段
    const fields = Object.values(data).filter(
      (v) => v !== undefined && v !== null && v !== '',
    );
    // 至少要有originalText或有实际数据字段
    return fields.length > 0;
  }

  /**
   * 映射字符串到LegalClauseType枚举
   */
  private mapStringToClauseType(type: string): LegalClauseType {
    const mapping: Record<string, LegalClauseType> = {
      intellectualProperty: LegalClauseType.INTELLECTUAL_PROPERTY,
      guarantee: LegalClauseType.GUARANTEE,
      liabilityLimitation: LegalClauseType.LIABILITY_LIMITATION,
      terminationDispute: LegalClauseType.TERMINATION_DISPUTE,
    };
    return mapping[type] || type as LegalClauseType;
  }

  /**
   * 映射LLM结果到数据库字段
   */
  private mapToDbFields(data: ExtractedLegalClause) {
    return {
      licenseType: data.licenseType,
      licenseFee: data.licenseFee,
      guarantor: data.guarantor,
      guaranteeType: data.guaranteeType,
      guaranteeAmount: data.guaranteeAmount ? String(data.guaranteeAmount) : undefined,
      guaranteePeriod: data.guaranteePeriod,
      liabilityLimit: data.liabilityLimit ? String(data.liabilityLimit) : undefined,
      exclusions: data.exclusions,
      compensationMethod: data.compensationMethod,
      terminationNotice: data.terminationNotice,
      breachLiability: data.breachLiability,
      disputeResolution: data.disputeResolution,
      disputeLocation: data.disputeLocation,
    };
  }

  /**
   * 映射Prisma模型到GraphQL实体
   */
  private mapToEntity(clause: PrismaContractLegalClause): ContractLegalClause {
    return {
      id: clause.id,
      contractId: clause.contractId,
      clauseType: clause.clauseType,
      licenseType: clause.licenseType || undefined,
      licenseFee: clause.licenseFee || undefined,
      guarantor: clause.guarantor || undefined,
      guaranteeType: clause.guaranteeType || undefined,
      guaranteeAmount: clause.guaranteeAmount?.toString() || undefined,
      guaranteePeriod: clause.guaranteePeriod || undefined,
      liabilityLimit: clause.liabilityLimit?.toString() || undefined,
      exclusions: clause.exclusions || undefined,
      compensationMethod: clause.compensationMethod || undefined,
      terminationNotice: clause.terminationNotice || undefined,
      breachLiability: clause.breachLiability || undefined,
      disputeResolution: clause.disputeResolution || undefined,
      disputeLocation: clause.disputeLocation || undefined,
      confidence: clause.confidence || undefined,
      originalText: clause.originalText || undefined,
      createdAt: clause.createdAt,
      updatedAt: clause.updatedAt,
    };
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(clauses: ContractLegalClause[]): number {
    if (clauses.length === 0) return 0;
    const sum = clauses.reduce((acc, c) => acc + (c.confidence || 0), 0);
    return Math.round((sum / clauses.length) * 100) / 100;
  }

  /**
   * 获取合同的所有法务条款
   */
  async getContractLegalClauses(contractId: string): Promise<ContractLegalClause[]> {
    const clauses = await this.prisma.contractLegalClause.findMany({
      where: { contractId },
      orderBy: { clauseType: 'asc' },
    });
    return clauses.map((c) => this.mapToEntity(c));
  }

  /**
   * 按条款类型查询
   */
  async getClausesByType(
    contractId: string,
    clauseType: LegalClauseType,
  ): Promise<ContractLegalClause[]> {
    const clauses = await this.prisma.contractLegalClause.findMany({
      where: { contractId, clauseType },
    });
    return clauses.map((c) => this.mapToEntity(c));
  }

  /**
   * 全局搜索条款
   */
  async searchLegalClauses(params: SearchLegalClausesParams): Promise<ContractLegalClause[]> {
    const where: any = {};

    if (params.clauseType) {
      where.clauseType = params.clauseType;
    }
    if (params.guaranteeType) {
      where.guaranteeType = params.guaranteeType;
    }
    if (params.disputeResolution) {
      where.disputeResolution = params.disputeResolution;
    }
    if (params.minLiability !== undefined) {
      where.liabilityLimit = {
        gte: String(params.minLiability),
      };
    }

    const clauses = await this.prisma.contractLegalClause.findMany({
      where,
      include: { contract: true },
      orderBy: { createdAt: 'desc' },
    });
    return clauses.map((c) => this.mapToEntity(c));
  }

  /**
   * 获取法务条款统计
   */
  async getLegalClauseStats(): Promise<{
    total: number;
    byType: Array<{ type: LegalClauseType; count: number }>;
    avgConfidence: number;
  }> {
    const [total, byTypeResult] = await Promise.all([
      this.prisma.contractLegalClause.count(),
      this.prisma.$queryRaw<Array<{ clauseType: LegalClauseType; count: bigint }>>`
        SELECT "clauseType", COUNT(*) as count
        FROM "contract_legal_clause"
        GROUP BY "clauseType"
        ORDER BY count DESC
      `,
    ]);

    const byType = byTypeResult.map((row) => ({
      type: row.clauseType,
      count: Number(row.count),
    }));

    const confidenceResult = await this.prisma.contractLegalClause.aggregate({
      _avg: { confidence: true },
    });

    const avgConfidence = confidenceResult._avg.confidence || 0;

    return {
      total,
      byType,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  /**
   * 删除合同的所有法务条款
   */
  async deleteContractClauses(contractId: string): Promise<{ count: number }> {
    const result = await this.prisma.contractLegalClause.deleteMany({
      where: { contractId },
    });
    return { count: result.count };
  }

  /**
   * 创建单个法务条款
   */
  async createClause(data: {
    contractId: string;
    clauseType: LegalClauseType;
    [key: string]: any;
  }): Promise<ContractLegalClause> {
    const clause = await this.prisma.contractLegalClause.create({
      data,
    });
    return this.mapToEntity(clause);
  }

  /**
   * 更新法务条款
   */
  async updateClause(
    id: number,
    data: Partial<{
      clauseType: LegalClauseType;
      licenseType: string;
      licenseFee: string;
      guarantor: string;
      guaranteeType: string;
      guaranteeAmount: string;
      guaranteePeriod: string;
      liabilityLimit: string;
      exclusions: string;
      compensationMethod: string;
      terminationNotice: string;
      breachLiability: string;
      disputeResolution: string;
      disputeLocation: string;
      confidence: number;
      originalText: string;
    }>,
  ): Promise<ContractLegalClause> {
    const clause = await this.prisma.contractLegalClause.update({
      where: { id },
      data,
    });
    return this.mapToEntity(clause);
  }

  /**
   * 删除法务条款
   */
  async deleteClause(id: number): Promise<ContractLegalClause> {
    const clause = await this.prisma.contractLegalClause.delete({
      where: { id },
    });
    return this.mapToEntity(clause);
  }
}
