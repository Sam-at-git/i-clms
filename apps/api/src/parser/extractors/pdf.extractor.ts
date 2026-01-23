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
  private initialized = false;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker(): void {
    if (this.initialized) return;

    try {
      // Set workerSrc to the actual worker file path for Node.js
      // The legacy build needs the worker.mjs file path
      const workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
      PDFParse.setWorker(workerSrc);
      this.initialized = true;
      this.logger.debug(`PDF.js worker configured: ${workerSrc}`);
    } catch (err) {
      this.logger.warn(`Could not configure PDF.js worker: ${err}`);
      // Continue anyway - the library might still work
    }
  }

  async extract(buffer: Buffer): Promise<PdfExtractResult> {
    let parser: PDFParse | null = null;
    try {
      // Create parser with options
      const options: any = {
        data: buffer,
        // Set verbosity to ERRORS only (0)
        verbosity: 0,
      };

      parser = new PDFParse(options);

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
