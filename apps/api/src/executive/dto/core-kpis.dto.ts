import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class KPIMetric {
  @Field(() => String)
  name!: string;

  @Field(() => Float)
  value!: number;

  @Field(() => String)
  unit!: string;

  @Field(() => Float, { nullable: true })
  target?: number | null;

  @Field(() => Float, { nullable: true })
  achievement?: number | null;

  @Field(() => String)
  trend!: string;

  @Field(() => Float, { nullable: true })
  previousValue?: number | null;
}

@ObjectType()
export class KPICategory {
  @Field(() => String)
  category!: string;

  @Field(() => [KPIMetric])
  metrics!: KPIMetric[];
}

@ObjectType()
export class CoreKPIs {
  @Field(() => String)
  period!: string;

  @Field(() => [KPICategory])
  categories!: KPICategory[];

  @Field(() => [String])
  highlights!: string[];
}
