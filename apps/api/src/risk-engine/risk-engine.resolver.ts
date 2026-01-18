import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { RiskAssessment, RiskClause, RiskAlert } from './dto/risk-engine.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class RiskEngineResolver {
  constructor(private readonly riskEngineService: RiskEngineService) {}

  @Query(() => RiskAssessment, { description: '评估合同风险' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async assessContractRisk(
    @Args('contractId') contractId: string
  ): Promise<RiskAssessment> {
    return this.riskEngineService.assessContractRisk(contractId);
  }

  @Query(() => [RiskClause], { description: '检测风险条款' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async detectRiskClauses(
    @Args('contractId') contractId: string
  ): Promise<RiskClause[]> {
    return this.riskEngineService.detectRiskClauses(contractId);
  }

  @Query(() => [RiskAlert], { description: '获取风险预警' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async getRiskAlerts(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number
  ): Promise<RiskAlert[]> {
    return this.riskEngineService.getRiskAlerts(limit);
  }
}
