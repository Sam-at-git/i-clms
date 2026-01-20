import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { ProjectOverview } from './dto/project-overview.dto';
import { MilestoneOverview } from './dto/milestone-tracker.dto';
import { ResourceUtilization } from './dto/resource-utilization.dto';
import {
  MilestoneDetail,
  MilestoneStatusHistory,
  UpdateMilestoneStatusInput,
  UploadDeliverableInput,
  AcceptMilestoneInput,
  RejectMilestoneInput,
} from './dto/milestone-status.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, MilestoneStatus } from '../graphql/types/enums';

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

  // ==================== 里程碑状态管理 ====================

  @Query(() => MilestoneDetail, { description: '获取里程碑详情（包含状态历史）' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async milestoneDetail(
    @Args('id') id: string,
  ): Promise<MilestoneDetail> {
    return this.deliveryService.getMilestoneDetail(id);
  }

  @Query(() => [MilestoneStatusHistory], { description: '获取里程碑状态历史' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async milestoneStatusHistory(
    @Args('milestoneId') milestoneId: string,
  ): Promise<MilestoneStatusHistory[]> {
    return this.deliveryService.getMilestoneStatusHistory(milestoneId);
  }

  @Mutation(() => MilestoneDetail, { description: '更新里程碑状态' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async updateMilestoneStatus(
    @Args('input') input: UpdateMilestoneStatusInput,
    @CurrentUser() user: { id: string },
  ): Promise<MilestoneDetail> {
    return this.deliveryService.updateMilestoneStatus(input, user.id);
  }

  @Mutation(() => MilestoneDetail, { description: '上传交付物' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async uploadDeliverable(
    @Args('input') input: UploadDeliverableInput,
    @CurrentUser() user: { id: string },
  ): Promise<MilestoneDetail> {
    return this.deliveryService.uploadDeliverable(input, user.id);
  }

  @Mutation(() => MilestoneDetail, { description: '验收通过里程碑' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async acceptMilestone(
    @Args('input') input: AcceptMilestoneInput,
    @CurrentUser() user: { id: string },
  ): Promise<MilestoneDetail> {
    return this.deliveryService.acceptMilestone(input, user.id);
  }

  @Mutation(() => MilestoneDetail, { description: '拒绝里程碑' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async rejectMilestone(
    @Args('input') input: RejectMilestoneInput,
    @CurrentUser() user: { id: string },
  ): Promise<MilestoneDetail> {
    return this.deliveryService.rejectMilestone(input, user.id);
  }
}
