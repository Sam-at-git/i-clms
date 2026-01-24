import { Injectable, Logger } from '@nestjs/common';

/**
 * 语义分段结果
 */
export interface SemanticChunk {
  id: string;
  text: string;
  metadata: {
    type: 'header' | 'article' | 'schedule' | 'financial' | 'party' | 'signature' | 'other';
    title?: string;        // 章节标题
    articleNumber?: string; // 条款编号
    priority: number;      // 优先级（用于排序）
    fieldRelevance: string[]; // 相关字段
  };
  position: {
    start: number;
    end: number;
    pageHint?: number;     // 页码提示
  };
}

/**
 * 语义分段检测结果
 */
export interface SemanticSegmentDetection {
  type: SemanticChunk['metadata']['type'];
  title?: string;
  articleNumber?: string;
  patterns: RegExp[];
  priority: number;
  fieldRelevance: string[];
}

/**
 * 改进的语义分段服务
 *
 * 核心改进：
 * 1. 基于合同结构的语义分段（而非固定长度）
 * 2. 识别章节标题、条款编号
 * 3. 为每个chunk标记相关字段，支持RAG检索
 * 4. 支持页码提示（如果有）
 * 5. 支持最大长度限制，章节过大时按条款二次分割
 */
@Injectable()
export class SemanticChunkerService {
  private readonly logger = new Logger(SemanticChunkerService.name);

  // 默认最大chunk长度（字符数）
  private readonly DEFAULT_MAX_CHUNK_LENGTH = 1000;

  // 章节模式定义
  private readonly SECTION_PATTERNS: SemanticSegmentDetection[] = [
    // 合同头部（最重要，优先级最高）
    {
      type: 'header',
      priority: 100,
      patterns: [
        /^(合同编号|合同名称|甲方|乙方|委托方|受托方|卖方|买方|发包方|承包方)[:：]/,
        /^(合同当事人|签订双方|双方当事人)[:：]/,
        /^(甲方|乙方|委托方|受托方)[:：]/,
      ],
      fieldRelevance: ['contractNo', 'name', 'customerName', 'ourEntity', 'type', 'contractType'],
    },
    // 财务条款
    {
      type: 'financial',
      priority: 90,
      patterns: [
        /^第[一二三四五六七八九十百千]+[条款章][\.、\s]*(合同价格|合同价款|金额|费用|总价|报酬|服务费|咨询费)/,
        /^(合同价格|合同价款|含税金额|不含税金额|总价款|合同总金额)[:：]/,
        /^(支付|付款|结算|开票|税费|税率|币种|货币)[:：]/,
      ],
      fieldRelevance: ['amountWithTax', 'amountWithoutTax', 'taxRate', 'paymentTerms', 'paymentMethod', 'currency'],
    },
    // 时间期限
    {
      type: 'schedule',
      priority: 80,
      patterns: [
        /^第[一二三四五六七八九十百千]+[条款章][\.、\s]*(合同期限|履行期限|有效期|起止时间)/,
        /^(签订日期|生效日期|起始日期|终止日期|到期日期|履行期限|合同期限|有效期)[:：]/,
        /^(期限|有效期|起止|履行期间)[:：]/,
      ],
      fieldRelevance: ['signedAt', 'effectiveAt', 'expiresAt', 'duration'],
    },
    // 主体信息
    {
      type: 'party',
      priority: 95,
      patterns: [
        /^第[一二三四五六七八九十百千]+[条款章][\.、\s]*(双方主体|当事人|甲乙双方)/,
        /^(甲方|乙方|委托方|受托方|发包方|承包方|卖方|买方)[:：]/,
      ],
      fieldRelevance: ['customerName', 'ourEntity', 'partyA', 'partyB'],
    },
    // 签署信息
    {
      type: 'signature',
      priority: 70,
      patterns: [
        /^(法定代表人|授权代表|签字|盖章|签署日期|签订地点)[:：]/,
        /^(甲方代表|乙方代表|委托方代表|受托方代表)[:：]/,
      ],
      fieldRelevance: ['signedAt', 'signLocation', 'salesPerson', 'legalRepresentative'],
    },
    // 具体条款
    {
      type: 'article',
      priority: 50,
      patterns: [
        /^第[一二三四五六七八九十百千\d]+[条款章][\.、\s]/,
        /^\d+\.[\s\S]/, // 数字编号
      ],
      fieldRelevance: [],
    },
  ];

