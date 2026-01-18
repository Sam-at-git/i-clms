import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { ContractType, ContractStatus } from '../../graphql/types/enums';

@ObjectType()
export class ContractSummary {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  name!: string;

  @Field(() => ContractType)
  type!: ContractType;

  @Field(() => ContractStatus)
  status!: ContractStatus;

  @Field(() => Float)
  amount!: number;

  @Field(() => Date, { nullable: true })
  signedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date | null;
}

@ObjectType()
export class Customer360 {
  @Field(() => String)
  customerId!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Int)
  totalContracts!: number;

  @Field(() => Float)
  totalValue!: number;

  @Field(() => Int)
  activeContracts!: number;

  @Field(() => [ContractSummary])
  contractHistory!: ContractSummary[];

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => Date, { nullable: true })
  firstContractDate?: Date | null;

  @Field(() => Date, { nullable: true })
  lastContractDate?: Date | null;
}

@ObjectType()
export class IndustryCount {
  @Field(() => String)
  industry!: string;

  @Field(() => Int)
  count!: number;

  @Field(() => Float)
  totalValue!: number;
}

@ObjectType()
export class CustomerOverview {
  @Field(() => Int)
  totalCustomers!: number;

  @Field(() => Int)
  activeCustomers!: number;

  @Field(() => Int)
  newCustomersThisYear!: number;

  @Field(() => [IndustryCount])
  byIndustry!: IndustryCount[];

  @Field(() => [Customer360])
  topCustomers!: Customer360[];
}
