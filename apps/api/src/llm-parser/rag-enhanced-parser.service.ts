import { Injectable, Logger } from '@nestjs/common';
import { SemanticChunkerService, SemanticChunk } from './semantic-chunker.service';
import { LlmConfigService } from './config/llm-config.service';
import OpenAI from 'openai';

/**
 * 向量嵌入结果
 */
interface EmbeddingResult {
  chunk: SemanticChunk;
  embedding: number[];
}

/**
 * 字段查询计划
 */
interface FieldExtractionPlan {
  field: string;
  relevantChunks: SemanticChunk[];
  strategy: 'direct' | 'llm' | 'hybrid';
  confidence: number;
}

/**
 * RAG增强的合同解析服务
 *
 * 核心思路：
 * 1. 使用语义分段将合同分成有意义的chunks
 * 2. 对每个chunk计算与目标字段的相似度
 * 3. 只将最相关的chunks发送给LLM
 * 4. 支持并发处理多个字段
 */
@Injectable()
export class RagEnhancedParserService {
  private readonly logger = new Logger(RagEnhancedParserService.name);
  private openai: OpenAI | null = null;

  // 字段关键词向量（简化的TF-IDF替代方案）
  private readonly FIELD_KEYWORDS: Record<string, string[]> = {
    // 基本信息字段
    contractNo: ['合同编号', '合同号', '协议编号', '编号：', 'No.', 'contract No'],
    name: ['合同名称', '项目名称', '协议名称', '名称：'],
    customerName: ['甲方', '委托方', '发包方', '买方', '客户', 'Party A'],
    ourEntity: ['乙方', '受托方', '承包方', '卖方', 'Party B'],
    contractType: ['合同类型', '人力框架', '项目外包', '产品购销', '服务协议'],

    // 财务字段
    amountWithTax: ['含税金额', '合同总价', '总价款', '含税价', '总计'],
    amountWithoutTax: ['不含税金额', '不含税价', '未税金额'],
    taxRate: ['税率', '增值税率', '税金'],
    paymentTerms: ['付款条件', '支付期限', '结算方式', '付款节点'],
    paymentMethod: ['付款方式', '支付方式', '银行转账', '现金', '支票'],
    currency: ['币种', '货币', '人民币', '美元', 'CNY', 'USD'],

    // 时间字段
    signedAt: ['签订日期', '签署日期', '签字日期', '签订时间'],
    effectiveAt: ['生效日期', '开始日期', '起始日期', '自'],
    expiresAt: ['到期日期', '终止日期', '截止日期', '有效期至', '至'],
    duration: ['合同期限', '履行期限', '有效期', '期限'],

    // 其他字段
    salesPerson: ['销售负责人', '业务代表', '项目经理', '联系人'],
    industry: ['所属行业', '行业'],
    signLocation: ['签订地点', '签署地点', '签订地'],
  };

  constructor(
    private semanticChunker: SemanticChunkerService,
    private configService: LlmConfigService,
  ) {
    this.refreshClient();
  }

  /**
   * 刷新OpenAI客户端
   */
  refreshClient() {
    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
  }

