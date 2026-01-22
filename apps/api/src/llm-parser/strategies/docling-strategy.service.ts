import { Injectable, Logger } from '@nestjs/common';
import { DoclingService } from '../../docling/docling.service';
import { VectorStoreService } from '../../vector-store/vector-store.service';
import { CacheService } from '../../cache/cache.service';
import { LlmClientService } from '../llm-client.service';
import { EXTRACT_TOPICS, ExtractTopic } from '../topics/topics.const';

/**
 * Docling Parse Strategy Service
 *
 * Integrates Docling document parsing with the multi-strategy parsing system.
 * Provides Docling-based document conversion and field extraction.
 *
 * @see Spec 25 - Docling Extraction Strategy
 */
@Injectable()
export class DoclingStrategyService {
  private readonly logger = new Logger(DoclingStrategyService.name);

  constructor(
    private readonly docling: DoclingService,
    private readonly vectorStore: VectorStoreService,
    private readonly cache: CacheService,
    private readonly llmClient: LlmClientService,
  ) {}

  /**
   * Parse document using Docling strategy
   */
  async parseWithDocling(
    filePath: string,
    options: {
      extractTopics?: ExtractTopic[];
      enableOcr?: boolean;
      cacheResult?: boolean;
    } = {},
  ): Promise<{
    success: boolean;
    markdown?: string;
    fields?: Record<string, unknown>;
    tables?: Array<{ markdown: string; rows: number; cols: number }>;
    error?: string;
  }> {
    if (!this.docling.isAvailable()) {
      return {
        success: false,
        error: 'Docling not available. Please install Python and docling package.',
      };
    }

    try {
      // Step 1: Convert document to Markdown
      const convertResult = await this.docling.convertToMarkdown(filePath, {
        ocr: options.enableOcr,
        withTables: true,
        withImages: false,
      });

      if (!convertResult.success) {
        return {
          success: false,
          error: convertResult.error,
        };
      }

      // Step 2: If topics requested, extract fields using LLM
      let fields: Record<string, unknown> = {};

      if (options.extractTopics && options.extractTopics.length > 0) {
        const topics = options.extractTopics.map(t => t.toString());
        const extractResult = await this.docling.extractFields(filePath, topics);

        if (extractResult.success) {
          fields = extractResult.fields as Record<string, unknown>;
        } else {
          this.logger.warn(`Docling field extraction failed: ${extractResult.error}`);
        }
      }

      this.logger.log(
        `Docling parse complete: ${convertResult.pages} pages, ${convertResult.tables.length} tables`,
      );

      return {
        success: true,
        markdown: convertResult.markdown,
        fields,
        tables: convertResult.tables,
      };
    } catch (error) {
      this.logger.error(`Docling parse failed: ${this.errorMessage(error)}`);
      return {
        success: false,
        error: this.errorMessage(error),
      };
    }
  }

  /**
   * Get strategy capabilities
   */
  getCapabilities(): {
    available: boolean;
    supportsOcr: boolean;
    supportsTables: boolean;
    supportedFormats: string[];
  } {
    return {
      available: this.docling.isAvailable(),
      supportsOcr: true,
      supportsTables: true,
      supportedFormats: ['pdf', 'docx', 'doc', 'txt'],
    };
  }

  /**
   * Convert document to Markdown
   */
  async convertToMarkdown(
    filePath: string,
    options: { ocr?: boolean } = {},
  ): Promise<{
    success: boolean;
    markdown?: string;
    tables?: Array<{ markdown: string; rows: number; cols: number }>;
    error?: string;
  }> {
    const result = await this.docling.convertToMarkdown(filePath, {
      ocr: options.ocr,
      withTables: true,
    });

    return {
      success: result.success,
      markdown: result.markdown,
      tables: result.tables,
      error: result.error,
    };
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
