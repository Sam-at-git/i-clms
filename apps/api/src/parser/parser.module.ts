import { Module } from '@nestjs/common';
import { StorageModule } from '../storage';
import { ParserService } from './parser.service';
import { ParserResolver } from './parser.resolver';
import { PdfExtractor } from './extractors/pdf.extractor';
import { WordExtractor } from './extractors/word.extractor';
import { FieldExtractor } from './extractors/field.extractor';

@Module({
  imports: [StorageModule],
  providers: [
    ParserService,
    ParserResolver,
    PdfExtractor,
    WordExtractor,
    FieldExtractor,
  ],
  exports: [ParserService],
})
export class ParserModule {}