  /**
   * 主方法：使用RAG策略解析合同
   *
   * @param text 合同全文
   * @param targetFields 需要提取的字段列表
   * @param maxChunksPerField 每个字段最多使用多少个chunk
   * @returns 提取结果
   */
  async parseWithRag(
    text: string,
    targetFields: string[],
    maxChunksPerField = 3
  ): Promise<Record<string, any>> {
    const startTime = Date.now();

    this.logger.log(`[RAG Parser] Starting: ${text.length} chars, ${targetFields.length} fields`);

    // Step 1: 语义分段
    const chunks = this.semanticChunker.chunkBySemanticStructure(text);
    this.logger.log(`[RAG Parser] Created ${chunks.length} semantic chunks`);

    // Step 2: 计算每个字段的提取计划
    const plans = this.createExtractionPlans(chunks, targetFields, maxChunksPerField);

    this.logger.log(
      `[RAG Parser] Extraction plans:\n` +
      plans.map(p =>
        `  - ${p.field}: ${p.relevantChunks.length} chunks, ` +
        `strategy=${p.strategy}, confidence=${p.confidence}`
      ).join('\n')
    );

    // Step 3: 按策略分组
    const directFields = plans.filter(p => p.strategy === 'direct').map(p => p.field);
    const llmFields = plans.filter(p => p.strategy === 'llm').map(p => p.field);
    const hybridFields = plans.filter(p => p.strategy === 'hybrid').map(p => p.field);

    const result: Record<string, any> = {};

    // Step 4: 直接提取（正则匹配）
    if (directFields.length > 0) {
      const directResults = await this.extractDirect(text, chunks, directFields);
      Object.assign(result, directResults);
    }

    // Step 5: LLM提取（单字段，使用相关chunks）
    if (llmFields.length > 0) {
      const llmResults = await this.extractWithLlm(chunks, llmFields, maxChunksPerField);
      Object.assign(result, llmResults);
    }

    // Step 6: 混合提取（先正则，再用LLM验证）
    if (hybridFields.length > 0) {
      const hybridResults = await this.extractHybrid(text, chunks, hybridFields);
      Object.assign(result, hybridResults);
    }

    const elapsed = Date.now() - startTime;
    this.logger.log(`[RAG Parser] Completed in ${elapsed}ms`);

    return result;
  }

