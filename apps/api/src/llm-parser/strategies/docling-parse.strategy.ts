import { Injectable, Logger } from '@nestjs/common';
import { DoclingService } from '../../docling/docling.service';
import { TopicRegistryService } from '../topics/topic-registry.service';
import {
  ParseStrategyExecutor,
  ParseStrategy,
  ParseOptions,
  ParseResult,
} from './parse-strategy.interface';
import { createHash } from 'crypto';
import { ExtractTopic } from '../topics/topics.const';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

interface DoclingFieldConfig {
  pattern?: RegExp;
  fallback?: string;
  transform?: (value: string) => unknown;
}

/**
 * Docling Parse Strategy
 *
 * Implements the ParseStrategyExecutor interface using Docling for document parsing.
 * Provides field extraction from Markdown output with table parsing support.
 *
 * @see Spec 25 - Docling Extraction Strategy
 */
@Injectable()
export class DoclingParseStrategy implements ParseStrategyExecutor {
  readonly name = ParseStrategy.DOCLING;
  private readonly logger = new Logger(DoclingParseStrategy.name);

  // Field extraction patterns for Docling Markdown output
  private readonly fieldConfigs: Record<string, DoclingFieldConfig> = {
    contractNo: {
      pattern: /合同编号[：:]\s*([^\n]+)/,
    },
    contractName: {
      pattern: /合同名称[：:]\s*([^\n]+)/,
    },
    partyA: {
      pattern: /甲方[：:]\s*([^\n]+)/,
    },
    partyB: {
      pattern: /乙方[：:]\s*([^\n]+)/,
    },
    contractAmount: {
      pattern: /合同金额[：:]\s*[¥￥]?\s*([0-9,.,，]+)\s*/,
      transform: (v: string) => parseFloat(v.replace(/,/g, '').replace(/，/g, '')),
    },
    signedDate: {
      pattern: /签订日期[：:]\s*([0-9]{4}[-年][0-9]{1,2}[-月][0-9]{1,2}[日]?)/,
    },
    startDate: {
      pattern: /起始日期[：:]\s*([0-9]{4}[-年][0-9]{1,2}[-月][0-9]{1,2}[日]?)/,
    },
    endDate: {
      pattern: /截止日期[：:]\s*([0-9]{4}[-年][0-9]{1,2}[-月][0-9]{1,2}[日]?)/,
    },
  };

  constructor(
    private readonly doclingService: DoclingService,
    private readonly topicRegistry: TopicRegistryService,
  ) {}

  async parse(content: string, options: ParseOptions = {}): Promise<ParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const extractedFields: Record<string, unknown> = {};

