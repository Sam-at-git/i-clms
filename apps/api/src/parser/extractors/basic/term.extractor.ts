import { Injectable, Logger } from '@nestjs/common';

export interface Duration {
  value: number;
  unit: 'day' | 'month' | 'year';
}

export interface RenewalTerms {
  automaticRenewal: boolean;
  renewalTerm: string | null;
  noticePeriod: Duration | null;
}

export interface ContractTerm {
  executionDate: string | null;
  effectiveDate: string | null;
  commencementDate: string | null;
  terminationDate: string | null;
  duration: Duration | null;
  renewal: RenewalTerms | null;
}

@Injectable()
export class TermExtractor {
  private readonly logger = new Logger(TermExtractor.name);

  private readonly datePatterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{4})\/(\d{2})\/(\d{2})/,
  ];

  private readonly patterns = {
    executionDate: [
      /签[署订]日期[：:]\s*/,
      /签[署订]于[：:]\s*/,
      /本合同于\s*/,
      /Execution\s*Date[：:]\s*/i,
      /签署时间[：:]\s*/,
    ],
    effectiveDate: [
      /生效日期[：:]\s*/,
      /自\s*(\d{4}年\d{1,2}月\d{1,2}日)\s*(?:起|开始)?生效/,
      /Effective\s*Date[：:]\s*/i,
      /生效时间[：:]\s*/,
    ],
    terminationDate: [
      /终止日期[：:]\s*/,
      /截止日期[：:]\s*/,
      /有效期至[：:]\s*/,
      /至\s*(\d{4}年\d{1,2}月\d{1,2}日)\s*(?:止|截止|终止)/,
      /Termination\s*Date[：:]\s*/i,
      /到期日期[：:]\s*/,
    ],
    commencementDate: [
      /开始日期[：:]\s*/,
      /起始日期[：:]\s*/,
      /Commencement\s*Date[：:]\s*/i,
      /自\s*(\d{4}年\d{1,2}月\d{1,2}日)\s*起/,
    ],
    duration: [
      /合同期限[为：:]\s*(\d+)\s*(年|个?月|天|日)/,
      /有效期[为：:]\s*(\d+)\s*(年|个?月|天|日)/,
      /期限为\s*(\d+)\s*(年|个?月|天|日)/,
      /服务期限[为：:]\s*(\d+)\s*(年|个?月|天|日)/,
      /Term[：:]\s*(\d+)\s*(year|month|day)s?/i,
    ],
    autoRenewal: [
      /自动续[约期]/,
      /自动延续/,
      /automatic(?:ally)?\s*renew/i,
      /自动延长/,
    ],
    renewalPeriod: [
      /续约\s*(\d+)\s*(年|月|天|日)/,
      /延续\s*(\d+)\s*(年|月|天|日)/,
      /续期\s*(\d+)\s*(年|月|天|日)/,
      /renew(?:al)?[^.]*(\d+)\s*(year|month|day)s?/i,
    ],
    noticePeriod: [
      /提前\s*(\d+)\s*(天|日|个?月|周)\s*(?:书面)?通知/,
      /(\d+)\s*(天|日|个?月|周)\s*前\s*(?:书面)?通知/,
      /notice[^.]*(\d+)\s*(day|month|week)s?\s*(?:in\s*advance|prior)?/i,
    ],
    dateRange: [
      /(\d{4}年\d{1,2}月\d{1,2}日)\s*(?:至|到|—|-)\s*(\d{4}年\d{1,2}月\d{1,2}日)/,
      /(\d{4}-\d{2}-\d{2})\s*(?:至|到|—|-)\s*(\d{4}-\d{2}-\d{2})/,
      /(\d{4}\/\d{2}\/\d{2})\s*(?:至|到|—|-)\s*(\d{4}\/\d{2}\/\d{2})/,
    ],
  };

  extract(text: string): ContractTerm {
    const normalizedText = this.normalizeText(text);

    const dateRange = this.extractDateRange(normalizedText);

    return {
      executionDate: this.extractDateNear(
        normalizedText,
        this.patterns.executionDate,
      ),
      effectiveDate:
        this.extractDateNear(normalizedText, this.patterns.effectiveDate) ||
        (dateRange ? dateRange.start : null),
      commencementDate:
        this.extractDateNear(normalizedText, this.patterns.commencementDate) ||
        (dateRange ? dateRange.start : null),
      terminationDate:
        this.extractDateNear(normalizedText, this.patterns.terminationDate) ||
        (dateRange ? dateRange.end : null),
      duration: this.extractDuration(normalizedText),
      renewal: this.extractRenewalTerms(normalizedText),
    };
  }

  extractWithConfidence(text: string): {
    data: ContractTerm;
    confidence: number;
  } {
    const data = this.extract(text);
    const confidence = this.calculateOverallConfidence(data);

    return { data, confidence };
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/：/g, ':');
  }

  private extractDateNear(
    text: string,
    contextPatterns: RegExp[],
  ): string | null {
    for (const contextPattern of contextPatterns) {
      const contextMatch = text.match(contextPattern);
      if (contextMatch) {
        const startIndex = contextMatch.index || 0;
        const searchText = text.substring(startIndex, startIndex + 100);

        for (const datePattern of this.datePatterns) {
          const dateMatch = searchText.match(datePattern);
          if (dateMatch) {
            return this.normalizeDate(dateMatch);
          }
        }
      }
    }
    return null;
  }

  private extractDateRange(
    text: string,
  ): { start: string; end: string } | null {
    for (const pattern of this.patterns.dateRange) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        const startMatch = match[1].match(this.datePatterns[0]) ||
          match[1].match(this.datePatterns[1]) ||
          match[1].match(this.datePatterns[2]);
        const endMatch = match[2].match(this.datePatterns[0]) ||
          match[2].match(this.datePatterns[1]) ||
          match[2].match(this.datePatterns[2]);

        if (startMatch && endMatch) {
          return {
            start: this.normalizeDate(startMatch),
            end: this.normalizeDate(endMatch),
          };
        }
      }
    }
    return null;
  }

  private normalizeDate(match: RegExpMatchArray): string {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  extractDuration(text: string): Duration | null {
    for (const pattern of this.patterns.duration) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        const value = parseInt(match[1], 10);
        const unit = this.normalizeUnit(match[2]);
        if (value > 0 && unit) {
          return { value, unit };
        }
      }
    }
    return null;
  }

  private normalizeUnit(unit: string): 'day' | 'month' | 'year' | null {
    const unitLower = unit.toLowerCase();

    if (['年', 'year', 'years'].includes(unitLower)) {
      return 'year';
    } else if (['月', 'month', 'months', '个月'].includes(unitLower)) {
      return 'month';
    } else if (['天', '日', 'day', 'days'].includes(unitLower)) {
      return 'day';
    }

    return null;
  }

  extractRenewalTerms(text: string): RenewalTerms | null {
    const hasAutoRenewal = this.patterns.autoRenewal.some((p) => p.test(text));
    if (!hasAutoRenewal) return null;

    return {
      automaticRenewal: true,
      renewalTerm: this.extractRenewalPeriod(text),
      noticePeriod: this.extractNoticePeriod(text),
    };
  }

  private extractRenewalPeriod(text: string): string | null {
    for (const pattern of this.patterns.renewalPeriod) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        return `${match[1]}${this.translateUnit(match[2])}`;
      }
    }
    return null;
  }

  private extractNoticePeriod(text: string): Duration | null {
    for (const pattern of this.patterns.noticePeriod) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        const value = parseInt(match[1], 10);
        const unit = this.normalizeUnit(match[2]);
        if (value > 0 && unit) {
          return { value, unit };
        }
      }
    }
    return null;
  }

  private translateUnit(unit: string): string {
    const unitLower = unit.toLowerCase();

    if (['年', 'year', 'years'].includes(unitLower)) {
      return '年';
    } else if (['月', 'month', 'months', '个月'].includes(unitLower)) {
      return '月';
    } else if (['天', '日', 'day', 'days'].includes(unitLower)) {
      return '日';
    } else if (['周', 'week', 'weeks'].includes(unitLower)) {
      return '周';
    }

    return unit;
  }

  private calculateOverallConfidence(data: ContractTerm): number {
    let score = 0;
    let total = 0;

    const weights = {
      executionDate: 0.2,
      effectiveDate: 0.15,
      commencementDate: 0.15,
      terminationDate: 0.15,
      duration: 0.2,
      renewal: 0.15,
    };

    for (const [field, weight] of Object.entries(weights)) {
      total += weight;
      const value = data[field as keyof ContractTerm];
      if (value !== null && value !== undefined) {
        score += weight;
      }
    }

    return total > 0 ? score / total : 0;
  }
}
