import { InputType, Field } from '@nestjs/graphql';
import { DataProtectionRisk as PrismaDataProtectionRisk } from '@prisma/client';

@InputType()
export class CreateDataProtectionInput {
  @Field({ description: '合同ID' })
  contractId!: string;

  @Field({ description: '是否涉及个人数据' })
  involvesPersonalData!: boolean;

  @Field({ nullable: true, description: '个人数据类型描述' })
  personalDataType?: string;

  @Field({ nullable: true, description: '数据处理地点限制' })
  processingLocation?: string;

  @Field({ nullable: true, description: '跨境传输要求' })
  crossBorderTransfer?: string;

  @Field({ nullable: true, description: '安全措施要求' })
  securityMeasures?: string;

  @Field({ nullable: true, description: '数据保留期限' })
  dataRetention?: string;

  @Field(() => PrismaDataProtectionRisk, { description: '风险等级' })
  riskLevel!: PrismaDataProtectionRisk;

  @Field({ nullable: true, description: 'AI提取的置信度 (0-1)' })
  confidence?: number;

  @Field({ nullable: true, description: '原始文本引用' })
  originalText?: string;
}
