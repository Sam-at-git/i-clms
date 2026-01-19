import { Injectable, Logger } from '@nestjs/common';
import { ExtractedFields } from '../parser/dto';

export interface CompletenessResult {
  score: number; // 0-100
  missingFields: string[];
  needsLlm: boolean;
  reason: string;
}

/**
 * 信息完整性检查器
 * 评估程序解析的结果是否足够完整，决定是否需要LLM增强
 */
@Injectable()
export class CompletenessCheckerService {
  private readonly logger = new Logger(CompletenessCheckerService.name);

  // 核心字段权重配置（总计100）
  private readonly FIELD_WEIGHTS = {
    // 基本信息 (40分)
    contractNo: 15,
    name: 10,
    customerName: 10,
    ourEntity: 5,

    // 财务信息 (30分)
    amountWithTax: 15,
    amountWithoutTax: 5,
    taxRate: 5,
    paymentTerms: 5,

    // 时间信息 (20分)
    signedAt: 8,
    effectiveAt: 6,
    expiresAt: 6,

    // 其他关键信息 (10分)
    type: 5,
    status: 3,
    salesPerson: 2,
  };

  // 完整性阈值
  private readonly COMPLETENESS_THRESHOLD = 70; // 低于70分需要LLM

  /**
   * 检查信息完整性
   */
  checkCompleteness(extractedFields: ExtractedFields): CompletenessResult {
    let score = 0;
    const missingFields: string[] = [];

    // 计算完整性得分
    for (const [field, weight] of Object.entries(this.FIELD_WEIGHTS)) {
      const value = (extractedFields as any)[field];

      if (this.isFieldValid(value)) {
        score += weight;
      } else {
        missingFields.push(field);
      }
    }

    const needsLlm = score < this.COMPLETENESS_THRESHOLD;

    const reason = needsLlm
      ? `完整性得分 ${score}/100，低于阈值 ${this.COMPLETENESS_THRESHOLD}。` +
        `缺失关键字段: ${missingFields.slice(0, 5).join(', ')}${missingFields.length > 5 ? '...' : ''}`
      : `完整性得分 ${score}/100，信息充足，无需LLM增强。`;

    this.logger.log(
      `Completeness check: score=${score}, needsLlm=${needsLlm}, ` +
      `missingFields=${missingFields.length}`
    );

    return {
      score,
      missingFields,
      needsLlm,
      reason,
    };
  }

  /**
   * 判断字段值是否有效
   */
  private isFieldValid(value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      // 字符串需要非空且有意义（不是占位符）
      const trimmed = value.trim();
      if (trimmed.length === 0) return false;
      if (trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined') {
        return false;
      }
      return true;
    }

    if (typeof value === 'number') {
      return !isNaN(value);
    }

    // 其他类型视为有效
    return true;
  }

  /**
   * 识别需要LLM重点提取的字段
   */
  identifyPriorityFields(missingFields: string[]): string[] {
    // 按权重排序缺失字段
    const sortedMissing = missingFields.sort((a, b) => {
      const weightA = this.FIELD_WEIGHTS[a as keyof typeof this.FIELD_WEIGHTS] || 0;
      const weightB = this.FIELD_WEIGHTS[b as keyof typeof this.FIELD_WEIGHTS] || 0;
      return weightB - weightA;
    });

    // 返回前10个高优先级字段
    return sortedMissing.slice(0, 10);
  }
}
