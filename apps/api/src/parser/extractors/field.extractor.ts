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
        /项目名称[：:]\s*(.+?)(?:\n|$)/,
        /《(.+?)》/,
      ],
      postProcess: (value) => value.trim().replace(/[》]$/, ''),
    },
    {
      name: 'partyA',
      patterns: [
        /甲方[（(]?.*?[）)]?[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        /委托方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        /买方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
        /发包方[：:]\s*(.+?)(?:\n|地址|法定|$)/,
      ],
      postProcess: (value) => value.trim().replace(/[（(].+[）)]$/, '').trim(),
    },
    {
      name: 'partyB',
      patterns: [
        /乙方[（(]?.*?[）)]?[：:]\s*(.+?)(?:\n|地址|法定|$)/,
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
