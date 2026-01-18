import { ObjectType, Field, Float, registerEnumType } from '@nestjs/graphql';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

registerEnumType(RiskLevel, {
  name: 'RiskLevel',
  description: '风险等级',
});

@ObjectType()
export class ClauseCheck {
  @Field(() => String)
  clauseType!: string;

  @Field(() => String)
  clauseName!: string;

  @Field(() => Boolean)
  exists!: boolean;

  @Field(() => RiskLevel, { nullable: true })
  riskLevel?: RiskLevel | null;

  @Field(() => String, { nullable: true })
  suggestion?: string | null;
}

@ObjectType()
export class ContractCompliance {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  contractName!: string;

  @Field(() => Float)
  overallScore!: number;

  @Field(() => [ClauseCheck])
  clauses!: ClauseCheck[];

  @Field(() => [String])
  missingClauses!: string[];

  @Field(() => [String])
  riskyClauses!: string[];

  @Field(() => Date, { nullable: true })
  lastScannedAt?: Date | null;
}

@ObjectType()
export class ComplianceStats {
  @Field(() => String)
  level!: string;

  @Field(() => Float)
  count!: number;

  @Field(() => Float)
  percentage!: number;
}

@ObjectType()
export class ComplianceOverview {
  @Field(() => Float)
  totalScanned!: number;

  @Field(() => Float)
  avgScore!: number;

  @Field(() => [ComplianceStats])
  byLevel!: ComplianceStats[];

  @Field(() => [ContractCompliance])
  lowScoreContracts!: ContractCompliance[];
}
