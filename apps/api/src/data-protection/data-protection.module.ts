import { Module } from '@nestjs/common';
import { DataProtectionService } from './data-protection.service';
import { DataProtectionResolver } from './data-protection.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { LlmParserModule } from '../llm-parser/llm-parser.module';

@Module({
  imports: [PrismaModule, LlmParserModule],
  providers: [DataProtectionService, DataProtectionResolver, LlmConfigService],
  exports: [DataProtectionService],
})
export class DataProtectionModule {}
