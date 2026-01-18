import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Customer {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  shortName?: string | null;

  @Field(() => String, { nullable: true })
  creditCode?: string | null;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => String, { nullable: true })
  address?: string | null;

  @Field(() => String, { nullable: true })
  contactPerson?: string | null;

  @Field(() => String, { nullable: true })
  contactPhone?: string | null;

  @Field(() => String, { nullable: true })
  contactEmail?: string | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
