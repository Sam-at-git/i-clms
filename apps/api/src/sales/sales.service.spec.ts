import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { RenewalPriority } from './dto/renewal-board.dto';

describe('SalesService', () => {
  let service: SalesService;
  let prismaService: DeepMockProxy<PrismaClient>;

  const mockDecimal = (value: number) => ({
    toString: () => value.toString(),
  });

  const mockCustomer = {
    id: 'customer-1',
    name: 'Test Customer',
    code: 'CUST001',
    industry: 'IT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    contracts: [
      {
        id: 'contract-1',
        contractNo: 'CT-2024-001',
        name: 'Test Contract',
        type: 'STAFF_AUGMENTATION',
        status: 'ACTIVE',
        amountWithTax: mockDecimal(100000),
        signedAt: new Date('2024-01-15'),
        expiresAt: new Date('2024-12-31'),
        customerId: 'customer-1',
        customer: { id: 'customer-1', name: 'Test Customer' },
      },
    ],
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCustomerOverview', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return customer overview', async () => {
      prismaService.customer.findMany.mockResolvedValue([mockCustomer] as any);

      const result = await service.getCustomerOverview();

      expect(result).toBeDefined();
      expect(result.totalCustomers).toBe(1);
      expect(result.activeCustomers).toBe(1);
      expect(result.byIndustry).toBeDefined();
      expect(result.topCustomers).toBeDefined();
    });

    it('should count active customers correctly', async () => {
      const customers = [
        mockCustomer,
        {
          ...mockCustomer,
          id: 'customer-2',
          contracts: [
            { ...mockCustomer.contracts[0], status: 'COMPLETED' },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-3',
          contracts: [
            { ...mockCustomer.contracts[0], status: 'EXECUTING' },
          ],
        },
      ];
      prismaService.customer.findMany.mockResolvedValue(customers as any);

      const result = await service.getCustomerOverview();

      expect(result.totalCustomers).toBe(3);
      expect(result.activeCustomers).toBe(2); // ACTIVE and EXECUTING
    });

    it('should count new customers this year', async () => {
      const customers = [
        {
          ...mockCustomer,
          contracts: [
            { ...mockCustomer.contracts[0], signedAt: new Date('2024-01-15') },
          ],
        },
        {
          ...mockCustomer,
          id: 'customer-2',
          contracts: [
            { ...mockCustomer.contracts[0], signedAt: new Date('2023-12-15') },
          ],
        },
      ];
      prismaService.customer.findMany.mockResolvedValue(customers as any);

      const result = await service.getCustomerOverview();

      expect(result.newCustomersThisYear).toBe(1);
    });

    it('should group customers by industry', async () => {
      const customers = [
        mockCustomer,
        { ...mockCustomer, id: 'customer-2', industry: 'Finance' },
        { ...mockCustomer, id: 'customer-3', industry: 'IT' },
      ];
      prismaService.customer.findMany.mockResolvedValue(customers as any);

      const result = await service.getCustomerOverview();

      expect(result.byIndustry).toHaveLength(2);
      expect(result.byIndustry.find((i) => i.industry === 'IT')?.count).toBe(2);
      expect(result.byIndustry.find((i) => i.industry === 'Finance')?.count).toBe(1);
    });

    it('should handle customers without industry', async () => {
      const customer = { ...mockCustomer, industry: null };
      prismaService.customer.findMany.mockResolvedValue([customer] as any);

      const result = await service.getCustomerOverview();

      expect(result.byIndustry[0].industry).toBe('未分类');
    });

    it('should sort industries by total value', async () => {
      const customers = [
        { ...mockCustomer, industry: 'IT', contracts: [{ ...mockCustomer.contracts[0], amountWithTax: mockDecimal(100000) }] },
        { ...mockCustomer, id: 'customer-2', industry: 'Finance', contracts: [{ ...mockCustomer.contracts[0], amountWithTax: mockDecimal(500000) }] },
      ];
      prismaService.customer.findMany.mockResolvedValue(customers as any);

      const result = await service.getCustomerOverview();

      expect(result.byIndustry[0].industry).toBe('Finance');
      expect(result.byIndustry[0].totalValue).toBe(500000);
    });

    it('should return top 10 customers by total value', async () => {
      const customers = Array.from({ length: 15 }, (_, i) => ({
        ...mockCustomer,
        id: `customer-${i}`,
        contracts: [{ ...mockCustomer.contracts[0], amountWithTax: mockDecimal((i + 1) * 10000) }],
      }));
      prismaService.customer.findMany.mockResolvedValue(customers as any);

      const result = await service.getCustomerOverview();

      expect(result.topCustomers.length).toBeLessThanOrEqual(10);
      expect(result.topCustomers[0].totalValue).toBeGreaterThan(result.topCustomers[1].totalValue);
    });
  });

  describe('getCustomer360', () => {
    it('should return customer 360 view', async () => {
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer as any);

      const result = await service.getCustomer360('customer-1');

      expect(result).toBeDefined();
      expect(result?.customerId).toBe('customer-1');
      expect(result?.customerName).toBe('Test Customer');
      expect(result?.totalContracts).toBe(1);
      expect(result?.totalValue).toBe(100000);
    });

    it('should return null when customer not found', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      const result = await service.getCustomer360('nonexistent');

      expect(result).toBeNull();
    });

    it('should calculate active contracts correctly', async () => {
      const customer = {
        ...mockCustomer,
        contracts: [
          { ...mockCustomer.contracts[0], status: 'ACTIVE' },
          { ...mockCustomer.contracts[0], id: 'contract-2', status: 'EXECUTING' },
          { ...mockCustomer.contracts[0], id: 'contract-3', status: 'COMPLETED' },
        ],
      };
      prismaService.customer.findUnique.mockResolvedValue(customer as any);

      const result = await service.getCustomer360('customer-1');

      expect(result?.activeContracts).toBe(2);
    });

    it('should include contract history', async () => {
      const customer = {
        ...mockCustomer,
        contracts: [
          mockCustomer.contracts[0],
          { ...mockCustomer.contracts[0], id: 'contract-2', contractNo: 'CT-2024-002' },
        ],
      };
      prismaService.customer.findUnique.mockResolvedValue(customer as any);

      const result = await service.getCustomer360('customer-1');

      expect(result?.contractHistory).toHaveLength(2);
      expect(result?.contractHistory[0]).toMatchObject({
        id: expect.any(String),
        contractNo: expect.any(String),
        name: expect.any(String),
      });
    });

    it('should calculate first and last contract dates', async () => {
      const customer = {
        ...mockCustomer,
        contracts: [
          { ...mockCustomer.contracts[0], signedAt: new Date('2024-01-15') },
          { ...mockCustomer.contracts[0], id: 'contract-2', signedAt: new Date('2024-06-15') },
        ],
      };
      prismaService.customer.findUnique.mockResolvedValue(customer as any);

      const result = await service.getCustomer360('customer-1');

      expect(result?.firstContractDate).toEqual(new Date('2024-01-15'));
      expect(result?.lastContractDate).toEqual(new Date('2024-06-15'));
    });
  });

  describe('getRenewalOverview', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return renewal overview', async () => {
      const expiringContract = {
        ...mockCustomer.contracts[0],
        expiresAt: new Date('2024-07-15'),
        customer: { name: 'Test Customer' },
      };
      prismaService.contract.findMany.mockResolvedValue([expiringContract] as any);
      prismaService.contract.count.mockResolvedValue(10);

      const result = await service.getRenewalOverview();

      expect(result).toBeDefined();
      expect(result.expiringThisMonth).toBeDefined();
      expect(result.expiringThisQuarter).toBeDefined();
      expect(result.totalRenewalValue).toBe(100000);
      expect(result.renewalRate).toBeDefined();
    });

    it('should count contracts expiring this month', async () => {
      const contracts = [
        { ...mockCustomer.contracts[0], id: 'c1', expiresAt: new Date('2024-06-20'), customer: { name: 'Customer 1' } },
        { ...mockCustomer.contracts[0], id: 'c2', expiresAt: new Date('2024-07-20'), customer: { name: 'Customer 2' } },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);
      prismaService.contract.count.mockResolvedValue(10);

      const result = await service.getRenewalOverview();

      expect(result.expiringThisMonth).toBe(1);
    });

    it('should calculate renewal probability', async () => {
      const contract = {
        ...mockCustomer.contracts[0],
        amountWithTax: mockDecimal(1500000),
        expiresAt: new Date('2024-07-15'),
        customer: { name: 'Test Customer' },
      };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);
      prismaService.contract.count.mockResolvedValue(10);

      const result = await service.getRenewalOverview();

      expect(result.renewalItems[0].renewalProbability).toBeGreaterThanOrEqual(70);
    });

    it('should calculate renewal priority correctly', async () => {
      const contracts = [
        { ...mockCustomer.contracts[0], id: 'c1', expiresAt: new Date('2024-06-20'), amountWithTax: mockDecimal(100000), customer: { name: 'Customer 1' } },
        { ...mockCustomer.contracts[0], id: 'c2', expiresAt: new Date('2024-08-20'), amountWithTax: mockDecimal(600000), customer: { name: 'Customer 2' } },
        { ...mockCustomer.contracts[0], id: 'c3', expiresAt: new Date('2024-08-20'), amountWithTax: mockDecimal(50000), customer: { name: 'Customer 3' } },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);
      prismaService.contract.count.mockResolvedValue(10);

      const result = await service.getRenewalOverview();

      expect(result.renewalItems.find((i) => i.contractId === 'c1')?.priority).toBe(RenewalPriority.HIGH);
      expect(result.renewalItems.find((i) => i.contractId === 'c2')?.priority).toBe(RenewalPriority.HIGH);
      expect(result.renewalItems.find((i) => i.contractId === 'c3')?.priority).toBe(RenewalPriority.LOW);
    });

    it('should calculate renewal rate from past year', async () => {
      prismaService.contract.findMany.mockResolvedValue([] as any);
      prismaService.contract.count
        .mockResolvedValueOnce(10) // expired last year
        .mockResolvedValueOnce(8); // renewed last year

      const result = await service.getRenewalOverview();

      expect(result.renewalRate).toBe(80);
    });

    it('should handle zero expired contracts', async () => {
      prismaService.contract.findMany.mockResolvedValue([] as any);
      prismaService.contract.count.mockResolvedValue(0);

      const result = await service.getRenewalOverview();

      expect(result.renewalRate).toBe(0);
    });
  });

  describe('getSalesPerformance', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return sales performance for current year', async () => {
      const contracts = [
        { ...mockCustomer.contracts[0], parentContractId: null, salesPerson: 'John Doe' },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getSalesPerformance();

      expect(result).toBeDefined();
      expect(result.totalSalesValue).toBe(100000);
      expect(result.newSignValue).toBe(100000);
      expect(result.renewalValue).toBe(0);
    });

    it('should differentiate between new sign and renewal', async () => {
      const contracts = [
        { ...mockCustomer.contracts[0], id: 'c1', parentContractId: null, salesPerson: 'John' },
        { ...mockCustomer.contracts[0], id: 'c2', parentContractId: 'c1', salesPerson: 'John' },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getSalesPerformance();

      expect(result.newSignValue).toBe(100000);
      expect(result.renewalValue).toBe(100000);
      expect(result.totalSalesValue).toBe(200000);
    });

    it('should generate monthly trend for all 12 months', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockCustomer.contracts[0]] as any);

      const result = await service.getSalesPerformance(2024);

      expect(result.monthlyTrend).toHaveLength(12);
      expect(result.monthlyTrend[0].month).toBe('2024-01');
    });

    it('should group sales by sales person', async () => {
      const contracts = [
        { ...mockCustomer.contracts[0], id: 'c1', salesPerson: 'John Doe', parentContractId: null },
        { ...mockCustomer.contracts[0], id: 'c2', salesPerson: 'Jane Smith', amountWithTax: mockDecimal(200000), parentContractId: null },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getSalesPerformance();

      expect(result.bySalesPerson).toHaveLength(2);
      expect(result.bySalesPerson[0].totalValue).toBeGreaterThan(result.bySalesPerson[1].totalValue);
    });

    it('should handle contracts without sales person', async () => {
      const contract = { ...mockCustomer.contracts[0], salesPerson: null };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getSalesPerformance();

      expect(result.bySalesPerson[0].salesPerson).toBe('未分配');
    });

    it('should handle specific year parameter', async () => {
      const contract = { ...mockCustomer.contracts[0], signedAt: new Date('2023-06-15') };
      prismaService.contract.findMany.mockResolvedValue([contract] as any);

      const result = await service.getSalesPerformance(2023);

      expect(result.totalSalesValue).toBe(100000);
    });

    it('should skip contracts without signed date in monthly trend', async () => {
      const contracts = [
        { ...mockCustomer.contracts[0], signedAt: null },
      ];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);

      const result = await service.getSalesPerformance();

      expect(result.monthlyTrend.every((m) => m.totalValue === 0)).toBe(true);
    });
  });
});
