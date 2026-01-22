import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataProtectionRisk, ContractDataProtection as PrismaContractDataProtection } from '@prisma/client';
import OpenAI from 'openai';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import {
  DATA_PROTECTION_SYSTEM_PROMPT,
  DATA_PROTECTION_EXTRACTION_PROMPT,
} from './prompts/data-protection-extraction.prompt';
import {
  ContractDataProtection,
  DataProtectionExtractionResult,
} from './dto';

/**
 * LLM提取的数据保护条款数据结构
 */
interface ExtractedDataProtection {
  involvesPersonalData: boolean;
  personalDataType?: string;
  processingLocation?: string;
  crossBorderTransfer?: string;
  securityMeasures?: string;
  dataRetention?: string;
  riskLevel: DataProtectionRisk;
  confidence?: number;
  originalText?: string;
}

/**
 * 搜索参数
 */
export interface SearchDataProtectionParams {
  riskLevel?: DataProtectionRisk;
  involvesPersonalData?: boolean;
  hasCrossBorderTransfer?: boolean;
}

@Injectable()
export class DataProtectionService implements OnModuleInit {
  private readonly logger = new Logger(DataProtectionService.name);
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
   * 从合同文本中提取数据保护条款
   */
  async extractDataProtection(
    contractId: string,
    content: string,
  ): Promise<DataProtectionExtractionResult> {
    const startTime = Date.now();

    try {
      // 使用LLM提取数据保护条款
      const extracted = await this.extractWithLlm(content);

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(
        `Extracted data protection info for contract ${contractId} in ${processingTimeMs}ms, ` +
        `involvesPersonalData=${extracted.involvesPersonalData}, riskLevel=${extracted.riskLevel}`,
      );

      // 如果不涉及个人数据，返回null
      if (!extracted.involvesPersonalData) {
        return {
          involvesPersonalData: false,
          riskLevel: DataProtectionRisk.NONE,
          confidence: extracted.confidence || 0.9,
          processingTimeMs,
          llmModel: this.configService?.getActiveConfig().model,
          llmProvider: this.configService?.getProviderName(),
          dataProtection: null,
        };
      }

      // 保存到数据库
      const dataProtection = await this.prisma.contractDataProtection.create({
        data: {
          contractId,
          involvesPersonalData: extracted.involvesPersonalData,
          personalDataType: extracted.personalDataType,
          processingLocation: extracted.processingLocation,
          crossBorderTransfer: extracted.crossBorderTransfer,
          securityMeasures: extracted.securityMeasures,
          dataRetention: extracted.dataRetention,
          riskLevel: extracted.riskLevel,
          confidence: extracted.confidence || 0.8,
          originalText: extracted.originalText,
        },
      });

      return {
        involvesPersonalData: true,
        riskLevel: extracted.riskLevel,
        dataProtection: this.mapToEntity(dataProtection),
        confidence: dataProtection.confidence || 0,
        llmModel: this.configService?.getActiveConfig().model,
        llmProvider: this.configService?.getProviderName(),
        processingTimeMs,
      };
    } catch (error) {
      this.logger.error(`Failed to extract data protection for contract ${contractId}`, error);
      throw error;
    }
  }

