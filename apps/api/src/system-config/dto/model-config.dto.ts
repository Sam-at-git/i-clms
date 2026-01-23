import { ObjectType, Field, Int } from '@nestjs/graphql';

/**
 * LLM Configuration
 */
@ObjectType()
export class LLMConfig {
  @Field(() => String)
  provider!: string;

  @Field(() => String)
  model!: string;

  @Field(() => String, { nullable: true })
  baseUrl?: string;

  @Field(() => String, { nullable: true })
  apiKey?: string;

  @Field(() => Number)
  temperature!: number;

  @Field(() => Int)
  maxTokens!: number;

  @Field(() => Int, { nullable: true })
  timeout?: number;
}

/**
 * Embedding Model Configuration
 */
@ObjectType()
export class EmbeddingConfig {
  @Field(() => String)
  provider!: string;

  @Field(() => String)
  model!: string;

  @Field(() => String, { nullable: true })
  baseUrl?: string;

  @Field(() => String, { nullable: true })
  apiKey?: string;

  @Field(() => Int)
  dimensions!: number;
}

/**
 * Model Test Result
 */
@ObjectType()
export class ModelTestResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Int, { nullable: true })
  latency?: number;
}

/**
 * OCR Configuration
 */
@ObjectType()
export class OCRConfig {
  @Field(() => String)
  engine!: 'rapidocr' | 'easyocr' | 'tesseract';
}
