import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RAGService } from './rag.service';
import { RAGResolver } from './rag.resolver';
import { RAGParseStrategy } from './rag-parse.strategy';
import { SemanticChunkerService } from '../llm-parser/semantic-chunker.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { TopicRegistryService } from '../llm-parser/topics/topic-registry.service';
import { PrismaService } from '../prisma';

/**
 * RAG Module
 *
 * Provides Retrieval-Augmented Generation capabilities for contract parsing.
 * Integrates embedding models, semantic chunking, and vector similarity search.
 *
 * @see Spec 26 - RAG Vector Search Strategy
 */
@Module({
  imports: [ConfigModule],
  providers: [
    RAGService,
    RAGResolver,
    RAGParseStrategy,
    // Dependencies (should be imported from other modules)
    SemanticChunkerService,
    VectorStoreService,
    TopicRegistryService,
    PrismaService,
  ],
  exports: [RAGService, RAGParseStrategy],
})
export class RAGModule {}
