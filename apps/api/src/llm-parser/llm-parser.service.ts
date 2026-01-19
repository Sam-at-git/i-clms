import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { LlmConfigService } from './config/llm-config.service';
import { ParserService } from '../parser/parser.service';
import { LlmParseResult } from './dto/llm-parse-result.dto';
import { ContractExtractedData } from './dto/contract-extracted-data.dto';
import {
  SYSTEM_PROMPT,
  USER_PROMPT_TEMPLATE,
  CONTRACT_JSON_SCHEMA,
} from './prompts/contract-extraction.prompt';

@Injectable()
export class LlmParserService {
  private readonly logger = new Logger(LlmParserService.name);
  private openai: OpenAI;

  constructor(
    private configService: LlmConfigService,
    private parserService: ParserService,
  ) {
    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout,
    });
    this.logger.log(`Initialized with LLM provider: ${this.configService.getProviderName()}`);
  }

  async parseContractWithLlm(objectName: string): Promise<LlmParseResult> {
    const startTime = Date.now();

    try {
      // 1. 下载文件并提取文本（复用现有ParserService）
      this.logger.log(`Starting to parse document: ${objectName}`);
      const parseResult = await this.parserService.parseDocument(objectName);

      if (!parseResult.success || !parseResult.text) {
        throw new Error(parseResult.error || 'Failed to extract text from document');
      }

      this.logger.log(`Extracted ${parseResult.text.length} characters from document`);

      // 2. 限制文本长度以避免token超限
      const textLimit = 15000;
      const contractText = parseResult.text.substring(0, textLimit);

      // 3. 构建Prompt
      const config = this.configService.getActiveConfig();
      const userPrompt = USER_PROMPT_TEMPLATE
        .replace('{{contractText}}', contractText)
        .replace('{{jsonSchema}}', JSON.stringify(CONTRACT_JSON_SCHEMA, null, 2));

      this.logger.log(`Calling LLM API (${config.model})...`);

      // 4. 调用LLM（使用JSON模式）
      const completion = await this.openai.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      });

      // 5. 解析JSON
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      this.logger.log(`Received response from LLM (${content.length} chars)`);

      const extractedData = JSON.parse(content);

      // 6. 验证和转换
      const validated = this.validateAndTransform(extractedData);

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(`Parsing completed in ${processingTimeMs}ms`);

      return {
        success: true,
        extractedData: validated,
        rawText: parseResult.text,
        pageCount: parseResult.pageCount,
        llmModel: config.model,
        llmProvider: this.configService.getProviderName(),
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Parsing failed: ${errorMessage}`, errorStack);

      return {
        success: false,
        error: errorMessage,
        processingTimeMs,
      };
    }
  }

  private validateAndTransform(data: any): ContractExtractedData {
    // 基本验证
    if (!data.contractType || !data.basicInfo) {
      throw new Error('Missing required fields: contractType or basicInfo');
    }

    // 验证合同类型
    const validTypes = ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'];
    if (!validTypes.includes(data.contractType)) {
      throw new Error(`Invalid contract type: ${data.contractType}`);
    }

    // 数据清理和转换
    const cleaned: ContractExtractedData = {
      contractType: data.contractType,
      basicInfo: {
        contractNo: this.cleanString(data.basicInfo?.contractNo),
        contractName: this.cleanString(data.basicInfo?.contractName),
        ourEntity: this.cleanString(data.basicInfo?.ourEntity),
        customerName: this.cleanString(data.basicInfo?.customerName),
        status: data.basicInfo?.status || 'DRAFT',
      },
      financialInfo: data.financialInfo
        ? {
            amountWithTax: this.cleanAmount(data.financialInfo?.amountWithTax),
            amountWithoutTax: this.cleanAmount(data.financialInfo?.amountWithoutTax),
            taxRate: this.cleanAmount(data.financialInfo?.taxRate),
            currency: data.financialInfo?.currency || 'CNY',
            paymentMethod: this.cleanString(data.financialInfo?.paymentMethod),
            paymentTerms: this.cleanString(data.financialInfo?.paymentTerms),
          }
        : undefined,
      timeInfo: data.timeInfo
        ? {
            signedAt: this.cleanDate(data.timeInfo?.signedAt),
            effectiveAt: this.cleanDate(data.timeInfo?.effectiveAt),
            expiresAt: this.cleanDate(data.timeInfo?.expiresAt),
            duration: this.cleanString(data.timeInfo?.duration),
          }
        : undefined,
      otherInfo: data.otherInfo
        ? {
            salesPerson: this.cleanString(data.otherInfo?.salesPerson),
            industry: this.cleanString(data.otherInfo?.industry),
            signLocation: this.cleanString(data.otherInfo?.signLocation),
            copies: data.otherInfo?.copies,
          }
        : undefined,
      typeSpecificDetails: data.typeSpecificDetails,
      metadata: data.metadata
        ? {
            overallConfidence: data.metadata?.overallConfidence,
            fieldConfidences: data.metadata?.fieldConfidences,
          }
        : undefined,
    };

    return cleaned;
  }

  private cleanString(value: any): string | undefined {
    if (!value || typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private cleanAmount(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'number') return value.toString();
    if (typeof value !== 'string') return undefined;

    // 移除逗号和空格
    const cleaned = value.replace(/[,\s]/g, '');
    // 验证是否是有效的数字
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;

    return cleaned;
  }

  private cleanDate(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value !== 'string') return undefined;

    // 基本的日期格式验证（YYYY-MM-DD）
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // 尝试其他常见格式并转换
      const date = new Date(value);
      if (isNaN(date.getTime())) return undefined;

      // 转换为YYYY-MM-DD格式
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return value;
  }
}