    // Check if Docling is available
    if (!this.isAvailable()) {
      return {
        strategy: this.name,
        fields: {},
        completeness: 0,
        confidence: 0,
        warnings: ['Python/Docling not available'],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    try {
      // 1. Create temp file for Docling processing
      const tempFilePath = await this.createTempFile(content);

      try {
        // 2. Call Docling to convert to Markdown
        const doclingResult = await this.doclingService.convertToMarkdown(tempFilePath, {
          ocr: options.ocr ?? true,
          withTables: true,
          withImages: false,
        });

        if (!doclingResult.success) {
          throw new Error(doclingResult.error || 'Docling conversion failed');
        }

        const markdown = doclingResult.markdown;

        // 3. 先提取基本信息获取合同类型
        let contractType: string | undefined = undefined;
        const basicInfoTopic = this.topicRegistry.getTopicSafe(ExtractTopic.BASIC_INFO);
        if (basicInfoTopic) {
          for (const field of basicInfoTopic.fields) {
            if (field.name === 'contractType') {
              const value = this.extractField(markdown, field.name);
              if (value) {
                extractedFields.contractType = value;
                contractType = String(value);
                this.logger.log(`[Docling] Detected contract type: ${contractType}`);
              }
              break;
            }
          }
        }

        // 4. 根据合同类型获取相关主题
        const topics = this.getTopicsForContractType(contractType, options.topics);
        this.logger.log(`[Docling] Using topics for contract type ${contractType || 'unknown'}: ${topics.join(', ')}`);

        for (const topicName of topics) {
          const topic = this.topicRegistry.getTopicSafe(topicName);
          if (!topic) {
            this.logger.warn(`Topic ${topicName} not found, skipping`);
            continue;
          }

          for (const field of topic.fields) {
            const value = this.extractField(markdown, field.name);
            if (value !== null && value !== undefined) {
              extractedFields[field.name] = value;
            }
          }

          // 4. Extract table data for specific topics
          if (topicName === ExtractTopic.MILESTONES && doclingResult.tables.length > 0) {
            const milestones = this.extractMilestonesFromTables(doclingResult.tables);
            if (milestones.length > 0) {
              extractedFields.milestones = milestones;
            }
          }
          if (topicName === ExtractTopic.RATE_ITEMS && doclingResult.tables.length > 0) {
            const rateItems = this.extractRateItemsFromTables(doclingResult.tables);
            if (rateItems.length > 0) {
              extractedFields.rateItems = rateItems;
            }
          }
          if (topicName === ExtractTopic.LINE_ITEMS && doclingResult.tables.length > 0) {
            const lineItems = this.extractLineItemsFromTables(doclingResult.tables);
            if (lineItems.length > 0) {
              extractedFields.lineItems = lineItems;
            }
          }
        }

        // 5. Calculate completeness and confidence
        const completeness = this.calculateCompleteness(extractedFields, topics);
        const confidence = this.calculateConfidence(extractedFields, topics);

        // 6. Generate warnings
        if (completeness < 70) {
          warnings.push('Docling解析完整性较低，建议使用LLM验证');
        }
        if (doclingResult.pages > 50) {
          warnings.push('文档页数较多，处理时间可能较长');
        }

        this.logger.log(
          `Docling parse complete: ${doclingResult.pages} pages, ${doclingResult.tables.length} tables, completeness=${completeness}%`,
        );

        return {
          strategy: this.name,
          fields: extractedFields,
          completeness,
          confidence,
          warnings,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      } finally {
        // Clean up temp file
        await this.cleanupTempFile(tempFilePath);
      }
    } catch (error) {
      this.logger.error(`Docling parse error: ${this.errorMessage(error)}`);
      return {
        strategy: this.name,
        fields: {},
        completeness: 0,
        confidence: 0,
        warnings: [this.errorMessage(error)],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  isAvailable(): boolean {
    return this.doclingService.isAvailable();
  }

  getPriority(): number {
    return 2; // Priority: Rule(3) > Docling(2) > LLM(1) > RAG(1)
  }

  /**
   * Extract field from Markdown using regex pattern
   */
  private extractField(markdown: string, fieldName: string): unknown {
    const config = this.fieldConfigs[fieldName];
    if (!config || !config.pattern) {
      return null;
    }

    const match = markdown.match(config.pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      return config.transform ? config.transform(value) : value;
    }

    return config.fallback ?? null;
  }

  /**
   * Extract milestones from tables
   */
  private extractMilestonesFromTables(
    tables: Array<{ markdown: string; rows: number; cols: number }>,
  ): Array<{ name: string; amount?: number; dueDate?: string }> {
    const milestones: Array<{ name: string; amount?: number; dueDate?: string }> = [];

    for (const table of tables) {
      const lines = table.markdown.split('\n');
      let headers: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split('|').filter((c) => c.trim()).map((c) => c.trim());

        // First row as header
        if (i === 0 || (headers.length === 0 && cells.length >= 3)) {
          headers = cells;
          continue;
        }

        // Skip separator row
        if (cells.some((c) => /^[-:]+$/.test(c))) {
          continue;
        }

        // Extract milestone data
        if (cells.length >= 2) {
          const milestone = this.parseMilestoneRow(headers, cells);
          if (milestone) {
            milestones.push(milestone);
          }
        }
      }
    }

    return milestones;
  }

  /**
   * Parse milestone row from table
   */
  private parseMilestoneRow(
    headers: string[],
    cells: string[],
  ): { name: string; amount?: number; dueDate?: string } | null {
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (cells[index]) {
        row[header] = cells[index];
      }
    });

    // Try to identify common fields
    const name = row['名称'] || row['里程碑'] || row['阶段'] || Object.values(row)[0];
    const amount = row['金额'] || row['价款'] || row['费用'];
    const dueDate = row['日期'] || row['时间'] || row['期限'];

    if (name) {
      return {
        name: name.toString(),
        amount: amount ? parseFloat(amount.replace(/[^\d.]/g, '')) : undefined,
        dueDate: dueDate || undefined,
      };
    }

    return null;
  }

  /**
   * Extract rate items from tables
   */
  private extractRateItemsFromTables(
    tables: Array<{ markdown: string; rows: number; cols: number }>,
  ): Array<{ role: string; rate?: number; unit?: string }> {
    const rateItems: Array<{ role: string; rate?: number; unit?: string }> = [];

    for (const table of tables) {
      const lines = table.markdown.split('\n');
      let headers: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split('|').filter((c) => c.trim()).map((c) => c.trim());

        if (i === 0 || (headers.length === 0 && cells.length >= 2)) {
          headers = cells;
          continue;
        }

        if (cells.some((c) => /^[-:]+$/.test(c))) {
          continue;
        }

        if (cells.length >= 2) {
          const rateItem = this.parseRateItemRow(headers, cells);
          if (rateItem) {
            rateItems.push(rateItem);
          }
        }
      }
    }

    return rateItems;
  }

  /**
   * Parse rate item row from table
   */
  private parseRateItemRow(
    headers: string[],
    cells: string[],
  ): { role: string; rate?: number; unit?: string } | null {
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (cells[index]) {
        row[header] = cells[index];
      }
    });

    const role = row['角色'] || row['职位'] || row['岗位'] || Object.values(row)[0];
    const rate = row['费率'] || row['单价'] || row['日薪'];
    const unit = row['单位'] || row['计价单位'];

