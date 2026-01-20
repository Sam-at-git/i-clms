import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { RateType } from '../enums/rate-type.enum';

@ObjectType()
export class StaffRateItem {
  @Field(() => ID)
  id!: string;

  @Field()
  role!: string;

  @Field(() => RateType)
  rateType!: RateType;

  @Field()
  rate!: string; // Decimal as string

  @Field(() => Date, { nullable: true })
  rateEffectiveFrom?: Date | null;

  @Field(() => Date, { nullable: true })
  rateEffectiveTo?: Date | null;
}

@ObjectType()
export class StaffAugmentationDetail {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  estimatedTotalHours?: string | null;

  @Field(() => String, { nullable: true })
  monthlyHoursCap?: string | null;

  @Field(() => String, { nullable: true })
  yearlyHoursCap?: string | null;

  @Field(() => String, { nullable: true })
  settlementCycle?: string | null;

  @Field(() => String, { nullable: true })
  timesheetApprovalFlow?: string | null;

  @Field(() => String, { nullable: true })
  adjustmentMechanism?: string | null;

  @Field(() => [StaffRateItem])
  rateItems!: StaffRateItem[];
}
