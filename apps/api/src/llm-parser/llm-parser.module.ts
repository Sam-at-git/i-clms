import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmConfigService } from './config/llm-config.service';
import { LlmClientService } from './llm-client.service';
import { LlmParserService } from './llm-parser.service';
import { LlmParserResolver } from './llm-parser.resolver';
import { CompletenessCheckerService } from './completeness-checker.service';
import { ChunkingStrategyService } from './chunking-strategy.service';
import { SemanticChunkerService } from './semantic-chunker.service';
import { RagEnhancedParserService } from './rag-enhanced-parser.service';
import { ConcurrentParserService } from './concurrent-parser.service';
import { OptimizedParserService } from './optimized-parser.service';
import { ParseProgressService } from './parse-progress.service';
import { TaskBasedParserService } from './task-based-parser.service';
import { TopicRegistryService } from './topics/topic-registry.service';
import { DoclingStrategyService } from './strategies/docling-strategy.service';
import { DoclingParseStrategy } from './strategies/docling-parse.strategy';
import { ComprehensiveLLMStrategy } from './strategies/comprehensive-llm.strategy';
import { StrategyManagerService } from './strategies/strategy-manager.service';
import { ParseStrategyService } from './parse-strategy.service';
import { VotingService } from './voting.service';
import { LLMEvaluatorService } from './evaluation/llm-evaluator.service';
import { MultiStrategyService } from './multi-strategy.service';
import { ContractTypeDetectorService } from './contract-type-detector.service';
import { RuleEnhancedParserService } from './rule-enhanced-parser.service';
import { ResultValidatorService } from './result-validator.service';
import { ParserModule } from '../parser/parser.module';
import { DoclingModule } from '../docling/docling.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { CacheModule } from '../cache/cache.module';
import { RAGModule } from '../rag/rag.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ParserModule),
    forwardRef(() => DoclingModule),
    VectorStoreModule,
    CacheModule,
    RAGModule,
  ],
  providers: [
    LlmConfigService,
    LlmClientService,
    LlmParserService,
    LlmParserResolver,
    CompletenessCheckerService,
    ChunkingStrategyService,
    // 新增的优化服务
    SemanticChunkerService,
    RagEnhancedParserService,
    ConcurrentParserService,
    OptimizedParserService,
    TaskBasedParserService,
    // 进度追踪服务
    ParseProgressService,
    // 主题注册服务
    TopicRegistryService,
    // Docling策略服务
    DoclingStrategyService,
    // 策略执行器 (SPEC-25)
    DoclingParseStrategy,
    ComprehensiveLLMStrategy,  // 综合LLM策略 (Docling + SemanticChunker + LLM)
    StrategyManagerService,
    // 策略选择服务 (SPEC-28)
    ParseStrategyService,
    // 投票和LLM评估服务 (SPEC-29)
    VotingService,
    LLMEvaluatorService,
    MultiStrategyService,
    // 合同类型检测服务
    ContractTypeDetectorService,
    // 规则增强解析服务
    RuleEnhancedParserService,
    // 结果验证与重试服务
    ResultValidatorService,
  ],
  exports: [
    LlmConfigService,
    LlmClientService,
    LlmParserService,
    CompletenessCheckerService,
    SemanticChunkerService,
    RagEnhancedParserService,
    ConcurrentParserService,
    OptimizedParserService,
    TaskBasedParserService,
    ParseProgressService,
    TopicRegistryService,
    DoclingStrategyService,
    DoclingParseStrategy,
    ComprehensiveLLMStrategy,  // 综合LLM策略
    StrategyManagerService,
    ParseStrategyService,
    VotingService,
    LLMEvaluatorService,
    MultiStrategyService,
    ContractTypeDetectorService,
    RuleEnhancedParserService,
    ResultValidatorService,
  ],
})
export class LlmParserModule {}
