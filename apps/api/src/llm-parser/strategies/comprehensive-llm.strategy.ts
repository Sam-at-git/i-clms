import { Injectable, Logger } from '@nestjs/common';
import { DoclingService, DoclingConvertResult } from '../../docling/docling.service';
import { SemanticChunkerService, SemanticChunk } from '../semantic-chunker.service';
import { LlmClientService } from '../llm-client.service';
import { TopicRegistryService } from '../topics/topic-registry.service';
import { ExtractTopic, EXTRACT_TOPICS } from '../topics/topics.const';
import {
  ParseStrategyExecutor,
  ParseStrategy,
  ParseOptions,
  ParseResult,
} from './parse-strategy.interface';

/**
 * Table data extracted from Markdown tables
 */
interface ExtractedTableData {
  milestones?: Array<{ name: string; amount?: string; paymentPercentage?: string; plannedDate?: string }>;
  rateItems?: Array<{ role: string; rate?: string; rateType?: string }>;
  lineItems?: Array<{ productName: string; quantity?: number; unit?: string; unitPriceWithTax?: string }>;
}

/**
 * Topic extraction result
 */
interface TopicExtractionResult {
  topic: ExtractTopic;
  fields: Record<string, unknown>;
  confidence: number;
  tablesUsed?: boolean;
}

/**
 * Comprehensive LLM Parse Strategy
 *
 * A hybrid approach combining:
 * 1. Docling for document → Markdown conversion (with OCR support)
 * 2. SemanticChunker for intelligent text segmentation
 * 3. LLM for field extraction (no regex)
 * 4. Topic-based extraction with special table handling
 * 5. Result merging and finalization
 *
 * @see Spec - LLM Comprehensive Strategy
 */
@Injectable()
export class ComprehensiveLLMStrategy implements ParseStrategyExecutor {
  readonly name = ParseStrategy.LLM;
  private readonly logger = new Logger(ComprehensiveLLMStrategy.name);

  constructor(
    private readonly doclingService: DoclingService,
    private readonly semanticChunker: SemanticChunkerService,
    private readonly llmClient: LlmClientService,
    private readonly topicRegistry: TopicRegistryService,
  ) {}

