import { Field, ObjectType, Int, Float } from '@nestjs/graphql';

/**
 * Cache Level Statistics
 */
@ObjectType({ description: 'L1 内存缓存统计' })
export class CacheLevelStats {
  @Field(() => Int, { description: '缓存条目数量' })
  size!: number;

  @Field(() => Int, { description: '命中次数' })
  hits!: number;

  @Field(() => Int, { description: '未命中次数' })
  misses!: number;

  @Field(() => Float, { description: '命中率 (0-1)' })
  hitRate!: number;
}

/**
 * Cache Level 2 Statistics (Embedding Cache)
 */
@ObjectType({ description: 'L2 向量嵌入缓存统计' })
export class CacheLevel2Stats {
  @Field(() => Int, { description: '嵌入缓存数量' })
  count!: number;
}

/**
 * Cache Level 3 Statistics (LLM Cache)
 */
@ObjectType({ description: 'L3 LLM结果缓存统计' })
export class CacheLevel3Stats {
  @Field(() => Int, { description: 'LLM缓存数量' })
  count!: number;

  @Field(() => Int, { description: '过期缓存数量' })
  expiredCount!: number;
}

/**
 * Overall Cache Statistics
 */
@ObjectType({ description: '多级缓存统计信息' })
export class CacheStats {
  @Field(() => CacheLevelStats, { description: 'L1 内存缓存统计' })
  level1!: CacheLevelStats;

  @Field(() => CacheLevel2Stats, { description: 'L2 向量嵌入缓存统计' })
  level2!: CacheLevel2Stats;

  @Field(() => CacheLevel3Stats, { description: 'L3 LLM结果缓存统计' })
  level3!: CacheLevel3Stats;
}
