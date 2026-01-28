import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { SystemConfigService } from '../system-config/system-config.service';
import { OcrCleanupService } from './ocr-cleanup.service';

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
  fromCache?: boolean;
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
  private pythonCommand = 'python3';
  private cachedOCREngine: 'rapidocr' | 'easyocr' | 'tesseract' = 'rapidocr';
  private readonly cacheDir: string;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly systemConfigService?: SystemConfigService,
    @Optional() private readonly ocrCleanupService?: OcrCleanupService,
  ) {
    // 初始化缓存目录
    this.cacheDir = this.config.get('DOCLING_CACHE_DIR') || '/tmp/docling-cache';
    this.ensureCacheDir();
  }

  /**
   * 确保缓存目录存在
   */
  private ensureCacheDir(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
        this.logger.log(`Created Docling cache directory: ${this.cacheDir}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to create cache directory: ${this.errorMessage(error)}`);
    }
  }

  /**
   * 计算文件内容的 hash（用于缓存 key）
   */
  private calculateFileHash(filePath: string): string | null {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hash = createHash('sha256').update(fileBuffer).digest('hex');
      return hash.substring(0, 16); // 使用前16位作为缓存key
    } catch (error) {
      this.logger.warn(`Failed to calculate file hash: ${this.errorMessage(error)}`);
      return null;
    }
  }

  /**
   * 获取缓存文件路径
   */
  private getCachePath(fileHash: string): string {
    return path.join(this.cacheDir, `${fileHash}.json`);
  }

  /**
   * 从缓存读取 Docling 结果
   */
  private readFromCache(fileHash: string): DoclingConvertResult | null {
    try {
      const cachePath = this.getCachePath(fileHash);
      if (fs.existsSync(cachePath)) {
        const cacheData = fs.readFileSync(cachePath, 'utf-8');
        const result = JSON.parse(cacheData) as DoclingConvertResult;
        this.logger.log(`[Docling Cache] Hit: ${fileHash}`);
        // 标记结果来自缓存
        return { ...result, fromCache: true };
      }
    } catch (error) {
      this.logger.warn(`[Docling Cache] Read error: ${this.errorMessage(error)}`);
    }
    return null;
  }

  /**
   * 写入缓存
   */
  private writeToCache(fileHash: string, result: DoclingConvertResult): void {
    try {
      const cachePath = this.getCachePath(fileHash);
      fs.writeFileSync(cachePath, JSON.stringify(result, null, 2), 'utf-8');
      this.logger.log(`[Docling Cache] Saved: ${fileHash}`);
    } catch (error) {
      this.logger.warn(`[Docling Cache] Write error: ${this.errorMessage(error)}`);
    }
  }

  /**
   * 清理过期缓存（保留最近 7 天的缓存）
   */
  async cleanExpiredCache(maxAgeDays = 7): Promise<number> {
    let cleanedCount = 0;
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`[Docling Cache] Cleaned ${cleanedCount} expired cache files`);
      }
    } catch (error) {
      this.logger.warn(`[Docling Cache] Clean error: ${this.errorMessage(error)}`);
    }
    return cleanedCount;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { count: number; totalSizeBytes: number } {
    try {
      const files = fs.readdirSync(this.cacheDir);
      let totalSize = 0;
      let count = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(this.cacheDir, file);
        const stat = fs.statSync(filePath);
        totalSize += stat.size;
        count++;
      }

      return { count, totalSizeBytes: totalSize };
    } catch {
      return { count: 0, totalSizeBytes: 0 };
    }
  }

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
   * 支持文件缓存：如果文件内容未变化，直接返回缓存的 markdown
   *
   * @param filePath 文件路径
   * @param options 转换选项
   * @param skipCache 是否跳过缓存（强制重新解析）
   */
  async convertToMarkdown(
    filePath: string,
    options: DoclingConvertOptions = {},
    skipCache = false,
  ): Promise<DoclingConvertResult> {
    if (!this.pythonAvailable) {
      return this.errorResult('Python/Docling not available');
    }

    // 检查缓存
    const fileHash = this.calculateFileHash(filePath);
    if (fileHash && !skipCache) {
      const cachedResult = this.readFromCache(fileHash);
      if (cachedResult) {
        this.logger.log(`[Docling] Using cached result for file hash: ${fileHash}`);
        return cachedResult;
      }
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
      this.logger.log(`[Docling] Converting file: ${filePath}`);
      // Increase timeout for OCR processing (5 minutes)
      const { stdout, stderr } = await execAsync(
        `${this.pythonCommand} ${wrapperPath} convert "${filePath}" '${optionsJson}'`,
        { timeout: 300000 }, // 5 minute timeout for OCR
      );

      // Log any warnings from stderr
      if (stderr && stderr.trim()) {
        this.logger.warn(`[Docling] Warning from Python: ${stderr}`);
      }

      // Parse result from stdout
      let result: DoclingConvertResult;
      try {
        result = JSON.parse(stdout) as DoclingConvertResult;
      } catch (parseError) {
        this.logger.error(`[Docling] Failed to parse Python output: ${stdout.substring(0, 500)}`);
        return this.errorResult(`Failed to parse Python output: ${this.errorMessage(parseError)}`);
      }

      // 执行 OCR 清洗（规则清洗）
      if (result.success && result.markdown && this.ocrCleanupService) {
        const cleanupResult = this.ocrCleanupService.ruleBasedCleanup(result.markdown);
        result.markdown = cleanupResult.cleanedText;
        this.logger.debug(
          `[Docling] OCR cleanup applied: ${cleanupResult.linesRemoved} lines removed, ` +
            `${cleanupResult.corrections.length} corrections`,
        );
      }

      // 质量检测：如果结果质量太差，自动使用RapidOCR重新处理
      const quality = this.assessMarkdownQuality(result.markdown);
      this.logger.log(`[Docling] Quality assessment: ${quality.score}/100 (${quality.reason})`);

      if (quality.score < 30 && !skipCache) {
        this.logger.log('[Docling] Primary conversion quality too low, triggering RapidOCR fallback');
        const rapidOcrResult = await this.tryRapidOCR(filePath, fileHash || '');
        if (rapidOcrResult.success && rapidOcrResult.markdown) {
          // Apply cleanup to RapidOCR result
          if (this.ocrCleanupService) {
            const cleanupResult = this.ocrCleanupService.ruleBasedCleanup(rapidOcrResult.markdown);
            rapidOcrResult.markdown = cleanupResult.cleanedText;
          }
          // Cache the better result
          if (fileHash) {
            this.writeToCache(fileHash, rapidOcrResult);
          }
          return { ...rapidOcrResult, fromCache: false };
        }
      }

      // 保存到缓存
      if (fileHash && result.success) {
        this.writeToCache(fileHash, result);
      }

      // 标记结果不是来自缓存（新生成的）
      return { ...result, fromCache: false };
    } catch (error) {
      const errorMessage = this.errorMessage(error);
      this.logger.error(`Docling conversion failed: ${errorMessage}`);

      // If OCR was enabled and the error suggests OCR issues, retry without OCR
      if (optionsWithDefaults.ocr && (errorMessage.includes('tolist') || errorMessage.includes('NoneType') || errorMessage.includes('OCR'))) {
        this.logger.log('[Docling] Retrying without OCR due to error');
        const noOcrOptions = { ...optionsWithDefaults, ocr: false };
        const noOcrOptionsJson = JSON.stringify(noOcrOptions);

        try {
          const { stdout: stdout2, stderr: stderr2 } = await execAsync(
            `${this.pythonCommand} ${wrapperPath} convert "${filePath}" '${noOcrOptionsJson}'`,
            { timeout: 300000 },
          );

          if (stderr2 && stderr2.trim()) {
            this.logger.warn(`[Docling] Warning from Python (retry): ${stderr2}`);
          }

          const result = JSON.parse(stdout2) as DoclingConvertResult;

          if (result.success && result.markdown && this.ocrCleanupService) {
            const cleanupResult = this.ocrCleanupService.ruleBasedCleanup(result.markdown);
            result.markdown = cleanupResult.cleanedText;
          }

          if (fileHash && result.success) {
            this.writeToCache(fileHash, result);
          }

          return { ...result, fromCache: false };
        } catch (retryError) {
          this.logger.error(`[Docling] Retry without OCR also failed: ${this.errorMessage(retryError)}`);

          // Try RapidOCR wrapper as final fallback
          this.logger.log('[Docling] Trying RapidOCR wrapper as final fallback');
          const rapidOcrResult = await this.tryRapidOCR(filePath, fileHash || '');
          if (rapidOcrResult.success && rapidOcrResult.markdown) {
            // Apply cleanup to RapidOCR result
            if (this.ocrCleanupService) {
              const cleanupResult = this.ocrCleanupService.ruleBasedCleanup(rapidOcrResult.markdown);
              rapidOcrResult.markdown = cleanupResult.cleanedText;
            }
            if (fileHash) {
              this.writeToCache(fileHash, rapidOcrResult);
            }
            this.logger.log('[Docling] RapidOCR conversion successful');
            return { ...rapidOcrResult, fromCache: false };
          } else {
            this.logger.error('[Docling] RapidOCR fallback returned no result');
            return this.errorResult(`All conversion methods failed: ${errorMessage}`);
          }
        }
      }

      return this.errorResult(`Conversion failed: ${errorMessage}`);
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

  /**
   * Assess the quality of extracted markdown text
   * Returns a score (0-100) and reason
   */
  private assessMarkdownQuality(markdown: string): { score: number; reason: string } {
    if (!markdown || markdown.trim().length === 0) {
      return { score: 0, reason: 'Empty markdown' };
    }

    const trimmed = markdown.trim();
    const length = trimmed.length;

    // Check if too short
    if (length < 200) {
      return { score: 10, reason: `Too short (${length} chars)` };
    }

    // Count Chinese characters
    const chineseCharMatch = trimmed.match(/[\u4e00-\u9fa5]/g);
    const chineseCount = chineseCharMatch ? chineseCharMatch.length : 0;

    // Count meaningful words (excluding numbers, single chars, etc)
    const lines = trimmed.split('\n').filter(l => l.trim().length > 1);
    const meaningfulLines = lines.filter(l =>
      /[\u4e00-\u9fa5]{2,}|[a-zA-Z]{3,}/.test(l.trim())
    );

    // Calculate Chinese ratio
    const chineseRatio = length > 0 ? chineseCount / length : 0;

    // Score calculation
    let score = 50; // Base score

    // Length score (up to 30 points)
    if (length > 1000) score += 20;
    else if (length > 500) score += 10;
    else if (length < 300) score -= 20;

    // Chinese character score (up to 30 points)
    if (chineseCount > 100) score += 20;
    else if (chineseCount > 50) score += 10;
    else if (chineseCount < 20) score -= 30;

    // Chinese ratio score (up to 20 points)
    if (chineseRatio > 0.3) score += 20;
    else if (chineseRatio > 0.1) score += 10;
    else if (chineseRatio < 0.05) score -= 20;

    // Meaningful lines score
    if (meaningfulLines.length > 20) score += 10;
    else if (meaningfulLines.length < 5) score -= 20;

    // Check for poor quality indicators
    if (trimmed.includes('<!-- image -->') && lines.length < 10) {
      score -= 30;
    }

    // Check if mostly numbers/symbols
    const nonWordChars = trimmed.replace(/[\w\s\u4e00-\u9fa5]/g, '').length;
    if (nonWordChars > length * 0.3) {
      score -= 20;
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    let reason = `Score: ${score}, Chinese: ${chineseCount} (${(chineseRatio * 100).toFixed(1)}%), Lines: ${meaningfulLines.length}`;
    if (score < 30) reason += ' - Poor quality';
    else if (score < 60) reason += ' - Medium quality';
    else reason += ' - Good quality';

    return { score, reason };
  }

  /**
   * Try RapidOCR wrapper as fallback for better Chinese text recognition
   */
  private async tryRapidOCR(filePath: string, fileHash: string): Promise<DoclingConvertResult> {
    const wrapperPath = this.getEasyOCRWrapperPath();

    try {
      this.logger.log('[Docling] Using RapidOCR for better Chinese text recognition');
      const { stdout, stderr } = await execAsync(
        `${this.pythonCommand} ${wrapperPath} "${filePath}"`,
        { timeout: 300000 },
      );

      if (stderr && stderr.trim()) {
        this.logger.warn(`[Docling] RapidOCR warning: ${stderr}`);
      }

      const result = JSON.parse(stdout) as DoclingConvertResult;
      return result;
    } catch (error) {
      this.logger.error(`[Docling] RapidOCR fallback failed: ${this.errorMessage(error)}`);
      return this.errorResult(`RapidOCR fallback failed: ${this.errorMessage(error)}`);
    }
  }

  private getWrapperPath(): string {
    // Path to the Python wrapper script (relative to project root)
    return 'apps/api/src/docling/python/docling_wrapper.py';
  }

  private getEasyOCRWrapperPath(): string {
    // Path to the RapidOCR wrapper script (relative to project root)
    return 'apps/api/src/docling/python/docling_ocr_wrapper.py';
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
