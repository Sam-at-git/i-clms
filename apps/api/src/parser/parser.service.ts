import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage';
import { DoclingService } from '../docling/docling.service';
import { PdfExtractor } from './extractors/pdf.extractor';
import { WordExtractor } from './extractors/word.extractor';
import { FieldExtractor } from './extractors/field.extractor';
import { ParseResult, ExtractedFields } from './dto';
import { fileTypeFromBuffer } from 'file-type';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';

const PDF_MIME_TYPE = 'application/pdf';
const WORD_DOC_MIME_TYPE = 'application/msword';
const WORD_DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);
  private readonly tempDir: string;

  constructor(
    private readonly storageService: StorageService,
    private readonly doclingService: DoclingService,
    private readonly pdfExtractor: PdfExtractor,
    private readonly wordExtractor: WordExtractor,
    private readonly fieldExtractor: FieldExtractor
  ) {
    // Use system temp directory with a subdirectory for our app
    this.tempDir = join(tmpdir(), 'iclms-parser');
    this.ensureTempDir();
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDir(): void {
    if (!existsSync(this.tempDir)) {
      try {
        mkdirSync(this.tempDir, { recursive: true });
        this.logger.debug(`Created temp directory: ${this.tempDir}`);
      } catch (err) {
        this.logger.warn(`Failed to create temp directory: ${err}`);
      }
    }
  }

  /**
   * Save buffer to a temporary file and return the path
   */
  private async saveToTempFile(buffer: Buffer, extension: string): Promise<string> {
    const filename = `${randomUUID()}.${extension}`;
    const filepath = join(this.tempDir, filename);
    await writeFile(filepath, buffer);
    return filepath;
  }

  /**
   * Clean up a temporary file
   */
  private async cleanupTempFile(filepath: string): Promise<void> {
    try {
      await unlink(filepath);
    } catch (err) {
      // Log but don't throw - cleanup failure shouldn't break parsing
      this.logger.warn(`Failed to cleanup temp file ${filepath}: ${err}`);
    }
  }

  async parseDocument(objectName: string): Promise<ParseResult> {
    this.logger.log(`========== 文档解析开始 ==========`);
    this.logger.log(`文件名: ${objectName}`);

    try {
      // Determine mime type from extension
      const mimeType = this.getMimeTypeFromExtension(objectName);
      this.logger.log(`MIME类型: ${mimeType || '(未识别)'}`);

      if (!mimeType) {
        this.logger.error(`不支持的文件类型: ${objectName}`);
        return {
          success: false,
          error: `Unsupported file type for: ${objectName}`,
        };
      }

      // Download file from storage
      this.logger.log(`正在从存储服务下载文件...`);
      const buffer = await this.storageService.downloadFile(objectName);
      this.logger.log(`文件下载完成, 大小: ${buffer.length} 字节`);

      const result = await this.parseBuffer(buffer, mimeType);
      this.logger.log(`========== 文档解析结束 ==========`);
      this.logger.log(`解析结果: ${result.success ? '成功' : '失败'}`);
      if (result.success) {
        this.logger.log(`提取文本长度: ${result.text?.length || 0} 字符`);
        this.logger.log(`页数: ${result.pageCount || '(未知)'}`);
        this.logger.log(`提取字段数: ${Object.keys(result.extractedFields || {}).length}`);
      } else {
        this.logger.error(`解析失败原因: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`文档解析异常: ${errorMsg}`, error instanceof Error ? error.stack : '');
      this.logger.log(`========== 文档解析结束 ==========`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async parseBuffer(buffer: Buffer, mimeType: string): Promise<ParseResult> {
    try {
      // 检测实际文件类型
      const detectedType = await fileTypeFromBuffer(buffer);
      const fileSignature = buffer.slice(0, 8).toString('hex');

      this.logger.debug('File detection', {
        providedMimeType: mimeType,
        detectedMimeType: detectedType?.mime,
        detectedExtension: detectedType?.ext,
        fileSignature,
        bufferSize: buffer.length,
      });

      // 如果检测到的类型与提供的不匹配，发出警告但继续尝试
      if (detectedType && detectedType.mime !== mimeType) {
        this.logger.warn(
          `File type mismatch: provided=${mimeType}, detected=${detectedType.mime}. ` +
          `Will attempt to parse as both types.`
        );
      }

      let text: string;
      let pageCount: number | undefined;
      const errors: string[] = [];

      // 尝试根据检测到的类型解析
      const typesToTry = new Set([mimeType]);
      if (detectedType?.mime) {
        typesToTry.add(detectedType.mime);
      }

      for (const tryType of typesToTry) {
        try {
          switch (tryType) {
            case PDF_MIME_TYPE: {
              // 优先使用 Docling，降级到 pdf-parse
              const pdfResult = await this.extractPdf(buffer);
              text = pdfResult.text;
              pageCount = pdfResult.pageCount;
              this.logger.log(`Successfully extracted as PDF using: ${pdfResult.method}`);
              break;
            }
            case WORD_DOC_MIME_TYPE:
            case WORD_DOCX_MIME_TYPE: {
              this.logger.debug('Attempting Word extraction...');
              const wordResult = await this.wordExtractor.extract(buffer);
              text = wordResult.text;
              this.logger.log('Successfully extracted as Word document');
              break;
            }
            default:
              continue;
          }

          // 如果成功提取到文本，继续处理
          if (text && text.trim().length > 0) {
            // Extract fields from text
            const extractedFields = this.fieldExtractor.extract(text);

            return {
              success: true,
              text,
              pageCount,
              extractedFields,
            };
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${tryType}: ${errorMsg}`);
          this.logger.warn(`Failed to parse as ${tryType}: ${errorMsg}`);
        }
      }

      // 所有尝试都失败了
      return {
        success: false,
        error:
          `Failed to parse document with all attempted types.\n` +
          `Provided type: ${mimeType}\n` +
          `Detected type: ${detectedType?.mime || 'unknown'}\n` +
          `File signature: ${fileSignature}\n` +
          `Errors:\n${errors.join('\n')}\n\n` +
          `Please ensure the file is a valid PDF or DOCX format.`,
      };
    } catch (error) {
      this.logger.error('Failed to parse buffer', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract PDF with Docling (preferred) or fallback to pdf-parse
   */
  private async extractPdf(buffer: Buffer): Promise<{ text: string; pageCount: number; method: string }> {
    this.logger.log(`[PDF提取] 开始, 文件大小: ${buffer.length} 字节`);

    // Method 1: Try Docling first
    if (this.doclingService.isAvailable()) {
      this.logger.log('[PDF提取] 尝试使用 Docling...');
      try {
        const tempFile = await this.saveToTempFile(buffer, 'pdf');
        this.logger.log(`[PDF提取] 临时文件: ${tempFile}`);
        try {
          const result = await this.doclingService.convertToMarkdown(tempFile, {
            preserveHeaders: true,
            withTables: true,
          });
          if (result.success && result.markdown) {
            this.logger.log(`[PDF提取] Docling 成功, 提取 ${result.markdown.length} 字符, ${result.pages} 页`);
            return {
              text: result.markdown,
              pageCount: result.pages,
              method: 'Docling',
            };
          }
          // Docling returned success=false, fall through to pdf-parse
          this.logger.warn('[PDF提取] Docling 返回空内容, 降级到 pdf-parse');
        } finally {
          await this.cleanupTempFile(tempFile);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[PDF提取] Docling 失败: ${errorMsg}, 降级到 pdf-parse`);
        // Fall through to pdf-parse
      }
    } else {
      this.logger.log('[PDF提取] Docling 不可用, 使用 pdf-parse');
    }

    // Method 2: Fallback to pdf-parse
    this.logger.log('[PDF提取] 尝试使用 pdf-parse...');
    const pdfResult = await this.pdfExtractor.extract(buffer);
    this.logger.log(`[PDF提取] pdf-parse 成功, 提取 ${pdfResult.text.length} 字符, ${pdfResult.pageCount} 页`);
    return {
      text: pdfResult.text,
      pageCount: pdfResult.pageCount,
      method: 'pdf-parse',
    };
  }

  extractFields(text: string): ExtractedFields {
    this.logger.log(`[字段提取] 开始, 文本长度: ${text.length} 字符`);
    const fields = this.fieldExtractor.extract(text);
    const foundFields = Object.entries(fields)
      .filter(([k, v]) => v !== null && v !== undefined && v !== '' && k !== 'rawMatches')
      .map(([k]) => k);
    this.logger.log(`[字段提取] 完成, 找到 ${foundFields.length} 个字段: ${foundFields.join(', ')}`);
    return fields;
  }

  private getMimeTypeFromExtension(filename: string): string | null {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return PDF_MIME_TYPE;
      case 'doc':
        return WORD_DOC_MIME_TYPE;
      case 'docx':
        return WORD_DOCX_MIME_TYPE;
      default:
        return null;
    }
  }
}
