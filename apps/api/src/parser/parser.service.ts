import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage';
import { DoclingService } from '../docling/docling.service';
import { PdfExtractor } from './extractors/pdf.extractor';
import { WordExtractor } from './extractors/word.extractor';
import { FieldExtractor } from './extractors/field.extractor';
import { ParseResult, ExtractedFields } from './dto';
import { fileTypeFromBuffer } from 'file-type';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
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
      mkdir(this.tempDir, { recursive: true })
        .then(() => this.logger.debug(`Created temp directory: ${this.tempDir}`))
        .catch((err) => this.logger.warn(`Failed to create temp directory: ${err.message}`));
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
    try {
      // Determine mime type from extension
      const mimeType = this.getMimeTypeFromExtension(objectName);
      if (!mimeType) {
        return {
          success: false,
          error: `Unsupported file type for: ${objectName}`,
        };
      }

      // Download file from storage
      const buffer = await this.storageService.downloadFile(objectName);

      return this.parseBuffer(buffer, mimeType);
    } catch (error) {
      this.logger.error(`Failed to parse document: ${objectName}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
    // Method 1: Try Docling first
    if (this.doclingService.isAvailable()) {
      this.logger.debug('Attempting PDF extraction with Docling...');
      try {
        const tempFile = await this.saveToTempFile(buffer, 'pdf');
        try {
          const result = await this.doclingService.convertToMarkdown(tempFile, {
            preserveHeaders: true,
            withTables: true,
          });
          if (result.success && result.markdown) {
            return {
              text: result.markdown,
              pageCount: result.pages,
              method: 'Docling',
            };
          }
          // Docling returned success=false, fall through to pdf-parse
          this.logger.warn('Docling parsing returned no content, falling back to pdf-parse');
        } finally {
          await this.cleanupTempFile(tempFile);
        }
      } catch (error) {
        this.logger.warn(`Docling extraction failed, falling back to pdf-parse: ${error}`);
        // Fall through to pdf-parse
      }
    } else {
      this.logger.debug('Docling not available, using pdf-parse');
    }

    // Method 2: Fallback to pdf-parse
    this.logger.debug('Attempting PDF extraction with pdf-parse...');
    const pdfResult = await this.pdfExtractor.extract(buffer);
    return {
      text: pdfResult.text,
      pageCount: pdfResult.pageCount,
      method: 'pdf-parse',
    };
  }

  extractFields(text: string): ExtractedFields {
    return this.fieldExtractor.extract(text);
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
