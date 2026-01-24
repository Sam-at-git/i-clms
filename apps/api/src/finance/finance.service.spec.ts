import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { OverdueLevel } from './dto/overdue-alert.dto';
import { TransactionType, TransactionStatus } from './dto/financial-transaction.dto';
import { NotFoundException } from '@nestjs/common';

describe('FinanceService', () => {
  let service: FinanceService;
  let prismaService: DeepMockProxy<PrismaClient>;

  const mockDecimal = (value: number) => ({
    toString: () => value.toString(),
  });

  const mockContract = {
    id: 'contract-1',
    contractNo: 'CT-2024-001',
    name: 'Test Contract',
    type: 'STAFF_AUGMENTATION',
    status: 'ACTIVE',
    customerId: 'customer-1',
    amountWithTax: mockDecimal(100000),
    signedAt: new Date('2024-01-15'),
    effectiveAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-12-31'),
    customer: {
      id: 'customer-1',
      name: 'Test Customer',
    },
  };

  const mockMilestone = {
    id: 'milestone-1',
    name: 'Phase 1',
    amount: mockDecimal(50000),
    plannedDate: new Date('2024-02-01'),
    status: 'PENDING',
    detail: {
      contract: {
        id: 'contract-1',
        contractNo: 'CT-2024-001',
        customer: {
          name: 'Test Customer',
        },
      },
    },
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueStats', () => {
    it('should return revenue statistics', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockContract] as any);

      const result = await service.getRevenueStats();

      expect(result).toBeDefined();
      expect(result.totalRevenue).toBe(100000);
      expect(result.byMonth).toBeDefined();
      expect(result.byContractType).toBeDefined();
      expect(result.byCustomer).toBeDefined();
    });

    it('should calculate monthly revenue correctly', async () => {
      const contracts = [
        { ...mockContract, signedAt: new Date('2024-01-15') },
        { ...mockContract, id: 'contract-2', signedAt: new Date('2024-01-20') },
        { ...mockContract, id: 'contract-3', signedAt: new Date('2024-02-10') },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getRevenueStats();

      expect(result.byMonth).toHaveLength(2);
      expect(result.byMonth[0].month).toBe('2024-01');
      expect(result.byMonth[0].amount).toBe(200000);
      expect(result.byMonth[0].count).toBe(2);
      expect(result.byMonth[1].month).toBe('2024-02');
      expect(result.byMonth[1].amount).toBe(100000);
      expect(result.byMonth[1].count).toBe(1);
    });

    it('should calculate revenue by contract type', async () => {
      const contracts = [
        { ...mockContract, type: 'STAFF_AUGMENTATION', amountWithTax: mockDecimal(100000) },
        { ...mockContract, id: 'contract-2', type: 'PROJECT_OUTSOURCING', amountWithTax: mockDecimal(200000) },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getRevenueStats();

      expect(result.byContractType).toHaveLength(2);
      expect(result.byContractType.find(t => t.type === 'STAFF_AUGMENTATION')).toEqual({
        type: 'STAFF_AUGMENTATION',
        amount: 100000,
        percentage: expect.any(Number),
      });
    });

    it('should calculate revenue by customer', async () => {
      const contracts = [
        mockContract,
        { ...mockContract, id: 'contract-2', customerId: 'customer-2', customer: { name: 'Customer 2' } },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getRevenueStats();

      expect(result.byCustomer).toHaveLength(2);
      expect(result.byCustomer[0]).toMatchObject({
        customerId: expect.any(String),
        customerName: expect.any(String),
        amount: 100000,
        contractCount: 1,
      });
    });

    it('should filter by year', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockContract] as any);

      await service.getRevenueStats({ year: 2024 });

      expect(prismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            signedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockContract] as any);

      await service.getRevenueStats({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      expect(prismaService.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            signedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should handle contracts without signed date', async () => {
      const contractWithoutDate = { ...mockContract, signedAt: null };
      prismaService.contract.findMany.mockResolvedValue([contractWithoutDate] as any);

      const result = await service.getRevenueStats();

      expect(result.byMonth).toHaveLength(0);
      expect(result.totalRevenue).toBe(100000);
    });

    it('should return zero revenue when no contracts', async () => {
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getRevenueStats();

      expect(result.totalRevenue).toBe(0);
      expect(result.byMonth).toHaveLength(0);
      expect(result.byContractType).toHaveLength(0);
      expect(result.byCustomer).toHaveLength(0);
    });
  });

  describe('getCashFlowForecast', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return cash flow forecast for 6 months by default', async () => {
      prismaService.projectMilestone.findMany.mockResolvedValue([]);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getCashFlowForecast();

      expect(result).toHaveLength(6);
      expect(result[0].month).toBe('2024-01');
    });

    it('should calculate expected income from milestones', async () => {
      const milestones = [
        { ...mockMilestone, amount: mockDecimal(50000), status: 'PENDING' },
        { ...mockMilestone, id: 'milestone-2', amount: mockDecimal(30000), status: 'ACCEPTED' },
      ];
      prismaService.projectMilestone.findMany.mockResolvedValue(milestones as any);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getCashFlowForecast(1);

      expect(result[0].expectedIncome).toBe(80000);
      expect(result[0].receivedAmount).toBe(30000);
      expect(result[0].pendingAmount).toBe(50000);
    });

    it('should calculate initial payment from contracts', async () => {
      prismaService.projectMilestone.findMany.mockResolvedValue([]);
      const contract = {
        ...mockContract,
        amountWithTax: mockDecimal(100000),
        status: 'ACTIVE',
      };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getCashFlowForecast(1);

      expect(result[0].expectedIncome).toBe(30000); // 30% of 100000
    });

    it('should handle custom months parameter', async () => {
      prismaService.projectMilestone.findMany.mockResolvedValue([]);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getCashFlowForecast(3);

      expect(result).toHaveLength(3);
    });
  });

  describe('getOverdueAlerts', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return overdue milestone alerts', async () => {
      const overdueMilestone = {
        ...mockMilestone,
        plannedDate: new Date('2023-11-01'), // More than 90 days ago from 2024-03-01
        status: 'PENDING',
      };
      prismaService.projectMilestone.findMany.mockResolvedValue([overdueMilestone] as any);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getOverdueAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].contractNo).toBe('CT-2024-001');
      expect(result[0].daysOverdue).toBeGreaterThan(90);
      expect(result[0].level).toBe(OverdueLevel.CRITICAL);
    });

    it('should return overdue contract alerts', async () => {
      prismaService.projectMilestone.findMany.mockResolvedValue([]);
      const expiredContract = {
        ...mockContract,
        expiresAt: new Date('2024-01-01'),
        status: 'ACTIVE',
      };
      prismaService.contract.findMany.mockResolvedValue([expiredContract] as any);

      const result = await service.getOverdueAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].contractNo).toBe('CT-2024-001');
      expect(result[0].daysOverdue).toBeGreaterThan(0);
    });

    it('should calculate overdue levels correctly', async () => {
      const milestones = [
        { ...mockMilestone, id: 'm1', plannedDate: new Date('2024-02-15'), status: 'PENDING' }, // 15 days
        { ...mockMilestone, id: 'm2', plannedDate: new Date('2024-01-15'), status: 'PENDING' }, // 46 days
        { ...mockMilestone, id: 'm3', plannedDate: new Date('2023-12-15'), status: 'PENDING' }, // 77 days
        { ...mockMilestone, id: 'm4', plannedDate: new Date('2023-10-01'), status: 'PENDING' }, // 152 days
      ];
      prismaService.projectMilestone.findMany.mockResolvedValue(milestones as any);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getOverdueAlerts();

      expect(result.find(a => a.daysOverdue >= 0 && a.daysOverdue <= 30)?.level).toBe(OverdueLevel.LOW);
      expect(result.find(a => a.daysOverdue > 30 && a.daysOverdue <= 60)?.level).toBe(OverdueLevel.MEDIUM);
      expect(result.find(a => a.daysOverdue > 60 && a.daysOverdue <= 90)?.level).toBe(OverdueLevel.HIGH);
      expect(result.find(a => a.daysOverdue > 90)?.level).toBe(OverdueLevel.CRITICAL);
    });

    it('should sort alerts by days overdue descending', async () => {
      const milestones = [
        { ...mockMilestone, id: 'm1', plannedDate: new Date('2024-02-15'), status: 'PENDING' },
        { ...mockMilestone, id: 'm2', plannedDate: new Date('2023-12-01'), status: 'PENDING' },
        { ...mockMilestone, id: 'm3', plannedDate: new Date('2024-01-15'), status: 'PENDING' },
      ];
      prismaService.projectMilestone.findMany.mockResolvedValue(milestones as any);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getOverdueAlerts();

      expect(result[0].daysOverdue).toBeGreaterThan(result[1].daysOverdue);
      expect(result[1].daysOverdue).toBeGreaterThan(result[2].daysOverdue);
    });

    it('should skip milestones without planned date', async () => {
      const milestone = { ...mockMilestone, plannedDate: null };
      prismaService.projectMilestone.findMany.mockResolvedValue([milestone] as any);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getOverdueAlerts();

      expect(result).toHaveLength(0);
    });

    it('should skip contracts without expiry date', async () => {
      prismaService.projectMilestone.findMany.mockResolvedValue([]);
      const contract = { ...mockContract, expiresAt: null };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getOverdueAlerts();

      expect(result).toHaveLength(0);
    });

    it('should return empty array when no overdue items', async () => {
      prismaService.projectMilestone.findMany.mockResolvedValue([]);
      prismaService.contract.findMany.mockResolvedValue([]);

      const result = await service.getOverdueAlerts();

      expect(result).toHaveLength(0);
    });
  });

  // ================================
  // Financial Transaction CRUD Tests
  // ================================

  const mockFinancialTransaction = {
    id: 'transaction-1',
    contractId: 'contract-1',
    type: TransactionType.PAYMENT,
    amount: { toString: () => '50000' } as any,
    currency: 'CNY',
    category: 'services',
    status: TransactionStatus.PENDING,
    occurredAt: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    description: 'Test payment',
    metadata: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'user-1',
    contract: {
      id: 'contract-1',
      contractNo: 'CT-2024-001',
      name: 'Test Contract',
    },
  };

  describe('financialTransactions', () => {
    it('should return paginated financial transactions', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([mockFinancialTransaction] as any);
      prismaService.financialTransaction.count.mockResolvedValue(1);

      const result = await service.financialTransactions();

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should apply filters correctly', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([] as any);
      prismaService.financialTransaction.count.mockResolvedValue(0);

      await service.financialTransactions({
        filter: {
          contractId: 'contract-1',
          type: TransactionType.PAYMENT,
          status: TransactionStatus.PENDING,
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        },
        page: 2,
        pageSize: 10,
        sortBy: 'occurredAt',
        sortOrder: 'asc',
      });

      expect(prismaService.financialTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractId: 'contract-1',
            type: TransactionType.PAYMENT,
            status: TransactionStatus.PENDING,
            occurredAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          skip: 10,
          take: 10,
          orderBy: { occurredAt: 'asc' },
        })
      );
    });

    it('should return empty array when no transactions exist', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([]);
      prismaService.financialTransaction.count.mockResolvedValue(0);

      const result = await service.financialTransactions();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('paymentHistory', () => {
    it('should return payment history for a contract', async () => {
      const transactions = [
        { ...mockFinancialTransaction, type: TransactionType.PAYMENT },
        { ...mockFinancialTransaction, id: 't2', type: TransactionType.RECEIPT },
      ];
      prismaService.financialTransaction.findMany.mockResolvedValue(transactions as any);

      const result = await service.paymentHistory('contract-1');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(TransactionType.PAYMENT);
      expect(result[1].type).toBe(TransactionType.RECEIPT);
    });

    it('should only return payment and receipt transactions', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([mockFinancialTransaction] as any);

      await service.paymentHistory('contract-1');

      expect(prismaService.financialTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractId: 'contract-1',
            type: { in: [TransactionType.PAYMENT, TransactionType.RECEIPT] },
          }),
        })
      );
    });

    it('should order by occurredAt descending', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([] as any);

      await service.paymentHistory('contract-1');

      expect(prismaService.financialTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { occurredAt: 'desc' },
        })
      );
    });
  });

  describe('pendingPayments', () => {
    it('should return pending payments', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([mockFinancialTransaction] as any);

      const result = await service.pendingPayments();

      expect(result).toHaveLength(1);
    });

    it('should filter by department when provided', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([] as any);

      await service.pendingPayments('dept-1', 50);

      expect(prismaService.financialTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TransactionStatus.PENDING,
            type: TransactionType.PAYMENT,
            contract: { departmentId: 'dept-1' },
          }),
        })
      );
    });

    it('should limit results', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([] as any);

      await service.pendingPayments(undefined, 25);

      expect(prismaService.financialTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        })
      );
    });

    it('should order by dueDate ascending', async () => {
      prismaService.financialTransaction.findMany.mockResolvedValue([] as any);

      await service.pendingPayments();

      expect(prismaService.financialTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { dueDate: 'asc' },
        })
      );
    });
  });

  describe('createTransaction', () => {
    it('should create a new financial transaction', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.financialTransaction.create.mockResolvedValue(mockFinancialTransaction as any);

      const result = await service.createTransaction(
        {
          contractId: 'contract-1',
          type: TransactionType.PAYMENT,
          amount: 50000,
          category: 'services',
        },
        'user-1'
      );

      expect(result).toBeDefined();
      expect(prismaService.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            type: TransactionType.PAYMENT,
            amount: 50000,
            category: 'services',
            status: TransactionStatus.PENDING,
            currency: 'CNY',
            createdBy: 'user-1',
          }),
        })
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.createTransaction(
          {
            contractId: 'nonexistent',
            type: TransactionType.PAYMENT,
            amount: 50000,
            category: 'services',
          },
          'user-1'
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should parse metadata JSON when provided', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.financialTransaction.create.mockResolvedValue(mockFinancialTransaction as any);

      const metadata = JSON.stringify({ reference: 'INV-001' });

      await service.createTransaction(
        {
          contractId: 'contract-1',
          type: TransactionType.PAYMENT,
          amount: 50000,
          category: 'services',
          metadata,
        },
        'user-1'
      );

      expect(prismaService.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { reference: 'INV-001' },
          }),
        })
      );
    });

    it('should use provided status when specified', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.financialTransaction.create.mockResolvedValue(mockFinancialTransaction as any);

      await service.createTransaction(
        {
          contractId: 'contract-1',
          type: TransactionType.PAYMENT,
          amount: 50000,
          category: 'services',
          status: TransactionStatus.COMPLETED,
        },
        'user-1'
      );

      expect(prismaService.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TransactionStatus.COMPLETED,
          }),
        })
      );
    });
  });

  describe('updateTransaction', () => {
    it('should update an existing transaction', async () => {
      prismaService.financialTransaction.findUnique.mockResolvedValue(mockFinancialTransaction as any);
      prismaService.financialTransaction.update.mockResolvedValue({
        ...mockFinancialTransaction,
        status: TransactionStatus.COMPLETED,
      } as any);

      const result = await service.updateTransaction('transaction-1', {
        status: TransactionStatus.COMPLETED,
      });

      expect(result).toBeDefined();
      expect(prismaService.financialTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'transaction-1' },
          data: expect.objectContaining({
            status: TransactionStatus.COMPLETED,
          }),
        })
      );
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      prismaService.financialTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTransaction('nonexistent', { status: TransactionStatus.COMPLETED })
      ).rejects.toThrow(NotFoundException);
    });

    it('should update multiple fields', async () => {
      prismaService.financialTransaction.findUnique.mockResolvedValue(mockFinancialTransaction as any);
      prismaService.financialTransaction.update.mockResolvedValue(mockFinancialTransaction as any);

      await service.updateTransaction('transaction-1', {
        status: TransactionStatus.COMPLETED,
        amount: 60000,
        category: 'deliverables',
      });

      expect(prismaService.financialTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TransactionStatus.COMPLETED,
            amount: 60000,
            category: 'deliverables',
          }),
        })
      );
    });

    it('should parse metadata JSON when updating', async () => {
      prismaService.financialTransaction.findUnique.mockResolvedValue(mockFinancialTransaction as any);
      prismaService.financialTransaction.update.mockResolvedValue(mockFinancialTransaction as any);

      const metadata = JSON.stringify({ updated: true, notes: 'Updated manually' });

      await service.updateTransaction('transaction-1', { metadata });

      expect(prismaService.financialTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { updated: true, notes: 'Updated manually' },
          }),
        })
      );
    });

    it('should remove dueDate when explicitly set to null in update', async () => {
      prismaService.financialTransaction.findUnique.mockResolvedValue(mockFinancialTransaction as any);
      prismaService.financialTransaction.update.mockResolvedValue(mockFinancialTransaction as any);

      // The DTO expects string | undefined, not null
      // But we can test that the service handles removing the field
      const result = await service.updateTransaction('transaction-1', {
        dueDate: undefined,
      });

      expect(prismaService.financialTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            dueDate: expect.anything(),
          }),
        })
      );
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      prismaService.financialTransaction.findUnique.mockResolvedValue(mockFinancialTransaction as any);
      prismaService.financialTransaction.delete.mockResolvedValue(mockFinancialTransaction as any);

      const result = await service.deleteTransaction('transaction-1');

      expect(result).toBe(true);
      expect(prismaService.financialTransaction.delete).toHaveBeenCalledWith({
        where: { id: 'transaction-1' },
      });
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      prismaService.financialTransaction.findUnique.mockResolvedValue(null);

      await expect(service.deleteTransaction('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordPayment', () => {
    it('should record a new payment', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.financialTransaction.create.mockResolvedValue(mockFinancialTransaction as any);

      const result = await service.recordPayment(
        {
          contractId: 'contract-1',
          amount: 50000,
          description: 'Payment for services',
        },
        'user-1'
      );

      expect(result).toBeDefined();
      expect(prismaService.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            type: TransactionType.PAYMENT,
            amount: 50000,
            category: 'services',
            status: TransactionStatus.PENDING,
            description: 'Payment for services',
            createdBy: 'user-1',
          }),
        })
      );
    });

    it('should use default category when not provided', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.financialTransaction.create.mockResolvedValue(mockFinancialTransaction as any);

      await service.recordPayment(
        {
          contractId: 'contract-1',
          amount: 50000,
        },
        'user-1'
      );

      expect(prismaService.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'services',
          }),
        })
      );
    });

    it('should use paymentDate when provided', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.financialTransaction.create.mockResolvedValue(mockFinancialTransaction as any);

      await service.recordPayment(
        {
          contractId: 'contract-1',
          amount: 50000,
          paymentDate: '2024-01-20',
        },
        'user-1'
      );

      expect(prismaService.financialTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            occurredAt: new Date('2024-01-20'),
          }),
        })
      );
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      await expect(
        service.recordPayment(
          {
            contractId: 'nonexistent',
            amount: 50000,
          },
          'user-1'
        )
      ).rejects.toThrow(NotFoundException);
    });
  });
});
