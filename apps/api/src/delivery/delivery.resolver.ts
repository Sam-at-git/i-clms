import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { ProjectOverview } from './dto/project-overview.dto';
import { MilestoneOverview } from './dto/milestone-tracker.dto';
import { ResourceUtilization } from './dto/resource-utilization.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class DeliveryResolver {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Query(() => ProjectOverview, { description: '获取项目交付概览' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async projectOverview(): Promise<ProjectOverview> {
    return this.deliveryService.getProjectOverview();
  }

  @Query(() => MilestoneOverview, { description: '获取里程碑概览' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async milestoneOverview(): Promise<MilestoneOverview> {
    return this.deliveryService.getMilestoneOverview();
  }

  @Query(() => ResourceUtilization, { description: '获取资源利用率' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async resourceUtilization(): Promise<ResourceUtilization> {
    return this.deliveryService.getResourceUtilization();
  }
}