  // 页面分隔符（PDF常见）
  private readonly PAGE_BREAK_PATTERNS = [
    /\f/, // 换页符
    /---+\s*Page\s*\d+\s*---+/i,
    /第\s*\d+\s*页/,
  ];

  /**
   * 主方法：对合同文本进行语义分段
   *
   * 分段策略（按优先级）：
   * 1. 优先按Markdown章节标题分割（#, ##, ###等）
   * 2. 如果无法识别章节，按合同结构切分（header/financial/schedule/party/article）
   * 3. 章节过长时按条款二次分割，确保不超过maxLength
   *
   * @param text 合同全文（Markdown格式）
   * @param minChunkSize 最小chunk大小（防止过小的片段）
   * @param maxLength 最大chunk长度（默认1000字符）
   * @returns 语义分段的chunk数组
   */
  chunkBySemanticStructure(text: string, minChunkSize = 500, maxLength = this.DEFAULT_MAX_CHUNK_LENGTH): SemanticChunk[] {
    this.logger.log(`[SemanticChunking] Starting: ${text.length} chars, maxLength: ${maxLength}`);

    // 尝试按章节结构分割（优先）
    const chapterChunks = this.chunkByChapterStructure(text);
    if (chapterChunks.length > 1) {
      this.logger.log(`[SemanticChunking] Using chapter-based splitting: ${chapterChunks.length} chapters`);

      // 先添加元数据
      let chunks = this.enrichChunksWithMetadata(chapterChunks);

      // 检查并分割过长的章节
      chunks = this.splitLongChucks(chunks, maxLength);

      return chunks;
    }

    // 如果没有识别出章节，回退到按合同结构分割
    this.logger.log(`[SemanticChunking] No chapters found, using structure-based splitting`);
    return this.chunkByContractStructure(text, minChunkSize, maxLength);
  }

