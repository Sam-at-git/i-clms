import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { RagCorrectionService } from './rag-correction.service';
import { FieldMetadataService } from './field-metadata.service';
import { CorrectionSuggestionDto, EvaluateResultDto } from './dto/correction-suggestion.dto';
import { BatchCorrectionProgressDto } from './dto/batch-correction-progress.dto';
import { FieldMetadataDto } from './dto/field-metadata.dto';
import { Contract } from '../contract/models/contract.model';

/**
 * RAG字段修正GraphQL Resolver
 */
@Resolver()
export class RagCorrectionResolver {
  constructor(
    private readonly ragCorrectionService: RagCorrectionService,
    private readonly fieldMetadataService: FieldMetadataService
  ) {}

  // ========== Queries ==========

  /**
   * 获取所有合同字段配置
   */
  @Query(() => [FieldMetadataDto], { name: 'contractFieldConfigs' })
  getContractFieldConfigs(): FieldMetadataDto[] {
    return this.fieldMetadataService.getAllFieldConfigs();
  }

  /**
   * 获取支持RAG修正的字段
   */
  @Query(() => [FieldMetadataDto], { name: 'ragSupportedFields' })
  getRagSupportedFields(): FieldMetadataDto[] {
    return this.fieldMetadataService.getRagSupportedFields();
  }

  /**
   * 获取批量修正进度
   */
  @Query(() => BatchCorrectionProgressDto, {
    name: 'ragCorrectionProgress',
    nullable: true,
  })
  getCorrectionProgress(
    @Args('sessionId') sessionId: string
  ): BatchCorrectionProgressDto | null {
    return this.ragCorrectionService.getCorrectionProgress(sessionId);
  }

  // ========== Mutations ==========

  /**
   * 单字段RAG修正
   */
  @Mutation(() => CorrectionSuggestionDto, { name: 'ragCorrectField' })
  async correctField(
    @Args('contractId', { type: () => ID }) contractId: string,
    @Args('fieldName') fieldName: string
  ): Promise<CorrectionSuggestionDto> {
    return this.ragCorrectionService.correctField(contractId, fieldName);
  }

  /**
   * 评估可疑字段
   */
  @Mutation(() => EvaluateResultDto, { name: 'ragEvaluateSuspiciousFields' })
  async evaluateSuspiciousFields(
    @Args('contractId', { type: () => ID }) contractId: string
  ): Promise<EvaluateResultDto> {
    return this.ragCorrectionService.evaluateSuspiciousFields(contractId);
  }

  /**
   * 启动批量修正
   */
  @Mutation(() => String, { name: 'ragBatchCorrectStart' })
  async startBatchCorrection(
    @Args('contractId', { type: () => ID }) contractId: string
  ): Promise<string> {
    return this.ragCorrectionService.startBatchCorrection(contractId);
  }

  /**
   * 应用修正
   * TODO: 从认证上下文获取operatorId
   */
  @Mutation(() => Contract, { name: 'applyCorrection' })
  async applyCorrection(
    @Args('contractId', { type: () => ID }) contractId: string,
    @Args('fieldName') fieldName: string,
    @Args('newValue') newValue: string
  ): Promise<Record<string, unknown>> {
    // TODO: 从认证上下文获取真实的operatorId
    const operatorId = 'system';
    return this.ragCorrectionService.applyCorrection(
      contractId,
      fieldName,
      newValue,
      operatorId
    );
  }
}
