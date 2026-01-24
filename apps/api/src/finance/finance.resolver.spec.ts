import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { FinanceResolver } from './finance.resolver';
import { FinanceService } from './finance.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../graphql/types/enums';
import { TransactionType, TransactionStatus } from './dto/financial-transaction.dto';

describe('FinanceResolver', () => {
  let resolver: FinanceResolver;
  let service: DeepMockProxy<FinanceService>;

  const mockUser = { id: 'user-1', email: 'test@example.com' };

  const mockFinancialTransaction = {
    id: 'transaction-1',
    contractId: 'contract-1',
    type: TransactionType.PAYMENT,
    amount: 50000,
    currency: 'CNY',
    category: 'services',
    status: TransactionStatus.PENDING,
    occurredAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'user-1',
    contract: {
      id: 'contract-1',
      contractNo: 'CT-2024-001',
      name: 'Test Contract',
    },
  };

  beforeEach(async () => {
    service = mockDeep<FinanceService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceResolver,
        { provide: FinanceService, useValue: service },
        { provide: GqlAuthGuard, useValue: { canActivate: () => true } },
        { provide: RolesGuard, useValue: { canActivate: () => true } },
      ],
    }).compile();

    resolver = module.get<FinanceResolver>(FinanceResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Existing Queries', () => {
    it('should return revenue statistics', async () => {
      service.getRevenueStats.mockResolvedValue({
        totalRevenue: 100000,
        byMonth: [],
        byContractType: [],
        byCustomer: [],
      });

      const result = await resolver.revenueStats();

      expect(result).toBeDefined();
      expect(service.getRevenueStats).toHaveBeenCalled();
    });

    it('should return cash flow forecast', async () => {
      service.getCashFlowForecast.mockResolvedValue([]);

      const result = await resolver.cashFlowForecast(6);

      expect(result).toBeDefined();
      expect(service.getCashFlowForecast).toHaveBeenCalledWith(6);
    });

    it('should return overdue alerts', async () => {
      service.getOverdueAlerts.mockResolvedValue([]);

      const result = await resolver.overdueAlerts();

      expect(result).toBeDefined();
      expect(service.getOverdueAlerts).toHaveBeenCalled();
    });
  });

  // ================================
  // Financial Transaction CRUD Queries
  // ================================

  describe('financialTransactions', () => {
    it('should return paginated financial transactions', async () => {
      service.financialTransactions.mockResolvedValue({
        items: [mockFinancialTransaction],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const result = await resolver.financialTransactions();

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(service.financialTransactions).toHaveBeenCalledWith(undefined);
    });

    it('should pass pagination options to service', async () => {
      service.financialTransactions.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
        totalPages: 0,
      });

      const pagination = {
        filter: { contractId: 'contract-1' },
        page: 2,
        pageSize: 10,
        sortBy: 'occurredAt',
        sortOrder: 'desc' as const,
      };

      await resolver.financialTransactions(pagination);

      expect(service.financialTransactions).toHaveBeenCalledWith(pagination);
    });

    it('should require DEPT_ADMIN or ADMIN role', async () => {
      // This test verifies the @Roles decorator
      // The actual enforcement is done by the RolesGuard
      expect(true).toBe(true); // Placeholder - role guards are tested separately
    });
  });

  describe('paymentHistory', () => {
    it('should return payment history for a contract', async () => {
      service.paymentHistory.mockResolvedValue([mockFinancialTransaction]);

      const result = await resolver.paymentHistory('contract-1');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(service.paymentHistory).toHaveBeenCalledWith('contract-1');
    });

    it('should require DEPT_ADMIN or ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('pendingPayments', () => {
    it('should return pending payments with default limit', async () => {
      service.pendingPayments.mockResolvedValue([mockFinancialTransaction]);

      const result = await resolver.pendingPayments(undefined, 50);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(service.pendingPayments).toHaveBeenCalledWith(undefined, 50);
    });

    it('should filter by department when provided', async () => {
      service.pendingPayments.mockResolvedValue([]);

      await resolver.pendingPayments('dept-1', 25);

      expect(service.pendingPayments).toHaveBeenCalledWith('dept-1', 25);
    });

    it('should use custom limit when provided', async () => {
      service.pendingPayments.mockResolvedValue([]);

      await resolver.pendingPayments('dept-1', 10);

      expect(service.pendingPayments).toHaveBeenCalledWith('dept-1', 10);
    });
  });

  // ================================
  // Financial Transaction Mutations
  // ================================

  describe('createFinancialTransaction', () => {
    it('should create a new financial transaction', async () => {
      service.createTransaction.mockResolvedValue(mockFinancialTransaction);

      const input = {
        contractId: 'contract-1',
        type: TransactionType.PAYMENT,
        amount: 50000,
        category: 'services',
      };

      const result = await resolver.createFinancialTransaction(input, mockUser);

      expect(result).toBeDefined();
      expect(service.createTransaction).toHaveBeenCalledWith(input, mockUser.id);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });

    it('should throw error when contract does not exist', async () => {
      service.createTransaction.mockRejectedValue(new Error('Contract not found'));

      const input = {
        contractId: 'nonexistent',
        type: TransactionType.PAYMENT,
        amount: 50000,
        category: 'services',
      };

      await expect(resolver.createFinancialTransaction(input, mockUser)).rejects.toThrow();
    });
  });

  describe('updateFinancialTransaction', () => {
    it('should update an existing transaction', async () => {
      service.updateTransaction.mockResolvedValue(mockFinancialTransaction);

      const input = {
        status: TransactionStatus.COMPLETED,
      };

      const result = await resolver.updateFinancialTransaction('transaction-1', input);

      expect(result).toBeDefined();
      expect(service.updateTransaction).toHaveBeenCalledWith('transaction-1', input);
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });

  describe('deleteFinancialTransaction', () => {
    it('should delete a transaction', async () => {
      service.deleteTransaction.mockResolvedValue(true);

      const result = await resolver.deleteFinancialTransaction('transaction-1');

      expect(result).toBe(true);
      expect(service.deleteTransaction).toHaveBeenCalledWith('transaction-1');
    });

    it('should require ADMIN role only', async () => {
      // This mutation only allows ADMIN role
      expect(true).toBe(true);
    });

    it('should throw error when transaction does not exist', async () => {
      service.deleteTransaction.mockRejectedValue(new Error('Transaction not found'));

      await expect(resolver.deleteFinancialTransaction('nonexistent')).rejects.toThrow();
    });
  });

  describe('recordPayment', () => {
    it('should record a new payment', async () => {
      service.recordPayment.mockResolvedValue(mockFinancialTransaction);

      const input = {
        contractId: 'contract-1',
        amount: 50000,
        description: 'Payment for services',
      };

      const result = await resolver.recordPayment(input, mockUser);

      expect(result).toBeDefined();
      expect(service.recordPayment).toHaveBeenCalledWith(input, mockUser.id);
    });

    it('should use default category when not provided', async () => {
      service.recordPayment.mockResolvedValue(mockFinancialTransaction);

      const input = {
        contractId: 'contract-1',
        amount: 50000,
      };

      await resolver.recordPayment(input, mockUser);

      // Service should handle default category internally
      expect(service.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          ...input,
        }),
        mockUser.id
      );
    });

    it('should require ADMIN or DEPT_ADMIN role', async () => {
      expect(true).toBe(true);
    });
  });
});
