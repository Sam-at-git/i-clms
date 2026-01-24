import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ClauseCheck,
  ContractCompliance,
  ComplianceOverview,
  RiskLevel,
} from './dto/compliance.dto';
import {
  RiskFactor,
  ContractRiskScore,
  RiskOverview,
} from './dto/risk-score.dto';
import { Evidence, EvidenceChain } from './dto/evidence-chain.dto';
import {
  LegalReview,
  PaginatedLegalReviews,
  CreateLegalReviewInput,
  UpdateLegalReviewInput,
  LegalReviewFilterInput,
  LegalReviewPaginationInput,
  ReviewStatus,
  LegalRiskLevel,
} from './dto/legal-review.dto';

// Type for Prisma Decimal values
type DecimalValue = { toString(): string } | null | undefined;

// Risk factor definitions
const RISK_FACTORS = {
  AMOUNT: { weight: 0.25, name: '合同金额' },
  DURATION: { weight: 0.15, name: '合同期限' },
  CUSTOMER: { weight: 0.20, name: '客户信用' },
  CLAUSE: { weight: 0.25, name: '条款风险' },
  OVERDUE: { weight: 0.15, name: '逾期历史' },
};

// Required clauses for compliance check
const REQUIRED_CLAUSES = [
  { type: 'confidentiality', name: '保密条款' },
  { type: 'penalty', name: '违约金条款' },
  { type: 'ip_rights', name: '知识产权条款' },
  { type: 'termination', name: '终止条款' },
  { type: 'dispute', name: '争议解决条款' },
  { type: 'liability', name: '责任限制条款' },
  { type: 'warranty', name: '质保条款' },
  { type: 'payment', name: '付款条款' },
];

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async getContractCompliance(contractId: string): Promise<ContractCompliance> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        tags: {
          include: { tag: true },
        },
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Simulate clause checking based on contract type and tags
    const clauses = this.checkClauses(contract);
    const missingClauses = clauses
      .filter((c) => !c.exists)
      .map((c) => c.clauseName);
    const riskyClauses = clauses
      .filter((c) => c.riskLevel === RiskLevel.HIGH || c.riskLevel === RiskLevel.CRITICAL)
      .map((c) => c.clauseName);

    // Calculate overall score
    const existingCount = clauses.filter((c) => c.exists).length;
    const overallScore = (existingCount / clauses.length) * 100;

    return {
      contractId: contract.id,
      contractNo: contract.contractNo,
      contractName: contract.name,
      overallScore,
      clauses,
      missingClauses,
      riskyClauses,
      lastScannedAt: new Date(),
    };
  }

  async getComplianceOverview(): Promise<ComplianceOverview> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXECUTING'] },
      },
      include: {
        customer: true,
        tags: { include: { tag: true } },
      },
      take: 50,
    });

    const complianceResults = contracts.map((contract) => {
      const clauses = this.checkClauses(contract);
      const existingCount = clauses.filter((c) => c.exists).length;
      const score = (existingCount / clauses.length) * 100;

      return {
        contractId: contract.id,
        contractNo: contract.contractNo,
        contractName: contract.name,
        overallScore: score,
        clauses,
        missingClauses: clauses.filter((c) => !c.exists).map((c) => c.clauseName),
        riskyClauses: clauses
          .filter((c) => c.riskLevel === RiskLevel.HIGH || c.riskLevel === RiskLevel.CRITICAL)
          .map((c) => c.clauseName),
        lastScannedAt: new Date(),
      };
    });

    const totalScanned = complianceResults.length;
    const avgScore = totalScanned > 0
      ? complianceResults.reduce((sum, r) => sum + r.overallScore, 0) / totalScanned
      : 0;

    // Group by score level
    const high = complianceResults.filter((r) => r.overallScore >= 80);
    const medium = complianceResults.filter((r) => r.overallScore >= 50 && r.overallScore < 80);
    const low = complianceResults.filter((r) => r.overallScore < 50);

    const byLevel = [
      { level: '高合规', count: high.length, percentage: totalScanned > 0 ? (high.length / totalScanned) * 100 : 0 },
      { level: '中合规', count: medium.length, percentage: totalScanned > 0 ? (medium.length / totalScanned) * 100 : 0 },
      { level: '低合规', count: low.length, percentage: totalScanned > 0 ? (low.length / totalScanned) * 100 : 0 },
    ];

    return {
      totalScanned,
      avgScore,
      byLevel,
      lowScoreContracts: complianceResults
        .filter((r) => r.overallScore < 60)
        .sort((a, b) => a.overallScore - b.overallScore)
        .slice(0, 10),
    };
  }

  async getContractRiskScore(contractId: string): Promise<ContractRiskScore> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        tags: { include: { tag: true } },
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const factors = this.calculateRiskFactors(contract);
    const overallScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const riskLevel = this.getRiskLevel(overallScore);

    return {
      contractId: contract.id,
      contractNo: contract.contractNo,
      contractName: contract.name,
      customerName: contract.customer.name,
      overallScore,
      riskLevel,
      factors,
      trend: this.getRandomTrend(),
    };
  }

  async getRiskOverview(): Promise<RiskOverview> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXECUTING', 'PENDING_APPROVAL'] },
      },
      include: {
        customer: true,
        tags: { include: { tag: true } },
      },
    });

    const riskScores = contracts.map((contract) => {
      const factors = this.calculateRiskFactors(contract);
      const overallScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
      const riskLevel = this.getRiskLevel(overallScore);

      return {
        contractId: contract.id,
        contractNo: contract.contractNo,
        contractName: contract.name,
        customerName: contract.customer.name,
        overallScore,
        riskLevel,
        factors,
        trend: this.getRandomTrend(),
      };
    });

    const totalContracts = riskScores.length;
    const avgRiskScore = totalContracts > 0
      ? riskScores.reduce((sum, r) => sum + r.overallScore, 0) / totalContracts
      : 0;

    // Group by risk level
    const lowRisk = riskScores.filter((r) => r.riskLevel === RiskLevel.LOW);
    const mediumRisk = riskScores.filter((r) => r.riskLevel === RiskLevel.MEDIUM);
    const highRisk = riskScores.filter((r) => r.riskLevel === RiskLevel.HIGH);
    const criticalRisk = riskScores.filter((r) => r.riskLevel === RiskLevel.CRITICAL);

    const byRiskLevel = [
      { level: RiskLevel.LOW, count: lowRisk.length, percentage: totalContracts > 0 ? (lowRisk.length / totalContracts) * 100 : 0 },
      { level: RiskLevel.MEDIUM, count: mediumRisk.length, percentage: totalContracts > 0 ? (mediumRisk.length / totalContracts) * 100 : 0 },
      { level: RiskLevel.HIGH, count: highRisk.length, percentage: totalContracts > 0 ? (highRisk.length / totalContracts) * 100 : 0 },
      { level: RiskLevel.CRITICAL, count: criticalRisk.length, percentage: totalContracts > 0 ? (criticalRisk.length / totalContracts) * 100 : 0 },
    ];

    // Get high risk contracts
    const highRiskContracts = riskScores
      .filter((r) => r.riskLevel === RiskLevel.HIGH || r.riskLevel === RiskLevel.CRITICAL)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);

    return {
      totalContracts,
      byRiskLevel,
      highRiskContracts,
      avgRiskScore,
    };
  }

  async getEvidenceChain(contractId: string): Promise<EvidenceChain> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        projectOutsourcing: {
          include: {
            milestones: true,
          },
        },
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Generate evidence events from contract lifecycle
    const evidences: Evidence[] = [];

    // Contract signed event
    if (contract.signedAt) {
      evidences.push({
        id: `${contract.id}-signed`,
        eventType: '合同签署',
        eventDate: contract.signedAt,
        description: `${contract.name} 签署完成`,
        fileUrl: contract.fileUrl,
        createdAt: contract.signedAt,
      });
    }

    // Contract start event
    if (contract.effectiveAt) {
      evidences.push({
        id: `${contract.id}-start`,
        eventType: '合同生效',
        eventDate: contract.effectiveAt,
        description: '合同开始执行',
        fileUrl: null,
        createdAt: contract.effectiveAt,
      });
    }

    // Milestone events for project outsourcing
    const milestones = contract.projectOutsourcing?.milestones || [];
    let milestonesCovered = 0;
    for (const milestone of milestones) {
      if (milestone.status === 'ACCEPTED' || milestone.status === 'DELIVERED') {
        milestonesCovered++;
        const eventDate = milestone.actualDate || milestone.plannedDate || new Date();
        evidences.push({
          id: `milestone-${milestone.id}`,
          eventType: '里程碑完成',
          eventDate,
          description: `里程碑: ${milestone.name}`,
          fileUrl: null,
          createdAt: eventDate,
        });
      }
    }

    // Sort by date
    evidences.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

    // Calculate completeness score
    const totalMilestones = milestones.length;
    const completenessScore = totalMilestones > 0
      ? (milestonesCovered / totalMilestones) * 100
      : evidences.length > 0 ? 50 : 0;

    return {
      contractId: contract.id,
      contractNo: contract.contractNo,
      contractName: contract.name,
      customerName: contract.customer.name,
      evidences,
      completenessScore,
      milestonesCovered,
      totalMilestones,
    };
  }

  private checkClauses(contract: {
    type: string;
    tags: Array<{ tag: { name: string } }>;
  }): ClauseCheck[] {
    return REQUIRED_CLAUSES.map((clause) => {
      // Simulate clause existence based on contract type
      const exists = this.simulateClauseExistence(clause.type, contract.type);
      const riskLevel = exists ? this.assessClauseRisk(clause.type) : null;
      const suggestion = exists
        ? null
        : `建议添加${clause.name}以降低法律风险`;

      return {
        clauseType: clause.type,
        clauseName: clause.name,
        exists,
        riskLevel,
        suggestion,
      };
    });
  }

  private simulateClauseExistence(
    clauseType: string,
    contractType: string
  ): boolean {
    // Simulate based on clause type and contract type
    const probabilities: Record<string, number> = {
      confidentiality: 0.9,
      penalty: 0.85,
      ip_rights: contractType === 'PROJECT_OUTSOURCING' ? 0.95 : 0.7,
      termination: 0.95,
      dispute: 0.9,
      liability: 0.8,
      warranty: contractType === 'PRODUCT_SALES' ? 0.95 : 0.6,
      payment: 0.98,
    };

    return Math.random() < (probabilities[clauseType] || 0.5);
  }

  private assessClauseRisk(clauseType: string): RiskLevel {
    // Assign risk levels to existing clauses
    const riskMap: Record<string, RiskLevel> = {
      confidentiality: RiskLevel.LOW,
      penalty: RiskLevel.MEDIUM,
      ip_rights: RiskLevel.LOW,
      termination: RiskLevel.LOW,
      dispute: RiskLevel.LOW,
      liability: RiskLevel.MEDIUM,
      warranty: RiskLevel.LOW,
      payment: RiskLevel.LOW,
    };

    return riskMap[clauseType] || RiskLevel.LOW;
  }

  private calculateRiskFactors(contract: {
    amountWithTax: DecimalValue;
    effectiveAt: Date | null;
    expiresAt: Date | null;
    type: string;
  }): RiskFactor[] {
    const amount = this.decimalToNumber(contract.amountWithTax);

    // Amount risk
    let amountScore = 0;
    if (amount >= 5000000) amountScore = 80;
    else if (amount >= 1000000) amountScore = 60;
    else if (amount >= 500000) amountScore = 40;
    else amountScore = 20;

    // Duration risk
    let durationScore = 0;
    if (contract.effectiveAt && contract.expiresAt) {
      const months = Math.ceil(
        (contract.expiresAt.getTime() - contract.effectiveAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      if (months > 24) durationScore = 70;
      else if (months > 12) durationScore = 50;
      else durationScore = 30;
    } else {
      durationScore = 40;
    }

    // Customer risk (simulated)
    const customerScore = Math.floor(Math.random() * 40) + 20;

    // Clause risk (simulated)
    const clauseScore = Math.floor(Math.random() * 30) + 20;

    // Overdue risk (simulated)
    const overdueScore = Math.floor(Math.random() * 50) + 10;

    return [
      {
        factor: 'AMOUNT',
        weight: RISK_FACTORS.AMOUNT.weight,
        score: amountScore,
        description: this.getAmountDescription(amount),
      },
      {
        factor: 'DURATION',
        weight: RISK_FACTORS.DURATION.weight,
        score: durationScore,
        description: this.getDurationDescription(contract.effectiveAt, contract.expiresAt),
      },
      {
        factor: 'CUSTOMER',
        weight: RISK_FACTORS.CUSTOMER.weight,
        score: customerScore,
        description: customerScore > 50 ? '客户信用一般' : '客户信用良好',
      },
      {
        factor: 'CLAUSE',
        weight: RISK_FACTORS.CLAUSE.weight,
        score: clauseScore,
        description: clauseScore > 50 ? '部分条款存在风险' : '条款基本完善',
      },
      {
        factor: 'OVERDUE',
        weight: RISK_FACTORS.OVERDUE.weight,
        score: overdueScore,
        description: overdueScore > 50 ? '存在逾期记录' : '履约记录良好',
      },
    ];
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 30) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private getRandomTrend(): string {
    const trends = ['UP', 'DOWN', 'STABLE'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private getAmountDescription(amount: number): string {
    if (amount >= 5000000) return '超大型合同(500万+)';
    if (amount >= 1000000) return '大型合同(100-500万)';
    if (amount >= 500000) return '中型合同(50-100万)';
    return '小型合同(<50万)';
  }

  private getDurationDescription(effectiveAt: Date | null, expiresAt: Date | null): string {
    if (!effectiveAt || !expiresAt) return '期限未明确';
    const months = Math.ceil(
      (expiresAt.getTime() - effectiveAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    if (months > 24) return `长期合同(${months}个月)`;
    if (months > 12) return `中期合同(${months}个月)`;
    return `短期合同(${months}个月)`;
  }

  private decimalToNumber(value: DecimalValue): number {
    if (!value) return 0;
    return Number(value.toString());
  }

  private readonly logger = new Logger(LegalService.name);

  // ================================
  // Legal Review CRUD
  // ================================

  /**
   * Get paginated legal reviews with optional filtering
   */
  async legalReviews(
    pagination?: LegalReviewPaginationInput
  ): Promise<PaginatedLegalReviews> {
    const {
      filter,
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination || {};

    const where = this.buildLegalReviewFilter(filter);

    const [items, total] = await Promise.all([
      this.prisma.legalReview.findMany({
        where,
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              name: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.legalReview.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        reviewedAt: item.reviewedAt,
      })) as unknown as LegalReview[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single legal review by ID
   */
  async legalReview(id: string): Promise<LegalReview> {
    const review = await this.prisma.legalReview.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Legal review with ID ${id} not found`);
    }

    return {
      ...review,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewedAt: review.reviewedAt,
    } as unknown as LegalReview;
  }

  /**
   * Get pending reviews for a department or all
   */
  async pendingReviews(departmentId?: string): Promise<LegalReview[]> {
    const where: Record<string, unknown> = {
      status: { in: [ReviewStatus.DRAFT, ReviewStatus.IN_PROGRESS] },
    };

    if (departmentId) {
      // Filter by department through contract relation
      where.contract = {
        departmentId,
      };
    }

    const reviews = await this.prisma.legalReview.findMany({
      where,
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return reviews.map((item) => ({
      ...item,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      reviewedAt: item.reviewedAt,
    })) as unknown as LegalReview[];
  }

  /**
   * Create a new legal review
   */
  async createLegalReview(
    input: CreateLegalReviewInput
  ): Promise<LegalReview> {
    // Verify contract exists
    const contract = await this.prisma.contract.findUnique({
      where: { id: input.contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${input.contractId} not found`);
    }

    // Verify reviewer exists
    const reviewer = await this.prisma.user.findUnique({
      where: { id: input.reviewerId },
    });

    if (!reviewer) {
      throw new NotFoundException(`User with ID ${input.reviewerId} not found`);
    }

    const review = await this.prisma.legalReview.create({
      data: {
        contractId: input.contractId,
        reviewerId: input.reviewerId,
        riskLevel: input.riskLevel,
        findings: input.findings ? JSON.parse(input.findings) : {},
        recommendations: input.recommendations,
        status: input.status || ReviewStatus.DRAFT,
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Created legal review ${review.id} for contract ${input.contractId}`);

    return {
      ...review,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewedAt: review.reviewedAt,
    } as unknown as LegalReview;
  }

  /**
   * Update an existing legal review
   */
  async updateLegalReview(
    id: string,
    input: UpdateLegalReviewInput
  ): Promise<LegalReview> {
    // Check if review exists
    const existing = await this.prisma.legalReview.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Legal review with ID ${id} not found`);
    }

    const updateData: Record<string, unknown> = {};

    if (input.status !== undefined) updateData.status = input.status;
    if (input.riskLevel !== undefined) updateData.riskLevel = input.riskLevel;
    if (input.findings !== undefined) updateData.findings = JSON.parse(input.findings);
    if (input.recommendations !== undefined) updateData.recommendations = input.recommendations;
    if (input.reviewedAt !== undefined) updateData.reviewedAt = new Date(input.reviewedAt);

    const review = await this.prisma.legalReview.update({
      where: { id },
      data: updateData,
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Updated legal review ${id}`);

    return {
      ...review,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewedAt: review.reviewedAt,
    } as unknown as LegalReview;
  }

  /**
   * Submit a legal review for approval
   */
  async submitLegalReview(id: string): Promise<LegalReview> {
    const review = await this.prisma.legalReview.update({
      where: { id },
      data: {
        status: ReviewStatus.SUBMITTED,
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Submitted legal review ${id}`);

    return {
      ...review,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewedAt: review.reviewedAt,
    } as unknown as LegalReview;
  }

  /**
   * Build filter for legal reviews
   */
  private buildLegalReviewFilter(filter?: LegalReviewFilterInput): Record<string, unknown> {
    if (!filter) return {};

    const where: Record<string, unknown> = {};

    if (filter.contractId) {
      where.contractId = filter.contractId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.riskLevel) {
      where.riskLevel = filter.riskLevel;
    }

    if (filter.reviewerId) {
      where.reviewerId = filter.reviewerId;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        (where.createdAt as Record<string, Date>).lte = new Date(filter.endDate);
      }
    }

    return where;
  }
}
