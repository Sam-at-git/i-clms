import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmConfigService } from './config/llm-config.service';
import { DoclingService } from '../docling/docling.service';
import { RAGService } from '../rag/rag.service';
import {
  ParseStrategyType,
  StrategyInfo,
  StrategyCost,
  ParseStrategyConfig,
  StrategyTestResult,
} from './dto/parse-strategy.dto';

/**
 * Parse Strategy Service
 *
 * Manages parsing strategies, their availability, and configuration.
 * Provides strategy information for the UI strategy selector.
 *
 * @see Spec 28 - Strategy Selector UI
 */
@Injectable()
export class ParseStrategyService implements OnModuleInit {
  private readonly logger = new Logger(ParseStrategyService.name);
  private config: ParseStrategyConfig;

  // Default strategy configuration
  private readonly defaultConfig: ParseStrategyConfig = {
    defaultStrategy: ParseStrategyType.LLM,
    enabledStrategies: [
      ParseStrategyType.RULE,
      ParseStrategyType.LLM,
    ],
    autoMultiStrategy: false,
    multiStrategyThreshold: 70,
    multiStrategyVoters: [ParseStrategyType.RULE, ParseStrategyType.LLM],
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly llmConfigService: LlmConfigService,
    private readonly doclingService: DoclingService,
    private readonly ragService: RAGService,
  ) {
    this.config = { ...this.defaultConfig };
  }

  async onModuleInit(): Promise<void> {
    // Load configuration from environment variables if set
    const defaultStrategy = this.configService.get<ParseStrategyType>('DEFAULT_PARSE_STRATEGY');
    if (defaultStrategy && Object.values(ParseStrategyType).includes(defaultStrategy)) {
      this.config.defaultStrategy = defaultStrategy;
    }

    this.logger.log(
      `ParseStrategyService initialized with default strategy: ${this.config.defaultStrategy}`,
    );
  }

  /**
   * Get all available strategies with their information
   */
  async getAvailableStrategies(): Promise<StrategyInfo[]> {
    const strategies: StrategyInfo[] = [];

    // Check each strategy availability in parallel
    const [ruleAvailable, llmAvailable, doclingAvailable, ragAvailable] = await Promise.all([
      this.checkRuleStrategy(),
      this.checkLLMStrategy(),
      this.checkDoclingStrategy(),
      this.checkRAGStrategy(),
    ]);

    strategies.push({
      type: ParseStrategyType.RULE,
      name: '规则解析',
      description: '基于正则表达式的快速解析，适合格式规范的合同',
      features: ['极速解析', '零成本', '支持标准格式', '可配置规则'],
      pros: ['最快（秒级）', '完全免费', '可定制规则'],
      cons: ['仅支持固定格式', '准确率依赖模板'],
      available: ruleAvailable,
      averageTime: 1,
      accuracy: 70,
      cost: StrategyCost.FREE,
    });

    strategies.push({
      type: ParseStrategyType.LLM,
      name: 'LLM智能解析',
      description: '使用大语言模型进行智能提取，适合复杂合同',
      features: ['深度理解', '格式灵活', '任务化解析', '进度跟踪'],
      pros: ['准确率高', '支持各种格式', '语义理解'],
      cons: ['需要LLM服务', '有API成本', '速度较慢'],
      available: llmAvailable.available,
      averageTime: 30,
      accuracy: 90,
      cost: llmAvailable.cost,
      errorMessage: llmAvailable.error,
    });

    strategies.push({
      type: ParseStrategyType.DOCLING,
      name: 'Docling解析',
      description: '使用IBM Docling进行文档解析，支持复杂表格',
      features: ['表格提取', 'OCR支持', '布局保留', 'Markdown输出'],
      pros: ['表格识别强', '支持扫描件', '格式保留好'],
      cons: ['需要Python环境', '首次使用需安装', '处理较慢'],
      available: doclingAvailable,
      averageTime: 15,
      accuracy: 85,
      cost: StrategyCost.FREE,
    });

    strategies.push({
      type: ParseStrategyType.RAG,
      name: 'RAG向量检索',
      description: '基于向量语义搜索的精准提取',
      features: ['语义搜索', '精准匹配', '上下文理解', '可索引历史'],
      pros: ['语义理解强', '可复用知识', '适合特定字段'],
      cons: ['需要向量数据库', '需要Embedding模型', '首次索引慢'],
      available: ragAvailable.available,
      averageTime: 10,
      accuracy: 88,
      cost: ragAvailable.cost,
    });

    // Multi-strategy is available if at least 2 other strategies are available
    const availableCount = [ruleAvailable, llmAvailable.available, doclingAvailable, ragAvailable.available].filter(
      Boolean,
    ).length;
    const multiAvailable = availableCount >= 2;

    strategies.push({
      type: ParseStrategyType.MULTI,
      name: '多策略交叉验证',
      description: '使用多种策略解析并投票，最准确的结果',
      features: ['交叉验证', '投票机制', '一致性检测', '高可靠性'],
      pros: ['准确率最高', '可靠性强', '错误检测'],
      cons: ['耗时最长', '成本最高', '需要多种策略'],
      available: multiAvailable,
      averageTime: 60,
      accuracy: 95,
      cost: StrategyCost.HIGH,
    });

    return strategies;
  }

