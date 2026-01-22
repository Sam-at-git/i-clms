import { Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigResolver } from './system-config.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmParserModule } from '../llm-parser/llm-parser.module';

@Module({
  imports: [PrismaModule, LlmParserModule],
  providers: [SystemConfigService, SystemConfigResolver],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
