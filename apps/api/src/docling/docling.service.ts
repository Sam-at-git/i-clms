import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DoclingConvertOptions {
  ocr?: boolean;
  withTables?: boolean;
  withImages?: boolean;
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

  constructor(private readonly config: ConfigService) {}

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
    const optionsJson = JSON.stringify(options);

    try {
      const { stdout } = await execAsync(
        `${this.pythonCommand} ${wrapperPath} convert "${filePath}" '${optionsJson}'`,
        { timeout: 60000 }, // 60 second timeout
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
