import { Injectable, Logger } from '@nestjs/common';

// Use the lib version to avoid worker issues in newer Node.js versions
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

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
    try {
      const data = await pdfParse(buffer, {
        // Disable worker to avoid DataCloneError in newer Node.js
        normalizeWhitespace: true,
      });

      return {
        text: data.text,
        pageCount: data.numpages,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse PDF', error);
      throw new Error(
        `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
