import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../storage';
import { PdfExtractor } from './extractors/pdf.extractor';
import { WordExtractor } from './extractors/word.extractor';
import { FieldExtractor } from './extractors/field.extractor';
import { ParseResult, ExtractedFields } from './dto';

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
      let text: string;
      let pageCount: number | undefined;

      switch (mimeType) {
        case PDF_MIME_TYPE: {
          const pdfResult = await this.pdfExtractor.extract(buffer);
          text = pdfResult.text;
          pageCount = pdfResult.pageCount;
          break;
        }
        case WORD_DOC_MIME_TYPE:
        case WORD_DOCX_MIME_TYPE: {
          const wordResult = await this.wordExtractor.extract(buffer);
          text = wordResult.text;
          break;
        }
        default:
          return {
            success: false,
            error: `Unsupported mime type: ${mimeType}`,
          };
      }

      // Extract fields from text
      const extractedFields = this.fieldExtractor.extract(text);

      return {
        success: true,
        text,
        pageCount,
        extractedFields,
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
