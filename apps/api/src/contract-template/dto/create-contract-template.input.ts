import { InputType, Field } from '@nestjs/graphql';
import { ContractType } from '@prisma/client';

@InputType()
export class TemplateParameterInput {
  @Field()
  name!: string;

  @Field()
  label!: string;

  @Field()
  type!: string; // text, number, date, select, textarea

  @Field({ nullable: true })
  required?: boolean;

  @Field({ nullable: true })
  defaultValue?: string;

  @Field(() => [String], { nullable: true })
  options?: string[]; // For select type
}

@InputType()
export class CreateContractTemplateInput {
  @Field()
  name!: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => ContractType)
  type!: ContractType;

  @Field()
  content!: string;

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
  isSystem?: boolean;

  @Field({ nullable: true })
  version?: string;

  @Field({ nullable: true })
  departmentId?: string;
}
