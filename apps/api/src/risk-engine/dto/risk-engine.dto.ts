import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class RiskFactorDetail {
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
export class RiskAssessment {
  @Field(() => String)
  contractId!: string;

  @Field(() => Float)
  totalScore!: number;

  @Field(() => String)
  level!: string;

  @Field(() => [RiskFactorDetail])
  factors!: RiskFactorDetail[];

  @Field(() => [String])
  recommendations!: string[];
}

@ObjectType()
export class RiskClause {
  @Field(() => String)
  clauseType!: string;

  @Field(() => String)
  content!: string;

  @Field(() => String)
  riskLevel!: string;

  @Field(() => String)
  suggestion!: string;
}

@ObjectType()
export class RiskAlert {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  alertType!: string;

  @Field(() => String)
  severity!: string;

  @Field(() => String)
  message!: string;

  @Field(() => Date)
  createdAt!: Date;
}
