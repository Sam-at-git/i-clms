import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { RiskLevel } from './compliance.dto';

@ObjectType()
export class RiskFactor {
  @Field(() => String)
  factor!: string;

  @Field(() => Float)
  weight!: number;

  @Field(() => Float)
  score!: number;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class ContractRiskScore {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  contractName!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Float)
  overallScore!: number;

  @Field(() => RiskLevel)
  riskLevel!: RiskLevel;

  @Field(() => [RiskFactor])
  factors!: RiskFactor[];

  @Field(() => String, { nullable: true })
  trend?: string | null;
}

@ObjectType()
export class RiskLevelStats {
  @Field(() => RiskLevel)
  level!: RiskLevel;

  @Field(() => Int)
  count!: number;

  @Field(() => Float)
  percentage!: number;
}

@ObjectType()
export class RiskOverview {
  @Field(() => Int)
  totalContracts!: number;

  @Field(() => [RiskLevelStats])
  byRiskLevel!: RiskLevelStats[];

  @Field(() => [ContractRiskScore])
  highRiskContracts!: ContractRiskScore[];

  @Field(() => Float)
  avgRiskScore!: number;
}