  /**
   * 按Markdown章节标题分割
   *
   * 识别以下格式：
   * - # 一级标题（第X章）
   * - ## 二级标题（第X条）
   * - ### 三级标题（第X款）
   *
   * @param text Markdown文本
   * @returns 章节分段的chunk数组
   */
  private chunkByChapterStructure(text: string): Array<{ text: string; title?: string; level: number }> {
    const chapters: Array<{ text: string; title?: string; level: number }> = [];

    // Markdown标题模式
    const headerPattern = /^(#{1,3})\s+(.+)$/gm;
    let currentChapter: { text: string; title?: string; level: number } = { text: '', level: 1 };
    let lastEndIndex = 0;
    let match: RegExpExecArray | null;

    // 重置正则表达式索引
    headerPattern.lastIndex = 0;

    while ((match = headerPattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const level = match[1].length; // #数量表示标题级别
      const title = match[2].trim();
      const startIndex = match.index;
      const endIndex = match.index + fullMatch.length;

      // 保存上一个章节（如果有内容）
      if (currentChapter.text.trim().length > 0) {
        currentChapter.text = text.substring(lastEndIndex, startIndex).trim();
        if (currentChapter.text) {
          chapters.push({ ...currentChapter });
        }
      }

      // 开始新章节
      currentChapter = {
        text: '',
        title,
        level,
      };
      lastEndIndex = endIndex;
    }

    // 保存最后一个章节
    if (currentChapter.text.trim().length > 0 || lastEndIndex < text.length) {
      currentChapter.text = text.substring(lastEndIndex).trim();
      if (currentChapter.text) {
        chapters.push({ ...currentChapter });
      }
    }

    return chapters;
  }

  /**
   * 为章节chunks添加语义元数据
   */
  private enrichChunksWithMetadata(
    chapters: Array<{ text: string; title?: string; level: number }>
  ): SemanticChunk[] {
    return chapters.map((chapter, index) => {
      // 根据标题和内容推断语义类型
      const detected = this.inferChunkType(chapter.title || '', chapter.text);

      return {
        id: `chunk-${index}`,
        text: chapter.text,
        metadata: {
          type: detected.type,
          title: chapter.title,
          priority: detected.priority,
          fieldRelevance: detected.fieldRelevance,
        },
        position: {
          start: 0,
          end: chapter.text.length,
        },
      };
    });
  }

  /**
   * 根据标题和内容推断chunk的语义类型
   */
  private inferChunkType(title: string, content: string): SemanticSegmentDetection {
    const combined = `${title} ${content}`.toLowerCase();

    // 检查各种章节类型
    const typeChecks = [
      {
        type: 'header' as const,
        keywords: ['合同编号', '合同名称', '甲方', '乙方', '合同当事人', '签订双方', '双方主体'],
        priority: 100,
        fieldRelevance: ['contractNo', 'name', 'customerName', 'ourEntity', 'contractType'],
      },
      {
        type: 'financial' as const,
        keywords: ['合同价格', '合同价款', '含税金额', '不含税金额', '总价款', '合同总金额', '支付', '付款', '结算', '开票', '税费', '税率'],
        priority: 90,
        fieldRelevance: ['amountWithTax', 'amountWithoutTax', 'taxRate', 'paymentTerms', 'paymentMethod', 'currency'],
      },
      {
        type: 'schedule' as const,
        keywords: ['合同期限', '履行期限', '有效期', '起止时间', '签订日期', '生效日期', '起始日期', '终止日期', '到期日期'],
        priority: 80,
        fieldRelevance: ['signedAt', 'effectiveAt', 'expiresAt', 'duration'],
      },
      {
        type: 'party' as const,
        keywords: ['甲方', '乙方', '委托方', '受托方', '发包方', '承包方', '卖方', '买方'],
        priority: 95,
        fieldRelevance: ['customerName', 'ourEntity', 'partyA', 'partyB'],
      },
      {
        type: 'signature' as const,
        keywords: ['法定代表人', '授权代表', '签字', '盖章', '签署日期', '签订地点'],
        priority: 70,
        fieldRelevance: ['signedAt', 'signLocation', 'salesPerson', 'legalRepresentative'],
      },
    ];

    for (const check of typeChecks) {
      if (check.keywords.some(kw => combined.includes(kw.toLowerCase()))) {
        return {
          type: check.type,
          priority: check.priority,
          fieldRelevance: check.fieldRelevance,
          patterns: [],
          title,
        };
      }
    }

    // 默认为article类型
    return {
      type: 'article',
      priority: 50,
      fieldRelevance: [],
      patterns: [],
      title,
    };
  }

  /**
   * 按合同结构切分（回退方案，当无法识别章节时使用）
   */
  private chunkByContractStructure(text: string, minChunkSize: number, maxLength = this.DEFAULT_MAX_CHUNK_LENGTH): SemanticChunk[] {
    this.logger.log(`[SemanticChunking] Using contract structure splitting`);

    const chunks: SemanticChunk[] = [];
    let currentChunk: Partial<SemanticChunk> = {
      id: `chunk-0`,
      text: '',
      metadata: {
        type: 'other',
        priority: 0,
        fieldRelevance: [],
      },
      position: { start: 0, end: 0 },
    };
    let chunkIndex = 0;
    let currentType: SemanticChunk['metadata']['type'] = 'other';
    let currentTitle: string | undefined;
    let currentArticleNumber: string | undefined;
    let currentPageHint = 1;

    // 按行处理
    const lines = text.split(/\n/);
    let currentPosition = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentPosition;
      const lineEnd = currentPosition + line.length;
      currentPosition = lineEnd + 1; // +1 for newline

      // 检测页面分隔
      const pageMatch = this.detectPageBreak(line);
      if (pageMatch) {
        currentPageHint = pageMatch;
        continue;
      }

      // 检测章节标题/条款
      const detection = this.detectSectionType(line);

      if (detection && this.shouldStartNewChunk(detection, currentChunk, currentPosition - lineStart, minChunkSize)) {
        // 保存当前chunk（如果有内容）
        if (currentChunk.text && currentChunk.text.trim().length > 0) {
          chunks.push(this.finalizeChunk(currentChunk, chunkIndex));
          chunkIndex++;
        }

        // 开始新chunk
        currentType = detection.type;
        currentTitle = detection.title || this.extractTitle(line);
        currentArticleNumber = detection.articleNumber || this.extractArticleNumber(line);

        currentChunk = {
          id: `chunk-${chunkIndex}`,
          text: line + '\n',
          metadata: {
            type: detection.type,
            title: currentTitle,
            articleNumber: currentArticleNumber,
            priority: detection.priority,
            fieldRelevance: detection.fieldRelevance,
          },
          position: {
            start: lineStart,
            end: lineEnd,
            pageHint: currentPageHint,
          },
        };
      } else {
        // 追加到当前chunk
        currentChunk.text = (currentChunk.text || '') + line + '\n';
        currentChunk.position = {
          start: currentChunk.position?.start || 0,
          end: lineEnd,
          pageHint: currentPageHint,
        };
      }
    }

    // 保存最后一个chunk
    if (currentChunk.text && currentChunk.text.trim().length > 0) {
      chunks.push(this.finalizeChunk(currentChunk, chunkIndex));
    }

    // 后处理：合并过小的chunk
    const mergedChunks = this.mergeSmallChunks(chunks, minChunkSize);

    this.logger.log(`[SemanticChunking] Created ${mergedChunks.length} chunks from ${text.length} chars`);

    return mergedChunks;
  }

  /**
   * 检测页面分隔
   */
  private detectPageBreak(line: string): number | null {
    for (const pattern of this.PAGE_BREAK_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const pageMatch = match[0].match(/\d+/);
        return pageMatch ? parseInt(pageMatch[0], 10) : null;
      }
    }
    return null;
  }

