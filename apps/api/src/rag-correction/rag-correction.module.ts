import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagCorrectionService } from './rag-correction.service';
import { RagCorrectionResolver } from './rag-correction.resolver';
import { FieldMetadataService } from './field-metadata.service';
import { CorrectionProgressService } from './correction-progress.service';
import { PrismaService } from '../prisma';
import { RAGService } from '../rag/rag.service';
import { AuditService } from '../audit/audit.service';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { SemanticChunkerService } from '../llm-parser/semantic-chunker.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { TopicRegistryService } from '../llm-parser/topics/topic-registry.service';

/**
 * RAG字段修正模块
 *
 * 提供基于RAG+LLM的合同字段修正功能：
 * - 单字段RAG修正
 * - 批量智能修正
 * - 字段配置元数据
 */
@Module({
  imports: [ConfigModule],
  providers: [
    // 核心服务
    RagCorrectionService,
    RagCorrectionResolver,
    FieldMetadataService,
    CorrectionProgressService,
    // 依赖服务
    PrismaService,
    RAGService,
    AuditService,
    LlmConfigService,
    SemanticChunkerService,
    VectorStoreService,
    TopicRegistryService,
  ],
  exports: [RagCorrectionService, FieldMetadataService],
})
export class RagCorrectionModule {}
