import { Module, forwardRef } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigResolver } from './system-config.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmParserModule } from '../llm-parser/llm-parser.module';
import { RAGModule } from '../rag/rag.module';

@Module({
  imports: [PrismaModule, forwardRef(() => LlmParserModule), RAGModule],
  providers: [SystemConfigService, SystemConfigResolver],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
