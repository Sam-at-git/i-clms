import { Injectable, Logger } from '@nestjs/common';
import mammoth from 'mammoth';
import PizZip from 'pizzip';
import Docx4js from 'docx4js';

export interface WordExtractResult {
  text: string;
  html: string;
  messages: string[];
}

@Injectable()
export class WordExtractor {
  private readonly logger = new Logger(WordExtractor.name);

  async extract(buffer: Buffer): Promise<WordExtractResult> {
    const errors: string[] = [];

    // 方法1: 尝试使用 mammoth（最佳HTML转换）
    try {
      this.logger.debug('Attempting to parse with mammoth...');
      const [textResult, htmlResult] = await Promise.all([
        mammoth.extractRawText({ buffer }),
        mammoth.convertToHtml({ buffer }),
      ]);

      const messages = [
        ...textResult.messages.map((m) => m.message),
        ...htmlResult.messages.map((m) => m.message),
      ];

      if (textResult.value && textResult.value.trim().length > 0) {
        this.logger.log('Successfully parsed with mammoth');
        return {
          text: textResult.value,
          html: htmlResult.value,
          messages,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Mammoth: ${errorMsg}`);
      this.logger.warn(`Mammoth parsing failed: ${errorMsg}`);
    }

    // 方法2: 尝试使用 docx4js（更宽容的解析器）
    try {
      this.logger.debug('Attempting to parse with docx4js...');
      const docx = await Docx4js.load(buffer);
      const text = this.extractTextFromDocx4js(docx);

      if (text && text.trim().length > 0) {
        this.logger.log('Successfully parsed with docx4js');
        return {
          text,
          html: `<p>${text.replace(/\n/g, '</p><p>')}</p>`,
          messages: ['Parsed using docx4js fallback'],
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Docx4js: ${errorMsg}`);
      this.logger.warn(`Docx4js parsing failed: ${errorMsg}`);
    }

    // 方法3: 尝试使用 PizZip 直接解析 XML
    try {
      this.logger.debug('Attempting to parse with PizZip...');
      const zip = new PizZip(buffer);
      const text = this.extractTextFromZip(zip);

      if (text && text.trim().length > 0) {
        this.logger.log('Successfully parsed with PizZip');
        return {
          text,
          html: `<p>${text.replace(/\n/g, '</p><p>')}</p>`,
          messages: ['Parsed using PizZip XML extraction'],
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`PizZip: ${errorMsg}`);
      this.logger.warn(`PizZip parsing failed: ${errorMsg}`);
    }

    // 所有方法都失败了
    this.logger.error('All parsing methods failed', {
      errors,
      bufferSize: buffer.length,
      bufferStart: buffer.slice(0, 10).toString('hex'),
    });

    throw new Error(
      `Word parsing failed with all methods. Errors:\n${errors.join('\n')}\n\n` +
      `File details: size=${buffer.length} bytes, ` +
      `signature=${buffer.slice(0, 4).toString('hex')}\n\n` +
      `Please ensure the file is a valid DOCX (not DOC) format.`
    );
  }

  private extractTextFromDocx4js(docx: any): string {
    const parts: string[] = [];

    try {
      // 尝试提取主文档内容
      const doc = docx.document;
      if (doc && doc.content) {
        this.traverseDocx4js(doc.content, parts);
      }
    } catch (error) {
      this.logger.warn('Error traversing docx4js structure', error);
    }

    return parts.join('\n');
  }

  private traverseDocx4js(node: any, parts: string[]): void {
    if (!node) return;

    if (typeof node === 'string') {
      parts.push(node);
      return;
    }

    if (node.text) {
      parts.push(node.text);
    }

    if (Array.isArray(node)) {
      node.forEach(child => this.traverseDocx4js(child, parts));
    } else if (node.children) {
      this.traverseDocx4js(node.children, parts);
    } else if (node.content) {
      this.traverseDocx4js(node.content, parts);
    }
  }

  private extractTextFromZip(zip: PizZip): string {
    try {
      // 读取 document.xml
      const documentXml = zip.file('word/document.xml')?.asText();
      if (!documentXml) {
        throw new Error('No word/document.xml found in ZIP');
      }

      // 提取所有 <w:t> 标签中的文本
      const textMatches = documentXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      const texts = textMatches.map(match => {
        const content = match.match(/>([^<]+)</)?.[1] || '';
        return content;
      });

      return texts.join(' ');
    } catch (error) {
      this.logger.warn('Error extracting text from ZIP', error);
      return '';
    }
  }
}
