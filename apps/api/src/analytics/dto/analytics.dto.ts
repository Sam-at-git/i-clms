import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class AnalyticsMetrics {
  @Field(() => Int)
  count!: number;

  @Field(() => Float)
  totalValue!: number;

  @Field(() => Float)
  avgValue!: number;
}

@ObjectType()
export class AnalyticsDimension {
  @Field(() => String)
  dimension!: string;

  @Field(() => String)
  value!: string;

  @Field(() => AnalyticsMetrics)
  metrics!: AnalyticsMetrics;
}

@ObjectType()
export class TrendPoint {
  @Field(() => String)
  period!: string;

  @Field(() => Float)
  value!: number;

  @Field(() => Float, { nullable: true })
  growth?: number | null;
}

@ObjectType()
export class ForecastResult {
  @Field(() => String)
  metric!: string;

  @Field(() => Float)
  currentValue!: number;

  @Field(() => Float)
  forecastValue!: number;

  @Field(() => Float)
  confidence!: number;

  @Field(() => String)
  trend!: string;
}
