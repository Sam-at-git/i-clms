import { Resolver, Query, Args, Int, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { RevenueStats, RevenueFilterInput } from './dto/revenue-stats.dto';
import { CashFlowForecast } from './dto/cash-flow.dto';
import { OverdueAlert } from './dto/overdue-alert.dto';
import {
  FinancialTransaction,
  PaginatedFinancialTransactions,
  CreateFinancialTransactionInput,
  UpdateFinancialTransactionInput,
  RecordPaymentInput,
  FinancialTransactionPaginationInput,
} from './dto/financial-transaction.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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

  // ================================
  // Financial Transaction CRUD
  // ================================

  @Query(() => PaginatedFinancialTransactions, { description: '获取财务交易列表（分页）' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async financialTransactions(
    @Args('pagination', { nullable: true }) pagination?: FinancialTransactionPaginationInput
  ): Promise<PaginatedFinancialTransactions> {
    return this.financeService.financialTransactions(pagination);
  }

  @Query(() => [FinancialTransaction], { description: '获取合同付款历史' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async paymentHistory(
    @Args('contractId') contractId: string
  ): Promise<FinancialTransaction[]> {
    return this.financeService.paymentHistory(contractId);
  }

  @Query(() => [FinancialTransaction], { description: '获取待处理付款列表' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async pendingPayments(
    @Args('departmentId', { nullable: true }) departmentId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit?: number
  ): Promise<FinancialTransaction[]> {
    return this.financeService.pendingPayments(departmentId, limit);
  }

  @Mutation(() => FinancialTransaction, { description: '创建财务交易' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async createFinancialTransaction(
    @Args('input') input: CreateFinancialTransactionInput,
    @CurrentUser() user: { id: string }
  ): Promise<FinancialTransaction> {
    return this.financeService.createTransaction(input, user.id);
  }

  @Mutation(() => FinancialTransaction, { description: '更新财务交易' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async updateFinancialTransaction(
    @Args('id') id: string,
    @Args('input') input: UpdateFinancialTransactionInput
  ): Promise<FinancialTransaction> {
    return this.financeService.updateTransaction(id, input);
  }

  @Mutation(() => Boolean, { description: '删除财务交易' })
  @Roles(UserRole.ADMIN)
  async deleteFinancialTransaction(@Args('id') id: string): Promise<boolean> {
    return this.financeService.deleteTransaction(id);
  }

  @Mutation(() => FinancialTransaction, { description: '记录付款' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async recordPayment(
    @Args('input') input: RecordPaymentInput,
    @CurrentUser() user: { id: string }
  ): Promise<FinancialTransaction> {
    return this.financeService.recordPayment(input, user.id);
  }
}
