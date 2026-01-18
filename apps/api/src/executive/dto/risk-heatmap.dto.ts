import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class RiskCell {
  @Field(() => String)
  category!: string;

  @Field(() => String)
  subCategory!: string;

  @Field(() => Float)
  riskScore!: number;

  @Field(() => String)
  riskLevel!: string;

  @Field(() => Int)
  contractCount!: number;

  @Field(() => Float)
  totalValue!: number;
}

@ObjectType()
export class RiskSummary {
  @Field(() => Int)
  totalContracts!: number;

  @Field(() => Int)
  highRiskCount!: number;

  @Field(() => Int)
  criticalRiskCount!: number;

  @Field(() => Float)
  avgRiskScore!: number;
}

@ObjectType()
export class RiskHeatmap {
  @Field(() => [String])
  rows!: string[];

  @Field(() => [String])
  columns!: string[];

  @Field(() => [RiskCell])
  cells!: RiskCell[];

  @Field(() => RiskSummary)
  summary!: RiskSummary;
}
