import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmConfigService } from './config/llm-config.service';
import { LlmClientService } from './llm-client.service';
import { LlmParserService } from './llm-parser.service';
import { LlmParserResolver } from './llm-parser.resolver';
import { CompletenessCheckerService } from './completeness-checker.service';
import { ChunkingStrategyService } from './chunking-strategy.service';
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
  ],
  exports: [LlmConfigService, LlmClientService, LlmParserService, CompletenessCheckerService],
})
export class LlmParserModule {}
