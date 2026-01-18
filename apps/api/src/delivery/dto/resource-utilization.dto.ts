import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class RoleUtilization {
  @Field(() => String)
  role!: string;

  @Field(() => Int)
  count!: number;

  @Field(() => Float)
  totalValue!: number;
}

@ObjectType()
export class MonthlyUtilization {
  @Field(() => String)
  month!: string;

  @Field(() => Int)
  hoursAllocated!: number;

  @Field(() => Float)
  value!: number;
}

@ObjectType()
export class ResourceUtilization {
  @Field(() => Int)
  totalStaffContracts!: number;

  @Field(() => [RoleUtilization])
  byRole!: RoleUtilization[];

  @Field(() => [MonthlyUtilization])
  monthlyTrend!: MonthlyUtilization[];
}
