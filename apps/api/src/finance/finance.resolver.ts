import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { RevenueStats, RevenueFilterInput } from './dto/revenue-stats.dto';
import { CashFlowForecast } from './dto/cash-flow.dto';
import { OverdueAlert } from './dto/overdue-alert.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class FinanceResolver {
  constructor(private readonly financeService: FinanceService) {}

  @Query(() => RevenueStats, { description: '获取收入统计' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async revenueStats(
    @Args('filter', { nullable: true }) filter?: RevenueFilterInput
  ): Promise<RevenueStats> {
    return this.financeService.getRevenueStats(filter);
  }

  @Query(() => [CashFlowForecast], { description: '获取现金流预测' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async cashFlowForecast(
    @Args('months', { type: () => Int, nullable: true, defaultValue: 6 })
    months: number
  ): Promise<CashFlowForecast[]> {
    return this.financeService.getCashFlowForecast(months);
  }

  @Query(() => [OverdueAlert], { description: '获取逾期预警' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async overdueAlerts(): Promise<OverdueAlert[]> {
    return this.financeService.getOverdueAlerts();
  }
}
