import { Module } from '@nestjs/common';
import { StorageModule } from '../storage';
import { ParserService } from './parser.service';
import { ParserResolver } from './parser.resolver';
import { PdfExtractor } from './extractors/pdf.extractor';
import { WordExtractor } from './extractors/word.extractor';
import { FieldExtractor } from './extractors/field.extractor';
import { FieldExtractorService } from './extractors/field-extractor.service';
import { IdentificationExtractor } from './extractors/basic/identification.extractor';
import { PartiesExtractor } from './extractors/basic/parties.extractor';
import { TermExtractor } from './extractors/basic/term.extractor';

@Module({
  imports: [StorageModule],
  providers: [
    ParserService,
    ParserResolver,
    PdfExtractor,
    WordExtractor,
    FieldExtractor,
    // Basic extractors (Spec 19)
    IdentificationExtractor,
    PartiesExtractor,
    TermExtractor,
    FieldExtractorService,
  ],
  exports: [ParserService, FieldExtractorService],
})
export class ParserModule {}
