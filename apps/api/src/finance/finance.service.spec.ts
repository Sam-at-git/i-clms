import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { FinanceService } from './finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { OverdueLevel } from './dto/overdue-alert.dto';

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
});
