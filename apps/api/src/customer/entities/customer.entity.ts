import {
  ObjectType,
  Field,
  ID,
  registerEnumType,
  Float,
  Int,
} from '@nestjs/graphql';
import { Contract } from '../../contract/models/contract.model';

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

registerEnumType(CustomerStatus, {
  name: 'CustomerStatus',
  description: 'Customer status',
});

@ObjectType()
export class CustomerContact {
  @Field(() => ID)
  id!: string;

  @Field()
  customerId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  phone!: string | null;

  @Field(() => String, { nullable: true })
  email!: string | null;

  @Field()
  isPrimary!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class Customer {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  shortName!: string | null;

  @Field(() => String, { nullable: true })
  creditCode!: string | null;

  @Field(() => String, { nullable: true })
  industry!: string | null;

  @Field(() => String, { nullable: true })
  address!: string | null;

  @Field(() => String, { nullable: true })
  contactPerson!: string | null;

  @Field(() => String, { nullable: true })
  contactPhone!: string | null;

  @Field(() => String, { nullable: true })
  contactEmail!: string | null;

  @Field(() => CustomerStatus)
  status!: CustomerStatus;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => [CustomerContact])
  contacts?: CustomerContact[];

  @Field(() => [Contract], { nullable: true })
  contracts?: Contract[];
}

@ObjectType()
export class CustomerStats {
  @Field(() => Int)
  totalContracts!: number;

  @Field(() => Int)
  activeContracts!: number;

  @Field(() => Float)
  totalValue!: number;

  @Field(() => Float)
  averageContractValue!: number;

  @Field(() => Date, { nullable: true })
  firstContractDate!: Date | null;

  @Field(() => Date, { nullable: true })
  lastContractDate!: Date | null;

  @Field(() => Float)
  lifetimeValueScore!: number;

  @Field()
  isActive!: boolean;
}

@ObjectType()
export class PaginatedCustomers {
  @Field(() => [Customer])
  items!: Customer[];

  @Field(() => Int)
  total!: number;

  @Field()
  hasMore!: boolean;
}
