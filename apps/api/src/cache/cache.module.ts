import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';
import { DocumentFingerprintService } from './document-fingerprint.service';
import { EmbeddingCacheService } from './embedding-cache.service';
import { LlmResultCacheService } from './llm-result-cache.service';
import { CacheResolver } from './cache.resolver';
import { PrismaModule } from '../prisma';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [PrismaModule, VectorStoreModule],
  providers: [
    MemoryCacheStrategy,
    DocumentFingerprintService,
    EmbeddingCacheService,
    LlmResultCacheService,
    CacheService,
    CacheResolver,
  ],
  exports: [
    MemoryCacheStrategy,
    DocumentFingerprintService,
    EmbeddingCacheService,
    LlmResultCacheService,
    CacheService,
  ],
})
export class CacheModule {}
