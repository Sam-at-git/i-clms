import { Module } from '@nestjs/common';
import { CaseStudyService } from './case-study.service';
import { CaseStudyResolver } from './case-study.resolver';
import { LlmParserModule } from '../llm-parser/llm-parser.module';

@Module({
  imports: [LlmParserModule],
  providers: [CaseStudyService, CaseStudyResolver],
  exports: [CaseStudyService],
})
export class CaseStudyModule {}
