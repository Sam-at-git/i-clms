import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { DataProtectionRisk as PrismaDataProtectionRisk } from '@prisma/client';

// 注册GraphQL枚举类型
registerEnumType(PrismaDataProtectionRisk, {
  name: 'DataProtectionRisk',
  description: '数据保护风险等级',
});

@ObjectType()
export class ContractDataProtection {
  @Field({ description: '主键ID' })
  id!: number;

  @Field({ description: '合同ID' })
  contractId!: string;

  @Field({ description: '是否涉及个人数据' })
  involvesPersonalData!: boolean;

  @Field({ nullable: true, description: '个人数据类型描述' })
  personalDataType?: string | null;

  @Field({ nullable: true, description: '数据处理地点限制' })
  processingLocation?: string | null;

  @Field({ nullable: true, description: '跨境传输要求' })
  crossBorderTransfer?: string | null;

  @Field({ nullable: true, description: '安全措施要求' })
  securityMeasures?: string | null;

  @Field({ nullable: true, description: '数据保留期限' })
  dataRetention?: string | null;

  @Field(() => PrismaDataProtectionRisk, { description: '风险等级' })
  riskLevel!: PrismaDataProtectionRisk;

  @Field({ nullable: true, description: 'AI提取的置信度 (0-1)' })
  confidence?: number | null;

  @Field({ nullable: true, description: '原始文本引用' })
  originalText?: string | null;

  @Field({ description: '创建时间' })
  createdAt!: Date;

  @Field({ description: '更新时间' })
  updatedAt!: Date;
}

@ObjectType()
export class DataProtectionExtractionResult {
  @Field({ nullable: true, description: '提取的数据保护条款' })
  dataProtection?: ContractDataProtection | null;

  @Field({ description: '整体置信度 (0-1)' })
  confidence!: number;

  @Field({ nullable: true, description: '使用的LLM模型' })
  llmModel?: string;

  @Field({ nullable: true, description: '使用的LLM提供商' })
  llmProvider?: string;

  @Field({ description: '处理时间（毫秒）' })
  processingTimeMs!: number;

  @Field({ description: '是否涉及个人数据' })
  involvesPersonalData!: boolean;

  @Field({ description: '风险等级' })
  riskLevel!: PrismaDataProtectionRisk;
}

@ObjectType()
export class DataProtectionStats {
  @Field({ description: '总记录数' })
  total!: number;

  @Field({ description: '涉及个人数据的合同数' })
  involvingPersonalData!: number;

  @Field(() => [DataProtectionRiskCount], { description: '按风险等级统计' })
  byRiskLevel!: DataProtectionRiskCount[];

  @Field({ description: '平均置信度' })
  avgConfidence!: number;
}

@ObjectType()
export class DataProtectionRiskCount {
  @Field(() => PrismaDataProtectionRisk, { description: '风险等级' })
  level!: PrismaDataProtectionRisk;

  @Field({ description: '数量' })
  count!: number;
}
