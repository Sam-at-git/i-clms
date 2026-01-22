import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CacheService } from './cache.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CacheStats, CacheLevelStats, CacheLevel2Stats, CacheLevel3Stats } from './entities/cache.entity';

@Resolver()
export class CacheResolver {
  constructor(private readonly cache: CacheService) {}

  @Query(() => CacheStats, {
    description: '获取缓存统计信息',
  })
  @UseGuards(GqlAuthGuard)
  async cacheStats(): Promise<CacheStats> {
    const stats = await this.cache.getStats();
    return {
      level1: {
        size: stats.level1.size,
        hits: stats.level1.hits,
        misses: stats.level1.misses,
        hitRate: stats.level1.hitRate,
      },
      level2: {
        count: stats.level2.count,
      },
      level3: {
        count: stats.level3.count,
        expiredCount: stats.level3.expiredCount,
      },
    };
  }

  @Mutation(() => Boolean, {
    description: '清空所有缓存',
  })
  @UseGuards(GqlAuthGuard)
  async clearAllCache(): Promise<boolean> {
    await this.cache.clearAll();
    return true;
  }

  @Mutation(() => String, {
    description: '清理过期缓存并返回清理数量',
  })
  @UseGuards(GqlAuthGuard)
  async cleanExpiredCache(): Promise<string> {
    const result = await this.cache.cleanExpired();
    return `Cleaned ${result.llm} LLM cache entries and ${result.document} document cache entries`;
  }
}
