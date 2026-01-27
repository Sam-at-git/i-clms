import { Injectable, Logger } from '@nestjs/common';
import { SemanticChunk } from '../llm-parser/semantic-chunker.service';

/**
 * Markdown格式清理工具
 *
 * 功能：
 * 1. 清理Markdown格式符号（##, **, `等）
 * 2. 保留标签文字（如"甲方："）
 * 3. 为分块添加上下文说明
 *
 * 用途：在送给LLM前清理Markdown格式，避免LLM产生格式干扰
 */
@Injectable()
export class MarkdownCleaner {
  private readonly logger = new Logger(MarkdownCleaner.name);

  /**
   * 清理Markdown格式，返回纯文本
   *
   * 清理规则：
   * 1. 删除 # 标题符号，保留文字
   * 2. 删除 ** 加粗符号，保留文字
   * 3. 删除 _ 斜体符号，保留文字
   * 4. 删除 ` 代码符号，保留文字
   * 5. 删除链接格式，保留文字
   * 6. 删除删除线符号，保留文字
   * 7. 保留标签文字（如"甲方："）
   *
   * @param markdown Markdown格式文本
   * @returns 清理后的纯文本
   */
  static clean(markdown: string): string {
    if (!markdown) return '';

    let cleaned = markdown;

    // 1. 先清理代码块（```code``` → code）- 必须在行内代码之前
    cleaned = cleaned.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, '$1');

    // 2. 清理标题标记（## 标题 → 标题）
    cleaned = cleaned.replace(/^(#{1,6})\s+/gm, '');

    // 3. 清理加粗标记（**文字** → 文字）
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
    cleaned = cleaned.replace(/__(.+?)__/g, '$1');

    // 4. 清理斜体标记（*文字* → 文字），但要小心处理 ** 已经处理过的
    cleaned = cleaned.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1');
    cleaned = cleaned.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '$1');

    // 5. 清理行内代码（`code` → code）
    cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

    // 6. 清理链接（[文字](url) → 文字）
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 7. 清理删除线（~~文字~~ → 文字）
    cleaned = cleaned.replace(/~~(.+?)~~/g, '$1');

    // 8. 清理水平线（--- 或 ***）
    cleaned = cleaned.replace(/^(\s*)([-*]{3,})\s*$/gm, '$1');

    // 9. 清理列表标记（- 或 * 或 + 开头的列表项，去除标记）
    cleaned = cleaned.replace(/^(\s*)[-*+]\s+/gm, '$1• '); // 替换为项目符号

    // 10. 清理多余空行（超过2个连续换行压缩为2个）
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 11. 清理行首行尾空白
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

    // 12. 移除首尾的空行
    cleaned = cleaned.replace(/^\n+|\n+$/g, '');

    return cleaned;
  }

  /**
   * 清理并添加分块上下文说明
   *
   * 为每个分块添加：
   * - 合同名称（如果有）
   * - 章节名称（如果有）
   * - 位置提示（开始/中间/结尾）
   *
   * @param chunk 语义分块
   * @param fullText 完整文本（用于计算位置）
   * @param contractName 合同名称（可选）
   * @returns 带上下文的清理文本
   */
  static cleanWithContext(
    chunk: SemanticChunk,
    fullText: string,
    contractName?: string
  ): string {
    const cleanedText = this.clean(chunk.text);

    // 构建上下文说明
    const contextParts: string[] = [];

    // 添加合同名称
    if (contractName) {
      contextParts.push(`合同名称：《${contractName}》`);
    }

    // 添加章节名称
    if (chunk.metadata.title) {
      contextParts.push(`当前章节：${chunk.metadata.title}`);
    }

    // 添加位置提示
    const position = this.getPositionHint(chunk, fullText.length);
    contextParts.push(`位置：${position}`);

    // 添加分块类型
    const typeLabel = this.getTypeLabel(chunk.metadata.type);
    contextParts.push(`类型：${typeLabel}`);

    // 组合上下文和文本
    const contextHeader = contextParts.join('，');
    return `【${contextHeader}】\n\n${cleanedText}`;
  }

  /**
   * 获取位置提示
   *
   * @param chunk 分块
   * @param fullTextLength 完整文本长度
   * @returns 位置描述（开始/中间/结尾）
   */
  private static getPositionHint(chunk: SemanticChunk, fullTextLength: number): string {
    const relativePosition = chunk.position.start / fullTextLength;

    if (relativePosition < 0.3) {
      return '文档开始部分';
    } else if (relativePosition > 0.7) {
      return '文档结尾部分';
    } else {
      return '文档中间部分';
    }
  }

