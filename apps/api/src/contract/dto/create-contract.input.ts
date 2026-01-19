import { InputType, Field } from '@nestjs/graphql';
import { ContractType, ContractStatus } from '../models';

@InputType()
export class CreateContractInput {
  @Field()
  contractNo!: string;

  @Field()
  name!: string;

  @Field(() => ContractType)
  type!: ContractType;

  @Field(() => ContractStatus, { nullable: true, defaultValue: ContractStatus.DRAFT })
  status?: ContractStatus;

  @Field()
  ourEntity!: string;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true, description: '客户名称，当customerId不提供时用于创建新客户' })
  customerName?: string;

  @Field()
  amountWithTax!: string; // Decimal as string

  @Field(() => String, { nullable: true })
  amountWithoutTax?: string;

  @Field({ nullable: true, defaultValue: 'CNY' })
  currency?: string;

  @Field(() => String, { nullable: true })
  taxRate?: string;

  @Field(() => String, { nullable: true })
  taxAmount?: string;

  @Field(() => String, { nullable: true })
  paymentMethod?: string;

  @Field(() => String, { nullable: true })
  paymentTerms?: string;

  @Field(() => Date, { nullable: true })
  signedAt?: Date;

  @Field(() => Date, { nullable: true })
  effectiveAt?: Date;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;

  @Field(() => String, { nullable: true })
  duration?: string;

  @Field(() => String, { nullable: true })
  fileUrl?: string;

  @Field(() => String, { nullable: true })
  fileType?: string;

  @Field()
  departmentId!: string;

  @Field(() => String, { nullable: true })
  salesPerson?: string;

  @Field(() => String, { nullable: true })
  industry?: string;

  @Field()
  uploadedById!: string;

  @Field(() => String, { nullable: true })
  parentContractId?: string;
}