  async parse(content: string, options: ParseOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const extractedFields: Record<string, unknown> = {};

    this.logger.log(`[Comprehensive LLM] Starting parse: ${content.length} chars`);

    try {
      // ============================================================
      // Step 1: Convert document to Markdown using Docling
      // ============================================================
      this.logger.log(`[Step 1/5] Converting to Markdown with Docling...`);

      if (!this.doclingService.isAvailable()) {
        return this.unavailableResult('Docling/Python not available');
      }

      // Create temp file for Docling processing
      const tempFilePath = await this.createTempFile(content);
      let doclingResult: DoclingConvertResult;

      try {
        doclingResult = await this.doclingService.convertToMarkdown(tempFilePath, {
          ocr: options.ocr ?? true,
          withTables: true,
          withImages: false,
          preserveHeaders: true,  // 保留章节标题，用于语义分段
        });

        if (!doclingResult.success) {
          throw new Error(doclingResult.error || 'Docling conversion failed');
        }

        this.logger.log(
          `[Step 1/5] Docling complete: ${doclingResult.pages} pages, ` +
          `${doclingResult.tables.length} tables, ${doclingResult.markdown.length} chars`
        );
      } finally {
        await this.cleanupTempFile(tempFilePath);
      }

      // ============================================================
      // Step 2: Semantic Chunking of Markdown
      // ============================================================
      this.logger.log(`[Step 2/5] Performing semantic chunking...`);

      const chunks = this.semanticChunker.chunkBySemanticStructure(doclingResult.markdown);

      this.logger.log(
        `[Step 2/5] Created ${chunks.length} semantic chunks: ` +
        chunks.map(c => `${c.metadata.type}`).join(', ')
      );

      // ============================================================
      // Step 3: Extract basic information using LLM
      // ============================================================
      this.logger.log(`[Step 3/5] Extracting basic information with LLM...`);

      const basicInfo = await this.extractBasicInfoWithLLM(doclingResult.markdown, chunks);
      Object.assign(extractedFields, basicInfo.fields);

      this.logger.log(
        `[Step 3/5] Basic info extracted: ${Object.keys(basicInfo.fields).length} fields, ` +
        `confidence: ${basicInfo.confidence}`
      );

      // ============================================================
      // Step 4: Topic-based extraction with table handling
      // ============================================================
      this.logger.log(`[Step 4/5] Performing topic-based extraction...`);

      // 根据合同类型过滤相关主题，避免解析无关字段
      const contractType = extractedFields.contractType as string;
      const topics = this.getTopicsForContractType(contractType, options.topics);
      this.logger.log(`[Step 4/5] Contract type: ${contractType}, topics: ${topics.join(', ')}`);

      const topicResults: TopicExtractionResult[] = [];

      // Extract table data first (for topics with tables)
      const tableData = this.extractTablesFromDoclingResult(doclingResult.tables);

      for (const topic of topics) {
        const topicResult = await this.extractTopic(
          topic,
          chunks,
          doclingResult.markdown,
          tableData
        );

        if (topicResult) {
          topicResults.push(topicResult);
          Object.assign(extractedFields, topicResult.fields);

          if (topicResult.tablesUsed) {
            this.logger.log(`[Topic ${topic}] Used table data for extraction`);
          }
        }
      }

      this.logger.log(
        `[Step 4/5] Topic extraction complete: ${topicResults.length} topics processed`
      );

      // ============================================================
      // Step 5: Merge results and finalize
      // ============================================================
      this.logger.log(`[Step 5/5] Merging and finalizing results...`);

      // Add table data if extracted
      if (tableData.milestones && tableData.milestones.length > 0) {
        extractedFields.milestones = tableData.milestones;
      }
      if (tableData.rateItems && tableData.rateItems.length > 0) {
        extractedFields.rateItems = tableData.rateItems;
      }
      if (tableData.lineItems && tableData.lineItems.length > 0) {
        extractedFields.lineItems = tableData.lineItems;
      }

      // Calculate completeness and confidence
      const completeness = this.calculateCompleteness(extractedFields, topics);
      const confidence = this.calculateConfidence(extractedFields, topicResults, basicInfo.confidence);

      // Generate warnings
      if (completeness < 70) {
        warnings.push('LLM解析完整性较低，建议人工复核');
      }
      if (doclingResult.pages > 50) {
        warnings.push('文档页数较多，可能需要更长的处理时间');
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[Comprehensive LLM] Parse complete in ${duration}ms: ` +
        `completeness=${completeness}%, confidence=${confidence}%, ` +
        `fields=${Object.keys(extractedFields).length}`
      );

      return {
        strategy: this.name,
        fields: extractedFields,
        completeness,
        confidence,
        warnings,
        duration,
        timestamp: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[Comprehensive LLM] Parse error: ${this.errorMessage(error)}`);

      return {
        strategy: this.name,
        fields: {},
        completeness: 0,
        confidence: 0,
        warnings: [this.errorMessage(error)],
        duration,
        timestamp: new Date(),
      };
    }
  }

  isAvailable(): boolean {
    return this.doclingService.isAvailable();
  }

  getPriority(): number {
    return 0; // Highest priority for comprehensive LLM
  }

