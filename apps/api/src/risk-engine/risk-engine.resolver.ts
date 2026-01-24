import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { RiskAssessment, RiskClause, RiskAlert } from './dto/risk-engine.dto';
import {
  RiskAlertModel,
  PaginatedRiskAlerts,
  CreateRiskAlertInput,
  UpdateRiskAlertInput,
  RiskAlertPaginationInput,
  RiskAssessmentHistory,
  PaginatedRiskAssessments,
  SaveRiskAssessmentInput,
  RiskSeverity,
} from './dto/risk-alert.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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

  // ================================
  // Risk Alert CRUD
  // ================================

  @Query(() => PaginatedRiskAlerts, { description: '获取风险告警列表（分页）' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async riskAlerts(
    @Args('pagination', { nullable: true }) pagination?: RiskAlertPaginationInput
  ): Promise<PaginatedRiskAlerts> {
    return this.riskEngineService.riskAlerts(pagination);
  }

  @Query(() => [RiskAlertModel], { description: '获取活跃告警' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async activeAlerts(
    @Args('severity', { nullable: true, type: () => RiskSeverity }) severity?: RiskSeverity
  ): Promise<RiskAlertModel[]> {
    return this.riskEngineService.getActiveAlerts(severity);
  }

  @Query(() => [RiskAlertModel], { description: '获取合同告警历史' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async alertHistory(
    @Args('contractId') contractId: string
  ): Promise<RiskAlertModel[]> {
    return this.riskEngineService.getAlertHistory(contractId);
  }

  @Mutation(() => RiskAlertModel, { description: '创建风险告警' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async createRiskAlert(
    @Args('input') input: CreateRiskAlertInput,
    @CurrentUser() user?: { id: string }
  ): Promise<RiskAlertModel> {
    return this.riskEngineService.createAlert(input, user?.id);
  }

  @Mutation(() => RiskAlertModel, { description: '更新风险告警' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async updateRiskAlert(
    @Args('id') id: string,
    @Args('input') input: UpdateRiskAlertInput
  ): Promise<RiskAlertModel> {
    return this.riskEngineService.updateAlert(id, input);
  }

  @Mutation(() => RiskAlertModel, { description: '忽略风险告警' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async dismissRiskAlert(
    @Args('id') id: string,
    @CurrentUser() user?: { id: string }
  ): Promise<RiskAlertModel> {
    return this.riskEngineService.dismissAlert(id, user?.id);
  }

  // ================================
  // Risk Assessment History
  // ================================

  @Mutation(() => RiskAssessmentHistory, { description: '保存风险评估结果' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async saveRiskAssessment(
    @Args('input') input: SaveRiskAssessmentInput
  ): Promise<RiskAssessmentHistory> {
    return this.riskEngineService.saveRiskAssessment(input);
  }

  @Query(() => PaginatedRiskAssessments, { description: '获取风险评估历史' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async riskAssessmentHistory(
    @Args('contractId') contractId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page?: number,
    @Args('pageSize', { type: () => Int, nullable: true, defaultValue: 20 }) pageSize?: number
  ): Promise<PaginatedRiskAssessments> {
    return this.riskEngineService.riskAssessmentHistory(contractId, page, pageSize);
  }

  @Query(() => String, { description: '对比当前vs历史风险评分' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async compareRiskScores(
    @Args('contractId') contractId: string
  ): Promise<{ current: { score: number; level: string; date: Date } | null; previous: Array<{ score: number; level: string; date: Date }>; trend: string }> {
    return this.riskEngineService.compareRiskScores(contractId);
  }
}