  /**
   * 检测当前行的章节类型
   */
  private detectSectionType(line: string): SemanticSegmentDetection | null {
    const trimmedLine = line.trim();

    for (const detection of this.SECTION_PATTERNS) {
      for (const pattern of detection.patterns) {
        if (pattern.test(trimmedLine)) {
          return {
            ...detection,
            title: this.extractTitle(trimmedLine),
            articleNumber: this.extractArticleNumber(trimmedLine),
          };
        }
      }
    }

    return null;
  }

  /**
   * 判断是否应该开始新的chunk
   */
  private shouldStartNewChunk(
    detection: SemanticSegmentDetection,
    currentChunk: Partial<SemanticChunk>,
    lineLength: number,
    minChunkSize: number
  ): boolean {
    const currentSize = currentChunk.text?.length || 0;
    const currentType = currentChunk.metadata?.type;
    const isSameType = currentType === detection.type;
    const isHighPriority = detection.priority >= 80;

    // 如果是相同类型，继续累积（除非当前chunk已经很大）
    if (isSameType && currentSize < minChunkSize) {
      return false;
    }

    // 开始新chunk的条件：
    // 1. 当前chunk已经足够大
    // 2. 检测到高优先级章节且类型发生变化
    // 3. 当前chunk有内容且检测到不同类型的高优先级章节
    return !!(
      currentSize >= minChunkSize ||
      (isHighPriority && !isSameType) ||
      (currentSize > 0 && currentType && currentType !== detection.type && isHighPriority)
    );
  }