  /**
   * 获取类型标签
   *
   * @param type 分块类型
   * @returns 中文类型描述
   */
  private static getTypeLabel(type: SemanticChunk['metadata']['type']): string {
    const typeLabels: Record<SemanticChunk['metadata']['type'], string> = {
      header: '合同头部',
      article: '条款内容',
      schedule: '时间期限',
      financial: '财务条款',
      party: '当事人信息',
      signature: '签署信息',
      other: '其他内容',
    };
    return typeLabels[type] || '其他内容';
  }

  /**
   * 智能清理：针对合同场景的优化清理
   *
   * 特殊处理：
   * 1. 保留重要标签文字（甲方：、乙方：、合同编号：等）
   * 2. 清理表格格式，保留表格内容
   * 3. 处理复杂的嵌套Markdown格式
   *
   * @param markdown Markdown格式文本
   * @returns 清理后的纯文本
   */
  static cleanForContract(markdown: string): string {
    if (!markdown) return '';

    let cleaned = markdown;

    // 1. 先处理表格（Markdown表格格式）
    cleaned = this.cleanTable(cleaned);

    // 2. 使用基础清理
    cleaned = this.clean(cleaned);

    // 3. 特殊处理：恢复可能被误删的重要标签
    cleaned = this.restoreImportantLabels(cleaned);

    return cleaned;
  }

  /**
   * 清理Markdown表格，保留内容
   *
   * 表格格式：
   * | 列1 | 列2 | 列3 |
   * |-----|-----|-----|
   * | 值1 | 值2 | 值3 |
   *
   * 转换为：
   * 列1    列2    列3
   * 值1    值2    值3
   */
  private static cleanTable(markdown: string): string {
    // 匹配表格块
    const tablePattern = /^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)+)/gm;

    return markdown.replace(tablePattern, (_match: string, header: string, _separator: string, body: string) => {
      // 处理表头
      const headerCells = header.split('|').filter((c: string) => c.trim());
      const cleanedHeader = headerCells.map((c: string) => c.trim()).join('    ');

      // 处理表体
      const rows = body.trim().split('\n');
      const cleanedRows = rows.map((row: string) => {
        const cells = row.split('|').filter((c: string) => c.trim());
        return cells.map((c: string) => c.trim()).join('    ');
      });

      return [cleanedHeader, ...cleanedRows].join('\n');
    });
  }

  /**
   * 恢复可能被误删的重要标签
   *
   * 在清理过程中，某些重要标签可能被误删（如"甲方："中的冒号）
   * 这个方法用于恢复这些标签
   */
  private static restoreImportantLabels(text: string): string {
    // 确保重要标签后有冒号
    const importantLabels = [
      '甲方', '乙方', '委托方', '受托方', '发包方', '承包方',
      '合同编号', '合同名称', '签订日期', '生效日期', '终止日期',
      '合同金额', '含税金额', '不含税金额', '税率', '付款方式',
      '付款条件', '支付方式', '结算方式', '币种', '货币',
      '合同期限', '有效期', '履行期限', '项目名称', '服务内容',
    ];

    let restored = text;

    for (const label of importantLabels) {
      // 匹配标签后面可能没有冒号或被错误分隔的情况
      const pattern = new RegExp(`(${label})\\s*[:：]?\\s*`, 'g');
      restored = restored.replace(pattern, `$1：`);
    }

    return restored;
  }

  /**
   * 清理Markdown标题，但保留标题层级信息
   *
   * 返回格式：
   * [一级标题] 标题文字
   * [二级标题] 标题文字
   *
   * @param markdown Markdown格式文本
   * @returns 带层级标记的文本
   */
  static cleanWithHeaderLevel(markdown: string): string {
    if (!markdown) return '';

    const headerPattern = /^(#{1,6})\s+(.+)$/gm;
    const levelLabels = ['一级标题', '二级标题', '三级标题', '四级标题', '五级标题', '六级标题'];

    return markdown.replace(headerPattern, (_match: string, hashes: string, title: string) => {
      const level = hashes.length;
      const levelLabel = levelLabels[level - 1] || `${level}级标题`;
      return `[${levelLabel}] ${title}`;
    });
  }

  /**
   * 提取纯文本（去除所有Markdown格式，用于搜索/索引）
   *
   * 与 clean() 的区别：
   * - clean() 保留段落结构
   * - extractPlainText() 返回连续的纯文本，适合搜索
   *
   * @param markdown Markdown格式文本
   * @returns 纯文本（连续）
   */
  static extractPlainText(markdown: string): string {
    const cleaned = this.clean(markdown);
    // 移除所有换行，合并为连续文本
    return cleaned.replace(/\s+/g, ' ').trim();
  }
}
