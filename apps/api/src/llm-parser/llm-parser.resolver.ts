import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { LlmParserService } from './llm-parser.service';
import { LlmParseResult } from './dto/llm-parse-result.dto';

@Resolver()
export class LlmParserResolver {
  private readonly logger = new Logger(LlmParserResolver.name);

  constructor(private llmParserService: LlmParserService) {}

  @Mutation(() => LlmParseResult)
  async parseContractWithLlm(
    @Args('objectName') objectName: string,
  ): Promise<LlmParseResult> {
    this.logger.log(`Received request to parse contract: ${objectName}`);
    return this.llmParserService.parseContractWithLlm(objectName);
  }
}
