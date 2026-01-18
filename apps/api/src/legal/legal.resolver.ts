import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LegalService } from './legal.service';
import { ContractCompliance, ComplianceOverview } from './dto/compliance.dto';
import { ContractRiskScore, RiskOverview } from './dto/risk-score.dto';
import { EvidenceChain } from './dto/evidence-chain.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class LegalResolver {
  constructor(private readonly legalService: LegalService) {}

  @Query(() => ContractCompliance, { description: '获取合同合规扫描结果' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async contractCompliance(
    @Args('contractId') contractId: string
  ): Promise<ContractCompliance> {
    return this.legalService.getContractCompliance(contractId);
  }

  @Query(() => ComplianceOverview, { description: '获取合规概览' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async complianceOverview(): Promise<ComplianceOverview> {
    return this.legalService.getComplianceOverview();
  }

  @Query(() => ContractRiskScore, { description: '获取合同风险评分' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async contractRiskScore(
    @Args('contractId') contractId: string
  ): Promise<ContractRiskScore> {
    return this.legalService.getContractRiskScore(contractId);
  }

  @Query(() => RiskOverview, { description: '获取风险概览' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async riskOverview(): Promise<RiskOverview> {
    return this.legalService.getRiskOverview();
  }

  @Query(() => EvidenceChain, { description: '获取履约证据链' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async evidenceChain(
    @Args('contractId') contractId: string
  ): Promise<EvidenceChain> {
    return this.legalService.getEvidenceChain(contractId);
  }
}
