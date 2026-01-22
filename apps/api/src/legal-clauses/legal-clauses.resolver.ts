import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LegalClauseType } from '@prisma/client';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { LegalClausesService } from './legal-clauses.service';
import {
  ContractLegalClause,
  LegalClausesExtractionResult,
  LegalClauseStats,
  LegalClauseTypeCount,
  CreateLegalClauseInput,
} from './dto';

@Resolver(() => ContractLegalClause)
export class LegalClausesResolver {
  constructor(private readonly legalClausesService: LegalClausesService) {}

  @Query(() => [ContractLegalClause], {
    description: '获取合同的所有法务条款',
  })
  @UseGuards(GqlAuthGuard)
  async contractLegalClauses(
    @Args('contractId', { type: () => String }) contractId: string,
  ): Promise<ContractLegalClause[]> {
    return this.legalClausesService.getContractLegalClauses(contractId);
  }

  @Query(() => [ContractLegalClause], {
    description: '按类型查询合同法务条款',
  })
  @UseGuards(GqlAuthGuard)
  async legalClausesByType(
    @Args('contractId', { type: () => String }) contractId: string,
    @Args('clauseType', { type: () => LegalClauseType }) clauseType: LegalClauseType,
  ): Promise<ContractLegalClause[]> {
    return this.legalClausesService.getClausesByType(contractId, clauseType);
  }

  @Query(() => [ContractLegalClause], {
    description: '全局搜索法务条款（跨合同）',
  })
  @UseGuards(GqlAuthGuard)
  async searchLegalClauses(
    @Args('clauseType', { type: () => LegalClauseType, nullable: true }) clauseType?: LegalClauseType,
    @Args('guaranteeType', { type: () => String, nullable: true }) guaranteeType?: string,
    @Args('disputeResolution', { type: () => String, nullable: true }) disputeResolution?: string,
    @Args('minLiability', { type: () => Int, nullable: true }) minLiability?: number,
  ): Promise<ContractLegalClause[]> {
    return this.legalClausesService.searchLegalClauses({
      clauseType,
      guaranteeType,
      disputeResolution,
      minLiability,
    });
  }

  @Query(() => LegalClauseStats, {
    description: '获取法务条款统计信息',
  })
  @UseGuards(GqlAuthGuard)
  async legalClauseStats(): Promise<LegalClauseStats> {
    const stats = await this.legalClausesService.getLegalClauseStats();
    return {
      total: stats.total,
      byType: stats.byType.map((item) => ({
        type: item.type,
        count: item.count,
      })) as LegalClauseTypeCount[],
      avgConfidence: stats.avgConfidence,
    };
  }

  @Mutation(() => LegalClausesExtractionResult, {
    description: '从合同文本中提取法务条款（AI提取）',
  })
  @UseGuards(GqlAuthGuard)
  async extractLegalClauses(
    @Args('contractId', { type: () => String }) contractId: string,
    @Args('content', { type: () => String }) content: string,
  ): Promise<LegalClausesExtractionResult> {
    return this.legalClausesService.extractLegalClauses(contractId, content);
  }

  @Mutation(() => ContractLegalClause, {
    description: '手动创建法务条款',
  })
  @UseGuards(GqlAuthGuard)
  async createLegalClause(
    @Args('input', { type: () => CreateLegalClauseInput }) input: CreateLegalClauseInput,
  ): Promise<ContractLegalClause> {
    return this.legalClausesService.createClause(input);
  }

  @Mutation(() => ContractLegalClause, {
    description: '更新法务条款',
  })
  @UseGuards(GqlAuthGuard)
  async updateLegalClause(
    @Args('id', { type: () => Int }) id: number,
    @Args('licenseType', { type: () => String, nullable: true }) licenseType?: string,
    @Args('licenseFee', { type: () => String, nullable: true }) licenseFee?: string,
    @Args('guarantor', { type: () => String, nullable: true }) guarantor?: string,
    @Args('guaranteeType', { type: () => String, nullable: true }) guaranteeType?: string,
    @Args('guaranteeAmount', { type: () => String, nullable: true }) guaranteeAmount?: string,
    @Args('guaranteePeriod', { type: () => String, nullable: true }) guaranteePeriod?: string,
    @Args('liabilityLimit', { type: () => String, nullable: true }) liabilityLimit?: string,
    @Args('exclusions', { type: () => String, nullable: true }) exclusions?: string,
    @Args('compensationMethod', { type: () => String, nullable: true }) compensationMethod?: string,
    @Args('terminationNotice', { type: () => String, nullable: true }) terminationNotice?: string,
    @Args('breachLiability', { type: () => String, nullable: true }) breachLiability?: string,
    @Args('disputeResolution', { type: () => String, nullable: true }) disputeResolution?: string,
    @Args('disputeLocation', { type: () => String, nullable: true }) disputeLocation?: string,
    @Args('confidence', { type: () => Int, nullable: true }) confidence?: number,
    @Args('originalText', { type: () => String, nullable: true }) originalText?: string,
  ): Promise<ContractLegalClause> {
    const updateData: any = {};
    if (licenseType !== undefined) updateData.licenseType = licenseType;
    if (licenseFee !== undefined) updateData.licenseFee = licenseFee;
    if (guarantor !== undefined) updateData.guarantor = guarantor;
    if (guaranteeType !== undefined) updateData.guaranteeType = guaranteeType;
    if (guaranteeAmount !== undefined) updateData.guaranteeAmount = guaranteeAmount;
    if (guaranteePeriod !== undefined) updateData.guaranteePeriod = guaranteePeriod;
    if (liabilityLimit !== undefined) updateData.liabilityLimit = liabilityLimit;
    if (exclusions !== undefined) updateData.exclusions = exclusions;
    if (compensationMethod !== undefined) updateData.compensationMethod = compensationMethod;
    if (terminationNotice !== undefined) updateData.terminationNotice = terminationNotice;
    if (breachLiability !== undefined) updateData.breachLiability = breachLiability;
    if (disputeResolution !== undefined) updateData.disputeResolution = disputeResolution;
    if (disputeLocation !== undefined) updateData.disputeLocation = disputeLocation;
    if (confidence !== undefined) updateData.confidence = confidence;
    if (originalText !== undefined) updateData.originalText = originalText;

    return this.legalClausesService.updateClause(id, updateData);
  }

  @Mutation(() => ContractLegalClause, {
    description: '删除法务条款',
  })
  @UseGuards(GqlAuthGuard)
  async deleteLegalClause(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<ContractLegalClause> {
    return this.legalClausesService.deleteClause(id);
  }

  @Mutation(() => String, {
    description: '删除合同的所有法务条款',
  })
  @UseGuards(GqlAuthGuard)
  async deleteContractLegalClauses(
    @Args('contractId', { type: () => String }) contractId: string,
  ): Promise<string> {
    const result = await this.legalClausesService.deleteContractClauses(contractId);
    return `Deleted ${result.count} legal clause(s)`;
  }
}
