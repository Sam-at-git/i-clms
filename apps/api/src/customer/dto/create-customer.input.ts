import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateContactInput {
  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isPrimary?: boolean;
}

@InputType()
export class CreateCustomerInput {
  @Field()
  fullName!: string;

  @Field(() => String, { nullable: true })
  shortName?: string;

  @Field(() => String, { nullable: true })
  creditCode?: string;

  @Field(() => String, { nullable: true })
  industry?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => [CreateContactInput], { nullable: true })
  contacts?: CreateContactInput[];
}
