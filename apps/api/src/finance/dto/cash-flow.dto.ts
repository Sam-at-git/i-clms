import { ObjectType, Field, Float, InputType, Int } from '@nestjs/graphql';

@ObjectType()
export class CashFlowForecast {
  @Field(() => String)
  month!: string;

  @Field(() => Float)
  expectedIncome!: number;

  @Field(() => Float)
  receivedAmount!: number;

  @Field(() => Float)
  pendingAmount!: number;
}

@InputType()
export class CashFlowFilterInput {
  @Field(() => Int, { nullable: true, defaultValue: 6 })
  months?: number;
}
