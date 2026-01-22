import { Injectable, Logger } from '@nestjs/common';

export interface TextChunk {
  id: string;
  text: string;
  purpose: string; // 描述这个chunk的目的
  targetFields: string[]; // 期望从这个chunk提取的字段
  startIndex: number;
  endIndex: number;
}

export interface ChunkingResult {
  strategy: 'single' | 'multi-segment';
  chunks: TextChunk[];
  totalLength: number;
  reason: string;
}

/**
 * LLM分段提取策略
 * 根据文档长度和缺失字段，智能分段以优化LLM提取
 */
@Injectable()
export class ChunkingStrategyService {
  private readonly logger = new Logger(ChunkingStrategyService.name);

  // 阈值配置
  private readonly SINGLE_CALL_MAX_LENGTH = 3000; // 单次调用最大字符数
  private readonly CHUNK_SIZE = 8000; // 分段大小
  private readonly CHUNK_OVERLAP = 500; // 重叠区域，防止信息被截断

  /**
   * 决定分段策略
   */
  determineStrategy(
    text: string,
    priorityFields: string[]
  ): ChunkingResult {
    const totalLength = text.length;

    // 策略1: 短文本，单次LLM调用
    if (totalLength <= this.SINGLE_CALL_MAX_LENGTH) {
      this.logger.log(`Using SINGLE strategy: text length ${totalLength} chars`);
      return {
        strategy: 'single',
        chunks: [
          {
            id: 'full',
            text: text,
            purpose: '完整文档提取',
            targetFields: priorityFields,
            startIndex: 0,
            endIndex: totalLength,
          },
        ],
        totalLength,
        reason: `文档长度 ${totalLength} 字符，适合单次LLM调用`,
      };
    }

    // 策略2: 长文本，多段智能分割
    this.logger.log(`Using MULTI-SEGMENT strategy: text length ${totalLength} chars`);
    return this.createSmartChunks(text, priorityFields, totalLength);
  }

  /**
   * 创建智能分段
   * 优先按语义边界分割（段落、章节），而非生硬截断
   */
  private createSmartChunks(
    text: string,
    priorityFields: string[],
    totalLength: number
  ): ChunkingResult {
    const chunks: TextChunk[] = [];

    // 分段策略：按关键信息区域划分
    const segments = [
      {
        id: 'header',
        purpose: '合同头部-基本信息',
        targetFields: ['contractNo', 'name', 'customerName', 'ourEntity', 'type'],
        extractRange: this.findHeaderRange(text),
      },
      {
        id: 'financial',
        purpose: '财务条款',
        targetFields: ['amountWithTax', 'amountWithoutTax', 'taxRate', 'paymentTerms', 'paymentMethod'],
        extractRange: this.findFinancialRange(text),
      },
      {
        id: 'schedule',
        purpose: '时间和期限',
        targetFields: ['signedAt', 'effectiveAt', 'expiresAt', 'duration'],
        extractRange: this.findScheduleRange(text),
      },
      {
        id: 'details',
        purpose: '类型特定详情',
        targetFields: ['milestones', 'rateItems', 'lineItems', 'deliverables'],
        extractRange: this.findDetailsRange(text),
      },
    ];

    // 只创建包含优先字段的chunk
    for (const segment of segments) {
      const hasRelevantFields = segment.targetFields.some(field =>
        priorityFields.includes(field)
      );

      if (hasRelevantFields && segment.extractRange) {
        const { start, end } = segment.extractRange;
        chunks.push({
          id: segment.id,
          text: text.substring(start, end),
          purpose: segment.purpose,
          targetFields: segment.targetFields.filter(f => priorityFields.includes(f)),
          startIndex: start,
          endIndex: end,
        });
      }
    }

    // 如果智能分段失败，降级到简单分段
    if (chunks.length === 0) {
      this.logger.warn('Smart chunking failed, falling back to simple chunking');
      return this.createSimpleChunks(text, priorityFields, totalLength);
    }

    this.logger.log(`Created ${chunks.length} smart chunks: ${chunks.map(c => c.id).join(', ')}`);

    return {
      strategy: 'multi-segment',
      chunks,
      totalLength,
      reason: `文档长度 ${totalLength} 字符，分为 ${chunks.length} 个智能分段`,
    };
  }

  /**
   * 简单分段策略（备用）
   */
  private createSimpleChunks(
    text: string,
    priorityFields: string[],
    totalLength: number
  ): ChunkingResult {
    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < totalLength) {
      const end = Math.min(start + this.CHUNK_SIZE, totalLength);
      const chunkText = text.substring(start, end);

      chunks.push({
        id: `chunk-${chunkIndex}`,
        text: chunkText,
        purpose: `文档片段 ${chunkIndex + 1}`,
        targetFields: priorityFields,
        startIndex: start,
        endIndex: end,
      });

      start = end - this.CHUNK_OVERLAP; // 保留重叠区域
      chunkIndex++;
    }

    return {
      strategy: 'multi-segment',
      chunks,
      totalLength,
      reason: `文档长度 ${totalLength} 字符，简单分割为 ${chunks.length} 段`,
    };
  }

  /**
   * 查找合同头部区域（前30%）
   */
  private findHeaderRange(text: string): { start: number; end: number } | null {
    const headerEnd = Math.min(Math.floor(text.length * 0.3), this.CHUNK_SIZE);
    return { start: 0, end: headerEnd };
  }

  /**
   * 查找财务条款区域
   * 关键词：金额、价款、支付、税
   */
  private findFinancialRange(text: string): { start: number; end: number } | null {
    const keywords = ['金额', '价款', '总价', '合同价', '支付', '付款', '税率', '税金', '费用'];
    return this.findSectionByKeywords(text, keywords);
  }

  /**
   * 查找时间条款区域
   * 关键词：签订、生效、期限、有效期
   */
  private findScheduleRange(text: string): { start: number; end: number } | null {
    const keywords = ['签订日期', '生效日期', '合同期限', '有效期', '起止时间', '履行期限'];
    return this.findSectionByKeywords(text, keywords);
  }

  /**
   * 查找详细条款区域（后50%）
   */
  private findDetailsRange(text: string): { start: number; end: number } | null {
    const detailsStart = Math.floor(text.length * 0.5);
    const detailsEnd = Math.min(detailsStart + this.CHUNK_SIZE, text.length);
    return { start: detailsStart, end: detailsEnd };
  }

  /**
   * 根据关键词查找章节
   */
  private findSectionByKeywords(
    text: string,
    keywords: string[]
  ): { start: number; end: number } | null {
    // 查找第一个关键词出现的位置
    let firstIndex = -1;
    for (const keyword of keywords) {
      const index = text.indexOf(keyword);
      if (index !== -1 && (firstIndex === -1 || index < firstIndex)) {
        firstIndex = index;
      }
    }

    if (firstIndex === -1) return null;

    // 提取该位置前后的文本
    const start = Math.max(0, firstIndex - 500);
    const end = Math.min(text.length, firstIndex + this.CHUNK_SIZE);

    return { start, end };
  }
}
