import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';
import { ExportService } from './export.service';
import { ExportResult, ExportFormat } from './dto';

@Resolver()
export class ExportResolver {
  constructor(private readonly exportService: ExportService) {}

  /**
   * 导出合同列表
   */
  @Mutation(() => ExportResult, { description: '导出合同列表' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async exportContracts(
    @Args('format', { type: () => ExportFormat, nullable: true, defaultValue: ExportFormat.EXCEL })
    format: ExportFormat,
    @Args('title', { type: () => String, nullable: true })
    title?: string,
    @Args('columns', { type: () => [String], nullable: true })
    columns?: string[],
  ): Promise<ExportResult> {
    return this.exportService.exportContracts(format, { title, columns });
  }

  /**
   * 导出客户列表
   */
  @Mutation(() => ExportResult, { description: '导出客户列表' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async exportCustomers(
    @Args('format', { type: () => ExportFormat, nullable: true, defaultValue: ExportFormat.EXCEL })
    format: ExportFormat,
    @Args('title', { type: () => String, nullable: true })
    title?: string,
    @Args('columns', { type: () => [String], nullable: true })
    columns?: string[],
  ): Promise<ExportResult> {
    return this.exportService.exportCustomers(format, { title, columns });
  }

  /**
   * 导出财务数据
   */
  @Mutation(() => ExportResult, { description: '导出财务数据' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async exportFinancial(
    @Args('format', { type: () => ExportFormat, nullable: true, defaultValue: ExportFormat.EXCEL })
    format: ExportFormat,
    @Args('title', { type: () => String, nullable: true })
    title?: string,
    @Args('columns', { type: () => [String], nullable: true })
    columns?: string[],
  ): Promise<ExportResult> {
    return this.exportService.exportFinancial(format, { title, columns });
  }

  /**
   * 导出里程碑数据
   */
  @Mutation(() => ExportResult, { description: '导出里程碑数据' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async exportMilestones(
    @Args('format', { type: () => ExportFormat, nullable: true, defaultValue: ExportFormat.EXCEL })
    format: ExportFormat,
    @Args('title', { type: () => String, nullable: true })
    title?: string,
    @Args('columns', { type: () => [String], nullable: true })
    columns?: string[],
  ): Promise<ExportResult> {
    return this.exportService.exportMilestones(format, { title, columns });
  }
}
