import { ObjectType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';

export enum RenewalPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

registerEnumType(RenewalPriority, {
  name: 'RenewalPriority',
  description: '续约优先级',
});

@ObjectType()
export class RenewalItem {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => Date)
  expiresAt!: Date;

  @Field(() => Int)
  daysUntilExpiry!: number;

  @Field(() => Float)
  renewalProbability!: number;

  @Field(() => RenewalPriority)
  priority!: RenewalPriority;
}

@ObjectType()
export class RenewalOverview {
  @Field(() => Int)
  expiringThisMonth!: number;

  @Field(() => Int)
  expiringThisQuarter!: number;

  @Field(() => Float)
  totalRenewalValue!: number;

  @Field(() => Float)
  renewalRate!: number;

  @Field(() => [RenewalItem])
  renewalItems!: RenewalItem[];
}
