import { ObjectType, Field, Float, Int, InputType } from '@nestjs/graphql';
import { ContractType } from '../../graphql/types/enums';

@ObjectType()
export class MonthlyRevenue {
  @Field(() => String)
  month!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class TypeRevenue {
  @Field(() => ContractType)
  type!: ContractType;

  @Field(() => Float)
  amount!: number;

  @Field(() => Float)
  percentage!: number;
}

@ObjectType()
export class CustomerRevenue {
  @Field(() => String)
  customerId!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => Int)
  contractCount!: number;
}

@ObjectType()
export class RevenueStats {
  @Field(() => Float)
  totalRevenue!: number;

  @Field(() => [MonthlyRevenue])
  byMonth!: MonthlyRevenue[];

  @Field(() => [TypeRevenue])
  byContractType!: TypeRevenue[];

  @Field(() => [CustomerRevenue])
  byCustomer!: CustomerRevenue[];
}

@InputType()
export class RevenueFilterInput {
  @Field(() => Int, { nullable: true })
  year?: number;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;
}
