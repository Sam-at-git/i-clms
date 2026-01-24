import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

// GraphQL Entities
import { VectorCacheStats, ContractChunk } from './entities/vector-store.entity';

@Resolver()
export class VectorStoreResolver {
  constructor(private readonly vectorStore: VectorStoreService) {}

  @Query(() => Boolean, {
    description: '检查pgvector扩展是否可用',
  })
  @UseGuards(GqlAuthGuard)
  async pgVectorStatus(): Promise<boolean> {
    return this.vectorStore.checkPgVectorAvailable();
  }

  @Query(() => VectorCacheStats, {
    description: '获取向量缓存统计信息',
  })
  @UseGuards(GqlAuthGuard)
  async vectorCacheStats(): Promise<VectorCacheStats> {
    const stats = await this.vectorStore.getVectorCacheStats();
    return {
      embeddingCacheCount: stats.embeddingCacheCount,
      llmCacheCount: stats.llmCacheCount,
      contractChunksCount: stats.contractChunksCount,
    };
  }

  @Query(() => [ContractChunk], {
    description: '获取合同段落列表',
  })
  @UseGuards(GqlAuthGuard)
  async contractChunks(@Args('contractId', { type: () => ID }) contractId: string): Promise<ContractChunk[]> {
    const chunks = await this.vectorStore.getContractChunks(contractId);
    return chunks.map(c => ({
      index: c.index,
      content: c.content,
      chunkType: c.chunkType,
    }));
  }

  @Mutation(() => VectorCacheStats, {
    description: '清理过期缓存',
  })
  @UseGuards(GqlAuthGuard)
  async cleanExpiredCache(): Promise<VectorCacheStats> {
    const result = await this.vectorStore.cleanExpiredCache();
    return {
      embeddingCacheCount: 0, // Not tracked in cleanup
      llmCacheCount: result.llm,
      contractChunksCount: 0,
    };
  }
}
