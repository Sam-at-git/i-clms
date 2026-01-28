import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

/**
 * 合同基本信息详情实体
 * 用于存储BASIC_INFO主题扩展的合同基本信息
 */
@ObjectType({ description: '合同基本信息详情' })
export class ContractBasicInfo {
  @Field(() => ID, { description: 'ID' })
  id!: string;

  // ==================== 项目基本信息 ====================

  @Field(() => String, { nullable: true, description: '项目名称' })
  projectName?: string | null;

  @Field(() => String, { nullable: true, description: '项目概述' })
  projectOverview?: string | null;

  // ==================== 时间信息（项目时间） ====================

  @Field(() => Date, { nullable: true, description: '项目开始日期' })
  projectStartDate?: Date | null;

  @Field(() => Date, { nullable: true, description: '项目结束日期' })
  projectEndDate?: Date | null;

  @Field(() => Date, { nullable: true, description: '质保期开始日期' })
  warrantyStartDate?: Date | null;

  @Field(() => Int, { nullable: true, description: '质保期(月)' })
  warrantyPeriodMonths?: number | null;

  // ==================== 验收信息 ====================

  @Field(() => String, { nullable: true, description: '验收方法' })
  acceptanceMethod?: string | null;

  @Field(() => Int, { nullable: true, description: '验收期(天)' })
  acceptancePeriodDays?: number | null;

  @Field(() => String, { nullable: true, description: '视为验收规则' })
  deemedAcceptanceRule?: string | null;

  // ==================== 保密条款 ====================

  @Field(() => Int, { nullable: true, description: '保密期限(年)' })
  confidentialityTermYears?: number | null;

  @Field(() => String, { nullable: true, description: '保密信息定义' })
  confidentialityDefinition?: string | null;

  @Field(() => String, { nullable: true, description: '保密义务描述' })
  confidentialityObligation?: string | null;

  // ==================== 通用条款 ====================

  @Field(() => String, { nullable: true, description: '管辖法律' })
  governingLaw?: string | null;

  @Field(() => String, { nullable: true, description: '争议解决方式' })
  disputeResolutionMethod?: string | null;

  @Field(() => String, { nullable: true, description: '通知要求' })
  noticeRequirements?: string | null;

  @Field(() => Date, { description: '创建时间' })
  createdAt!: Date;

  @Field(() => Date, { description: '更新时间' })
  updatedAt!: Date;
}
