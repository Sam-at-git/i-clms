import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ContractExtractedData } from './contract-extracted-data.dto';

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
}
