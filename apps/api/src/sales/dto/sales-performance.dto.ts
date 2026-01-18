import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class SalesPersonPerformance {
  @Field(() => String)
  salesPerson!: string;

  @Field(() => Int)
  totalContracts!: number;

  @Field(() => Float)
  totalValue!: number;

  @Field(() => Float)
  newSignValue!: number;

  @Field(() => Float)
  renewalValue!: number;
}

@ObjectType()
export class MonthlySales {
  @Field(() => String)
  month!: string;

  @Field(() => Float)
  newSignValue!: number;

  @Field(() => Float)
  renewalValue!: number;

  @Field(() => Float)
  totalValue!: number;
}

@ObjectType()
export class SalesPerformance {
  @Field(() => Float)
  totalSalesValue!: number;

  @Field(() => Float)
  newSignValue!: number;

  @Field(() => Float)
  renewalValue!: number;

  @Field(() => [MonthlySales])
  monthlyTrend!: MonthlySales[];

  @Field(() => [SalesPersonPerformance])
  bySalesPerson!: SalesPersonPerformance[];
}
