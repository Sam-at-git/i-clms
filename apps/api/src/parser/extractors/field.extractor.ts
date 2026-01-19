import { Injectable, Logger } from '@nestjs/common';
import { ExtractedFields, FieldMatch } from '../dto';

interface FieldRule {
  name: string;
  patterns: RegExp[];
  postProcess?: (value: string) => string;
}

@Injectable()
export class FieldExtractor {
  private readonly logger = new Logger(FieldExtractor.name);

  private readonly fieldRules: FieldRule[] = [
    {
      name: 'contractNumber',
      patterns: [
        /合同编号[：:]\s*([A-Za-z0-9\-_]+)/,
        /编号[：:]\s*([A-Za-z0-9\-_]+)/,
        /Contract\s*No\.?\s*[：:]?\s*([A-Za-z0-9\-_]+)/i,
      ],
    },
    {
      name: 'contractName',
      patterns: [
        /合同名称[：:]\s*(.+?)(?:\n|$)/,
        /项目名称[：:]\s*(.+?)(?:\n|1\.|第|$)/,  // 修复：避免匹配到后续章节内容
        /《(.+?)》/,
        /^\s*(.+?合同)\s*$/m,  // 匹配单独一行的合同标题
      ],
      postProcess: (value) => value.trim().replace(/[》]$/, '').replace(/\d+\.\d+.*$/, '').trim(),
    },
    {
      name: 'partyA',
      patterns: [
        // 优先：甲方标题 + 换行 + 公司名称（处理标题和内容分两行的情况）
        /甲方[（(]?[^）)]*[）)]?[\s\S]{0,50}?公司名称[：:]\s*(.+?)(?:\n|统一|地址|法定|$)/,
        // 其次：直接跟在甲方后面的内容（老格式）
        /甲方[（(]?.*?[）)]?[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        // 备选：委托方等同义词
        /委托方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        /买方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        /发包方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
      ],
      postProcess: (value) => value.trim().replace(/[（(].+[）)]$/, '').trim(),
    },
    {
      name: 'partyB',
      patterns: [
        // 优先：乙方标题 + 换行 + 公司名称（处理标题和内容分两行的情况）
        /乙方[（(]?[^）)]*[）)]?[\s\S]{0,50}?公司名称[：:]\s*(.+?)(?:\n|统一|地址|法定|$)/,
        // 其次：直接跟在乙方后面的内容（老格式）
        /乙方[（(]?.*?[）)]?[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        // 备选：受托方等同义词
        /受托方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        /卖方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        /承包方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
      ],
      postProcess: (value) => value.trim().replace(/[（(].+[）)]$/, '').trim(),
    },
    {
      name: 'signDate',
      patterns: [
        /签订日期[：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
        /签署日期[：:]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
        /(\d{4})年(\d{1,2})月(\d{1,2})日/,
      ],
      postProcess: (value) => {
        // Normalize date format
        const match = value.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
        if (match) {
          const [, year, month, day] = match;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return value;
      },
    },
    {
      name: 'amount',
      patterns: [
        /合同金额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
        /总金额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
        /合同总价[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
        /金额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
      ],
      postProcess: (value) => value.replace(/,/g, ''),
    },
    {
      name: 'validPeriod',
      patterns: [
        /有效期[：:]\s*(.+?)(?:\n|$)/,
        /合同期限[：:]\s*(.+?)(?:\n|$)/,
        /服务期限[：:]\s*(.+?)(?:\n|$)/,
        /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)\s*[至到]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
      ],
    },
  ];

  extract(text: string): ExtractedFields {
    const rawMatches: FieldMatch[] = [];
    const result: ExtractedFields = {
      rawMatches,
    };

    for (const rule of this.fieldRules) {
      const match = this.findMatch(text, rule);
      if (match) {
        rawMatches.push(match);
        this.setFieldValue(result, rule.name, match.value);
      }
    }

    this.logger.debug(`Extracted ${rawMatches.length} fields from text`);
    return result;
  }

  private setFieldValue(
    result: ExtractedFields,
    fieldName: string,
    value: string
  ): void {
    switch (fieldName) {
      case 'contractNumber':
        result.contractNumber = value;
        break;
      case 'contractName':
        result.contractName = value;
        break;
      case 'partyA':
        result.partyA = value;
        break;
      case 'partyB':
        result.partyB = value;
        break;
      case 'signDate':
        result.signDate = value;
        break;
      case 'amount':
        result.amount = value;
        break;
      case 'validPeriod':
        result.validPeriod = value;
        break;
    }
  }

  private findMatch(text: string, rule: FieldRule): FieldMatch | null {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let value = match[1].trim();
        if (rule.postProcess) {
          value = rule.postProcess(value);
        }

        // Calculate confidence based on pattern specificity
        const confidence = this.calculateConfidence(pattern, value);

        return {
          field: rule.name,
          value,
          confidence,
        };
      }
    }
    return null;
  }

  private calculateConfidence(pattern: RegExp, value: string): number {
    // Base confidence
    let confidence = 0.7;

    // Increase confidence for longer matches (more context)
    if (value.length > 10) confidence += 0.1;
    if (value.length > 20) confidence += 0.05;

    // Decrease confidence for very short matches
    if (value.length < 3) confidence -= 0.2;

    // Check for common false positives
    if (value.includes('...') || value.includes('____')) {
      confidence -= 0.3;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}
