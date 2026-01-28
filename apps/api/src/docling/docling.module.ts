import { Module, forwardRef } from '@nestjs/common';
import { DoclingService } from './docling.service';
import { DoclingResolver } from './docling.resolver';
import { OcrCleanupService } from './ocr-cleanup.service';
import { ConfigModule } from '@nestjs/config';
import { SystemConfigModule } from '../system-config/system-config.module';
import { StorageModule } from '../storage/storage.module';
import { LlmParserModule } from '../llm-parser/llm-parser.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => SystemConfigModule),
    forwardRef(() => StorageModule),
    forwardRef(() => LlmParserModule),
    PrismaModule,
  ],
  providers: [DoclingService, DoclingResolver, OcrCleanupService],
  exports: [DoclingService, OcrCleanupService],
})
export class DoclingModule {}
