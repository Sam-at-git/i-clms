import { InputType, Field } from '@nestjs/graphql';
import { LegalClauseType as PrismaLegalClauseType } from '@prisma/client';

@InputType()
export class CreateLegalClauseInput {
  @Field({ description: '合同ID' })
  contractId!: string;

  @Field(() => PrismaLegalClauseType, { description: '条款类型' })
  clauseType!: PrismaLegalClauseType;

  // ========== 知识产权条款 ==========
  @Field({ nullable: true, description: '许可类型（独占/非独占/普通）' })
  licenseType?: string;

  @Field({ nullable: true, description: '许可费用描述' })
  licenseFee?: string;

  // ========== 担保条款 ==========
  @Field({ nullable: true, description: '担保方（FIRST_PARTY/SECOND_PARTY/THIRD_PARTY）' })
  guarantor?: string;

  @Field({ nullable: true, description: '担保类型（GENERAL/JOINT_AND_SEVERAL）' })
  guaranteeType?: string;

  @Field({ nullable: true, description: '担保金额' })
  guaranteeAmount?: number;

  @Field({ nullable: true, description: '担保期限描述' })
  guaranteePeriod?: string;

  // ========== 责任限制条款 ==========
  @Field({ nullable: true, description: '责任上限金额' })
  liabilityLimit?: number;

  @Field({ nullable: true, description: '除外责任类型描述' })
  exclusions?: string;

  @Field({ nullable: true, description: '赔偿计算方式' })
  compensationMethod?: string;

  // ========== 终止与争议条款 ==========
  @Field({ nullable: true, description: '便利终止通知期' })
  terminationNotice?: string;

  @Field({ nullable: true, description: '违约责任描述' })
  breachLiability?: string;

  @Field({ nullable: true, description: '争议解决方式' })
  disputeResolution?: string;

  @Field({ nullable: true, description: '争议解决地点' })
  disputeLocation?: string;

  // ========== 通用字段 ==========
  @Field({ nullable: true, description: 'AI提取的置信度 (0-1)' })
  confidence?: number;

  @Field({ nullable: true, description: '原始文本引用' })
  originalText?: string;
}
