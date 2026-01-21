import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { Logger, UseGuards } from '@nestjs/common';
import { GraphQLJSONObject } from 'graphql-scalars';
import { LlmParserService } from './llm-parser.service';
import { CompletenessCheckerService } from './completeness-checker.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { OptimizedParserService } from './optimized-parser.service';
import { LlmParseResult } from './dto/llm-parse-result.dto';
import { ParseWithLlmInput } from './dto/parse-with-llm.input';
import {
  OptimizedParseResult,
  SemanticChunkResult,
  SemanticChunkInfo,
} from './dto/optimized-parse-result.dto';
import {
  ParseWithOptimizedInput,
  SemanticChunkInput,
  RagParseInput,
  ConcurrentParseInput,
  ParseMode,
} from './dto/parse-optimized.input';
import { CompletenessScore } from './entities/completeness-score.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

@Resolver()
export class LlmParserResolver {
  private readonly logger = new Logger(LlmParserResolver.name);

  constructor(
    private readonly llmParserService: LlmParserService,
    private readonly completenessChecker: CompletenessCheckerService,
    private readonly semanticChunker: SemanticChunkerService,
    private readonly optimizedParser: OptimizedParserService,
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

  // ========== 新增的优化解析 API ==========

  @Mutation(() => OptimizedParseResult, {
    description: '使用优化策略解析合同 - 自动选择最佳解析模式（语义分段/RAG/并发）',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithOptimized(
    @Args('input') input: ParseWithOptimizedInput,
  ): Promise<OptimizedParseResult> {
    this.logger.log(
      `[Optimized Parse] mode=${input.mode}, ` +
      `textLength=${input.textContent.length}, ` +
      `fields=${input.targetFields?.length || 'all'}`
    );

    return this.optimizedParser.parseOptimized(
      input.textContent,
      input.mode,
      input.targetFields,
      {
        forceStrategy: input.forceStrategy,
        maxConcurrent: input.maxConcurrent,
        maxChunksPerField: input.maxChunksPerField,
      }
    );
  }

  @Mutation(() => SemanticChunkResult, {
    description: '对合同文本进行语义分段 - 返回分段的元数据和位置信息',
  })
  @UseGuards(GqlAuthGuard)
  async chunkTextSemantically(
    @Args('input') input: SemanticChunkInput,
  ): Promise<SemanticChunkResult> {
    this.logger.log(
      `[Semantic Chunking] textLength=${input.text.length}, ` +
      `minChunkSize=${input.minChunkSize || 500}`
    );

    const result = this.semanticChunker.chunkText(
      input.text,
      input.minChunkSize
    );

    return {
      success: result.success,
      chunks: result.chunks,
      totalLength: result.totalLength,
      strategy: result.strategy,
      summary: result.summary,
    };
  }

  @Query(() => [SemanticChunkInfo], {
    description: '获取语义分段的示例（用于调试和测试）',
  })
  @UseGuards(GqlAuthGuard)
  async getSemanticChunkExample(
    @Args('text', { type: () => String }) text: string,
  ): Promise<SemanticChunkInfo[]> {
    const chunks = this.semanticChunker.chunkBySemanticStructure(text, 500);
    return chunks.map(chunk => ({
      id: chunk.id,
      type: chunk.metadata.type,
      title: chunk.metadata.title,
      articleNumber: chunk.metadata.articleNumber,
      priority: chunk.metadata.priority,
      fieldRelevance: chunk.metadata.fieldRelevance,
      length: chunk.text.length,
      startIndex: chunk.position.start,
      endIndex: chunk.position.end,
      pageHint: chunk.position.pageHint,
    }));
  }

  @Mutation(() => OptimizedParseResult, {
    description: '使用语义分段模式解析合同 - 适合中等大小合同',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithSemantic(
    @Args('text', { type: () => String }) text: string,
    @Args('fields', { type: () => [String], nullable: true }) fields?: string[],
  ): Promise<OptimizedParseResult> {
    return this.optimizedParser.parseOptimized(text, ParseMode.SEMANTIC, fields);
  }

  @Mutation(() => OptimizedParseResult, {
    description: '使用RAG模式解析合同 - 只提取相关字段相关的内容，减少token消耗',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithRag(
    @Args('input') input: RagParseInput,
  ): Promise<OptimizedParseResult> {
    return this.optimizedParser.parseOptimized(
      input.text,
      ParseMode.RAG,
      input.fields,
      { maxChunksPerField: input.maxChunksPerField }
    );
  }

  @Mutation(() => OptimizedParseResult, {
    description: '使用并发模式解析合同 - Map-Reduce模式，适合大合同，大幅提升速度',
  })
  @UseGuards(GqlAuthGuard)
  async parseWithConcurrent(
    @Args('input') input: ConcurrentParseInput,
  ): Promise<OptimizedParseResult> {
    return this.optimizedParser.parseOptimized(
      input.text,
      ParseMode.CONCURRENT,
      input.fields,
      { maxConcurrent: input.maxConcurrent }
    );
  }
}
