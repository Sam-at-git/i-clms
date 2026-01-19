import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage';
import { PdfExtractor } from './extractors/pdf.extractor';
import { WordExtractor } from './extractors/word.extractor';
import { FieldExtractor } from './extractors/field.extractor';
import { ParseResult, ExtractedFields } from './dto';
import { fileTypeFromBuffer } from 'file-type';

const PDF_MIME_TYPE = 'application/pdf';
const WORD_DOC_MIME_TYPE = 'application/msword';
const WORD_DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly pdfExtractor: PdfExtractor,
    private readonly wordExtractor: WordExtractor,
    private readonly fieldExtractor: FieldExtractor
  ) {}

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
              this.logger.debug('Attempting PDF extraction...');
              const pdfResult = await this.pdfExtractor.extract(buffer);
              text = pdfResult.text;
              pageCount = pdfResult.pageCount;
              this.logger.log('Successfully extracted as PDF');
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
