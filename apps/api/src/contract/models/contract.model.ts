import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { ContractType, ContractStatus, ParseStatus, PricingModel } from './enums';
import { Customer } from '../../customer/entities/customer.entity';
import { UserDto } from '../../user/dto/user.dto';
import { DepartmentDto } from '../../department/dto/department.dto';
import { StaffAugmentationDetail } from '../entities/staff-augmentation-detail.entity';
import { ProjectOutsourcingDetail } from '../entities/project-outsourcing-detail.entity';
import { ProductSalesDetail } from '../entities/product-sales-detail.entity';
import { ContractBasicInfo } from '../entities/contract-basic-info.entity';
import { TagDto } from '../../tagging/dto/tagging.dto';

@ObjectType()
export class Contract {
  @Field(() => ID)
  id!: string;

  @Field()
  contractNo!: string;

  @Field()
  name!: string;

  @Field(() => ContractType)
  type!: ContractType;

  @Field(() => ContractStatus)
  status!: ContractStatus;

  // ==================== 合同元数据（扩展） ====================

  @Field(() => String, { nullable: true, description: '版本号' })
  version?: string | null;

  @Field(() => String, { nullable: true, description: '管辖语言', defaultValue: '中文' })
  governingLanguage?: string | null;

  @Field()
  ourEntity!: string;

  @Field(() => Customer)
  customer!: Customer;

  // ==================== 甲方扩展信息（合同级别） ====================

  @Field(() => String, { nullable: true, description: '甲方法定代表人' })
  clientLegalRep?: string | null;

  @Field(() => String, { nullable: true, description: '甲方统一社会信用代码/注册号' })
  clientRegistrationNumber?: string | null;

  @Field(() => String, { nullable: true, description: '甲方营业执照号' })
  clientBusinessLicense?: string | null;

  @Field(() => String, { nullable: true, description: '甲方地址' })
  clientAddress?: string | null;

  @Field(() => String, { nullable: true, description: '甲方联系人' })
  clientContactPerson?: string | null;

  @Field(() => String, { nullable: true, description: '甲方电话' })
  clientPhone?: string | null;

  @Field(() => String, { nullable: true, description: '甲方邮箱' })
  clientEmail?: string | null;

  @Field(() => String, { nullable: true, description: '甲方传真' })
  clientFax?: string | null;

  @Field(() => String, { nullable: true, description: '甲方开户行' })
  clientBankName?: string | null;

  @Field(() => String, { nullable: true, description: '甲方银行账号' })
  clientBankAccount?: string | null;

  @Field(() => String, { nullable: true, description: '甲方账户名称' })
  clientAccountName?: string | null;

  // ==================== 乙方信息 ====================

  @Field(() => String, { nullable: true, description: '乙方法定代表人' })
  vendorLegalRep?: string | null;

  @Field(() => String, { nullable: true, description: '乙方注册号/统一社会信用代码' })
  vendorRegistrationNumber?: string | null;

  @Field(() => String, { nullable: true, description: '乙方营业执照号' })
  vendorBusinessLicense?: string | null;

  @Field(() => String, { nullable: true, description: '乙方地址' })
  vendorAddress?: string | null;

  @Field(() => String, { nullable: true, description: '乙方联系人' })
  vendorContactPerson?: string | null;

  @Field(() => String, { nullable: true, description: '乙方电话' })
  vendorPhone?: string | null;

  @Field(() => String, { nullable: true, description: '乙方邮箱' })
  vendorEmail?: string | null;

  @Field(() => String, { nullable: true, description: '乙方传真' })
  vendorFax?: string | null;

  @Field(() => String, { nullable: true, description: '乙方开户行' })
  vendorBankName?: string | null;

  @Field(() => String, { nullable: true, description: '乙方银行账号' })
  vendorBankAccount?: string | null;

  @Field(() => String, { nullable: true, description: '乙方账户名称' })
  vendorAccountName?: string | null;

  @Field()
  amountWithTax!: string; // Decimal as string

  @Field(() => String, { nullable: true })
  amountWithoutTax?: string | null;

  @Field({ defaultValue: 'CNY' })
  currency!: string;

  @Field(() => String, { nullable: true })
  taxRate?: string | null;

  @Field(() => String, { nullable: true })
  taxAmount?: string | null;

  @Field(() => String, { nullable: true })
  paymentMethod?: string | null;

  @Field(() => String, { nullable: true })
  paymentTerms?: string | null;

  // ==================== 财务条款（扩展） ====================

  @Field(() => Boolean, { description: '是否含税', defaultValue: true })
  isTaxInclusive!: boolean;

  @Field(() => PricingModel, { nullable: true, description: '定价模式' })
  pricingModel?: PricingModel | null;

  @Field(() => Date, { nullable: true })
  signedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  effectiveAt?: Date | null;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date | null;

  @Field(() => String, { nullable: true })
  duration?: string | null;

  @Field(() => String, { nullable: true })
  fileUrl?: string | null;

  @Field(() => String, { nullable: true })
  fileType?: string | null;

  @Field(() => Int, { nullable: true })
  copies?: number | null;

  @Field(() => String, { nullable: true })
  signLocation?: string | null;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => DepartmentDto)
  department!: DepartmentDto;

  @Field(() => String, { nullable: true })
  salesPerson?: string | null;

  @Field(() => ParseStatus)
  parseStatus!: ParseStatus;

  @Field(() => Date, { nullable: true })
  parsedAt?: Date | null;

  @Field(() => Float, { nullable: true })
  parseConfidence?: number | null;

  @Field()
  needsManualReview!: boolean;

  @Field(() => Contract, { nullable: true })
  parentContract?: Contract | null;

  @Field(() => [Contract])
  supplements!: Contract[];

  @Field(() => UserDto)
  uploadedBy!: UserDto;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  // Contract type-specific details
  @Field(() => StaffAugmentationDetail, { nullable: true })
  staffAugmentationDetail?: StaffAugmentationDetail | null;

  @Field(() => ProjectOutsourcingDetail, { nullable: true })
  projectOutsourcingDetail?: ProjectOutsourcingDetail | null;

  @Field(() => ProductSalesDetail, { nullable: true })
  productSalesDetail?: ProductSalesDetail | null;

  // ==================== 基本信息详情关联（新增） ====================

  @Field(() => ContractBasicInfo, { nullable: true, description: '合同基本信息详情' })
  basicInfo?: ContractBasicInfo | null;

  @Field(() => [TagDto])
  tags!: TagDto[];

  // ==================== 向量化相关字段 ====================

  @Field(() => Boolean, { description: '是否已向量化' })
  isVectorized!: boolean;

  @Field(() => Date, { nullable: true, description: '向量化时间' })
  vectorizedAt?: Date | null;

  @Field(() => String, { nullable: true, description: '向量化方式：AUTO/MANUAL' })
  vectorizationMethod?: string | null;

  @Field(() => Int, { nullable: true, description: '分块数量' })
  chunkCount?: number | null;
}
