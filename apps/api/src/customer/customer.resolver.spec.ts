import { Test, TestingModule } from '@nestjs/testing';
import { CustomerResolver } from './customer.resolver';
import { CustomerService } from './customer.service';
import { CustomerStatus } from './entities/customer.entity';

const mockCustomer = {
  id: 'customer-1',
  name: '上海某某科技有限公司',
  shortName: '某某科技',
  creditCode: '91310000MA1XXXXXX',
  industry: 'IT服务',
  address: '上海市浦东新区',
  contactPerson: null,
  contactPhone: null,
  contactEmail: null,
  status: CustomerStatus.ACTIVE,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-06-01'),
  contacts: [],
  contracts: [],
};

const mockCustomerStats = {
  totalContracts: 5,
  activeContracts: 2,
  totalValue: 500000,
  averageContractValue: 100000,
  firstContractDate: new Date('2024-01-01'),
  lastContractDate: new Date('2025-06-01'),
  lifetimeValueScore: 600000,
  isActive: true,
};

const mockContact = {
  id: 'contact-1',
  customerId: 'customer-1',
  name: '张三',
  title: '采购经理',
  phone: '13800138000',
  email: 'zhangsan@example.com',
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCustomerService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getCustomerStats: jest.fn(),
  addContact: jest.fn(),
  updateContact: jest.fn(),
  removeContact: jest.fn(),
};

describe('CustomerResolver', () => {
  let resolver: CustomerResolver;
  let service: typeof mockCustomerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerResolver,
        {
          provide: CustomerService,
          useValue: mockCustomerService,
        },
      ],
    }).compile();

    resolver = module.get<CustomerResolver>(CustomerResolver);
    service = module.get(CustomerService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  // TEST-021: customers query
  describe('getCustomers', () => {
    it('should return paginated customers', async () => {
      const result = {
        items: [mockCustomer],
        total: 1,
        hasMore: false,
      };
      service.findAll.mockResolvedValue(result);

      const response = await resolver.getCustomers();

      expect(response.items).toHaveLength(1);
      expect(response.total).toBe(1);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should pass filter to service', async () => {
      service.findAll.mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false,
      });

      await resolver.getCustomers({ search: '某某', industry: 'IT' });

      expect(service.findAll).toHaveBeenCalledWith({
        search: '某某',
        industry: 'IT',
      });
    });
  });

  // TEST-022: customer query
  describe('getCustomer', () => {
    it('should return customer by id', async () => {
      service.findOne.mockResolvedValue(mockCustomer);

      const result = await resolver.getCustomer('customer-1');

      expect(result.id).toBe('customer-1');
      expect(service.findOne).toHaveBeenCalledWith('customer-1');
    });
  });

  // TEST-023: customerStats query
  describe('getCustomerStats', () => {
    it('should return customer stats', async () => {
      service.getCustomerStats.mockResolvedValue(mockCustomerStats);

      const result = await resolver.getCustomerStats('customer-1');

      expect(result.totalContracts).toBe(5);
      expect(result.totalValue).toBe(500000);
      expect(service.getCustomerStats).toHaveBeenCalledWith('customer-1');
    });
  });

  // TEST-024: createCustomer mutation
  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      service.create.mockResolvedValue(mockCustomer);

      const result = await resolver.createCustomer({
        fullName: '上海某某科技有限公司',
        shortName: '某某科技',
      });

      expect(result.name).toBe('上海某某科技有限公司');
      expect(service.create).toHaveBeenCalledWith({
        fullName: '上海某某科技有限公司',
        shortName: '某某科技',
      });
    });
  });

  // TEST-025: updateCustomer mutation
  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const updated = { ...mockCustomer, shortName: '新简称' };
      service.update.mockResolvedValue(updated);

      const result = await resolver.updateCustomer('customer-1', {
        shortName: '新简称',
      });

      expect(result.shortName).toBe('新简称');
      expect(service.update).toHaveBeenCalledWith('customer-1', {
        shortName: '新简称',
      });
    });
  });

  // TEST-026: deleteCustomer mutation
  describe('deleteCustomer', () => {
    it('should delete customer successfully', async () => {
      service.delete.mockResolvedValue(mockCustomer);

      const result = await resolver.deleteCustomer('customer-1');

      expect(result.id).toBe('customer-1');
      expect(service.delete).toHaveBeenCalledWith('customer-1');
    });
  });

  // TEST-027: contact mutations
  describe('contact management', () => {
    it('should add contact', async () => {
      service.addContact.mockResolvedValue(mockContact);

      const result = await resolver.addCustomerContact('customer-1', {
        name: '张三',
        title: '采购经理',
      });

      expect(result.name).toBe('张三');
      expect(service.addContact).toHaveBeenCalledWith('customer-1', {
        name: '张三',
        title: '采购经理',
      });
    });

    it('should update contact', async () => {
      const updated = { ...mockContact, title: '新职位' };
      service.updateContact.mockResolvedValue(updated);

      const result = await resolver.updateCustomerContact('contact-1', {
        title: '新职位',
      });

      expect(result.title).toBe('新职位');
    });

    it('should remove contact', async () => {
      service.removeContact.mockResolvedValue(mockContact);

      const result = await resolver.removeCustomerContact('contact-1');

      expect(result.id).toBe('contact-1');
    });
  });

  // TEST-028: combined test for filter operations
  describe('filter operations', () => {
    it('should filter by status', async () => {
      service.findAll.mockResolvedValue({
        items: [mockCustomer],
        total: 1,
        hasMore: false,
      });

      await resolver.getCustomers({ status: CustomerStatus.ACTIVE });

      expect(service.findAll).toHaveBeenCalledWith({
        status: CustomerStatus.ACTIVE,
      });
    });

    it('should filter by skip and take', async () => {
      service.findAll.mockResolvedValue({
        items: [],
        total: 100,
        hasMore: true,
      });

      await resolver.getCustomers({ skip: 20, take: 10 });

      expect(service.findAll).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
      });
    });
  });
});
