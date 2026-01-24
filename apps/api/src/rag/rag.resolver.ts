import { Resolver, Query, Mutation, Args, Int, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RAGService } from './rag.service';
import {
  EmbeddingModelInfo,
  RetrievedChunk,
  RAGExtractResult,
  RAGContractChunk,
} from './entities/rag.entity';
import { TopicQueryDto } from './dto/rag-options.dto';
import { EMBEDDING_MODELS, EmbeddingProvider, EmbeddingModelConfig } from './dto/embedding-config.dto';
import { GraphQLJSONObject } from 'graphql-scalars';
import { RAGQuestionAnswerResult } from './dto/rag-qa.dto';

@Resolver()
export class RAGResolver {
  constructor(private readonly rag: RAGService) {}

  @Query(() => EmbeddingModelInfo, {
    description: 'Get current embedding model configuration',
  })
  @UseGuards(GqlAuthGuard)
  embeddingModel(): EmbeddingModelInfo {
    const current = this.rag.getCurrentConfig();

    return {
      provider: current?.config.provider || EmbeddingProvider.OLLAMA,
      model: current?.config.model || 'nomic-embed-text',
      dimensions: current?.config.dimensions || 768,
      available: this.rag.isAvailable(),
    };
  }

  @Query(() => [EmbeddingModelInfo], {
    description: 'Get all available embedding models',
  })
  @UseGuards(GqlAuthGuard)
  availableEmbeddingModels(): EmbeddingModelInfo[] {
    return Object.entries(EMBEDDING_MODELS).map(([name, config]) => ({
      provider: config.provider,
      model: config.model,
      dimensions: config.dimensions,
      available: false, // Would need to check each one
    }));
  }

  @Query(() => Boolean, {
    description: 'Test connection to an embedding model',
  })
  @UseGuards(GqlAuthGuard)
  async testEmbeddingConnection(
    @Args('config', { type: () => GraphQLJSONObject }) config: EmbeddingModelConfig,
  ): Promise<boolean> {
    return this.rag.testConnection(config);
  }

  @Query(() => [RAGContractChunk], {
    description: 'Get all chunks for a contract',
  })
  @UseGuards(GqlAuthGuard)
  async contractChunks(@Args('contractId', { type: () => ID }) contractId: string): Promise<
    RAGContractChunk[]
  > {
    // This would be implemented by VectorStoreService
    return [];
  }

  @Mutation(() => Boolean, {
    description: 'Generate vector index for a contract',
  })
  @UseGuards(GqlAuthGuard)
  async indexContract(
    @Args('contractId', { type: () => ID }) contractId: string,
    @Args('content', { type: () => String }) content: string,
  ): Promise<boolean> {
    try {
      await this.rag.indexContract(contractId, content);
      return true;
    } catch {
      return false;
    }
  }

  @Mutation(() => [RAGExtractResult], {
    description: 'Extract contract information using RAG',
  })
  @UseGuards(GqlAuthGuard)
  async extractWithRAG(
    @Args('contractId', { type: () => ID }) contractId: string,
    @Args('queries', { type: () => [TopicQueryDto] }) queries: TopicQueryDto[],
  ): Promise<RAGExtractResult[]> {
    const results = await this.rag.extractByTopic(
      contractId,
      queries as Array<{ topic: string; query: string; topK?: number; threshold?: number }>,
    );

    return results.map(r => ({
      topic: r.topic,
      query: r.query,
      retrievedChunks: r.retrievedChunks.map(c => ({
        content: c.content,
        similarity: c.similarity,
      })),
      extractedData: r.extractedData,
    }));
  }

  @Query(() => [RAGQuestionAnswerResult], {
    description: 'RAG Question Answer - search contracts by natural language question',
  })
  @UseGuards(GqlAuthGuard)
  async ragQuestionAnswer(
    @Args('question') question: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit?: number,
    @Args('threshold', { type: () => Number, nullable: true, defaultValue: 0.5 }) threshold?: number,
  ): Promise<RAGQuestionAnswerResult[]> {
    return this.rag.questionAnswer(question, limit || 10, threshold || 0.5);
  }
}
