import { Field, ObjectType, registerEnumType, Int, Float } from '@nestjs/graphql';
import { LegalClauseType as PrismaLegalClauseType } from '@prisma/client';

// 注册GraphQL枚举类型
registerEnumType(PrismaLegalClauseType, {
  name: 'LegalClauseType',
  description: '法务条款类型',
});

@ObjectType()
export class ContractLegalClause {
  @Field(() => Int, { description: '主键ID' })
  id!: number;

  @Field(() => String, { description: '合同ID' })
  contractId!: string;

  @Field(() => PrismaLegalClauseType, { description: '条款类型' })
  clauseType!: PrismaLegalClauseType;

  // ========== 知识产权条款 ==========
  @Field(() => String, { nullable: true, description: '许可类型（独占/非独占/普通）' })
  licenseType?: string | null;

  @Field(() => String, { nullable: true, description: '许可费用描述' })
  licenseFee?: string | null;

  // ========== 担保条款 ==========
  @Field(() => String, { nullable: true, description: '担保方（FIRST_PARTY/SECOND_PARTY/THIRD_PARTY）' })
  guarantor?: string | null;

  @Field(() => String, { nullable: true, description: '担保类型（GENERAL/JOINT_AND_SEVERAL）' })
  guaranteeType?: string | null;

  @Field(() => String, { nullable: true, description: '担保金额' })
  guaranteeAmount?: string | null;

  @Field(() => String, { nullable: true, description: '担保期限描述' })
  guaranteePeriod?: string | null;

  // ========== 责任限制条款 ==========
  @Field(() => String, { nullable: true, description: '责任上限金额' })
  liabilityLimit?: string | null;

  @Field(() => String, { nullable: true, description: '除外责任类型描述' })
  exclusions?: string | null;

  @Field(() => String, { nullable: true, description: '赔偿计算方式' })
  compensationMethod?: string | null;

  // ========== 终止与争议条款 ==========
  @Field(() => String, { nullable: true, description: '便利终止通知期（如"30天"、"60天"）' })
  terminationNotice?: string | null;

  @Field(() => String, { nullable: true, description: '违约责任描述' })
  breachLiability?: string | null;

  @Field(() => String, { nullable: true, description: '争议解决方式（ARBITRATION/LITIGATION/NEGOTIATION）' })
  disputeResolution?: string | null;

  @Field(() => String, { nullable: true, description: '争议解决地点' })
  disputeLocation?: string | null;

  // ========== 通用字段 ==========
  @Field(() => Float, { nullable: true, description: 'AI提取的置信度 (0-1)' })
  confidence?: number | null;

  @Field(() => String, { nullable: true, description: '原始文本引用（用于溯源）' })
  originalText?: string | null;

  @Field(() => Date, { description: '创建时间' })
  createdAt!: Date;

  @Field(() => Date, { description: '更新时间' })
  updatedAt!: Date;
}

@ObjectType()
export class LegalClausesExtractionResult {
  @Field(() => [ContractLegalClause], { description: '提取的法务条款列表' })
  extracted!: ContractLegalClause[];

  @Field(() => Float, { description: '整体置信度 (0-1)' })
  confidence!: number;

  @Field(() => String, { nullable: true, description: '使用的LLM模型' })
  llmModel?: string;

  @Field(() => String, { nullable: true, description: '使用的LLM提供商' })
  llmProvider?: string;

  @Field(() => Int, { description: '处理时间（毫秒）' })
  processingTimeMs!: number;
}

@ObjectType()
export class LegalClauseStats {
  @Field(() => Int, { description: '总条款数' })
  total!: number;

  @Field(() => [LegalClauseTypeCount], { description: '按类型统计' })
  byType!: LegalClauseTypeCount[];

  @Field(() => Float, { description: '平均置信度' })
  avgConfidence!: number;
}

@ObjectType()
export class LegalClauseTypeCount {
  @Field(() => PrismaLegalClauseType, { description: '条款类型' })
  type!: PrismaLegalClauseType;

  @Field(() => Int, { description: '数量' })
  count!: number;
}
