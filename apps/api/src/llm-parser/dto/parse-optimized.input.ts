import { InputType, Field, registerEnumType, Int } from '@nestjs/graphql';
import { ParseStrategy } from '../entities/completeness-score.entity';

// 注册解析模式枚举
export enum ParseMode {
  AUTO = 'AUTO',
  SEMANTIC = 'SEMANTIC',
  RAG = 'RAG',
  CONCURRENT = 'CONCURRENT',
  LEGACY = 'LEGACY',
}

registerEnumType(ParseMode, {
  name: 'ParseMode',
  description: '合同解析模式',
});

@InputType()
export class ParseWithOptimizedInput {
  @Field(() => String, { nullable: true, description: '合同ID（可选）' })
  contractId?: string;

  @Field(() => String, { description: '合同文本内容' })
  textContent!: string;

  @Field(() => ParseMode, {
    description: '解析模式: AUTO-自动选择, SEMANTIC-语义分段, RAG-向量检索增强, CONCURRENT-并发处理, LEGACY-原有策略',
    defaultValue: ParseMode.AUTO,
  })
  mode?: ParseMode = ParseMode.AUTO;

  @Field(() => [String], {
    nullable: true,
    description: '目标字段列表（可选，未指定则提取所有字段）',
  })
  targetFields?: string[];

  @Field(() => ParseStrategy, {
    nullable: true,
    description: '强制使用指定的解析策略（仅用于调试）',
  })
  forceStrategy?: ParseStrategy;

  @Field(() => Int, {
    nullable: true,
    description: '最大并发数（仅用于CONCURRENT模式，默认3）',
  })
  maxConcurrent?: number;

  @Field(() => Int, {
    nullable: true,
    description: '每字段最大chunks数（仅用于RAG模式，默认3）',
  })
  maxChunksPerField?: number;
}

@InputType()
export class SemanticChunkInput {
  @Field(() => String, { description: '合同文本内容' })
  text!: string;

  @Field(() => Int, {
    nullable: true,
    description: '最小chunk大小（字符数，默认500）',
  })
  minChunkSize?: number;
}

@InputType()
export class RagParseInput {
  @Field(() => String, { description: '合同文本内容' })
  text!: string;

  @Field(() => [String], { description: '需要提取的字段列表' })
  fields!: string[];

  @Field(() => Int, {
    nullable: true,
    description: '每字段最大chunks数（默认3）',
  })
  maxChunksPerField?: number;
}

@InputType()
export class ConcurrentParseInput {
  @Field(() => String, { description: '合同文本内容' })
  text!: string;

  @Field(() => [String], { description: '需要提取的字段列表' })
  fields!: string[];

  @Field(() => Int, {
    nullable: true,
    description: '最大并发数（默认3）',
  })
  maxConcurrent?: number;
}
