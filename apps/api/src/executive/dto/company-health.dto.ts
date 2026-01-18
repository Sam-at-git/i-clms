import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class HealthDimension {
  @Field(() => String)
  dimension!: string;

  @Field(() => Float)
  score!: number;

  @Field(() => String)
  trend!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class HealthAlert {
  @Field(() => String)
  level!: string;

  @Field(() => String)
  message!: string;

  @Field(() => String)
  dimension!: string;

  @Field(() => Float)
  value!: number;
}

@ObjectType()
export class MonthlyScore {
  @Field(() => String)
  month!: string;

  @Field(() => Float)
  score!: number;
}

@ObjectType()
export class CompanyHealth {
  @Field(() => Float)
  overallScore!: number;

  @Field(() => [HealthDimension])
  dimensions!: HealthDimension[];

  @Field(() => [HealthAlert])
  alerts!: HealthAlert[];

  @Field(() => [MonthlyScore])
  trend!: MonthlyScore[];
}
