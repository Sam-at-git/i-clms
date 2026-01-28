import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { ContractType } from '../../contract/models/enums';
import { JSONScalar } from '../../common/scalars/json.scalar';

@ObjectType()
export class BasicInfo {
  // ===== 现有核心字段 =====
  @Field(() => String, { nullable: true })
  contractNo?: string;

  @Field(() => String, { nullable: true })
  contractName?: string;

  @Field(() => String, { nullable: true })
  ourEntity?: string;

  @Field(() => String, { nullable: true })
  customerName?: string;

  @Field(() => String, { nullable: true })
  status?: string;

  // ===== 合同元数据 =====
  @Field(() => String, { nullable: true })
  version?: string;

  @Field(() => String, { nullable: true })
  governingLanguage?: string;

  // ===== 甲方详细信息 =====
  @Field(() => String, { nullable: true })
  clientLegalRep?: string;

  @Field(() => String, { nullable: true })
  clientRegistrationNumber?: string;

  @Field(() => String, { nullable: true })
  clientBusinessLicense?: string;

  @Field(() => String, { nullable: true })
  clientAddress?: string;

  @Field(() => String, { nullable: true })
  clientContactPerson?: string;

  @Field(() => String, { nullable: true })
  clientPhone?: string;

  @Field(() => String, { nullable: true })
  clientEmail?: string;

  @Field(() => String, { nullable: true })
  clientFax?: string;

  @Field(() => String, { nullable: true })
  clientBankName?: string;

  @Field(() => String, { nullable: true })
  clientBankAccount?: string;

  @Field(() => String, { nullable: true })
  clientAccountName?: string;

  // ===== 乙方详细信息 =====
  @Field(() => String, { nullable: true })
  vendorLegalRep?: string;

  @Field(() => String, { nullable: true })
  vendorRegistrationNumber?: string;

  @Field(() => String, { nullable: true })
  vendorBusinessLicense?: string;

  @Field(() => String, { nullable: true })
  vendorAddress?: string;

  @Field(() => String, { nullable: true })
  vendorContactPerson?: string;

  @Field(() => String, { nullable: true })
  vendorPhone?: string;

  @Field(() => String, { nullable: true })
  vendorEmail?: string;

  @Field(() => String, { nullable: true })
  vendorFax?: string;

  @Field(() => String, { nullable: true })
  vendorBankName?: string;

  @Field(() => String, { nullable: true })
  vendorBankAccount?: string;

  @Field(() => String, { nullable: true })
  vendorAccountName?: string;

  // ===== 项目基本信息 =====
  @Field(() => String, { nullable: true })
  projectName?: string;

  @Field(() => String, { nullable: true })
  projectOverview?: string;

  // ===== 时间信息 =====
  @Field(() => String, { nullable: true })
  projectStartDate?: string;  // YYYY-MM-DD format

  @Field(() => String, { nullable: true })
  projectEndDate?: string;    // YYYY-MM-DD format

  @Field(() => String, { nullable: true })
  warrantyStartDate?: string; // YYYY-MM-DD format

  @Field(() => Int, { nullable: true })
  warrantyPeriodMonths?: number;

  // ===== 财务信息 =====
  @Field(() => Boolean, { nullable: true })
  isTaxInclusive?: boolean;

  @Field(() => String, { nullable: true })
  pricingModel?: string; // FIXED_PRICE, TIME_MATERIAL, MIXED

  // ===== 验收信息 =====
  @Field(() => String, { nullable: true })
  acceptanceMethod?: string;

  @Field(() => Int, { nullable: true })
  acceptancePeriodDays?: number;

  @Field(() => String, { nullable: true })
  deemedAcceptanceRule?: string;

  // ===== 保密条款 =====
  @Field(() => Int, { nullable: true })
  confidentialityTermYears?: number;

  @Field(() => String, { nullable: true })
  confidentialityDefinition?: string;

  @Field(() => String, { nullable: true })
  confidentialityObligation?: string;

  // ===== 通用条款 =====
  @Field(() => String, { nullable: true })
  governingLaw?: string;

  @Field(() => String, { nullable: true })
  disputeResolutionMethod?: string;

  @Field(() => String, { nullable: true })
  noticeRequirements?: string;
}

@ObjectType()
export class FinancialInfo {
  @Field(() => String, { nullable: true })
  amountWithTax?: string;

  @Field(() => String, { nullable: true })
  amountWithoutTax?: string;

  @Field(() => String, { nullable: true })
  taxRate?: string;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => String, { nullable: true })
  paymentMethod?: string;

  @Field(() => String, { nullable: true })
  paymentTerms?: string;
}

@ObjectType()
export class TimeInfo {
  @Field(() => String, { nullable: true })
  signedAt?: string;

  @Field(() => String, { nullable: true })
  effectiveAt?: string;

  @Field(() => String, { nullable: true })
  expiresAt?: string;

  @Field(() => String, { nullable: true })
  duration?: string;
}

@ObjectType()
export class OtherInfo {
  @Field(() => String, { nullable: true })
  salesPerson?: string;

  @Field(() => String, { nullable: true })
  industry?: string;

  @Field(() => String, { nullable: true })
  signLocation?: string;

  @Field(() => Float, { nullable: true })
  copies?: number;
}

@ObjectType()
export class ExtractionMetadata {
  @Field(() => Float, { nullable: true })
  overallConfidence?: number;

  @Field(() => JSONScalar, { nullable: true })
  fieldConfidences?: Record<string, number>;
}

@ObjectType()
export class ContractExtractedData {
  @Field(() => ContractType)
  contractType!: ContractType;

  @Field(() => BasicInfo)
  basicInfo!: BasicInfo;

  @Field(() => FinancialInfo, { nullable: true })
  financialInfo?: FinancialInfo;

  @Field(() => TimeInfo, { nullable: true })
  timeInfo?: TimeInfo;

  @Field(() => OtherInfo, { nullable: true })
  otherInfo?: OtherInfo;

  @Field(() => JSONScalar, { nullable: true })
  typeSpecificDetails?: any;

  @Field(() => ExtractionMetadata, { nullable: true })
  metadata?: ExtractionMetadata;
}