  /**
   * Step 3: Extract basic information using LLM
   * Uses full markdown for comprehensive extraction
   */
  private async extractBasicInfoWithLLM(
    markdown: string,
    chunks: SemanticChunk[]
  ): Promise<{ fields: Record<string, unknown>; confidence: number }> {
    const systemPrompt = `你是一个专业的合同信息提取助手。

请从合同Markdown文本中提取基本信息字段。注意：
1. 只提取明确存在的信息，如果信息不存在或不确定，设为null
2. 日期格式统一为YYYY-MM-DD
3. 金额只保留数字和小数点，不要货币符号
4. 合同类型必须是以下三种之一：STAFF_AUGMENTATION（人力框架）、PROJECT_OUTSOURCING（项目外包）、PRODUCT_SALES（产品购销）

请以JSON格式输出。`;

    // Get relevant chunks for basic info (header, party, financial, schedule types)
    const relevantChunks = chunks.filter(c =>
      ['header', 'party', 'financial', 'schedule'].includes(c.metadata.type)
    );

    const relevantText = relevantChunks.map(c => c.text).join('\n\n---\n\n');

    const userPrompt = `请从以下合同文本中提取基本信息：

【合同文本】
${relevantText.substring(0, 15000)}

【需要提取的字段】
请提取以下字段并以JSON格式输出：
{
  "contractNumber": "合同编号",
  "contractName": "合同名称",
  "contractType": "合同类型（STAFF_AUGMENTATION/PROJECT_OUTSOURCING/PRODUCT_SALES）",
  "customerName": "客户名称（甲方）",
  "ourEntity": "我方主体（乙方）",
  "industry": "所属行业",
  "amountWithTax": "含税金额（纯数字）",
  "amountWithoutTax": "不含税金额（纯数字）",
  "taxRate": "税率（纯数字）",
  "currency": "币种",
  "paymentMethod": "付款方式",
  "paymentTerms": "付款条件",
  "signedAt": "签订日期（YYYY-MM-DD格式，如：2024-01-15）",
  "effectiveAt": "生效日期（YYYY-MM-DD格式，如：2024-01-15）",
  "expiresAt": "合同终止日期/到期日期/有效期至（YYYY-MM-DD格式，如：2024-12-31。注意：这是合同结束的日期，不是合同期限）",
  "duration": "合同期限（如：1年、3年等文字描述）"
}

重要提示：
- expiresAt应该是具体的日期（YYYY-MM-DD格式），不是期限描述
- 如果合同中有"有效期至X年X月X日"、"合同期限X年"、"终止日期为X年X月X日"等表述，请提取具体的日期作为expiresAt`;

    try {
      const result = await this.llmClient.complete({
        systemPrompt,
        userContent: userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });

      const fields = JSON.parse(result.content);

      // Map field names to match existing schema
      const mappedFields: Record<string, unknown> = {
        contractNo: fields.contractNumber,
        name: fields.contractName,
        contractType: fields.contractType,
        customerName: fields.customerName,
        ourEntity: fields.ourEntity,
        industry: fields.industry,
        amountWithTax: fields.amountWithTax,
        amountWithoutTax: fields.amountWithoutTax,
        taxRate: fields.taxRate,
        currency: fields.currency,
        paymentMethod: fields.paymentMethod,
        paymentTerms: fields.paymentTerms,
        signedAt: fields.signedAt,
        effectiveAt: fields.effectiveAt,
        expiresAt: fields.expiresAt,
        duration: fields.duration,
      };

      return { fields: mappedFields, confidence: 0.85 };
    } catch (error) {
      this.logger.warn(`Basic info extraction failed: ${this.errorMessage(error)}`);
      return { fields: {}, confidence: 0 };
    }
  }

