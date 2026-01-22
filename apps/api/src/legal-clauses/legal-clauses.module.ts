import { Module } from '@nestjs/common';
import { LegalClausesService } from './legal-clauses.service';
import { LegalClausesResolver } from './legal-clauses.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { LlmParserModule } from '../llm-parser/llm-parser.module';

@Module({
  imports: [PrismaModule, LlmParserModule],
  providers: [LegalClausesService, LegalClausesResolver, LlmConfigService],
  exports: [LegalClausesService],
})
export class LegalClausesModule {}