    if (role) {
      return {
        role: role.toString(),
        rate: rate ? parseFloat(rate.replace(/[^\d.]/g, '')) : undefined,
        unit: unit || undefined,
      };
    }

    return null;
  }

  /**
   * Extract line items from tables
   */
  private extractLineItemsFromTables(
    tables: Array<{ markdown: string; rows: number; cols: number }>,
  ): Array<{ name: string; quantity?: number; unitPrice?: number }> {
    const lineItems: Array<{ name: string; quantity?: number; unitPrice?: number }> = [];

    for (const table of tables) {
      const lines = table.markdown.split('\n');
      let headers: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split('|').filter((c) => c.trim()).map((c) => c.trim());

        if (i === 0 || (headers.length === 0 && cells.length >= 2)) {
          headers = cells;
          continue;
        }

        if (cells.some((c) => /^[-:]+$/.test(c))) {
          continue;
        }

        if (cells.length >= 2) {
          const lineItem = this.parseLineItemRow(headers, cells);
          if (lineItem) {
            lineItems.push(lineItem);
          }
        }
      }
    }

    return lineItems;
  }

  /**
   * Parse line item row from table
   */
  private parseLineItemRow(
    headers: string[],
    cells: string[],
  ): { name: string; quantity?: number; unitPrice?: number } | null {
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      if (cells[index]) {
        row[header] = cells[index];
      }
    });

    const name = row['名称'] || row['产品'] || row['商品'] || Object.values(row)[0];
    const quantity = row['数量'] || row['qty'];
    const unitPrice = row['单价'] || row['价格'];

    if (name) {
      return {
        name: name.toString(),
        quantity: quantity ? parseFloat(quantity.replace(/[^\d.]/g, '')) : undefined,
        unitPrice: unitPrice ? parseFloat(unitPrice.replace(/[^\d.]/g, '')) : undefined,
      };
    }

    return null;
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(fields: Record<string, unknown>, topics: ExtractTopic[]): number {
    let totalWeight = 0;
    let completedWeight = 0;

    for (const topicName of topics) {
      const topic = this.topicRegistry.getTopicSafe(topicName);
      if (!topic) continue;

      const weight = topic.weight || 1;

      const completedFields = topic.fields.filter(
        (f) => fields[f.name] !== null && fields[f.name] !== undefined,
      ).length;

      const completion = completedFields / topic.fields.length;
      totalWeight += weight;
      completedWeight += weight * completion;
    }

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(fields: Record<string, unknown>, topics: ExtractTopic[]): number {
    const fieldCount = Object.keys(fields).length;
    const baseConfidence = Math.min(fieldCount * 5, 80);

    // Bonus for table data
    const hasTableData = fields.milestones || fields.rateItems || fields.lineItems;
    const tableBonus = hasTableData ? 10 : 0;

    return Math.min(baseConfidence + tableBonus, 100);
  }

  /**
   * Create temp file for Docling processing
   */
  private async createTempFile(content: string): Promise<string> {
    const tempDir = os.tmpdir();
    const fileName = `docling_${Date.now()}_${createHash('md5').update(content).digest('hex').slice(0, 8)}.txt`;
    const filePath = path.join(tempDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * Clean up temp file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore errors
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * 根据合同类型获取相关主题
   *
   * 配置与 topics.const.ts 中的 CONTRACT_TYPE_TOPIC_BATCHES 保持一致
   *
   * - 项目外包(PROJECT_OUTSOURCING): BASIC_INFO, FINANCIAL, TIME_INFO, MILESTONES, DELIVERABLES, RISK_CLAUSES (6个)
   * - 人力外包(STAFF_AUGMENTATION): BASIC_INFO, FINANCIAL, TIME_INFO, RATE_ITEMS, DELIVERABLES, RISK_CLAUSES (6个)
   * - 产品销售(PRODUCT_SALES): BASIC_INFO, FINANCIAL, TIME_INFO, LINE_ITEMS, RISK_CLAUSES (5个)
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

    // 根据合同类型添加特定主题（与 topics.const.ts 保持一致）
    const typeSpecificTopics: Record<string, ExtractTopic[]> = {
      PROJECT_OUTSOURCING: [
        ExtractTopic.MILESTONES,   // 里程碑（核心）
        ExtractTopic.DELIVERABLES, // 交付物
        ExtractTopic.RISK_CLAUSES,  // 风险条款
      ],
      STAFF_AUGMENTATION: [
        ExtractTopic.RATE_ITEMS,    // 人力费率（核心）
        ExtractTopic.DELIVERABLES,  // 交付物
        ExtractTopic.RISK_CLAUSES,  // 风险条款
      ],
      PRODUCT_SALES: [
        ExtractTopic.LINE_ITEMS,    // 产品清单（核心）
        ExtractTopic.RISK_CLAUSES,  // 风险条款
      ],
    };

    // 如果能识别出合同类型，只提取相关主题
    if (contractType && typeSpecificTopics[contractType]) {
      return [...baseTopics, ...typeSpecificTopics[contractType]];
    }

    // 默认：返回所有主题
    return this.topicRegistry.getTopicNames() as ExtractTopic[];
  }
}
