import { Injectable, Logger } from '@nestjs/common';

export interface ContractIdentification {
  contractNumber: string | null;
  contractTitle: string | null;
  contractType: ContractTypeEnum | null;
  subType: string | null;
  versionNumber: string | null;
  effectiveLanguage: 'zh' | 'en' | 'bilingual' | null;
}

export type ContractTypeEnum =
  | 'STAFF_AUGMENTATION'
  | 'PROJECT_OUTSOURCING'
  | 'PRODUCT_SALES'
  | 'MIXED';

interface ExtractionResult {
  value: string | null;
  confidence: number;
}

@Injectable()
export class IdentificationExtractor {
  private readonly logger = new Logger(IdentificationExtractor.name);

  private readonly patterns = {
    contractNumber: [
      /合同编号[：:]\s*([A-Z0-9\-/]+)/i,
      /Contract\s*No[.:]?\s*([A-Z0-9\-/]+)/i,
      /编号[：:]\s*([A-Z0-9\-/]+)/i,
      /合同号[：:]\s*([A-Z0-9\-/]+)/i,
      /协议编号[：:]\s*([A-Z0-9\-/]+)/i,
    ],
    contractTitle: [
      /合同名称[：:]\s*(.+?)(?:\n|$)/,
      /项目名称[：:]\s*(.+?)(?:\n|第|$)/,
      /《(.+?(?:合同|协议))》/,
      /^(.+?(?:合同|协议|Contract|Agreement))$/m,
      /Title[：:]\s*(.+?)(?:\n|$)/i,
    ],
    contractType: {
      STAFF_AUGMENTATION: [
        /人力外包/,
        /人员外派/,
        /劳务派遣/,
        /人力资源/,
        /Staff\s*Augmentation/i,
        /人员外包/,
        /外派人员/,
      ],
      PROJECT_OUTSOURCING: [
        /项目外包/,
        /软件开发/,
        /系统集成/,
        /技术开发/,
        /Project\s*Outsourcing/i,
        /开发服务/,
        /软件项目/,
        /IT服务/,
        /技术服务/,
      ],
      PRODUCT_SALES: [
        /产品销售/,
        /软硬件买卖/,
        /采购/,
        /购销/,
        /Product\s*Sales/i,
        /设备采购/,
        /货物买卖/,
        /销售合同/,
      ],
      MIXED: [/综合服务/, /混合/, /框架/],
    },
    versionNumber: [
      /版本[：:]\s*(v?\d+\.?\d*)/i,
      /Version[：:]\s*(v?\d+\.?\d*)/i,
      /第\s*(\d+)\s*版/,
      /修订版[：:]\s*(\d+)/,
    ],
    subType: [
      /合同类型[：:]\s*(.+?)(?:\n|$)/,
      /服务类型[：:]\s*(.+?)(?:\n|$)/,
      /项目类型[：:]\s*(.+?)(?:\n|$)/,
    ],
  };

  extract(text: string): ContractIdentification {
    const normalizedText = this.normalizeText(text);

    return {
      contractNumber: this.extractContractNumber(normalizedText),
      contractTitle: this.extractContractTitle(normalizedText),
      contractType: this.detectContractType(normalizedText),
      subType: this.extractSubType(normalizedText),
      versionNumber: this.extractVersionNumber(normalizedText),
      effectiveLanguage: this.detectLanguage(text),
    };
  }

  extractWithConfidence(text: string): {
    data: ContractIdentification;
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
      .replace(/[ ]+/g, ' ')  // Only collapse spaces, preserve newlines
      .replace(/：/g, ':');
  }

  private extractContractNumber(text: string): string | null {
    for (const pattern of this.patterns.contractNumber) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (this.isValidContractNumber(value)) {
          return value;
        }
      }
    }
    return null;
  }

  private isValidContractNumber(value: string): boolean {
    if (!value || value.length < 3 || value.length > 50) return false;
    if (/^[0]+$/.test(value)) return false;
    if (value.includes('____') || value.includes('...')) return false;
    return true;
  }

  private extractContractTitle(text: string): string | null {
    for (const pattern of this.patterns.contractTitle) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1]
          .trim()
          .replace(/[》]/g, '')
          .replace(/\d+\.\d+.*$/, '')
          .trim();
        if (this.isValidContractTitle(value)) {
          return value;
        }
      }
    }
    return null;
  }

  private isValidContractTitle(value: string): boolean {
    if (!value || value.length < 4 || value.length > 200) return false;
    if (value.includes('____') || value.includes('...')) return false;
    return true;
  }

  detectContractType(text: string): ContractTypeEnum | null {
    const typeScores: Record<ContractTypeEnum, number> = {
      STAFF_AUGMENTATION: 0,
      PROJECT_OUTSOURCING: 0,
      PRODUCT_SALES: 0,
      MIXED: 0,
    };

    for (const [type, patterns] of Object.entries(this.patterns.contractType)) {
      for (const pattern of patterns) {
        const matches = text.match(new RegExp(pattern, 'gi'));
        if (matches) {
          typeScores[type as ContractTypeEnum] += matches.length;
        }
      }
    }

    const maxScore = Math.max(...Object.values(typeScores));
    if (maxScore === 0) return null;

    for (const [type, score] of Object.entries(typeScores)) {
      if (score === maxScore) {
        return type as ContractTypeEnum;
      }
    }

    return null;
  }

  private extractSubType(text: string): string | null {
    for (const pattern of this.patterns.subType) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        if (value.length >= 2 && value.length <= 50) {
          return value;
        }
      }
    }
    return null;
  }

  private extractVersionNumber(text: string): string | null {
    for (const pattern of this.patterns.versionNumber) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  detectLanguage(text: string): 'zh' | 'en' | 'bilingual' | null {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    const totalLength = text.replace(/\s/g, '').length;

    if (totalLength === 0) return null;

    const chineseRatio = chineseChars / totalLength;
    const englishRatio = englishWords / (totalLength / 5);

    if (chineseRatio > 0.7 && englishRatio < 0.1) {
      return 'zh';
    } else if (englishRatio > 0.7 && chineseRatio < 0.1) {
      return 'en';
    } else if (chineseRatio > 0.15 && englishRatio > 0.3) {
      return 'bilingual';
    }

    return chineseRatio > englishRatio ? 'zh' : 'en';
  }

  private calculateOverallConfidence(data: ContractIdentification): number {
    let score = 0;
    let total = 0;

    const weights = {
      contractNumber: 0.25,
      contractTitle: 0.2,
      contractType: 0.2,
      subType: 0.1,
      versionNumber: 0.1,
      effectiveLanguage: 0.15,
    };

    for (const [field, weight] of Object.entries(weights)) {
      total += weight;
      if (data[field as keyof ContractIdentification] !== null) {
        score += weight;
      }
    }

    return total > 0 ? score / total : 0;
  }
}
