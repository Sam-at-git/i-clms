import { InputType, Field, Int } from '@nestjs/graphql';
import { CustomerStatus } from '../entities/customer.entity';

@InputType()
export class CustomerFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => String, { nullable: true })
  industry?: string;

  @Field(() => CustomerStatus, { nullable: true })
  status?: CustomerStatus;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  skip?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  take?: number;
}
