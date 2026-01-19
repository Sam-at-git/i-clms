import { InputType, Field } from '@nestjs/graphql';
import { CustomerStatus } from '../entities/customer.entity';

@InputType()
export class UpdateCustomerInput {
  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field(() => String, { nullable: true })
  shortName?: string;

  @Field(() => String, { nullable: true })
  industry?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => CustomerStatus, { nullable: true })
  status?: CustomerStatus;
}

@InputType()
export class UpdateContactInput {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => Boolean, { nullable: true })
  isPrimary?: boolean;
}