  /**
   * 提取标题
   */
  private extractTitle(line: string): string | undefined {
    const trimmed = line.trim();
    if (trimmed.length > 50) return undefined; // 标题不会太长
    return trimmed || undefined;
  }

  /**
   * 提取条款编号
   */
  private extractArticleNumber(line: string): string | undefined {
    const match = line.match(/^第([一二三四五六七八九十百千\d]+)[条款章]/);
    return match ? match[1] : undefined;
  }

  /**
   * 完成chunk的构建
   */
  private finalizeChunk(chunk: Partial<SemanticChunk>, index: number): SemanticChunk {
    return {
      id: chunk.id || `chunk-${index}`,
      text: chunk.text || '',
      metadata: {
        type: chunk.metadata?.type || 'other',
        title: chunk.metadata?.title,
        articleNumber: chunk.metadata?.articleNumber,
        priority: chunk.metadata?.priority || 0,
        fieldRelevance: chunk.metadata?.fieldRelevance || [],
      },
      position: {
        start: chunk.position?.start || 0,
        end: chunk.position?.end || 0,
        pageHint: chunk.position?.pageHint,
      },
    };
  }

  /**
   * 合并过小的chunk到相邻chunk
   *
   * 注意：高优先级的chunk（priority >= 80）不会被合并，以保留其语义类型
   * 此外，只有很小的chunk（< minSize/2）才会被合并
   */
  private mergeSmallChunks(chunks: SemanticChunk[], minSize: number): SemanticChunk[] {
    const merged: SemanticChunk[] = [];
    let i = 0;

    while (i < chunks.length) {
      const current = chunks[i];

      // 如果当前chunk很小且不是高优先级chunk
      if (current.text.length < minSize / 2 && i > 0 && current.metadata.priority < 80) {
        // 合并到前一个chunk
        const prev = merged[merged.length - 1];
        if (prev) {
          prev.text += '\n\n' + current.text;
          prev.position.end = current.position.end;
          // 保留优先级更高的metadata
          if (current.metadata.priority > prev.metadata.priority) {
            prev.metadata = { ...prev.metadata, ...current.metadata };
          }
        } else {
          merged.push(current);
        }
      } else {
        merged.push(current);
      }

      i++;
    }

    return merged;
  }

  /**
   * 分割过长的chunk
   *
   * 如果chunk长度超过maxLength，按以下策略分割：
   * 1. 尝试按条款（第X条、数字编号）分割
   * 2. 如果无法识别条款，按自然段分割
   * 3. 确保不跨自然段
   *
   * @param chunks 原始chunks
   * @param maxLength 最大长度限制
   * @returns 处理后的chunks
   */
  private splitLongChucks(chunks: SemanticChunk[], maxLength: number): SemanticChunk[] {
    const result: SemanticChunk[] = [];

    for (const chunk of chunks) {
      if (chunk.text.length <= maxLength) {
        result.push(chunk);
        continue;
      }

      // Chunk过长，需要分割
      this.logger.debug(`[SemanticChunking] Splitting long chunk ${chunk.id}: ${chunk.text.length} chars > ${maxLength}`);

      const subChunks = this.splitLongChunk(chunk, maxLength);
      result.push(...subChunks);
    }

    // 更新chunk ID
    return result.map((chunk, index) => ({
      ...chunk,
      id: `chunk-${index}`,
    }));
  }

