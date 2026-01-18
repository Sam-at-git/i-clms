import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';

export interface WordExtractResult {
  text: string;
  html: string;
  messages: string[];
}

@Injectable()
export class WordExtractor {
  private readonly logger = new Logger(WordExtractor.name);

  async extract(buffer: Buffer): Promise<WordExtractResult> {
    try {
      const [textResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]);

      const messages = [
        ...textResult.messages.map((m) => m.message),
        ...htmlResult.messages.map((m) => m.message),
      ];

      return {
        text: textResult.value,
        html: htmlResult.value,
        messages,
      };
    } catch (error) {
      this.logger.error('Failed to parse Word document', error);
      throw new Error(
        `Word parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
