import { InputType, Field } from '@nestjs/graphql';
import { ContractType, ContractStatus, PricingModel } from '../models';
import {
  ProjectOutsourcingDetailInput,
  StaffAugmentationDetailInput,
  ProductSalesDetailInput,
} from './type-specific-inputs.dto';
import { ContractBasicInfoInput } from './contract-basic-info.input';

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

  // ==================== 合同元数据（扩展） ====================

  @Field(() => String, { nullable: true, description: '版本号' })
  version?: string;

  @Field(() => String, { nullable: true, description: '管辖语言', defaultValue: '中文' })
  governingLanguage?: string;

  @Field()
  ourEntity!: string;

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true, description: '客户名称，当customerId不提供时用于创建新客户' })
  customerName?: string;

  // ==================== 甲方扩展信息（合同级别） ====================

  @Field(() => String, { nullable: true, description: '甲方法定代表人' })
  clientLegalRep?: string;

  @Field(() => String, { nullable: true, description: '甲方统一社会信用代码/注册号' })
  clientRegistrationNumber?: string;

  @Field(() => String, { nullable: true, description: '甲方营业执照号' })
  clientBusinessLicense?: string;

  @Field(() => String, { nullable: true, description: '甲方地址' })
  clientAddress?: string;

  @Field(() => String, { nullable: true, description: '甲方联系人' })
  clientContactPerson?: string;

  @Field(() => String, { nullable: true, description: '甲方电话' })
  clientPhone?: string;

  @Field(() => String, { nullable: true, description: '甲方邮箱' })
  clientEmail?: string;

  @Field(() => String, { nullable: true, description: '甲方传真' })
  clientFax?: string;

  @Field(() => String, { nullable: true, description: '甲方开户行' })
  clientBankName?: string;

  @Field(() => String, { nullable: true, description: '甲方银行账号' })
  clientBankAccount?: string;

  @Field(() => String, { nullable: true, description: '甲方账户名称' })
  clientAccountName?: string;

  // ==================== 乙方信息 ====================

  @Field(() => String, { nullable: true, description: '乙方法定代表人' })
  vendorLegalRep?: string;

  @Field(() => String, { nullable: true, description: '乙方注册号/统一社会信用代码' })
  vendorRegistrationNumber?: string;

  @Field(() => String, { nullable: true, description: '乙方营业执照号' })
  vendorBusinessLicense?: string;

  @Field(() => String, { nullable: true, description: '乙方地址' })
  vendorAddress?: string;

  @Field(() => String, { nullable: true, description: '乙方联系人' })
  vendorContactPerson?: string;

  @Field(() => String, { nullable: true, description: '乙方电话' })
  vendorPhone?: string;

  @Field(() => String, { nullable: true, description: '乙方邮箱' })
  vendorEmail?: string;

  @Field(() => String, { nullable: true, description: '乙方传真' })
  vendorFax?: string;

  @Field(() => String, { nullable: true, description: '乙方开户行' })
  vendorBankName?: string;

  @Field(() => String, { nullable: true, description: '乙方银行账号' })
  vendorBankAccount?: string;

  @Field(() => String, { nullable: true, description: '乙方账户名称' })
  vendorAccountName?: string;

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

  // ==================== 财务条款（扩展） ====================

  @Field(() => Boolean, { nullable: true, description: '是否含税', defaultValue: true })
  isTaxInclusive?: boolean;

  @Field(() => PricingModel, { nullable: true, description: '定价模式' })
  pricingModel?: PricingModel;

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

  // ==================== 基本信息详情（新增） ====================

  @Field(() => ContractBasicInfoInput, { nullable: true, description: '合同基本信息详情' })
  basicInfo?: ContractBasicInfoInput;
}
