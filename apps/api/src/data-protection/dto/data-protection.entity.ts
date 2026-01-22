import { Field, ObjectType, registerEnumType, Int, Float } from '@nestjs/graphql';
import { DataProtectionRisk as PrismaDataProtectionRisk } from '@prisma/client';

// 注册GraphQL枚举类型
registerEnumType(PrismaDataProtectionRisk, {
  name: 'DataProtectionRisk',
  description: '数据保护风险等级',
});

@ObjectType()
export class ContractDataProtection {
  @Field(() => Int, { description: '主键ID' })
  id!: number;

  @Field(() => String, { description: '合同ID' })
  contractId!: string;

  @Field(() => Boolean, { description: '是否涉及个人数据' })
  involvesPersonalData!: boolean;

  @Field(() => String, { nullable: true, description: '个人数据类型描述' })
  personalDataType?: string | null;

  @Field(() => String, { nullable: true, description: '数据处理地点限制' })
  processingLocation?: string | null;

  @Field(() => String, { nullable: true, description: '跨境传输要求' })
  crossBorderTransfer?: string | null;

  @Field(() => String, { nullable: true, description: '安全措施要求' })
  securityMeasures?: string | null;

  @Field(() => String, { nullable: true, description: '数据保留期限' })
  dataRetention?: string | null;

  @Field(() => PrismaDataProtectionRisk, { description: '风险等级' })
  riskLevel!: PrismaDataProtectionRisk;

  @Field(() => Float, { nullable: true, description: 'AI提取的置信度 (0-1)' })
  confidence?: number | null;

  @Field(() => String, { nullable: true, description: '原始文本引用' })
  originalText?: string | null;

  @Field(() => Date, { description: '创建时间' })
  createdAt!: Date;

  @Field(() => Date, { description: '更新时间' })
  updatedAt!: Date;
}

@ObjectType()
export class DataProtectionExtractionResult {
  @Field(() => ContractDataProtection, { nullable: true, description: '提取的数据保护条款' })
  dataProtection?: ContractDataProtection | null;

  @Field(() => Float, { description: '整体置信度 (0-1)' })
  confidence!: number;

  @Field(() => String, { nullable: true, description: '使用的LLM模型' })
  llmModel?: string;

  @Field(() => String, { nullable: true, description: '使用的LLM提供商' })
  llmProvider?: string;

  @Field(() => Int, { description: '处理时间（毫秒）' })
  processingTimeMs!: number;

  @Field(() => Boolean, { description: '是否涉及个人数据' })
  involvesPersonalData!: boolean;

  @Field(() => PrismaDataProtectionRisk, { description: '风险等级' })
  riskLevel!: PrismaDataProtectionRisk;
}

@ObjectType()
export class DataProtectionStats {
  @Field(() => Int, { description: '总记录数' })
  total!: number;

  @Field(() => Int, { description: '涉及个人数据的合同数' })
  involvingPersonalData!: number;

  @Field(() => [DataProtectionRiskCount], { description: '按风险等级统计' })
  byRiskLevel!: DataProtectionRiskCount[];

  @Field(() => Float, { description: '平均置信度' })
  avgConfidence!: number;
}

@ObjectType()
export class DataProtectionRiskCount {
  @Field(() => PrismaDataProtectionRisk, { description: '风险等级' })
  level!: PrismaDataProtectionRisk;

  @Field(() => Int, { description: '数量' })
  count!: number;
}