  /**
   * Step 4: Extract information for a specific topic
   * Uses targeted prompts and special handling for table data
   */
  private async extractTopic(
    topic: ExtractTopic,
    chunks: SemanticChunk[],
    fullMarkdown: string,
    tableData: ExtractedTableData
  ): Promise<TopicExtractionResult | null> {
    const topicDef = EXTRACT_TOPICS.find(t => t.name === topic);
    if (!topicDef) {
      this.logger.warn(`Topic definition not found: ${topic}`);
      return null;
    }

    // Topics with table data - return directly
    if (topic === ExtractTopic.MILESTONES && tableData.milestones && tableData.milestones.length > 0) {
      return {
        topic,
        fields: { milestones: tableData.milestones },
        confidence: 0.9,
        tablesUsed: true,
      };
    }
    if (topic === ExtractTopic.RATE_ITEMS && tableData.rateItems && tableData.rateItems.length > 0) {
      return {
        topic,
        fields: { rateItems: tableData.rateItems },
        confidence: 0.9,
        tablesUsed: true,
      };
    }
    if (topic === ExtractTopic.LINE_ITEMS && tableData.lineItems && tableData.lineItems.length > 0) {
      return {
        topic,
        fields: { lineItems: tableData.lineItems },
        confidence: 0.9,
        tablesUsed: true,
      };
    }

    // Get relevant chunks for this topic
    const relevantChunks = this.getRelevantChunksForTopic(topic, chunks);
    if (relevantChunks.length === 0) {
      this.logger.debug(`No relevant chunks found for topic: ${topic}`);
      return null;
    }

    // Build topic-specific prompt
    const prompt = this.buildTopicPrompt(topic, topicDef, relevantChunks, tableData);

    try {
      const result = await this.llmClient.complete({
        systemPrompt: this.getTopicSystemPrompt(topic),
        userContent: prompt,
        jsonMode: true,
        temperature: 0.1,
      });

      const fields = JSON.parse(result.content);

      return {
        topic,
        fields,
        confidence: 0.8,
      };
    } catch (error) {
      this.logger.warn(`Topic ${topic} extraction failed: ${this.errorMessage(error)}`);
      return null;
    }
  }

  /**
   * Build topic-specific extraction prompt
   */
  private buildTopicPrompt(
    topic: ExtractTopic,
    topicDef: any,
    chunks: SemanticChunk[],
    tableData: ExtractedTableData
  ): string {
    const chunkText = chunks.map(c => c.text).join('\n\n---\n\n');

    let prompt = `请从以下合同文本中提取【${topicDef.displayName}】相关信息：\n\n`;
    prompt += `【合同文本】\n${chunkText.substring(0, 10000)}\n\n`;

    // Add table context if available for this topic
    if (topic === ExtractTopic.MILESTONES && tableData.milestones) {
      prompt += `【已提取的表格数据（供参考）】\n${JSON.stringify(tableData.milestones, null, 2)}\n\n`;
      prompt += `请验证并补充表格数据，如果表格中有遗漏或需要从文本中提取更多里程碑，请补充。\n\n`;
    }

    prompt += `【需要提取的字段】\n`;
    for (const field of topicDef.fields) {
      prompt += `- ${field.name} (${field.description})\n`;
    }

    prompt += `\n【输出格式】\n请以JSON格式输出：\n{\n`;
    const fieldNames = topicDef.fields.map((f: any) => `  "${f.name}": null`).join(',\n');
    prompt += fieldNames + '\n}';

    return prompt;
  }

  /**
   * Get system prompt for specific topic
   */
  private getTopicSystemPrompt(topic: ExtractTopic): string {
    const basePrompt = `你是一个专业的合同信息提取助手。请从合同文本中提取指定主题的信息。
只提取明确存在的信息，如果信息不存在或不确定，设为null。`;

    const topicSpecific: Record<ExtractTopic, string> = {
      [ExtractTopic.BASIC_INFO]: basePrompt,
      [ExtractTopic.FINANCIAL]: basePrompt + ' 金额使用纯数字，不要货币符号。',
      [ExtractTopic.TIME_INFO]: basePrompt + ' 日期格式统一为YYYY-MM-DD。',
      [ExtractTopic.MILESTONES]: basePrompt + ` 里程碑信息非常重要，请仔细提取付款条款中的每个里程碑节点。
每个里程碑应包含：sequence（序号）、name（名称）、amount（金额）、paymentPercentage（付款比例）。
如果有表格数据，请优先使用表格数据。`,
      [ExtractTopic.RATE_ITEMS]: basePrompt + ` 费率信息非常重要，请仔细提取每个角色的费率。
每个费率项应包含：role（角色）、rate（费率金额）、rateType（费率类型：HOURLY/DAILY/MONTHLY）。
如果有表格数据，请优先使用表格数据。`,
      [ExtractTopic.LINE_ITEMS]: basePrompt + ` 产品清单非常重要，请逐条提取每个产品。
每个产品项应包含：productName（产品名称）、quantity（数量）、unit（单位）、unitPriceWithTax（含税单价）。
如果有表格数据，请优先使用表格数据。`,
      [ExtractTopic.RISK_CLAUSES]: basePrompt + ' 风险条款可能分散在合同不同部分，请仔细查找。',
      [ExtractTopic.DELIVERABLES]: basePrompt + ' 交付物信息可能包含在里程碑或验收条款中。',
    };

    return topicSpecific[topic] || basePrompt;
  }