  /**
   * 使用LLM从合同文本提取数据保护条款
   */
  private async extractWithLlm(content: string): Promise<ExtractedDataProtection> {
    if (!this.openai) {
      throw new Error('LLM client not initialized');
    }

    const config = this.configService!.getActiveConfig();
    const userPrompt = DATA_PROTECTION_EXTRACTION_PROMPT.replace(
      '{{contractText}}',
      content.substring(0, 20000), // 限制长度避免超出token限制
    );

    this.logger.log(`Calling LLM for data protection extraction (${config.model})`);

    const completion = await this.openai.chat.completions.create({
      model: config.model,
      temperature: 0.1,
      max_tokens: config.maxTokens || 4000,
      messages: [
        { role: 'system', content: DATA_PROTECTION_SYSTEM_PROMPT },
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

    const result = JSON.parse(jsonText) as ExtractedDataProtection;

    // 验证并修正riskLevel
    if (!result.riskLevel || !['NONE', 'LOW', 'MEDIUM', 'HIGH'].includes(result.riskLevel)) {
      result.riskLevel = this.calculateRiskLevel(result);
    }

    this.logger.log(
      `LLM extraction result: involvesPersonalData=${result.involvesPersonalData}, ` +
      `riskLevel=${result.riskLevel}, confidence=${result.confidence}`,
    );

    return result;
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(data: ExtractedDataProtection): DataProtectionRisk {
    if (!data.involvesPersonalData) {
      return DataProtectionRisk.NONE;
    }

    const sensitiveKeywords = ['身份证', '生物识别', '指纹', '人脸', '医疗', '健康', '金融', '信用', '社保', '护照'];
    const hasSensitiveData = data.personalDataType
      ? sensitiveKeywords.some((keyword) => data.personalDataType!.includes(keyword))
      : false;

    const hasCrossBorder = !!data.crossBorderTransfer && data.crossBorderTransfer.length > 0;

    if (hasSensitiveData && hasCrossBorder) {
      return DataProtectionRisk.HIGH;
    }
    if (hasCrossBorder || hasSensitiveData) {
      return DataProtectionRisk.MEDIUM;
    }
    return DataProtectionRisk.LOW;
  }

  /**
   * 映射Prisma模型到GraphQL实体
   */
  private mapToEntity(dataProtection: PrismaContractDataProtection): ContractDataProtection {
    return {
      id: dataProtection.id,
      contractId: dataProtection.contractId,
      involvesPersonalData: dataProtection.involvesPersonalData,
      personalDataType: dataProtection.personalDataType || undefined,
      processingLocation: dataProtection.processingLocation || undefined,
      crossBorderTransfer: dataProtection.crossBorderTransfer || undefined,
      securityMeasures: dataProtection.securityMeasures || undefined,
      dataRetention: dataProtection.dataRetention || undefined,
      riskLevel: dataProtection.riskLevel as DataProtectionRisk,
      confidence: dataProtection.confidence || undefined,
      originalText: dataProtection.originalText || undefined,
      createdAt: dataProtection.createdAt,
      updatedAt: dataProtection.updatedAt,
    };
  }

  /**
   * 获取合同的数据保护条款
   */
  async getContractDataProtection(contractId: string): Promise<ContractDataProtection | null> {
    const result = await this.prisma.contractDataProtection.findUnique({
      where: { contractId },
    });
    return result ? this.mapToEntity(result) : null;
  }

  /**
   * 按风险等级查询
   */
  async getByRiskLevel(riskLevel: DataProtectionRisk): Promise<ContractDataProtection[]> {
    const results = await this.prisma.contractDataProtection.findMany({
      where: { riskLevel },
      include: { contract: true },
    });
    return results.map((r) => this.mapToEntity(r));
  }

  /**
   * 查询涉及个人数据的合同
   */
  async getInvolvingPersonalData(): Promise<ContractDataProtection[]> {
    const results = await this.prisma.contractDataProtection.findMany({
      where: { involvesPersonalData: true },
      include: { contract: true },
      orderBy: { riskLevel: 'desc' },
    });
    return results.map((r) => this.mapToEntity(r));
  }

  /**
   * 搜索数据保护条款
   */
  async searchDataProtection(params: SearchDataProtectionParams): Promise<ContractDataProtection[]> {
    const where: any = {};

    if (params.riskLevel !== undefined) {
      where.riskLevel = params.riskLevel;
    }
    if (params.involvesPersonalData !== undefined) {
      where.involvesPersonalData = params.involvesPersonalData;
    }
    if (params.hasCrossBorderTransfer !== undefined) {
      if (params.hasCrossBorderTransfer) {
        where.crossBorderTransfer = { not: null };
      } else {
        where.crossBorderTransfer = null;
      }
    }

    const results = await this.prisma.contractDataProtection.findMany({
      where,
      include: { contract: true },
      orderBy: { createdAt: 'desc' },
    });
    return results.map((r) => this.mapToEntity(r));
  }

  /**
   * 获取数据保护统计
   */
  async getDataProtectionStats(): Promise<{
    total: number;
    involvingPersonalData: number;
    byRiskLevel: Array<{ level: DataProtectionRisk; count: number }>;
    avgConfidence: number;
  }> {
    const [total, involvingPersonalData, byRiskLevelResult] = await Promise.all([
      this.prisma.contractDataProtection.count(),
      this.prisma.contractDataProtection.count({
        where: { involvesPersonalData: true },
      }),
      this.prisma.$queryRaw<Array<{ risklevel: DataProtectionRisk; count: bigint }>>`
        SELECT "riskLevel", COUNT(*) as count
        FROM "contract_data_protection"
        GROUP BY "riskLevel"
        ORDER BY "riskLevel"
      `,
    ]);

    const byRiskLevel = byRiskLevelResult.map((row) => ({
      level: row.risklevel,
      count: Number(row.count),
    }));

    // 确保所有风险等级都有计数
    const allLevels: DataProtectionRisk[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];
    for (const level of allLevels) {
      if (!byRiskLevel.find((item) => item.level === level)) {
        byRiskLevel.push({ level, count: 0 });
      }
    }

    const confidenceResult = await this.prisma.contractDataProtection.aggregate({
      _avg: { confidence: true },
    });

    const avgConfidence = confidenceResult._avg.confidence || 0;

    return {
      total,
      involvingPersonalData,
      byRiskLevel,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  /**
   * 创建或更新数据保护条款
   */
  async upsertDataProtection(
    contractId: string,
    data: {
      involvesPersonalData: boolean;
      personalDataType?: string;
      processingLocation?: string;
      crossBorderTransfer?: string;
      securityMeasures?: string;
      dataRetention?: string;
      riskLevel: DataProtectionRisk;
      confidence?: number;
      originalText?: string;
    },
  ): Promise<ContractDataProtection> {
    const result = await this.prisma.contractDataProtection.upsert({
      where: { contractId },
      create: { contractId, ...data },
      update: data,
    });
    return this.mapToEntity(result);
  }

  /**
   * 删除数据保护条款
   */
  async deleteDataProtection(contractId: string): Promise<ContractDataProtection> {
    const result = await this.prisma.contractDataProtection.delete({
      where: { contractId },
    });
    return this.mapToEntity(result);
  }
}
