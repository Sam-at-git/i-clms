import { ObjectType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { ContractExtractedData } from './contract-extracted-data.dto';
import { LlmValidationResult } from './validation-result.dto';

@ObjectType()
export class HybridStrategyInfo {
  @Field(() => Boolean)
  usedLlm!: boolean;

  @Field(() => String)
  reason!: string;

  @Field(() => Int)
  programParseScore!: number;

  @Field(() => Int, { nullable: true })
  llmChunks?: number;

  @Field(() => [String], { nullable: true })
  enhancedFields?: string[];

  @Field(() => Boolean, { nullable: true })
  usedValidation?: boolean;

  @Field(() => LlmValidationResult, { nullable: true })
  validationResult?: LlmValidationResult;

  @Field(() => Int, { nullable: true })
  correctedFieldsCount?: number;
}

@ObjectType()
export class LlmParseResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => ContractExtractedData, { nullable: true })
  extractedData?: ContractExtractedData;

  @Field(() => String, { nullable: true })
  rawText?: string;

  @Field(() => Int, { nullable: true })
  pageCount?: number;

  @Field(() => String, { nullable: true })
  llmModel?: string;

  @Field(() => String, { nullable: true })
  llmProvider?: string;

  @Field(() => Int, { nullable: true })
  processingTimeMs?: number;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => HybridStrategyInfo, { nullable: true })
  hybridStrategy?: HybridStrategyInfo;
}
