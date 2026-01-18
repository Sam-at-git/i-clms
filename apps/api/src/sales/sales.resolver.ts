import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CustomerOverview, Customer360 } from './dto/customer-360.dto';
import { RenewalOverview } from './dto/renewal-board.dto';
import { SalesPerformance } from './dto/sales-performance.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class SalesResolver {
  constructor(private readonly salesService: SalesService) {}

  @Query(() => CustomerOverview, { description: '获取客户概览' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async customerOverview(): Promise<CustomerOverview> {
    return this.salesService.getCustomerOverview();
  }

  @Query(() => Customer360, { nullable: true, description: '获取客户360°视图' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async customer360(
    @Args('customerId') customerId: string
  ): Promise<Customer360 | null> {
    return this.salesService.getCustomer360(customerId);
  }

  @Query(() => RenewalOverview, { description: '获取续约看板' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async renewalOverview(): Promise<RenewalOverview> {
    return this.salesService.getRenewalOverview();
  }

  @Query(() => SalesPerformance, { description: '获取销售业绩' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async salesPerformance(
    @Args('year', { type: () => Int, nullable: true }) year?: number
  ): Promise<SalesPerformance> {
    return this.salesService.getSalesPerformance(year);
  }
}
