import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmConfigService } from './config/llm-config.service';
import { LlmClientService } from './llm-client.service';
import { LlmParserService } from './llm-parser.service';
import { LlmParserResolver } from './llm-parser.resolver';
import { CompletenessCheckerService } from './completeness-checker.service';
import { ChunkingStrategyService } from './chunking-strategy.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { RagEnhancedParserService } from './rag-enhanced-parser.service';
import { ConcurrentParserService } from './concurrent-parser.service';
import { OptimizedParserService } from './optimized-parser.service';
import { ParserModule } from '../parser/parser.module';

@Module({
  imports: [ConfigModule, ParserModule],
  providers: [
    LlmConfigService,
    LlmClientService,
    LlmParserService,
    LlmParserResolver,
    CompletenessCheckerService,
    ChunkingStrategyService,
    // 新增的优化服务
    SemanticChunkerService,
    RagEnhancedParserService,
    ConcurrentParserService,
    OptimizedParserService,
  ],
  exports: [
    LlmConfigService,
    LlmClientService,
    LlmParserService,
    CompletenessCheckerService,
    SemanticChunkerService,
    RagEnhancedParserService,
    ConcurrentParserService,
    OptimizedParserService,
  ],
})
export class LlmParserModule {}
