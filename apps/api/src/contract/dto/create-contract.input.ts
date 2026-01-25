import { InputType, Field } from '@nestjs/graphql';
import { ContractType, ContractStatus } from '../models';
import {
  ProjectOutsourcingDetailInput,
  StaffAugmentationDetailInput,
  ProductSalesDetailInput,
} from './type-specific-inputs.dto';

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

  @Field(() => String, { nullable: true, description: '签订地点' })
  signLocation?: string;

  @Field(() => Number, { nullable: true, description: '合同份数' })
  copies?: number;

  @Field()
  uploadedById!: string;

  @Field(() => String, { nullable: true })
  parentContractId?: string;

  // ==================== 向量化相关字段 ====================

  @Field(() => String, { nullable: true, description: 'Docling生成的markdown文本，用于向量化' })
  markdownText?: string;

  // ==================== 类型特定详情（LLM解析的扩展字段） ====================

  @Field(() => ProjectOutsourcingDetailInput, { nullable: true, description: '项目外包合同详情（里程碑等）' })
  projectOutsourcingDetail?: ProjectOutsourcingDetailInput;

  @Field(() => StaffAugmentationDetailInput, { nullable: true, description: '人力框架合同详情（费率等）' })
  staffAugmentationDetail?: StaffAugmentationDetailInput;

  @Field(() => ProductSalesDetailInput, { nullable: true, description: '产品购销合同详情（产品清单等）' })
  productSalesDetail?: ProductSalesDetailInput;
}