  /**
   * 创建字段提取计划
   */
  private createExtractionPlans(
    chunks: SemanticChunk[],
    targetFields: string[],
    maxChunks: number
  ): FieldExtractionPlan[] {
    return targetFields.map(field => {
      // 计算每个chunk与该字段的相关性
      const scoredChunks = chunks.map(chunk => ({
        chunk,
        score: this.calculateFieldRelevance(chunk, field),
      }));

      // 取top chunks
      const relevantChunks = scoredChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, maxChunks)
        .map(sc => sc.chunk);

      // 决定策略
      const topScore = scoredChunks[0]?.score || 0;
      let strategy: FieldExtractionPlan['strategy'];
      let confidence: number;

      if (topScore > 0.8) {
        strategy = 'direct';
        confidence = topScore;
      } else if (topScore > 0.4) {
        strategy = 'hybrid';
        confidence = topScore;
      } else {
        strategy = 'llm';
        confidence = topScore;
      }

      return {
        field,
        relevantChunks,
        strategy,
        confidence,
      };
    });
  }

  /**
   * 计算chunk与字段的相关性（简化版，不使用向量）
   */
  private calculateFieldRelevance(chunk: SemanticChunk, field: string): number {
    let score = 0;

    // 1. 检查metadata中的fieldRelevance
    if (chunk.metadata.fieldRelevance.includes(field)) {
      score += 0.5;
    }

    // 2. 检查chunk类型与字段的匹配度
    const fieldTypeMap: Record<string, string[]> = {
      header: ['contractNo', 'name', 'customerName', 'ourEntity', 'contractType'],
      financial: ['amountWithTax', 'amountWithoutTax', 'taxRate', 'paymentTerms', 'paymentMethod', 'currency'],
      schedule: ['signedAt', 'effectiveAt', 'expiresAt', 'duration'],
      party: ['customerName', 'ourEntity'],
      signature: ['signedAt', 'signLocation', 'salesPerson'],
    };

    const matchingTypes = fieldTypeMap[chunk.metadata.type] || [];
    if (matchingTypes.includes(field)) {
      score += 0.3;
    }

    // 3. 关键词匹配（TF-IDF简化版）
    const keywords = this.FIELD_KEYWORDS[field] || [];
    const chunkText = chunk.text.toLowerCase();

    for (const keyword of keywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = chunkText.match(regex);
      if (matches) {
        score += Math.min(matches.length * 0.05, 0.2); // 最多贡献0.2分
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * 直接提取（使用正则）
   */
  private async extractDirect(
    text: string,
    chunks: SemanticChunk[],
    fields: string[]
  ): Promise<Record<string, any>> {
    this.logger.log(`[RAG Parser] Direct extraction for: ${fields.join(', ')}`);

    const result: Record<string, any> = {};

    // 这里可以复用现有的 FieldExtractor 逻辑
    // 简化实现：直接从相关chunks中提取
    for (const field of fields) {
      const relevantChunks = this.semanticChunker.getRelevantChunksForFields(chunks, [field]);
      if (relevantChunks.length > 0) {
        // 简单提取：取第一个匹配的值
        result[field] = this.extractFieldFromChunks(field, relevantChunks);
      }
    }

    return result;
  }

  /**
   * 从chunks中提取字段值
   */
  private extractFieldFromChunks(field: string, chunks: SemanticChunk[]): any {
    const keywords = this.FIELD_KEYWORDS[field] || [];

    for (const chunk of chunks) {
      for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[:：]?\\s*([^\\n\\r]{0,100})`, 'i');
        const match = chunk.text.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }

    return null;
  }

  /**
   * LLM提取（使用相关chunks）
   */
  private async extractWithLlm(
    chunks: SemanticChunk[],
    fields: string[],
    maxChunks: number
  ): Promise<Record<string, any>> {
    this.logger.log(`[RAG Parser] LLM extraction for: ${fields.join(', ')}`);

    // 获取所有需要的chunks（去重）
    const allRelevantChunks = this.semanticChunker.getRelevantChunksForFields(chunks, fields);
    const selectedChunks = allRelevantChunks.slice(0, maxChunks);

    // 构建上下文
    const context = selectedChunks
      .map(c => `[${c.metadata.type}${c.metadata.title ? `: ${c.metadata.title}` : ''}]\n${c.text}`)
      .join('\n\n---\n\n');

    // 构建prompt
    const prompt = this.buildLlmPrompt(fields, context);

    try {
      const config = this.configService.getActiveConfig();
      const completion = await this.openai!.chat.completions.create({
        model: config.model,
        temperature: 0.1,
        max_tokens: config.maxTokens,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的合同信息提取助手。请从给定的合同片段中提取指定的字段信息。' +
            '只提取明确存在的信息，如果信息不存在或不确定，设为null。' +
            '日期格式统一为YYYY-MM-DD，金额只保留数字和小数点。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (error) {
      this.logger.error(`[RAG Parser] LLM extraction failed:`, error);
    }

    return {};
  }

  /**
   * 混合提取
   */
  private async extractHybrid(
    text: string,
    chunks: SemanticChunk[],
    fields: string[]
  ): Promise<Record<string, any>> {
    this.logger.log(`[RAG Parser] Hybrid extraction for: ${fields.join(', ')}`);

    // 先尝试直接提取
    const directResults = await this.extractDirect(text, chunks, fields);

    // 对于null或低置信度的结果，使用LLM
    const needsLlm = fields.filter(f => !directResults[f]);
    const llmResults = needsLlm.length > 0
      ? await this.extractWithLlm(chunks, needsLlm, 2)
      : {};

    return { ...directResults, ...llmResults };
  }

  /**
   * 构建LLM prompt
   */
  private buildLlmPrompt(fields: string[], context: string): string {
    return `请从以下合同片段中提取信息：

【需要提取的字段】
${fields.map(f => `- ${f} (${this.getFieldDescription(f)})`).join('\n')}

【合同片段】
${context}

【输出格式】
请以JSON格式输出，字段名为key，提取的值为value：
{
${fields.map(f => `  "${f}": "提取的值或null"`).join(',\n')}
}`;
  }

  /**
   * 获取字段描述
   */
  private getFieldDescription(field: string): string {
    const descriptions: Record<string, string> = {
      contractNo: '合同编号',
      name: '合同名称',
      customerName: '客户名称/甲方',
      ourEntity: '我方主体/乙方',
      contractType: '合同类型',
      amountWithTax: '含税金额',
      amountWithoutTax: '不含税金额',
      taxRate: '税率',
      paymentTerms: '付款条件',
      paymentMethod: '付款方式',
      signedAt: '签订日期',
      effectiveAt: '生效日期',
      expiresAt: '到期日期',
      duration: '合同期限',
      salesPerson: '销售负责人',
      signLocation: '签订地点',
    };
    return descriptions[field] || field;
  }
}
