import { ObjectType, Field, Float } from '@nestjs/graphql';

/**
 * 单字段修正建议DTO
 */
@ObjectType()
export class CorrectionSuggestionDto {
  @Field()
  fieldName!: string;

  @Field()
  fieldDisplayName!: string;

  @Field({ nullable: true })
  originalValue?: string;

  @Field({ nullable: true })
  suggestedValue?: string;

  @Field()
  evidence!: string;

  @Field()
  shouldChange!: boolean;

  @Field(() => Float)
  confidence!: number;

  @Field({ nullable: true })
  reasoning?: string;
}

/**
 * 可疑字段评估结果DTO
 */
@ObjectType()
export class EvaluateResultDto {
  @Field(() => [String])
  suspiciousFields!: string[];

  @Field({ nullable: true })
  reasoning?: string;
}

/**
 * 单字段修正输入（内部使用）
 */
export interface FieldCorrectionInput {
  contractId: string;
  fieldName: string;
  originalValue: string | null;
  ragChunks: string[];
}

/**
 * LLM返回的修正建议（内部使用）
 */
export interface LlmCorrectionResponse {
  fieldName: string;
  fieldDisplayName: string;
  originalValue: string | null;
  suggestedValue: string | null;
  shouldChange: boolean;
  confidence: number;
  evidence: string;
  reasoning?: string;
}
