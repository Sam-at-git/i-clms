import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ParserService } from './parser.service';
import { ParseResult, ExtractedFields } from './dto';

@Resolver()
export class ParserResolver {
  constructor(private readonly parserService: ParserService) {}

  @Query(() => ParseResult, {
    description: 'Parse a document from storage and extract text content',
  })
  async parseDocument(
    @Args('objectName') objectName: string
  ): Promise<ParseResult> {
    return this.parserService.parseDocument(objectName);
  }

  @Mutation(() => ParseResult, {
    description: 'Parse a document and extract contract fields',
  })
  async parseAndExtract(
    @Args('objectName') objectName: string
  ): Promise<ParseResult> {
    return this.parserService.parseDocument(objectName);
  }

  @Query(() => ExtractedFields, {
    description: 'Extract contract fields from provided text',
  })
  extractFieldsFromText(@Args('text') text: string): ExtractedFields {
    return this.parserService.extractFields(text);
  }
}
