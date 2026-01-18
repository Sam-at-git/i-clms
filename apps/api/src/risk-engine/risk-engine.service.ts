import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RiskAssessment,
  RiskClause,
  RiskAlert,
  RiskFactorDetail,
} from './dto/risk-engine.dto';

type DecimalValue = { toString(): string } | null | undefined;

const RISK_CLAUSE_PATTERNS = [
  { type: '无限责任条款', pattern: /无限责任|不限于/, level: 'HIGH', suggestion: '建议限定责任上限' },
  { type: '单方终止条款', pattern: /单方解除|单方终止/, level: 'MEDIUM', suggestion: '建议增加对等终止权' },
  { type: '违约金过高', pattern: /违约金.*[5-9][0-9]%|违约金.*100%/, level: 'HIGH', suggestion: '建议降低违约金比例' },
  { type: '付款周期过长', pattern: /[6-9]0天.*付款|90天.*付款/, level: 'MEDIUM', suggestion: '建议缩短付款周期' },
  { type: '知识产权归属', pattern: /知识产权.*归.*甲方|版权.*归.*甲方/, level: 'LOW', suggestion: '确认知识产权条款符合公司政策' },
];

@Injectable()
export class RiskEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async assessContractRisk(contractId: string): Promise<RiskAssessment> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const amount = this.decimalToNumber(contract.amountWithTax);
    const factors: RiskFactorDetail[] = [];

    // Factor 1: 合同金额风险
    const amountScore = amount >= 5000000 ? 80 : amount >= 1000000 ? 60 : 40;
    factors.push({
      factor: '合同金额',
      weight: 0.25,
      score: amountScore,
      description: amount >= 5000000 ? '超大金额合同，需重点关注' : '金额在可控范围',
    });

    // Factor 2: 付款条件风险 (based on payment terms)
    const paymentScore = contract.paymentTerms?.includes('预付') ? 30 : 60;
    factors.push({
      factor: '付款条件',
      weight: 0.20,
      score: paymentScore,
      description: paymentScore > 50 ? '付款条件需关注' : '付款条件良好',
    });

    // Factor 3: 履约周期风险
    const effectiveDate = contract.effectiveAt || contract.createdAt;
    const durationDays = contract.expiresAt
      ? Math.ceil((contract.expiresAt.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24))
      : 365;
    const durationScore = durationDays > 365 ? 70 : durationDays > 180 ? 50 : 30;
    factors.push({
      factor: '履约周期',
      weight: 0.15,
      score: durationScore,
      description: durationDays > 365 ? '长周期合同，执行风险较高' : '周期适中',
    });

    // Factor 4: 客户信用风险
    const customerScore = contract.customer.name.includes('集团') ? 30 : 50;
    factors.push({
      factor: '客户信用',
      weight: 0.20,
      score: customerScore,
      description: customerScore < 40 ? '优质客户，信用良好' : '需关注客户信用',
    });

    // Factor 5: 条款完整性风险
    const completenessScore = contract.fileUrl ? 40 : 80;
    factors.push({
      factor: '条款完整性',
      weight: 0.10,
      score: completenessScore,
      description: contract.fileUrl ? '合同文件完整' : '缺少合同文件',
    });

    // Factor 6: 历史表现风险
    const historyScore = 40 + Math.random() * 30;
    factors.push({
      factor: '历史表现',
      weight: 0.10,
      score: historyScore,
      description: historyScore < 50 ? '历史表现良好' : '需关注历史履约',
    });

    // Calculate total score
    const totalScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

    // Determine risk level
    let level: string;
    if (totalScore >= 70) level = 'HIGH';
    else if (totalScore >= 50) level = 'MEDIUM';
    else level = 'LOW';

    // Generate recommendations
    const recommendations: string[] = [];
    for (const f of factors) {
      if (f.score >= 60) {
        recommendations.push(`${f.factor}: ${f.description}`);
      }
    }
    if (recommendations.length === 0) {
      recommendations.push('该合同整体风险可控');
    }

    return {
      contractId,
      totalScore,
      level,
      factors,
      recommendations,
    };
  }

  async detectRiskClauses(contractId: string): Promise<RiskClause[]> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const clauses: RiskClause[] = [];

    // Simulate clause detection based on contract name and payment terms
    const textToAnalyze = `${contract.name} ${contract.paymentTerms || ''}`;

    for (const pattern of RISK_CLAUSE_PATTERNS) {
      if (pattern.pattern.test(textToAnalyze)) {
        clauses.push({
          clauseType: pattern.type,
          content: `检测到${pattern.type}相关内容`,
          riskLevel: pattern.level,
          suggestion: pattern.suggestion,
        });
      }
    }

    // Add some simulated clauses based on contract type
    if (contract.type === 'PROJECT_OUTSOURCING') {
      clauses.push({
        clauseType: '里程碑验收条款',
        content: '项目外包合同应明确里程碑验收标准',
        riskLevel: 'LOW',
        suggestion: '建议细化验收标准和流程',
      });
    }

    if (clauses.length === 0) {
      clauses.push({
        clauseType: '无明显风险条款',
        content: '未检测到明显风险条款',
        riskLevel: 'LOW',
        suggestion: '建议定期审查合同条款',
      });
    }

    return clauses;
  }

  async getRiskAlerts(limit = 10): Promise<RiskAlert[]> {
    const contracts = await this.prisma.contract.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    });

    const alerts: RiskAlert[] = [];

    for (const contract of contracts) {
      const amount = this.decimalToNumber(contract.amountWithTax);

      // Generate alerts based on contract status
      if (contract.status === 'ACTIVE' && contract.expiresAt) {
        const daysUntilExpiry = Math.ceil(
          (contract.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
          alerts.push({
            id: `alert-expire-${contract.id}`,
            contractId: contract.id,
            alertType: 'EXPIRY_WARNING',
            severity: 'MEDIUM',
            message: `合同【${contract.name}】将在${daysUntilExpiry}天后到期`,
            createdAt: new Date(),
          });
        }
      }

      // High value contract alert
      if (amount >= 5000000) {
        alerts.push({
          id: `alert-value-${contract.id}`,
          contractId: contract.id,
          alertType: 'HIGH_VALUE',
          severity: 'LOW',
          message: `高价值合同【${contract.name}】需重点关注`,
          createdAt: contract.createdAt,
        });
      }
    }

    return alerts.slice(0, limit);
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }
}
