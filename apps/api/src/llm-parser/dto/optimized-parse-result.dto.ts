import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { ContractExtractedData } from './contract-extracted-data.dto';
import { ParseMode } from './parse-optimized.input';

/**
 * 单个语义分段信息
 */
@ObjectType()
export class SemanticChunkInfo {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  type!: string;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  articleNumber?: string;

  @Field(() => Int)
  priority!: number;

  @Field(() => [String])
  fieldRelevance!: string[];

  @Field(() => Int)
  length!: number;

  @Field(() => Int)
  startIndex!: number;

  @Field(() => Int)
  endIndex!: number;

  @Field(() => Int, { nullable: true })
  pageHint?: number;
}

/**
 * 单个并发提取任务的结果
 */
@ObjectType()
export class ExtractionTaskResult {
  @Field(() => String)
  chunkId!: string;

  @Field(() => Boolean)
  success!: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: Record<string, any>;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Int, { nullable: true })
  tokensUsed?: number;

  @Field(() => Int)
  processingTimeMs!: number;
}

/**
 * 优化解析结果
 */
@ObjectType()
export class OptimizedParseResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => ParseMode)
  mode!: ParseMode;

  @Field(() => ContractExtractedData, { nullable: true })
  extractedData?: ContractExtractedData;

  @Field(() => GraphQLJSONObject, { nullable: true })
  extractedDataJson?: Record<string, unknown>;

  @Field(() => SemanticChunkInfo, { nullable: true })
  chunks?: SemanticChunkInfo[];

  @Field(() => [ExtractionTaskResult], { nullable: true })
  taskResults?: ExtractionTaskResult[];

  @Field(() => Int, { nullable: true })
  totalChunks?: number;

  @Field(() => Int, { nullable: true })
  totalTokensUsed?: number;

  @Field(() => Int)
  processingTimeMs!: number;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field(() => String, { nullable: true })
  llmModel?: string;

  @Field(() => String, { nullable: true })
  llmProvider?: string;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => [String], { nullable: true })
  warnings?: string[];

  @Field(() => String, { nullable: true })
  strategy?: string;
}

/**
 * 语义分段结果
 */
@ObjectType()
export class SemanticChunkResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => [SemanticChunkInfo])
  chunks!: SemanticChunkInfo[];

  @Field(() => Int)
  totalLength!: number;

  @Field(() => String)
  strategy!: string;

  @Field(() => String, { nullable: true })
  summary!: string;
}
