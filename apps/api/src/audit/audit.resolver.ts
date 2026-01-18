import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogConnectionDto, AuditLogFilterInput } from './dto/audit.dto';
import { GqlAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => AuditLogConnectionDto, { description: 'Get paginated audit logs' })
  @Roles('ADMIN')
  async auditLogs(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 50 }) pageSize: number,
    @Args('filter', { type: () => AuditLogFilterInput, nullable: true })
    filter?: AuditLogFilterInput
  ): Promise<AuditLogConnectionDto> {
    return this.auditService.getAuditLogs(page, pageSize, filter);
  }

  @Query(() => [String], { description: 'Get distinct audit actions for filtering' })
  @Roles('ADMIN')
  async auditActions(): Promise<string[]> {
    return this.auditService.getDistinctActions();
  }

  @Query(() => [String], { description: 'Get distinct entity types for filtering' })
  @Roles('ADMIN')
  async auditEntityTypes(): Promise<string[]> {
    return this.auditService.getDistinctEntityTypes();
  }
}
