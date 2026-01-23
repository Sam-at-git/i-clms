import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SystemConfigService } from '../system-config/system-config.service';

const execAsync = promisify(exec);

export interface DoclingConvertOptions {
  ocr?: boolean;
  /**
   * OCR 引擎选择
   * - 'rapidocr': 基于 PaddleOCR，中文识别效果最好（推荐）
   * - 'easyocr': 默认选项，支持多语言
   * - 'tesseract': Tesseract OCR
   */
  ocrEngine?: 'rapidocr' | 'easyocr' | 'tesseract';
  withTables?: boolean;
  withImages?: boolean;
  /**
   * 保留章节标题（用于语义分段）
   * 启用后，Markdown输出将保留原始文档的章节结构（# 标题格式）
   */
  preserveHeaders?: boolean;
}

export interface DoclingTable {
  markdown: string;
  rows: number;
  cols: number;
}

export interface DoclingImage {
  page: number;
  width: number;
  height: number;
}

export interface DoclingConvertResult {
  markdown: string;
  tables: DoclingTable[];
  pages: number;
  images: DoclingImage[];
  success: boolean;
  error?: string;
}

export interface DoclingExtractResult {
  fields: Record<string, unknown>;
  success: boolean;
  error?: string;
}

/**
 * Docling Document Parser Service
 *
 * Integrates with IBM's Docling Python library for document parsing.
 * Provides PDF/DOCX to Markdown conversion with table extraction and OCR support.
 *
 * @see Spec 24 - Docling Integration
 */
@Injectable()
export class DoclingService implements OnModuleInit {
  private readonly logger = new Logger(DoclingService.name);
  private pythonAvailable = false;
  private pythonCommand: string = 'python3';
  private cachedOCREngine: 'rapidocr' | 'easyocr' | 'tesseract' = 'rapidocr';

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly systemConfigService?: SystemConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Check Python environment
    this.pythonAvailable = await this.checkPythonEnvironment();
    if (!this.pythonAvailable) {
      this.logger.warn('Python/Docling not available. Docling features will be disabled.');
    } else {
      this.logger.log('Docling service initialized successfully');
    }
  }

  /**
   * Check if Python and Docling are available
   */
  private async checkPythonEnvironment(): Promise<boolean> {
    try {
      // Try python3 first, then python
      const { stdout } = await execAsync('python3 --version');
      this.logger.debug(`Python version: ${stdout.trim()}`);
      this.pythonCommand = 'python3';
    } catch {
      try {
        const { stdout } = await execAsync('python --version');
        this.logger.debug(`Python version: ${stdout.trim()}`);
        this.pythonCommand = 'python';
      } catch {
        this.logger.warn('Python not found in PATH');
        return false;
      }
    }

    // Check if docling is installed
    try {
      const { stdout } = await execAsync(`${this.pythonCommand} -c "import docling; print('docling installed')"`);
      return stdout.includes('docling installed');
    } catch {
      this.logger.warn('Docling not installed. Run: pip install docling');
      return false;
    }
  }

  /**
   * Convert document to Markdown
   */
  async convertToMarkdown(
    filePath: string,
    options: DoclingConvertOptions = {},
  ): Promise<DoclingConvertResult> {
    if (!this.pythonAvailable) {
      return this.errorResult('Python/Docling not available');
    }

    const wrapperPath = this.getWrapperPath();

    // Get OCR engine from system config if not specified in options
    let defaultOCREngine = this.cachedOCREngine;
    if (this.systemConfigService && !options.ocrEngine) {
      try {
        const ocrConfig = await this.systemConfigService.getOCRConfig();
        this.cachedOCREngine = ocrConfig.engine;
        defaultOCREngine = ocrConfig.engine;
      } catch (error) {
        this.logger.warn('Failed to get OCR config from system, using default');
      }
    }

    const optionsWithDefaults: DoclingConvertOptions = {
      ocrEngine: options.ocrEngine || defaultOCREngine,
      ocr: options.ocr !== false,
      withTables: options.withTables !== false,
      withImages: options.withImages !== false,
      preserveHeaders: options.preserveHeaders !== false,
    };
    const optionsJson = JSON.stringify(optionsWithDefaults);

    try {
      // Increase timeout for OCR processing (5 minutes)
      const { stdout } = await execAsync(
        `${this.pythonCommand} ${wrapperPath} convert "${filePath}" '${optionsJson}'`,
        { timeout: 300000 }, // 5 minute timeout for OCR
      );

      const result = JSON.parse(stdout);
      return result;
    } catch (error) {
      this.logger.error(`Docling conversion failed: ${this.errorMessage(error)}`);
      return this.errorResult(this.errorMessage(error));
    }
  }

  /**
   * Extract fields from document
   */
  async extractFields(
    filePath: string,
    topics: string[],
  ): Promise<DoclingExtractResult> {
    if (!this.pythonAvailable) {
      return {
        fields: {},
        success: false,
        error: 'Python/Docling not available',
      };
    }

    const wrapperPath = this.getWrapperPath();
    const topicsJson = JSON.stringify(topics);

    try {
      const { stdout } = await execAsync(
        `${this.pythonCommand} ${wrapperPath} extract "${filePath}" '${topicsJson}'`,
        { timeout: 60000 },
      );

      const result = JSON.parse(stdout);
      return result;
    } catch (error) {
      this.logger.error(`Docling extraction failed: ${this.errorMessage(error)}`);
      return {
        fields: {},
        success: false,
        error: this.errorMessage(error),
      };
    }
  }

  /**
   * Check if Docling is available
   */
  isAvailable(): boolean {
    return this.pythonAvailable;
  }

  /**
   * Get Docling version
   */
  async getVersion(): Promise<string | null> {
    if (!this.pythonAvailable) {
      return null;
    }

    try {
      const { stdout } = await execAsync(`${this.pythonCommand} -c "import docling; print(docling.__version__)"`);
      return stdout.trim();
    } catch {
      return null;
    }
  }

  private getWrapperPath(): string {
    // Path to the Python wrapper script
    return 'scripts/docling_wrapper.py';
  }

  private errorResult(message: string): DoclingConvertResult {
    return {
      markdown: '',
      tables: [],
      pages: 0,
      images: [],
      success: false,
      error: message,
    };
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }
}