  /**
   * Get chunks relevant to a specific topic
   */
  private getRelevantChunksForTopic(topic: ExtractTopic, chunks: SemanticChunk[]): SemanticChunk[] {
    const topicChunkTypes: Record<ExtractTopic, string[]> = {
      [ExtractTopic.BASIC_INFO]: ['header', 'party'],
      [ExtractTopic.FINANCIAL]: ['financial'],
      [ExtractTopic.TIME_INFO]: ['schedule', 'signature'],
      [ExtractTopic.MILESTONES]: ['financial', 'schedule', 'article'],
      [ExtractTopic.RATE_ITEMS]: ['financial', 'article'],
      [ExtractTopic.LINE_ITEMS]: ['financial', 'article'],
      [ExtractTopic.RISK_CLAUSES]: ['article'],
      [ExtractTopic.DELIVERABLES]: ['article', 'schedule'],
    };

    const targetTypes = topicChunkTypes[topic] || [];
    return chunks.filter(c => targetTypes.includes(c.metadata.type));
  }

  /**
   * Extract table data from Docling result
   */
  private extractTablesFromDoclingResult(
    tables: Array<{ markdown: string; rows: number; cols: number }>
  ): ExtractedTableData {
    const result: ExtractedTableData = {};

    for (const table of tables) {
      // Detect table type and extract accordingly
      const milestones = this.tryExtractMilestones(table);
      if (milestones.length > 0) {
        result.milestones = milestones;
        continue;
      }

      const rateItems = this.tryExtractRateItems(table);
      if (rateItems.length > 0) {
        result.rateItems = rateItems;
        continue;
      }

      const lineItems = this.tryExtractLineItems(table);
      if (lineItems.length > 0) {
        result.lineItems = lineItems;
        continue;
      }
    }

    return result;
  }

  /**
   * Try to extract milestones from a table
   */
  private tryExtractMilestones(
    table: { markdown: string; rows: number; cols: number }
  ): Array<{ name: string; amount?: string; paymentPercentage?: string; plannedDate?: string }> {
    const lines = table.markdown.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const milestones: Array<{ name: string; amount?: string; paymentPercentage?: string; plannedDate?: string }> = [];
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());

      // Detect header row
      if (i === 0 || (headers.length === 0 && cells.length >= 2)) {
        headers = cells;
        continue;
      }

      // Skip separator row
      if (cells.some(c => /^[-:]+$/.test(c))) continue;

