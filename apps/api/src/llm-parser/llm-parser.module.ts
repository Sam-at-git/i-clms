import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmConfigService } from './config/llm-config.service';
import { LlmParserService } from './llm-parser.service';
import { LlmParserResolver } from './llm-parser.resolver';
import { ParserModule } from '../parser/parser.module';

@Module({
  imports: [ConfigModule, ParserModule],
  providers: [LlmConfigService, LlmParserService, LlmParserResolver],
  exports: [LlmConfigService, LlmParserService],
})
export class LlmParserModule {}
