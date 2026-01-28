import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LlmClientService } from '../llm-parser/llm-client.service';

/**
 * OCR 清洗结果
 */
export interface OcrCleanupResult {
  cleanedText: string;
  originalLength: number;
  cleanedLength: number;
  linesRemoved: number;
  corrections: string[];
  method: 'rule' | 'llm' | 'hybrid';
  llmTokensUsed?: number;
}

/**
 * OCR 清洗服务
 *
 * 功能：
 * 1. 规则清洗：删除无效行、合并断行、字符纠错
 * 2. LLM 清洗：调用 LLM 修复 OCR 错误
 *
 * 用途：提高 Docling OCR 生成文本的质量，为后续 LLM 解析提供更干净的输入
 */
@Injectable()
export class OcrCleanupService implements OnModuleInit {
  private readonly logger = new Logger(OcrCleanupService.name);
  private llmAvailable = false;
  private llmCheckDone = false;

  constructor(private readonly llmClient: LlmClientService) {}

  async onModuleInit(): Promise<void> {
    // 异步检查 LLM 是否可用，不阻塞启动
    this.checkLlmAvailabilityInBackground();
  }

  /**
   * 后台检查 LLM 可用性（不阻塞模块初始化）
   */
  private checkLlmAvailabilityInBackground(): void {
    // 使用 setTimeout 让检查在后台进行
    setTimeout(async () => {
      try {
        // 设置超时保护（10秒）
        const timeoutPromise = new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('LLM check timeout')), 10000),
        );

        this.llmAvailable = await Promise.race([
          this.llmClient.isAvailable(),
          timeoutPromise,
        ]) as boolean;

        if (this.llmAvailable) {
          this.logger.log('LLM available for OCR cleanup');
        } else {
          this.logger.warn('LLM not available, only rule-based cleanup will work');
        }
      } catch (error) {
        this.logger.warn('LLM availability check failed, only rule-based cleanup will work');
        this.llmAvailable = false;
      } finally {
        this.llmCheckDone = true;
      }
    }, 100);
  }

  /**
   * 规则清洗（快速、免费）
   *
   * 清理规则：
   * 1. 删除页眉页脚重复内容
   * 2. 删除页码行
   * 3. 删除纯符号/空白行
   * 4. 合并断行（段落内不完整的行）
   * 5. 常见 OCR 字符纠错
   *
   * @param markdown OCR 生成的 Markdown 文本
   * @returns 清洗结果
   */
  ruleBasedCleanup(markdown: string): OcrCleanupResult {
    if (!markdown || markdown.trim().length === 0) {
      return {
        cleanedText: '',
        originalLength: 0,
        cleanedLength: 0,
        linesRemoved: 0,
        corrections: [],
        method: 'rule',
      };
    }

    const originalLength = markdown.length;
    const corrections: string[] = [];
    let lines = markdown.split('\n');
    const originalLineCount = lines.length;

    // 步骤 1: 删除无效行
    lines = this.removeInvalidLines(lines, corrections);

    // 步骤 2: 合并断行
    lines = this.mergeBrokenLines(lines, corrections);

    // 步骤 3: 字符纠错
    const cleanedText = this.correctCharacters(lines.join('\n'), corrections);

    const linesRemoved = originalLineCount - lines.length;
    const cleanedLength = cleanedText.length;

    this.logger.debug(
      `[RuleBasedCleanup] Removed ${linesRemoved} lines, ${corrections.length} corrections, ` +
        `size: ${originalLength} → ${cleanedLength}`,
    );

    return {
      cleanedText,
      originalLength,
      cleanedLength,
      linesRemoved,
      corrections,
      method: 'rule',
    };
  }

  /**
   * LLM 清洗（高质量、有成本）
   *
   * 调用 LLM 修复 OCR 错误，保持合同语义不变
   *
   * @param markdown OCR 生成的 Markdown 文本
   * @returns 清洗结果
   */
  async llmCleanup(markdown: string): Promise<OcrCleanupResult> {
    if (!markdown || markdown.trim().length === 0) {
      return {
        cleanedText: '',
        originalLength: 0,
        cleanedLength: 0,
        linesRemoved: 0,
        corrections: [],
        method: 'llm',
      };
    }

    if (!this.llmAvailable) {
      this.logger.warn('LLM not available, falling back to rule-based cleanup');
      return this.ruleBasedCleanup(markdown);
    }

    const originalLength = markdown.length;

    try {
      const systemPrompt = `你是一个专业的合同文档 OCR 后处理专家。

你的任务是修复 OCR（光学字符识别）生成的合同文本中的错误，同时保持合同的法律语义和结构不变。

具体要求：
1. 修复常见的 OCR 识别错误（如 0/O 混淆、1/l/I 混淆、5/S 混淆等）
2. 删除页码、页眉页脚等重复噪音内容
3. 合并被错误断开的行（保持句子完整性）
4. 保留所有 Markdown 格式（标题、表格、列表等）
5. 保持合同的原始结构和布局
6. 不要改变任何金额、日期、编号等关键数据
7. 保持所有专业术语和法律用语不变

直接返回修复后的 Markdown 文本，不要添加任何解释或说明。`;

      const userPrompt = `请修复以下 OCR 生成的合同文本中的错误：

\`\`\`markdown
${markdown}
\`\`\`

返回修复后的完整 Markdown 文本。`;

      const response = await this.llmClient.complete({
        systemPrompt,
        userContent: userPrompt,
        temperature: 0.1, // 低温度以提高一致性
        maxTokens: Math.max(markdown.length + 1000, 4000),
      });

      this.logger.log(
        `[LLMCleanup] Cleaned with ${response.tokensUsed} tokens, size: ${originalLength} → ${response.content.length}`,
      );

      return {
        cleanedText: response.content,
        originalLength,
        cleanedLength: response.content.length,
        linesRemoved: 0, // LLM 处理无法准确统计
        corrections: ['LLM 全面修复'],
        method: 'llm',
        llmTokensUsed: response.tokensUsed,
      };
    } catch (error) {
      this.logger.error(`LLM cleanup failed: ${error}`, error);
      // 失败时回退到规则清洗
      this.logger.warn('Falling back to rule-based cleanup');
      return this.ruleBasedCleanup(markdown);
    }
  }

  /**
   * 混合清洗：先规则清洗，用户可选择是否 LLM 进一步清洗
   *
   * @param markdown OCR 生成的 Markdown 文本
   * @param useLlm 是否使用 LLM 清洗
   * @returns 清洗结果
   */
  async hybridCleanup(markdown: string, useLlm = false): Promise<OcrCleanupResult> {
    // 先执行规则清洗
    const ruleResult = this.ruleBasedCleanup(markdown);

    if (!useLlm) {
      return ruleResult;
    }

    // 再执行 LLM 清洗
    const llmResult = await this.llmCleanup(ruleResult.cleanedText);

    return {
      ...llmResult,
      originalLength: ruleResult.originalLength,
      corrections: [...ruleResult.corrections, ...llmResult.corrections],
      method: 'hybrid',
    };
  }

  /**
   * 删除无效行
   */
  private removeInvalidLines(lines: string[], corrections: string[]): string[] {
    const pageHeaderFooterSet = new Set<string>(); // 用于检测重复的页眉页脚

    return lines.filter((line, index) => {
      const trimmed = line.trim();

      // 空行保留（用于段落分隔），但连续多个空行压缩为一个
      if (trimmed === '') {
        return index === 0 || lines[index - 1].trim() !== '';
      }

      // 删除页码行：更精确地匹配页码模式，避免误删合同条款编号
      // 匹配：- 12 -、第5页、Page 3 of 10、- 12 - 等格式
      // 不匹配：1.1 xxx、1.2 xxx、2.3 xxx 等条款编号
      const pageNumberPatterns = [
        /^-\s*\d+\s*-$/,                    // - 12 -
        /^-\s*\d+\s*-\s*$/,                 // - 12 - （尾部可能有空格）
        /^第?\s*\d+\s*页$/,                  // 第5页、 5页
        /^第\s*\d+\s*页\s*$/,                // 第 5 页
        /^Page\s*\d+\s*of\s*\d+$/i,         // Page 3 of 10
        /^\d+\s*\/\s*\d+$/,                 // 3 / 10
        /^[-\s]*\d+[-\s]*$/,                 // 单独的数字或带横线的数字（如 " 5 "、" - 5 - "）
      ];

      // 只有当行非常短（不超过20字符）且匹配页码模式时才删除
      if (trimmed.length <= 20 && pageNumberPatterns.some(p => p.test(trimmed))) {
        corrections.push(`删除页码行: ${trimmed.substring(0, 30)}`);
        return false;
      }

      // 删除纯符号行（只包含非文字字符）
      if (/^[^\w\u4e00-\u9fa5]+$/.test(trimmed)) {
        corrections.push(`删除符号行: ${trimmed.substring(0, 30)}`);
        return false;
      }

      // 检测并删除重复的页眉页脚（出现3次以上的短行）
      if (trimmed.length > 3 && trimmed.length < 50) {
        pageHeaderFooterSet.add(trimmed);
        if (this.countOccurrences(lines, trimmed) >= 3) {
          // 只在第一次出现时保留，后续删除
          if (this.findNthOccurrence(lines, trimmed, 1) !== index) {
            corrections.push(`删除重复页眉页脚: ${trimmed}`);
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * 合并断行
   *
   * 将被错误断开的行合并，如：
   * "甲方：北京XX科技"
   * "有限公司"
   * → "甲方：北京XX科技有限公司"
   */
  private mergeBrokenLines(lines: string[], corrections: string[]): string[] {
    const merged: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const currentLine = lines[i];
      const trimmedCurrent = currentLine.trim();

      // 跳过空行
      if (trimmedCurrent === '') {
        merged.push(currentLine);
        continue;
      }

      // 检查是否应该与下一行合并
      const shouldMerge =
        i + 1 < lines.length &&
        this.shouldMergeWithNext(trimmedCurrent, lines[i + 1].trim());

      if (shouldMerge) {
        merged.push(trimmedCurrent + lines[i + 1].trim());
        i++; // 跳过下一行
        corrections.push(`合并断行: ${trimmedCurrent.substring(0, 20)}...`);
      } else {
        merged.push(currentLine);
      }
    }

    return merged;
  }

  /**
   * 判断当前行是否应该与下一行合并
   */
  private shouldMergeWithNext(current: string, next: string): boolean {
    if (!next) return false;

    // 下一行是空行，不合并
    if (next.trim() === '') return false;

    // 当前行以非结束标点结尾，且下一行以小写字母开头（可能是被断开的句子）
    if (/[^\.\。\!！\?？\)]$/.test(current) && /^[a-z\u4e00-\u9fa5]/.test(next)) {
      // 当前行不太短，下一行不太长（避免合并列表）
      if (current.length > 5 && next.length < 30) {
        return true;
      }
    }

    // 特殊模式：公司名称、地址等常被断开
    // 如：北京XX科技 + 有限公司
    const companyPrefixPatterns = [
      /科技$|信息$|网络$|数据$|软件$|系统$|技术$/,
      /公司$|有限$|股份$/,
      /北京$|上海$|深圳$|广州$|杭州$/,
    ];
    const companySuffixPatterns = [
      /^有限公司|^股份|^公司|^科技|^信息|^网络/,
    ];

    for (const prefix of companyPrefixPatterns) {
      if (prefix.test(current)) {
        for (const suffix of companySuffixPatterns) {
          if (suffix.test(next)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 字符纠错
   */
  private correctCharacters(text: string, corrections: string[]): string {
    let corrected = text;
    let totalCorrections = 0;

    // 常见 OCR 字符混淆纠错
    const ocrCorrections: Array<[RegExp, string, string]> = [
      // 金额相关的 0/O 纠错 - 只有在明确的金额语境下才纠正
      [/([¥$￥]\s*[\d,]+)\s*O\s*(\d)/g, '$1$2', '金额中O纠正为0'],
      [/(\d+)\s*O\s*(\d+)/g, '$10$2', '数字间O纠正为0'],
      [/(\d+)\s*O/g, '$10', '数字末尾O纠正为0'],

      // 1/l/I 混淆 - 在特定语境下纠正
      [/l(\d{3,})/g, '1$1', '小写l开头的编号纠正为1'],
      [/(合同编号|编号|代码|No)\s*:\s*l/g, '$1: 1', '编号中的l纠正为1'],
      [/l\s*%/g, '1%', 'l%纠正为1%'],

      // 5/S 混淆
      [/(\d)S(\d)/g, '$15$2', '数字间S纠正为5'],
      [/(\d+)S\s*(元|万|千|百)/g, '$15$2', '金额单位前S纠正为5'],

      // 常见中文错别字（OCR 常见错误）
      [/己方/g, '乙方', '己方纠正为乙方'],
      [/甲方:\s*己/g, '甲方: 乙', '甲方:己纠正为甲方:乙'],
    ];

    for (const [pattern, replacement, description] of ocrCorrections) {
      const before = corrected;
      corrected = corrected.replace(pattern, replacement);
      if (before !== corrected) {
        totalCorrections++;
      }
    }

    if (totalCorrections > 0) {
      corrections.push(`字符纠错: ${totalCorrections} 处`);
    }

    return corrected;
  }

  /**
   * 计算行在数组中出现的次数
   */
  private countOccurrences(lines: string[], target: string): number {
    return lines.filter((line) => line.trim() === target).length;
  }

  /**
   * 查找第 n 次出现的位置（0-based）
   */
  private findNthOccurrence(lines: string[], target: string, n: number): number {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === target) {
        if (count === n) return i;
        count++;
      }
    }
    return -1;
  }
}
