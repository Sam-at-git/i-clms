import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CloneFromTemplateInput {
  @Field(() => ID)
  templateId!: string;

  @Field()
  contractNo!: string;

  @Field()
  name!: string;

  @Field()
  customerId!: string;

  @Field()
  departmentId!: string;

  @Field({ nullable: true })
  parameterValues?: Record<string, any>;

  @Field({ nullable: true })
  ourEntity?: string;

  @Field({ nullable: true })
  salesPerson?: string;

  @Field({ nullable: true })
  uploadedById?: string;
}
