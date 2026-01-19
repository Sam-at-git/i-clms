import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ContractService } from './contract.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { ContractType, ContractStatus, ParseStatus } from './models';

describe('ContractService', () => {
  let service: ContractService;
  let prismaService: DeepMockProxy<PrismaClient>;

  const mockContract = {
    id: 'contract-1',
    contractNo: 'CT-2024-001',
    name: 'Test Contract',
    type: ContractType.STAFF_AUGMENTATION,
    status: ContractStatus.ACTIVE,
    ourEntity: 'Test Company Ltd.',
    customerId: 'customer-1',
    amountWithTax: 100000,
    amountWithoutTax: 90000,
    currency: 'CNY',
    taxRate: 10,
    taxAmount: 10000,
    paymentMethod: 'Bank Transfer',
    paymentTerms: 'Net 30',
    signedAt: new Date('2024-01-01'),
    effectiveAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-12-31'),
    duration: '1 year',
    fileUrl: 'https://example.com/contract.pdf',
    fileType: 'pdf',
    copies: null,
    signLocation: null,
    industry: 'IT',
    departmentId: 'dept-1',
    salesPerson: 'John Doe',
    parseStatus: 'COMPLETED',
    parsedAt: new Date('2024-01-02'),
    parseConfidence: 0.95,
    needsManualReview: false,
    parentContractId: null,
    uploadedById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: {
      id: 'customer-1',
      name: 'Test Customer',
      code: 'CUST001',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    department: {
      id: 'dept-1',
      name: 'Test Department',
      code: 'DEPT001',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    uploadedBy: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      department: {
        id: 'dept-1',
        name: 'Test Department',
      },
    },
    parentContract: null,
    supplements: [],
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated contracts', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockContract] as any);
      prismaService.contract.count.mockResolvedValue(1);

      const result = await service.findAll(undefined, 0, 20);

      expect(result.nodes).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it('should filter by contract types', async () => {
      prismaService.contract.findMany.mockResolvedValue([mockContract] as any);
      prismaService.contract.count.mockResolvedValue(1);

      await service.findAll({ types: [ContractType.STAFF_AUGMENTATION] });

      expect(prismaService.contract.findMany).toHaveBeenCalled();
    });

    it('should detect hasNextPage correctly', async () => {
      const contracts = [mockContract, { ...mockContract, id: 'contract-2' }];
      prismaService.contract.findMany.mockResolvedValue(contracts as any);
      prismaService.contract.count.mockResolvedValue(2);

      const result = await service.findAll(undefined, 0, 1);

      expect(result.hasNextPage).toBe(true);
      expect(result.nodes).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return contract with full details', async () => {
      const fullContract = {
        ...mockContract,
        staffAugmentation: { rateItems: [] },
        projectOutsourcing: null,
        productSales: null,
        tags: [],
      };
      prismaService.contract.findUnique.mockResolvedValue(fullContract as any);

      const result = await service.findOne('contract-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('contract-1');
      expect(prismaService.contract.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contract-1' },
        })
      );
    });

    it('should return null when contract not found', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createInput = {
      contractNo: 'CT-2024-002',
      name: 'New Contract',
      type: ContractType.STAFF_AUGMENTATION,
      status: ContractStatus.DRAFT,
      ourEntity: 'Test Company',
      customerId: 'customer-1',
      amountWithTax: '50000',
      currency: 'CNY',
      departmentId: 'dept-1',
      uploadedById: 'user-1',
      fileUrl: 'https://example.com/new-contract.pdf',
    };

    it('should create contract successfully', async () => {
      prismaService.contract.create.mockResolvedValue(mockContract as any);

      const result = await service.create(createInput);

      expect(result).toBeDefined();
      expect(prismaService.contract.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update contract successfully', async () => {
      const updateInput = {
        name: 'Updated Contract Name',
        status: ContractStatus.ACTIVE,
      };

      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.contract.update.mockResolvedValue({
        ...mockContract,
        name: 'Updated Contract Name',
      } as any);

      const result = await service.update('contract-1', updateInput);

      expect(result).toBeDefined();
      expect(prismaService.contract.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent contract', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('delete', () => {
    it('should delete contract successfully', async () => {
      prismaService.contract.findUnique.mockResolvedValue(mockContract as any);
      prismaService.contract.delete.mockResolvedValue(mockContract as any);

      const result = await service.delete('contract-1');

      expect(result).toBe(true);
      expect(prismaService.contract.delete).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent contract', async () => {
      prismaService.contract.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
