import { InputType, Field } from '@nestjs/graphql';
import { ContractType } from '@prisma/client';
import { TemplateParameterInput } from './create-contract-template.input';

@InputType()
export class UpdateContractTemplateInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => ContractType, { nullable: true })
  type?: ContractType;

  @Field({ nullable: true })
  content?: string;

  @Field({ nullable: true })
  fileUrl?: string;

  @Field({ nullable: true })
  fileType?: string;

  @Field(() => [TemplateParameterInput], { nullable: true })
  parameters?: TemplateParameterInput[];

  @Field({ nullable: true })
  defaultValues?: Record<string, any>;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  version?: string;

  @Field({ nullable: true })
  departmentId?: string;
}