  /**
   * Get current strategy configuration
   */
  getStrategyConfig(): ParseStrategyConfig {
    return { ...this.config };
  }

  /**
   * Update strategy configuration
   */
  updateStrategyConfig(updates: Partial<ParseStrategyConfig>): ParseStrategyConfig {
    // Validate default strategy is in enabled strategies
    if (updates.defaultStrategy && updates.enabledStrategies) {
      if (!updates.enabledStrategies.includes(updates.defaultStrategy)) {
        throw new Error('Default strategy must be in enabled strategies');
      }
    }

    // Validate multi-strategy threshold
    if (updates.multiStrategyThreshold !== undefined) {
      if (updates.multiStrategyThreshold < 0 || updates.multiStrategyThreshold > 100) {
        throw new Error('Multi-strategy threshold must be between 0 and 100');
      }
    }

    // Validate multi-strategy voters
    if (updates.multiStrategyVoters) {
      if (updates.multiStrategyVoters.length < 2) {
        throw new Error('At least 2 strategies required for multi-strategy voting');
      }
      if (updates.multiStrategyVoters.includes(ParseStrategyType.MULTI)) {
        throw new Error('MULTI strategy cannot be a voter');
      }
    }

    // Apply updates
    this.config = { ...this.config, ...updates };

    this.logger.log(`Strategy configuration updated: ${JSON.stringify(this.config)}`);

    return this.getStrategyConfig();
  }

  /**
   * Test availability of a specific strategy
   */
  async testStrategyAvailability(strategy: ParseStrategyType): Promise<StrategyTestResult> {
    const startTime = Date.now();

    try {
      let available = false;
      let message = '';

      switch (strategy) {
        case ParseStrategyType.RULE:
          available = await this.checkRuleStrategy();
          message = available ? 'Rule-based parsing available' : 'Rule-based parsing not available';
          break;

        case ParseStrategyType.LLM:
          const llmResult = await this.checkLLMStrategyDetailed();
          available = llmResult.available;
          message = llmResult.message;
          break;

        case ParseStrategyType.DOCLING:
          available = this.doclingService.isAvailable();
          const version = await this.doclingService.getVersion();
          message = available
            ? `Docling available (v${version || 'unknown'})`
            : 'Docling not available (Python/docling not installed)';
          break;

        case ParseStrategyType.RAG:
          available = this.ragService.isAvailable();
          const ragConfig = this.ragService.getCurrentConfig();
          message = available
            ? `RAG available (${ragConfig?.name || 'unknown'})`
            : 'RAG not available (no embedding model configured)';
          break;

        case ParseStrategyType.MULTI:
          // Check if at least 2 strategies are available
          const strategies = await this.getAvailableStrategies();
          const availableCount = strategies.filter(s => s.available && s.type !== ParseStrategyType.MULTI)
            .length;
          available = availableCount >= 2;
          message = available
            ? `Multi-strategy available (${availableCount} strategies ready)`
            : 'Multi-strategy not available (need at least 2 other strategies)';
          break;

        default:
          message = `Unknown strategy: ${strategy}`;
      }

      return {
        strategy,
        available,
        message,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        strategy,
        available: false,
        message: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Test all strategies
   */
  async testAllStrategies(): Promise<StrategyTestResult[]> {
    const results = await Promise.all(
      Object.values(ParseStrategyType).map(strategy => this.testStrategyAvailability(strategy)),
    );
    return results;
  }

  /**
   * Check if rule-based strategy is available
   */
  private async checkRuleStrategy(): Promise<boolean> {
    // Rule-based parsing is always available (it's built-in)
    return true;
  }

  /**
   * Check if LLM strategy is available
   */
  private async checkLLMStrategy(): Promise<{ available: boolean; cost: StrategyCost; error?: string }> {
    try {
      const config = this.llmConfigService.getActiveConfig();
      const provider = this.llmConfigService.getProviderName();

      // Determine cost based on provider
      let cost = StrategyCost.LOW;
      if (provider === 'ollama') {
        cost = StrategyCost.FREE;
      } else if (provider === 'openai') {
        cost = StrategyCost.MEDIUM;
      }

      return { available: true, cost };
    } catch (error) {
      return {
        available: false,
        cost: StrategyCost.LOW,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if LLM strategy is available (detailed)
   */
  private async checkLLMStrategyDetailed(): Promise<{ available: boolean; message: string }> {
    try {
      const config = this.llmConfigService.getActiveConfig();
      const provider = this.llmConfigService.getProviderName();

      return {
        available: true,
        message: `LLM available (${provider} - ${config.model})`,
      };
    } catch (error) {
      return {
        available: false,
        message: `LLM not available: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if Docling strategy is available
   */
  private async checkDoclingStrategy(): Promise<boolean> {
    return this.doclingService.isAvailable();
  }

  /**
   * Check if RAG strategy is available
   */
  private async checkRAGStrategy(): Promise<{ available: boolean; cost: StrategyCost }> {
    const available = this.ragService.isAvailable();
    let cost = StrategyCost.LOW;

    // Check embedding provider to determine cost
    if (available) {
      const config = this.ragService.getCurrentConfig();
      if (config?.config.provider === 'ollama') {
        cost = StrategyCost.FREE;
      } else if (config?.config.provider === 'openai') {
        cost = StrategyCost.LOW;
      }
    }

    return { available, cost };
  }
}
