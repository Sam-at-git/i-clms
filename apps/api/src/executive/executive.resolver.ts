import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ExecutiveService } from './executive.service';
import { CompanyHealth } from './dto/company-health.dto';
import { RiskHeatmap } from './dto/risk-heatmap.dto';
import { CoreKPIs } from './dto/core-kpis.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class ExecutiveResolver {
  constructor(private readonly executiveService: ExecutiveService) {}

  @Query(() => CompanyHealth, { description: '获取公司健康度' })
  @Roles(UserRole.ADMIN)
  async companyHealth(): Promise<CompanyHealth> {
    return this.executiveService.getCompanyHealth();
  }

  @Query(() => RiskHeatmap, { description: '获取风险热力图' })
  @Roles(UserRole.ADMIN)
  async riskHeatmap(
    @Args('groupBy', { nullable: true, defaultValue: 'department' }) groupBy: string
  ): Promise<RiskHeatmap> {
    return this.executiveService.getRiskHeatmap(groupBy);
  }

  @Query(() => CoreKPIs, { description: '获取核心KPI指标' })
  @Roles(UserRole.ADMIN)
  async coreKPIs(
    @Args('period', { nullable: true, defaultValue: 'monthly' }) period: string
  ): Promise<CoreKPIs> {
    return this.executiveService.getCoreKPIs(period);
  }
}