  /**
   * 分割单个过长的chunk
   *
   * @param chunk 过长的chunk
   * @param maxLength 最大长度限制
   * @returns 分割后的子chunks
   */
  private splitLongChunk(chunk: SemanticChunk, maxLength: number): SemanticChunk[] {
    const { text, metadata } = chunk;
    const subChunks: SemanticChunk[] = [];

    // 首先尝试按条款分割
    const articleSplits = this.splitByArticles(text);

    if (articleSplits.length > 1) {
      // 成功按条款分割，合并相邻的小段直到达到maxLength
      let currentText = '';
      let startIndex = 0;

      for (let i = 0; i < articleSplits.length; i++) {
        const split = articleSplits[i];
        const potentialLength = currentText ? currentText.length + split.text.length + 2 : split.text.length;

        if (currentText && potentialLength > maxLength) {
          // 当前段已满，保存并开始新的
          subChunks.push(this.createSubChunk(currentText, metadata, startIndex, startIndex + currentText.length, subChunks.length));
          startIndex += currentText.length + 2;
          currentText = split.text;
        } else {
          // 继续累积
          currentText = currentText ? `${currentText}\n\n${split.text}` : split.text;
        }
      }

      // 保存最后一段
      if (currentText) {
        subChunks.push(this.createSubChunk(currentText, metadata, startIndex, startIndex + currentText.length, subChunks.length));
      }
    } else {
      // 无法按条款分割，按自然段分割
      const paragraphSplits = this.splitByParagraphs(text, maxLength);
      subChunks.push(...paragraphSplits);
    }

    this.logger.debug(`[SemanticChunking] Split into ${subChunks.length} sub-chunks`);
    return subChunks;
  }

  /**
   * 按条款分割文本
   *
   * 识别以下模式：
   * - 第X条、第X章
   * - 数字编号：1.、2.、3. 等
   *
   * @param text 文本
   * @returns 分割后的段萂数组
   */
  private splitByArticles(text: string): Array<{ text: string; articleNumber?: string }> {
    const splits: Array<{ text: string; articleNumber?: string }> = [];

    // 条款分割模式
    const articlePattern = /(?:^|\n)\s*(第[一二三四五六七八九十百千\d]+[条款章]|(?:^|\n)\s*\d+[\.\、]\s+)/gm;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let currentArticleNumber: string | undefined;

    // 重置正则表达式索引
    articlePattern.lastIndex = 0;

    while ((match = articlePattern.exec(text)) !== null) {
      // 保存上一段
      if (match.index > lastIndex) {
        const segmentText = text.substring(lastIndex, match.index).trim();
        if (segmentText) {
          splits.push({ text: segmentText, articleNumber: currentArticleNumber });
        }
      }

      // 提取条款编号
      const articleMatch = match[1].match(/第([一二三四五六七八九十百千\d]+)[条款章]/);
      const numberMatch = match[1].match(/(\d+)[\.\、]/);
      currentArticleNumber = articleMatch ? articleMatch[1] : (numberMatch ? numberMatch[1] : undefined);

      lastIndex = match.index;
    }

    // 保存最后一段
    if (lastIndex < text.length) {
      const segmentText = text.substring(lastIndex).trim();
      if (segmentText) {
        splits.push({ text: segmentText, articleNumber: currentArticleNumber });
      }
    }

    return splits.length > 1 ? splits : [{ text }];
  }

