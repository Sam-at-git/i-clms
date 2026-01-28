import { InputType, Field, Int } from '@nestjs/graphql';

/**
 * 合同基本信息详情输入DTO
 * 用于创建和更新ContractBasicInfo
 */
@InputType({ description: '合同基本信息详情输入' })
export class ContractBasicInfoInput {
  // ==================== 项目基本信息 ====================

  @Field(() => String, { nullable: true, description: '项目名称' })
  projectName?: string;

  @Field(() => String, { nullable: true, description: '项目概述' })
  projectOverview?: string;

  // ==================== 时间信息（项目时间） ====================

  @Field(() => Date, { nullable: true, description: '项目开始日期' })
  projectStartDate?: Date;

  @Field(() => Date, { nullable: true, description: '项目结束日期' })
  projectEndDate?: Date;

  @Field(() => Date, { nullable: true, description: '质保期开始日期' })
  warrantyStartDate?: Date;

  @Field(() => Int, { nullable: true, description: '质保期(月)' })
  warrantyPeriodMonths?: number;

  // ==================== 验收信息 ====================

  @Field(() => String, { nullable: true, description: '验收方法' })
  acceptanceMethod?: string;

  @Field(() => Int, { nullable: true, description: '验收期(天)' })
  acceptancePeriodDays?: number;

  @Field(() => String, { nullable: true, description: '视为验收规则' })
  deemedAcceptanceRule?: string;

  // ==================== 保密条款 ====================

  @Field(() => Int, { nullable: true, description: '保密期限(年)' })
  confidentialityTermYears?: number;

  @Field(() => String, { nullable: true, description: '保密信息定义' })
  confidentialityDefinition?: string;

  @Field(() => String, { nullable: true, description: '保密义务描述' })
  confidentialityObligation?: string;

  // ==================== 通用条款 ====================

  @Field(() => String, { nullable: true, description: '管辖法律' })
  governingLaw?: string;

  @Field(() => String, { nullable: true, description: '争议解决方式' })
  disputeResolutionMethod?: string;

  @Field(() => String, { nullable: true, description: '通知要求' })
  noticeRequirements?: string;
}
