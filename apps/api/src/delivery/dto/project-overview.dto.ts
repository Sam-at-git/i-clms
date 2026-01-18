import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { ContractStatus } from '../../graphql/types/enums';

@ObjectType()
export class StatusCount {
  @Field(() => ContractStatus)
  status!: ContractStatus;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class CustomerProjects {
  @Field(() => String)
  customerId!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Int)
  projectCount!: number;

  @Field(() => Int)
  activeCount!: number;
}

@ObjectType()
export class ProjectOverview {
  @Field(() => Int)
  totalProjects!: number;

  @Field(() => [StatusCount])
  byStatus!: StatusCount[];

  @Field(() => [CustomerProjects])
  byCustomer!: CustomerProjects[];

  @Field(() => Float)
  completionRate!: number;
}
