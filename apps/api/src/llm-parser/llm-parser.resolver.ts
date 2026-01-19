import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { GraphQLJSONObject } from 'graphql-scalars';
import { LlmParserService } from './llm-parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { LlmParseResult } from './dto/llm-parse-result.dto';
import { ParseWithLlmInput } from './dto/parse-with-llm.input';
import { CompletenessScore } from './entities/completeness-score.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

@Resolver()
export class LlmParserResolver {
  private readonly logger = new Logger(LlmParserResolver.name);

  constructor(
    private readonly llmParserService: LlmParserService,
    private readonly completenessChecker: CompletenessCheckerService,
  ) {}

  @Query(() => CompletenessScore, {
    description: 'Calculate completeness score for extracted fields',
  })
  @UseGuards(GqlAuthGuard)
  calculateCompleteness(
    @Args('extractedFields', { type: () => GraphQLJSONObject })
    extractedFields: Record<string, unknown>,
  ): CompletenessScore {
    this.logger.log('Calculating completeness score for provided fields');
    return this.completenessChecker.calculateScore(extractedFields);
  }

  @Mutation(() => LlmParseResult, {
    description: 'Parse contract text with mixed strategy (programmatic + LLM)',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithLlm(
    @Args('input') input: ParseWithLlmInput,
  ): Promise<LlmParseResult> {
    this.logger.log(
      `Parsing with LLM: contractId=${input.contractId}, ` +
        `textLength=${input.textContent.length}, ` +
        `forceStrategy=${input.forceStrategy || 'auto'}`,
    );

    return this.llmParserService.parseWithMixedStrategy(
      input.textContent,
      input.programmaticResult,
      input.forceStrategy,
    );
  }

  @Mutation(() => LlmParseResult, {
    description: 'Parse contract from uploaded file with hybrid strategy',
  })
  @UseGuards(GqlAuthGuard)
  async parseContractWithLlm(
    @Args('objectName') objectName: string,
  ): Promise<LlmParseResult> {
    this.logger.log(`Received request to parse contract: ${objectName}`);
    return this.llmParserService.parseContractWithLlm(objectName);
  }
}
