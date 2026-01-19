import { ObjectType, Field, Float } from '@nestjs/graphql';
import { ContractType } from '../../contract/models/enums';
import { JSONScalar } from '../../common/scalars/json.scalar';

@ObjectType()
export class BasicInfo {
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