      // Parse milestone row
      const milestone = this.parseMilestoneRow(headers, cells);
      if (milestone) {
        milestones.push(milestone);
      }
    }

    return milestones;
  }

  /**
   * Parse a single milestone row
   */
  private parseMilestoneRow(
    headers: string[],
    cells: string[]
  ): { name: string; amount?: string; paymentPercentage?: string; plannedDate?: string } | null {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (cells[idx]) row[h] = cells[idx];
    });

    const name = row['名称'] || row['里程碑'] || row['阶段'] || row['付款节点'] || Object.values(row)[0];
    if (!name) return null;

    return {
      name: name.toString(),
      amount: this.cleanNumeric(row['金额'] || row['价款']),
      paymentPercentage: this.cleanNumeric(row['比例'] || row['百分比'] || row['付款比例']),
      plannedDate: this.cleanDate(row['日期'] || row['计划日期']),
    };
  }

  /**
   * Try to extract rate items from a table
   */
  private tryExtractRateItems(
    table: { markdown: string; rows: number; cols: number }
  ): Array<{ role: string; rate?: string; rateType?: string }> {
    const lines = table.markdown.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const rateItems: Array<{ role: string; rate?: string; rateType?: string }> = [];
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());

      if (i === 0 || (headers.length === 0 && cells.length >= 2)) {
        headers = cells;
        continue;
      }

      if (cells.some(c => /^[-:]+$/.test(c))) continue;

      const rateItem = this.parseRateItemRow(headers, cells);
      if (rateItem) {
        rateItems.push(rateItem);
      }
    }

    return rateItems;
  }

  /**
   * Parse a single rate item row
   */
  private parseRateItemRow(
    headers: string[],
    cells: string[]
  ): { role: string; rate?: string; rateType?: string } | null {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (cells[idx]) row[h] = cells[idx];
    });

    const role = row['角色'] || row['职位'] || row['岗位'] || row['人员级别'] || Object.values(row)[0];
    if (!role) return null;

    return {
      role: role.toString(),
      rate: this.cleanNumeric(row['费率'] || row['单价'] || row['日薪'] || row['时薪']),
      rateType: this.detectRateType(row['单位'] || row['计价方式']),
    };
  }

  /**
   * Detect rate type from unit string
   */
  private detectRateType(unit?: string): string | undefined {
    if (!unit) return undefined;
    const u = unit.toLowerCase();
    if (u.includes('小时') || u.includes('时') || u.includes('hour')) return 'HOURLY';
    if (u.includes('天') || u.includes('日') || u.includes('day')) return 'DAILY';
    if (u.includes('月') || u.includes('人月') || u.includes('month')) return 'MONTHLY';
    return undefined;
  }

  /**
   * Try to extract line items from a table
   */
  private tryExtractLineItems(
    table: { markdown: string; rows: number; cols: number }
  ): Array<{ productName: string; quantity?: number; unit?: string; unitPriceWithTax?: string }> {
    const lines = table.markdown.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const lineItems: Array<{ productName: string; quantity?: number; unit?: string; unitPriceWithTax?: string }> = [];
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());

      if (i === 0 || (headers.length === 0 && cells.length >= 2)) {
        headers = cells;
        continue;
      }

      if (cells.some(c => /^[-:]+$/.test(c))) continue;

      const lineItem = this.parseLineItemRow(headers, cells);
      if (lineItem) {
        lineItems.push(lineItem);
      }
    }

    return lineItems;
  }

  /**
   * Parse a single line item row
   */
  private parseLineItemRow(
    headers: string[],
    cells: string[]
  ): { productName: string; quantity?: number; unit?: string; unitPriceWithTax?: string } | null {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (cells[idx]) row[h] = cells[idx];
    });

    const name = row['名称'] || row['产品'] || row['商品'] || row['产品名称'] || Object.values(row)[0];
    if (!name) return null;

    return {
      productName: name.toString(),
      quantity: row['数量'] ? parseInt(row['数量'], 10) : undefined,
      unit: row['单位'] || row['计量单位'],
      unitPriceWithTax: this.cleanNumeric(row['单价'] || row['含税单价']),
    };
  }

  /**
   * Clean numeric value (remove currency symbols, commas, etc.)
   */
  private cleanNumeric(value: any): string | undefined {
    if (!value) return undefined;
    const str = String(value).replace(/[¥$,\s%]/g, '').trim();
    return str || undefined;
  }

  /**
   * Clean date value
   */
  private cleanDate(value: any): string | undefined {
    if (!value) return undefined;
    const str = String(value).trim();
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Try to parse and format
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Ignore
    }
    return undefined;
  }

  /**
   * 根据合同类型获取相关主题
   *
   * 不同合同类型只需提取特定信息，避免浪费时间解析无关字段：
   * - 项目外包(PROJECT_OUTSOURCING): 需要里程碑信息，不需要费率和产品清单
   * - 人力框架(STAFF_AUGMENTATION): 需要费率信息，不需要里程碑和产品清单
   * - 产品购销(PRODUCT_SALES): 需要产品清单，不需要里程碑和费率
   */
  private getTopicsForContractType(
    contractType: string | undefined,
    userTopics?: ExtractTopic[]
  ): ExtractTopic[] {
    // 如果用户明确指定了主题，使用用户的主题
    if (userTopics && userTopics.length > 0) {
      return userTopics;
    }

    // 基础主题（所有合同类型都需要）
    const baseTopics = [
      ExtractTopic.BASIC_INFO,
      ExtractTopic.FINANCIAL,
      ExtractTopic.TIME_INFO,
    ];

    // 根据合同类型添加特定主题
    const typeSpecificTopics: Record<string, ExtractTopic[]> = {
      PROJECT_OUTSOURCING: [ExtractTopic.MILESTONES, ExtractTopic.DELIVERABLES],
      STAFF_AUGMENTATION: [ExtractTopic.RATE_ITEMS],
      PRODUCT_SALES: [ExtractTopic.LINE_ITEMS, ExtractTopic.DELIVERABLES],
    };

    // 如果能识别出合同类型，只提取相关主题
    if (contractType && typeSpecificTopics[contractType]) {
      return [...baseTopics, ...typeSpecificTopics[contractType]];
    }

    // 默认：返回所有主题（向后兼容）
    return this.getDefaultTopics();
  }

  /**
   * Get default topics if none specified
   */
  private getDefaultTopics(): ExtractTopic[] {
    return [
      ExtractTopic.BASIC_INFO,
      ExtractTopic.FINANCIAL,
      ExtractTopic.TIME_INFO,
      ExtractTopic.MILESTONES,
      ExtractTopic.RATE_ITEMS,
      ExtractTopic.LINE_ITEMS,
    ];
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(fields: Record<string, unknown>, topics: ExtractTopic[]): number {
    let totalWeight = 0;
    let completedWeight = 0;

    for (const topicName of topics) {
      const topic = EXTRACT_TOPICS.find(t => t.name === topicName);
      if (!topic) continue;

      const weight = topic.weight || 1;
      const completedFields = topic.fields.filter(
        f => fields[f.name] !== null && fields[f.name] !== undefined
      ).length;
      const completion = completedFields / topic.fields.length;

      totalWeight += weight;
      completedWeight += weight * completion;
    }

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    fields: Record<string, unknown>,
    topicResults: TopicExtractionResult[],
    basicConfidence: number
  ): number {
    if (topicResults.length === 0) return basicConfidence;

    const avgTopicConfidence =
      topicResults.reduce((sum, t) => sum + t.confidence, 0) / topicResults.length;

    return Math.round((basicConfidence * 0.6 + avgTopicConfidence * 0.4) * 100);
  }

  /**
   * Create a temporary file for Docling processing
   */
  private async createTempFile(content: string): Promise<string> {
    const os = await import('os');
    const path = await import('path');
    const fs = await import('fs/promises');

    const tempDir = os.tmpdir();
    const fileName = `comprehensive_llm_${Date.now()}.txt`;
    const filePath = path.join(tempDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }

  private unavailableResult(reason: string): ParseResult {
    return {
      strategy: this.name,
      fields: {},
      completeness: 0,
      confidence: 0,
      warnings: [reason],
      duration: 0,
      timestamp: new Date(),
    };
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
