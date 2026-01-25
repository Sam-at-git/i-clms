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
        // 支持markdown粗体标记 **合同编号：** CTR-2024-001
        /合同编号[：:]\*{0,2}\s*([A-Za-z0-9\-_]+)/,
        /编号[：:]\*{0,2}\s*([A-Za-z0-9\-_]+)/,
        /Contract\s*No\.?\s*[：:]?\*{0,2}\s*([A-Za-z0-9\-_]+)/i,
      ],
    },
    {
      name: 'contractName',
      patterns: [
        // 支持markdown粗体标记
        /合同名称[：:]\*{0,2}\s*(.+?)(?:\n|$)/,
        /项目名称[：:]\*{0,2}\s*(.+?)(?:\n|1\.|第|$)/,
        /《(.+?)》/,
        // 支持markdown标题格式: ## 人力资源外包框架协议
        /^#{1,6}\s*(.+?(?:合同|协议|合约))\s*$/m,
        // 支持"协议"、"合约"结尾
        /^\s*(.+?(?:合同|协议|合约))\s*$/m,
      ],
      postProcess: (value) => value.trim().replace(/[》]$/, '').replace(/\d+\.\d+.*$/, '').trim(),
    },
    {
      name: 'partyA',
      patterns: [
        // markdown标题格式: ### 甲方（用工方） \n **公司名称：** 杭州某某互联网有限公司
        /#+\s*甲方[（(]?[^）)]*[）)]?[\s\S]{0,100}?\*{0,2}公司名称[：:]\*{0,2}\s*(.+?)(?:\n|统一|地址|法定|$)/,
        // 优先：甲方标题 + 换行 + 公司名称（处理标题和内容分两行的情况）
        /甲方[（(]?[^）)]*[）)]?[\s\S]{0,50}?\*{0,2}公司名称[：:]\*{0,2}\s*(.+?)(?:\n|统一|地址|法定|$)/,
        // 其次：直接跟在甲方后面的内容（老格式）
        /甲方[（(]?.*?[）)]?[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
        // 备选：委托方等同义词（支持markdown）
        /委托方[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
        /买方[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
        /发包方[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
      ],
      postProcess: (value) => value.trim().replace(/[（(].+[）)]$/, '').trim(),
    },
    {
      name: 'partyB',
      patterns: [
        // markdown标题格式: ### 乙方（派遣方） \n **公司名称：** insigma软件有限公司
        /#+\s*乙方[（(]?[^）)]*[）)]?[\s\S]{0,100}?\*{0,2}公司名称[：:]\*{0,2}\s*(.+?)(?:\n|统一|地址|法定|$)/,
        // 优先：乙方标题 + 换行 + 公司名称（处理标题和内容分两行的情况）
        /乙方[（(]?[^）)]*[）)]?[\s\S]{0,50}?\*{0,2}公司名称[：:]\*{0,2}\s*(.+?)(?:\n|统一|地址|法定|$)/,
        // 其次：直接跟在乙方后面的内容（老格式）
        /乙方[（(]?.*?[）)]?[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
        // 备选：受托方等同义词（支持markdown）
        /受托方[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
        /卖方[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
        /承包方[：:]\*{0,2}\s*(.+?)(?:\n|地址|法定|$)/,
      ],
      postProcess: (value) => value.trim().replace(/[（(].+[）)]$/, '').trim(),
    },
    {
      name: 'signDate',
      patterns: [
        // 支持markdown粗体标记
        /签订日期[：:]\*{0,2}\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
        /签署日期[：:]\*{0,2}\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
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
        // 支持markdown粗体标记
        /合同金额[：:]\*{0,2}\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
        /总金额[：:]\*{0,2}\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
        /合同总价[：:]\*{0,2}\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
        /金额[：:]\*{0,2}\s*[¥￥]?\s*([\d,]+\.?\d*)\s*元?/,
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
