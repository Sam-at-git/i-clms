import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: string;
  };
}

@Injectable()
export class PdfExtractor {
  private readonly logger = new Logger(PdfExtractor.name);

  async extract(buffer: Buffer): Promise<PdfExtractResult> {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: buffer });

      const [info, textResult] = await Promise.all([
        parser.getInfo(),
        parser.getText(),
      ]);

      return {
        text: textResult.text,
        pageCount: info.total,
        metadata: {
          title: info.info?.Title,
          author: info.info?.Author,
          creationDate: info.info?.CreationDate?.toISOString?.(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse PDF', error);
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      if (parser) {
        await parser.destroy();
      }
    }
  }
}
