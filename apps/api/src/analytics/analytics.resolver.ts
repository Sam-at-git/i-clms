import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDimension, TrendPoint, ForecastResult } from './dto/analytics.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class AnalyticsResolver {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Query(() => [AnalyticsDimension], { description: '多维度分析' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async analyzeByDimension(
    @Args('dimension') dimension: string,
    @Args('groupBy', { nullable: true }) groupBy?: string
  ): Promise<AnalyticsDimension[]> {
    return this.analyticsService.analyzeByDimension(dimension, groupBy);
  }

  @Query(() => [TrendPoint], { description: '趋势分析' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async getTrend(
    @Args('metric') metric: string,
    @Args('periods', { type: () => Int, nullable: true, defaultValue: 12 }) periods: number
  ): Promise<TrendPoint[]> {
    return this.analyticsService.getTrend(metric, periods);
  }

  @Query(() => ForecastResult, { description: '预测分析' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async forecast(@Args('metric') metric: string): Promise<ForecastResult> {
    return this.analyticsService.forecast(metric);
  }
}
