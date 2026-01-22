import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DataProtectionRisk } from '@prisma/client';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { DataProtectionService } from './data-protection.service';
import {
  ContractDataProtection,
  DataProtectionExtractionResult,
  DataProtectionStats,
  DataProtectionRiskCount,
  CreateDataProtectionInput,
} from './dto';

@Resolver(() => ContractDataProtection)
export class DataProtectionResolver {
  constructor(private readonly dataProtectionService: DataProtectionService) {}

  @Query(() => ContractDataProtection, {
    description: '获取合同的数据保护条款',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  async contractDataProtection(
    @Args('contractId', { type: () => String }) contractId: string,
  ): Promise<ContractDataProtection | null> {
    return this.dataProtectionService.getContractDataProtection(contractId);
  }

  @Query(() => [ContractDataProtection], {
    description: '按风险等级查询数据保护条款',
  })
  @UseGuards(GqlAuthGuard)
  async dataProtectionByRiskLevel(
    @Args('riskLevel', { type: () => DataProtectionRisk }) riskLevel: DataProtectionRisk,
  ): Promise<ContractDataProtection[]> {
    return this.dataProtectionService.getByRiskLevel(riskLevel);
  }

  @Query(() => [ContractDataProtection], {
    description: '查询涉及个人数据的合同',
  })
  @UseGuards(GqlAuthGuard)
  async contractsWithPersonalData(): Promise<ContractDataProtection[]> {
    return this.dataProtectionService.getInvolvingPersonalData();
  }

  @Query(() => [ContractDataProtection], {
    description: '搜索数据保护条款（跨合同）',
  })
  @UseGuards(GqlAuthGuard)
  async searchDataProtection(
    @Args('riskLevel', { type: () => DataProtectionRisk, nullable: true }) riskLevel?: DataProtectionRisk,
    @Args('involvesPersonalData', { type: () => Boolean, nullable: true }) involvesPersonalData?: boolean,
    @Args('hasCrossBorderTransfer', { type: () => Boolean, nullable: true }) hasCrossBorderTransfer?: boolean,
  ): Promise<ContractDataProtection[]> {
    return this.dataProtectionService.searchDataProtection({
      riskLevel,
      involvesPersonalData,
      hasCrossBorderTransfer,
    });
  }

  @Query(() => DataProtectionStats, {
    description: '获取数据保护统计信息',
  })
  @UseGuards(GqlAuthGuard)
  async dataProtectionStats(): Promise<DataProtectionStats> {
    const stats = await this.dataProtectionService.getDataProtectionStats();
    return {
      total: stats.total,
      involvingPersonalData: stats.involvingPersonalData,
      byRiskLevel: stats.byRiskLevel.map((item) => ({
        level: item.level,
        count: item.count,
      })) as DataProtectionRiskCount[],
      avgConfidence: stats.avgConfidence,
    };
  }

  @Mutation(() => DataProtectionExtractionResult, {
    description: '从合同文本中提取数据保护条款（AI提取）',
  })
  @UseGuards(GqlAuthGuard)
  async extractDataProtection(
    @Args('contractId', { type: () => String }) contractId: string,
    @Args('content', { type: () => String }) content: string,
  ): Promise<DataProtectionExtractionResult> {
    return this.dataProtectionService.extractDataProtection(contractId, content);
  }

  @Mutation(() => ContractDataProtection, {
    description: '创建或更新数据保护条款',
  })
  @UseGuards(GqlAuthGuard)
  async upsertDataProtection(
    @Args('input', { type: () => CreateDataProtectionInput }) input: CreateDataProtectionInput,
  ): Promise<ContractDataProtection> {
    const { contractId, ...data } = input;
    return this.dataProtectionService.upsertDataProtection(contractId, data);
  }

  @Mutation(() => ContractDataProtection, {
    description: '更新数据保护条款',
  })
  @UseGuards(GqlAuthGuard)
  async updateDataProtection(
    @Args('contractId', { type: () => String }) contractId: string,
    @Args('involvesPersonalData', { type: () => Boolean, nullable: true }) involvesPersonalData?: boolean,
    @Args('personalDataType', { type: () => String, nullable: true }) personalDataType?: string,
    @Args('processingLocation', { type: () => String, nullable: true }) processingLocation?: string,
    @Args('crossBorderTransfer', { type: () => String, nullable: true }) crossBorderTransfer?: string,
    @Args('securityMeasures', { type: () => String, nullable: true }) securityMeasures?: string,
    @Args('dataRetention', { type: () => String, nullable: true }) dataRetention?: string,
    @Args('riskLevel', { type: () => DataProtectionRisk, nullable: true }) riskLevel?: DataProtectionRisk,
    @Args('confidence', { type: () => Int, nullable: true }) confidence?: number,
    @Args('originalText', { type: () => String, nullable: true }) originalText?: string,
  ): Promise<ContractDataProtection> {
    const updateData: any = {};
    if (involvesPersonalData !== undefined) updateData.involvesPersonalData = involvesPersonalData;
    if (personalDataType !== undefined) updateData.personalDataType = personalDataType;
    if (processingLocation !== undefined) updateData.processingLocation = processingLocation;
    if (crossBorderTransfer !== undefined) updateData.crossBorderTransfer = crossBorderTransfer;
    if (securityMeasures !== undefined) updateData.securityMeasures = securityMeasures;
    if (dataRetention !== undefined) updateData.dataRetention = dataRetention;
    if (riskLevel !== undefined) updateData.riskLevel = riskLevel;
    if (confidence !== undefined) updateData.confidence = confidence;
    if (originalText !== undefined) updateData.originalText = originalText;

    return this.dataProtectionService.upsertDataProtection(contractId, updateData);
  }

  @Mutation(() => ContractDataProtection, {
    description: '删除数据保护条款',
  })
  @UseGuards(GqlAuthGuard)
  async deleteDataProtection(
    @Args('contractId', { type: () => String }) contractId: string,
  ): Promise<ContractDataProtection> {
    return this.dataProtectionService.deleteDataProtection(contractId);
  }
}
