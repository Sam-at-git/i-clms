import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStatus } from './entities/customer.entity';

// Mock Decimal for tests - Prisma Decimal has toNumber() method
const mockDecimal = (value: number) => ({
  toNumber: () => value,
  toString: () => value.toString(),
});

const mockCustomer = {
  id: 'customer-1',
  name: '上海某某科技有限公司',
  shortName: '某某科技',
  creditCode: '91310000MA1XXXXXX',
  industry: 'IT服务',
  address: '上海市浦东新区',
  contactPerson: '张三',
  contactPhone: '13800138000',
  contactEmail: 'zhangsan@example.com',
  status: 'ACTIVE',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
  contacts: [
    {
      id: 'contact-1',
      customerId: 'customer-1',
      name: '张三',
      title: '采购经理',
      phone: '13800138000',
      email: 'zhangsan@example.com',
      isPrimary: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ],
  contracts: [],
};

const mockCustomerWithContracts = {
  ...mockCustomer,
  contracts: [
    {
      id: 'contract-1',
      amountWithTax: mockDecimal(100000),
      status: 'ACTIVE',
      signedAt: new Date('2025-03-01'),
      createdAt: new Date('2025-03-01'),
    },
    {
      id: 'contract-2',
      amountWithTax: mockDecimal(200000),
      status: 'COMPLETED',
      signedAt: new Date('2025-06-01'),
      createdAt: new Date('2025-06-01'),
    },
  ],
};

const mockPrismaService = {
  customer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  customerContact: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    // TEST-001: findAll without filter
    it('should return paginated customers without filter', async () => {
      const customers = [mockCustomer];
      prisma.customer.findMany.mockResolvedValue(customers);
      prisma.customer.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    // TEST-002: findAll with search
    it('should filter by search term', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      prisma.customer.count.mockResolvedValue(1);

      await service.findAll({ search: '某某' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: '某某', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    // TEST-003: findAll with industry filter
    it('should filter by industry', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      prisma.customer.count.mockResolvedValue(1);

      await service.findAll({ industry: 'IT服务' });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            industry: 'IT服务',
          }),
        }),
      );
    });

    // TEST-004: findAll with status filter
    it('should filter by status', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      prisma.customer.count.mockResolvedValue(1);

      await service.findAll({ status: CustomerStatus.ACTIVE });

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should return hasMore true when more pages exist', async () => {
      prisma.customer.findMany.mockResolvedValue([mockCustomer]);
      prisma.customer.count.mockResolvedValue(50);

      const result = await service.findAll({ skip: 0, take: 10 });

      expect(result.hasMore).toBe(true);
    });
  });

  describe('findOne', () => {
    // TEST-005: findOne existing customer
    it('should return customer with contacts and contracts', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomerWithContracts);

      const result = await service.findOne('customer-1');

      expect(result.id).toBe('customer-1');
      expect(result.name).toBe('上海某某科技有限公司');
      expect(result.contacts).toHaveLength(1);
    });

    // TEST-006: findOne non-existing customer
    it('should throw NotFoundException for non-existing customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    // TEST-007: create customer normally
    it('should create customer successfully', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create({
        fullName: '上海某某科技有限公司',
        shortName: '某某科技',
        creditCode: '91310000MA1XXXXXX',
        industry: 'IT服务',
        address: '上海市浦东新区',
      });

      expect(result.name).toBe('上海某某科技有限公司');
      expect(prisma.customer.create).toHaveBeenCalled();
    });

    // TEST-008: create customer with contacts
    it('should create customer with contacts', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue(mockCustomer);

      await service.create({
        fullName: '上海某某科技有限公司',
        contacts: [
          {
            name: '张三',
            title: '采购经理',
            phone: '13800138000',
            email: 'zhangsan@example.com',
            isPrimary: true,
          },
        ],
      });

      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contacts: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ name: '张三' }),
              ]),
            }),
          }),
        }),
      );
    });

    // TEST-009: create customer with duplicate credit code
    it('should throw ConflictException for duplicate credit code', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.create({
          fullName: '另一家公司',
          creditCode: '91310000MA1XXXXXX',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    // TEST-010: update customer normally
    it('should update customer successfully', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.customer.update.mockResolvedValue({
        ...mockCustomer,
        shortName: '新简称',
      });

      const result = await service.update('customer-1', {
        shortName: '新简称',
      });

      expect(result.shortName).toBe('新简称');
    });

    // TEST-011: update non-existing customer
    it('should throw NotFoundException for non-existing customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existing', { shortName: '新简称' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    // TEST-012: delete customer without contracts
    it('should delete customer successfully', async () => {
      prisma.customer.findUnique.mockResolvedValue({
        ...mockCustomer,
        contracts: [],
      });
      prisma.customer.delete.mockResolvedValue(mockCustomer);

      const result = await service.delete('customer-1');

      expect(result.id).toBe('customer-1');
      expect(prisma.customer.delete).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { contacts: true },
      });
    });

    // TEST-013: delete customer with contracts
    it('should throw ConflictException when customer has contracts', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomerWithContracts);

      await expect(service.delete('customer-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException for non-existing customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCustomerStats', () => {
    // TEST-014: getCustomerStats with contracts
    it('should return correct stats for customer with contracts', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomerWithContracts);

      const result = await service.getCustomerStats('customer-1');

      expect(result.totalContracts).toBe(2);
      expect(result.activeContracts).toBe(1);
      expect(result.totalValue).toBe(300000);
      expect(result.averageContractValue).toBe(150000);
      expect(result.isActive).toBe(true);
    });

    // TEST-015: getCustomerStats without contracts
    it('should return zero stats for customer without contracts', async () => {
      prisma.customer.findUnique.mockResolvedValue({
        ...mockCustomer,
        contracts: [],
      });

      const result = await service.getCustomerStats('customer-1');

      expect(result.totalContracts).toBe(0);
      expect(result.activeContracts).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.averageContractValue).toBe(0);
      expect(result.isActive).toBe(false);
    });

    // TEST-016: lifetime value calculation
    it('should calculate lifetime value correctly', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomerWithContracts);

      const result = await service.getCustomerStats('customer-1');

      // Should apply bonuses for active contracts and frequency
      expect(result.lifetimeValueScore).toBeGreaterThan(result.totalValue);
    });

    it('should throw NotFoundException for non-existing customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerStats('non-existing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('contact management', () => {
    // TEST-017: addContact
    it('should add contact to customer', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.customerContact.create.mockResolvedValue(mockCustomer.contacts[0]);

      const result = await service.addContact('customer-1', {
        name: '李四',
        title: '技术总监',
        phone: '13900139000',
        email: 'lisi@example.com',
      });

      expect(result.name).toBe('张三');
      expect(prisma.customerContact.create).toHaveBeenCalled();
    });

    // TEST-018: addContact as primary
    it('should reset other primary contacts when adding primary', async () => {
      prisma.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.customerContact.updateMany.mockResolvedValue({ count: 1 });
      prisma.customerContact.create.mockResolvedValue({
        ...mockCustomer.contacts[0],
        id: 'contact-2',
        name: '李四',
      });

      await service.addContact('customer-1', {
        name: '李四',
        isPrimary: true,
      });

      expect(prisma.customerContact.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1', isPrimary: true },
        data: { isPrimary: false },
      });
    });

    // TEST-019: updateContact
    it('should update contact successfully', async () => {
      const contact = mockCustomer.contacts[0];
      prisma.customerContact.findUnique.mockResolvedValue(contact);
      prisma.customerContact.update.mockResolvedValue({
        ...contact,
        title: '新职位',
      });

      const result = await service.updateContact('contact-1', {
        title: '新职位',
      });

      expect(result.title).toBe('新职位');
    });

    it('should throw NotFoundException for non-existing contact', async () => {
      prisma.customerContact.findUnique.mockResolvedValue(null);

      await expect(
        service.updateContact('non-existing', { title: '新职位' }),
      ).rejects.toThrow(NotFoundException);
    });

    // TEST-020: removeContact
    it('should remove contact successfully', async () => {
      const contact = mockCustomer.contacts[0];
      prisma.customerContact.findUnique.mockResolvedValue(contact);
      prisma.customerContact.delete.mockResolvedValue(contact);

      const result = await service.removeContact('contact-1');

      expect(result.id).toBe('contact-1');
    });

    it('should throw NotFoundException when removing non-existing contact', async () => {
      prisma.customerContact.findUnique.mockResolvedValue(null);

      await expect(service.removeContact('non-existing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
