import { Field, ObjectType, Int } from '@nestjs/graphql';

/**
 * Vector Cache Statistics
 */
@ObjectType({ description: '向量缓存统计信息' })
export class VectorCacheStats {
  @Field(() => Int, { description: '嵌入缓存数量' })
  embeddingCacheCount!: number;

  @Field(() => Int, { description: 'LLM缓存数量' })
  llmCacheCount!: number;

  @Field(() => Int, { description: '合同段落数量' })
  contractChunksCount!: number;
}

/**
 * Contract Chunk
 */
@ObjectType({ description: '合同段落信息' })
export class ContractChunk {
  @Field(() => Int, { description: '段落索引' })
  index!: number;

  @Field(() => String, { description: '段落内容' })
  content!: string;

  @Field(() => String, { description: '段落类型' })
  chunkType!: string;
}

/**
 * Similar Chunk Result
 */
@ObjectType({ description: '相似段落搜索结果' })
export class SimilarChunkResult {
  @Field(() => Int, { description: '合同ID' })
  contractId!: number;

  @Field(() => String, { description: '段落内容' })
  content!: string;

  @Field(() => Number, { description: '相似度 (0-1)' })
  similarity!: number;
}

/**
 * Cache Cleanup Result
 */
@ObjectType({ description: '缓存清理结果' })
export class CacheCleanupResult {
  @Field(() => Int, { description: '清理的LLM缓存数量' })
  llm!: number;

  @Field(() => Int, { description: '清理的文档缓存数量' })
  document!: number;
}