  /**
   * 按自然段分割文本（不跨段）
   *
   * @param text 文本
   * @param maxLength 每段最大长度
   * @returns 分割后的chunks
   */
  private splitByParagraphs(text: string, maxLength: number): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];

    // 按自然段分割（空行或换行）
    const paragraphs = text.split(/\n\s*\n/);

    let currentText = '';
    let currentIndex = 0;

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      const potentialLength = currentText ? currentText.length + trimmedPara.length + 2 : trimmedPara.length;

      if (currentText && potentialLength > maxLength) {
        // 当前段落已满，保存并开始新的
        chunks.push(this.createSubChunk(currentText, {}, currentIndex, currentIndex + currentText.length, chunks.length));
        currentIndex += currentText.length + 2;
        currentText = trimmedPara;
      } else {
        // 继续累积
        currentText = currentText ? `${currentText}\n\n${trimmedPara}` : trimmedPara;
      }
    }

    // 保存最后一段
    if (currentText) {
      chunks.push(this.createSubChunk(currentText, {}, currentIndex, currentIndex + currentText.length, chunks.length));
    }

    return chunks;
  }

  /**
   * 创建子chunk
   *
   * @param text 文本内容
   * @param parentMetadata 父chunk的元数据（继承）
   * @param start 起始位置
   * @param end 结束位置
   * @param index chunk索引
   * @returns 新的SemanticChunk
   */
  private createSubChunk(
    text: string,
    parentMetadata: Partial<SemanticChunk['metadata']>,
    start: number,
    end: number,
    index: number
  ): SemanticChunk {
    return {
      id: `chunk-${index}`,
      text,
      metadata: {
        type: parentMetadata.type || 'article',
        title: parentMetadata.title,
        articleNumber: parentMetadata.articleNumber,
        priority: parentMetadata.priority || 50,
        fieldRelevance: parentMetadata.fieldRelevance || [],
      },
      position: {
        start,
        end,
      },
    };
  }

  /**
   * 根据字段相关性检索chunks
   * 这是RAG的基础：只提取相关chunks，而非全部
   */
  getRelevantChunksForFields(
    chunks: SemanticChunk[],
    fields: string[]
  ): SemanticChunk[] {
    // 计算每个chunk的相关性得分
    const scoredChunks = chunks.map(chunk => {
      const score = chunk.metadata.fieldRelevance.filter(f => fields.includes(f)).length;
      return { chunk, score };
    });

    // 按得分排序，取top chunks
    const sorted = scoredChunks
      .filter(sc => sc.score > 0)
      .sort((a, b) => b.score - a.score);

    // 总是包含header（如果有）
    const header = chunks.find(c => c.metadata.type === 'header');
    if (header && !sorted.some(sc => sc.chunk.id === header.id)) {
      sorted.unshift({ chunk: header, score: 0 });
    }

    // 也包含优先级高的chunk（即使没有直接相关字段）
    const highPriority = chunks
      .filter(c => c.metadata.priority >= 80)
      .filter(c => !sorted.some(sc => sc.chunk.id === c.id));

    for (const hp of highPriority) {
      sorted.push({ chunk: hp, score: 0 });
    }

    this.logger.log(
      `[SemanticChunking] Retrieved ${sorted.length} relevant chunks for fields: ${fields.join(', ')}`
    );

    return sorted.map(sc => sc.chunk);
  }

  /**
   * 获取chunk摘要（用于日志或调试）
   */
  getChunksSummary(chunks: SemanticChunk[]): string {
    return chunks.map(c =>
      `[${c.id}] ${c.metadata.type}${c.metadata.title ? `: ${c.metadata.title}` : ''} ` +
      `(${c.text.length} chars, priority=${c.metadata.priority})`
    ).join('\n');
  }

  /**
   * 仅分段（不提取数据）
   * 这个方法被 OptimizedParserService 调用
   */
  chunkText(text: string, minChunkSize = 500): {
    success: boolean;
    chunks: any[];
    totalLength: number;
    strategy: string;
    summary: string;
  } {
    try {
      const chunks = this.chunkBySemanticStructure(text, minChunkSize);

      return {
        success: true,
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          type: chunk.metadata.type,
          title: chunk.metadata.title,
          articleNumber: chunk.metadata.articleNumber,
          priority: chunk.metadata.priority,
          fieldRelevance: chunk.metadata.fieldRelevance,
          length: chunk.text.length,
          startIndex: chunk.position.start,
          endIndex: chunk.position.end,
          pageHint: chunk.position.pageHint,
        })),
        totalLength: text.length,
        strategy: 'semantic-structure',
        summary: `Created ${chunks.length} semantic chunks from ${text.length} characters`,
      };
    } catch (error) {
      this.logger.error('[SemanticChunker] Chunking failed:', error);
      throw error;
    }
  }
}
