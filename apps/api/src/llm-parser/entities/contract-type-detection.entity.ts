import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

/**
 * 合同类型检测结果
 */
@ObjectType()
export class ContractTypeDetectionResult {
  @Field(() => String, { nullable: true, description: '检测到的合同类型' })
  detectedType!: string | null;

  @Field(() => Float, { description: '置信度 (0-1)' })
  confidence!: number;

  @Field(() => String, { description: '判断依据说明' })
  reasoning!: string;

  @Field(() => String, { nullable: true, description: '合同类型中文名称' })
  displayName!: string | null;

  @Field(() => String, { nullable: true, description: '合同类型描述' })
  description!: string | null;
}
