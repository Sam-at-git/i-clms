import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { MilestoneStatus, RateType } from '../../graphql/types/enums';

// ==================== 项目外包 - 里程碑 ====================

@InputType()
export class ProjectMilestoneInput {
  @Field(() => Int)
  sequence!: number;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  deliverables?: string;

  @Field(() => String, { nullable: true })
  amount?: string;

  @Field(() => String, { nullable: true })
  paymentPercentage?: string;

  @Field(() => Date, { nullable: true })
  plannedDate?: Date;

  @Field(() => Date, { nullable: true })
  actualDate?: Date;

  @Field(() => String, { nullable: true })
  acceptanceCriteria?: string;

  @Field(() => MilestoneStatus, { nullable: true, defaultValue: MilestoneStatus.PENDING })
  status?: MilestoneStatus;
}

@InputType()
export class ProjectOutsourcingDetailInput {
  @Field(() => String, { nullable: true })
  sowSummary?: string;

  @Field(() => String, { nullable: true })
  deliverables?: string;

  @Field(() => String, { nullable: true })
  acceptanceCriteria?: string;

  @Field(() => String, { nullable: true })
  acceptanceFlow?: string;

  @Field(() => String, { nullable: true })
  changeManagementFlow?: string;

  @Field(() => [ProjectMilestoneInput], { nullable: true })
  milestones?: ProjectMilestoneInput[];
}

// ==================== 人力框架 - 费率项 ====================

@InputType()
export class StaffRateItemInput {
  @Field()
  role!: string;

  @Field(() => RateType)
  rateType!: RateType;

  @Field()
  rate!: string;

  @Field(() => Date, { nullable: true })
  rateEffectiveFrom?: Date;

  @Field(() => Date, { nullable: true })
  rateEffectiveTo?: Date;
}

@InputType()
export class StaffAugmentationDetailInput {
  @Field(() => Int, { nullable: true })
  estimatedTotalHours?: number;

  @Field(() => Int, { nullable: true })
  monthlyHoursCap?: number;

  @Field(() => Int, { nullable: true })
  yearlyHoursCap?: number;

  @Field(() => String, { nullable: true })
  settlementCycle?: string;

  @Field(() => String, { nullable: true })
  timesheetApprovalFlow?: string;

  @Field(() => String, { nullable: true })
  adjustmentMechanism?: string;

  @Field(() => String, { nullable: true })
  staffReplacementFlow?: string;

  @Field(() => [StaffRateItemInput], { nullable: true })
  rateItems?: StaffRateItemInput[];
}

// ==================== 产品购销 - 产品项 ====================

@InputType()
export class ProductLineItemInput {
  @Field()
  productName!: string;

  @Field(() => String, { nullable: true })
  specification?: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String, { nullable: true, defaultValue: '套' })
  unit?: string;

  @Field()
  unitPriceWithTax!: string;

  @Field(() => String, { nullable: true })
  unitPriceWithoutTax?: string;

  @Field(() => String, { nullable: true })
  subtotal?: string;
}

@InputType()
export class ProductSalesDetailInput {
  @Field(() => String, { nullable: true })
  deliveryContent?: string;

  @Field(() => Date, { nullable: true })
  deliveryDate?: Date;

  @Field(() => String, { nullable: true })
  deliveryLocation?: string;

  @Field(() => String, { nullable: true })
  shippingResponsibility?: string;

  @Field(() => String, { nullable: true })
  ipOwnership?: string;

  @Field(() => String, { nullable: true })
  warrantyPeriod?: string;

  @Field(() => String, { nullable: true })
  afterSalesTerms?: string;

  @Field(() => [ProductLineItemInput], { nullable: true })
  lineItems?: ProductLineItemInput[];
}
