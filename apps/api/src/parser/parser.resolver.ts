import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ParserService } from './parser.service';
import { ParseResult, ExtractedFields } from './dto';
import { FieldExtractorService } from './extractors/field-extractor.service';
import { BasicExtractedFieldsType } from './entities/basic-extracted-fields.entity';

@Resolver()
export class ParserResolver {
  constructor(
    private readonly parserService: ParserService,
    private readonly fieldExtractorService: FieldExtractorService,
  ) {}

  @Query(() => ParseResult, {
    description: 'Parse a document from storage and extract text content',
  })
  async parseDocument(
    @Args('objectName') objectName: string,
  ): Promise<ParseResult> {
    return this.parserService.parseDocument(objectName);
  }

  @Mutation(() => ParseResult, {
    description: 'Parse a document and extract contract fields',
  })
  async parseAndExtract(
    @Args('objectName') objectName: string,
  ): Promise<ParseResult> {
    return this.parserService.parseDocument(objectName);
  }

  @Query(() => ExtractedFields, {
    description: 'Extract contract fields from provided text',
  })
  extractFieldsFromText(@Args('text') text: string): ExtractedFields {
    return this.parserService.extractFields(text);
  }

  @Query(() => BasicExtractedFieldsType, {
    description:
      'Extract basic contract fields (identification, parties, term) from text',
  })
  extractBasicFields(
    @Args('textContent') textContent: string,
  ): BasicExtractedFieldsType {
    return this.fieldExtractorService.extractBasicFields(
      textContent,
    ) as unknown as BasicExtractedFieldsType;
  }
}
