import { Test, TestingModule } from '@nestjs/testing';
import { DataProtectionService } from './data-protection.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { DataProtectionRisk, ContractDataProtection as PrismaContractDataProtection } from '@prisma/client';
import { ContractDataProtection, DataProtectionExtractionResult } from './dto';

describe('DataProtectionService', () => {
  let service: DataProtectionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    contractDataProtection: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockLlmConfigService = {
    refreshCache: jest.fn(),
    getActiveConfig: jest.fn(),
    getProviderName: jest.fn().mockReturnValue('openai'),
  };

  const mockContractDataProtection: PrismaContractDataProtection = {
    id: 1,
    contractId: 'test-contract-id',
    involvesPersonalData: true,
    personalDataType: '用户姓名、联系方式、身份证号',
    processingLocation: '仅限中国大陆境内',
    crossBorderTransfer: '需获得用户单独同意',
    securityMeasures: '数据加密存储、访问权限控制',
    dataRetention: '合同终止后3年',
    riskLevel: DataProtectionRisk.MEDIUM,
    confidence: 0.85,
    originalText: '甲方承诺对用户个人信息进行加密存储...',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataProtectionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LlmConfigService,
          useValue: mockLlmConfigService,
        },
      ],
    }).compile();

    service = module.get<DataProtectionService>(DataProtectionService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContractDataProtection', () => {
    it('should return data protection for a contract', async () => {
      mockPrismaService.contractDataProtection.findUnique.mockResolvedValue(mockContractDataProtection);

      const result = await service.getContractDataProtection('test-contract-id');

      expect(result).toBeDefined();
      expect(result?.contractId).toBe('test-contract-id');
      expect(result?.involvesPersonalData).toBe(true);
      expect(result?.riskLevel).toBe(DataProtectionRisk.MEDIUM);
      expect(mockPrismaService.contractDataProtection.findUnique).toHaveBeenCalledWith({
        where: { contractId: 'test-contract-id' },
      });
    });

    it('should return null when no data protection found', async () => {
      mockPrismaService.contractDataProtection.findUnique.mockResolvedValue(null);

      const result = await service.getContractDataProtection('unknown-contract-id');

      expect(result).toBeNull();
    });
  });

  describe('getByRiskLevel', () => {
    it('should return data protection filtered by risk level', async () => {
      const mockDataProtection = [mockContractDataProtection];
      mockPrismaService.contractDataProtection.findMany.mockResolvedValue(mockDataProtection);

      const result = await service.getByRiskLevel(DataProtectionRisk.MEDIUM);

      expect(result).toHaveLength(1);
      expect(result[0].riskLevel).toBe(DataProtectionRisk.MEDIUM);
      expect(mockPrismaService.contractDataProtection.findMany).toHaveBeenCalledWith({
        where: { riskLevel: DataProtectionRisk.MEDIUM },
        include: { contract: true },
      });
    });
  });

  describe('getInvolvingPersonalData', () => {
    it('should return contracts involving personal data', async () => {
      const mockDataProtection = [mockContractDataProtection];
      mockPrismaService.contractDataProtection.findMany.mockResolvedValue(mockDataProtection);

      const result = await service.getInvolvingPersonalData();

      expect(result).toHaveLength(1);
      expect(result[0].involvesPersonalData).toBe(true);
      expect(mockPrismaService.contractDataProtection.findMany).toHaveBeenCalledWith({
        where: { involvesPersonalData: true },
        include: { contract: true },
        orderBy: { riskLevel: 'desc' },
      });
    });
  });

  describe('searchDataProtection', () => {
    it('should search with riskLevel filter', async () => {
      mockPrismaService.contractDataProtection.findMany.mockResolvedValue([]);

      await service.searchDataProtection({
        riskLevel: DataProtectionRisk.HIGH,
      });

      expect(mockPrismaService.contractDataProtection.findMany).toHaveBeenCalledWith({
        where: { riskLevel: DataProtectionRisk.HIGH },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search with involvesPersonalData filter', async () => {
      mockPrismaService.contractDataProtection.findMany.mockResolvedValue([]);

      await service.searchDataProtection({
        involvesPersonalData: true,
      });

      expect(mockPrismaService.contractDataProtection.findMany).toHaveBeenCalledWith({
        where: { involvesPersonalData: true },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search with hasCrossBorderTransfer filter', async () => {
      mockPrismaService.contractDataProtection.findMany.mockResolvedValue([]);

      await service.searchDataProtection({
        hasCrossBorderTransfer: true,
      });

      expect(mockPrismaService.contractDataProtection.findMany).toHaveBeenCalledWith({
        where: { crossBorderTransfer: { not: null } },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search with multiple filters', async () => {
      mockPrismaService.contractDataProtection.findMany.mockResolvedValue([]);

      await service.searchDataProtection({
        riskLevel: DataProtectionRisk.HIGH,
        involvesPersonalData: true,
        hasCrossBorderTransfer: false,
      });

      expect(mockPrismaService.contractDataProtection.findMany).toHaveBeenCalledWith({
        where: {
          riskLevel: DataProtectionRisk.HIGH,
          involvesPersonalData: true,
          crossBorderTransfer: null,
        },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getDataProtectionStats', () => {
    it('should return statistics', async () => {
      mockPrismaService.contractDataProtection.count.mockResolvedValueOnce(10).mockResolvedValueOnce(6);
      mockPrismaService.$queryRaw.mockResolvedValue([
        { risklevel: DataProtectionRisk.NONE, count: BigInt(2) },
        { risklevel: DataProtectionRisk.LOW, count: BigInt(2) },
        { risklevel: DataProtectionRisk.MEDIUM, count: BigInt(4) },
        { risklevel: DataProtectionRisk.HIGH, count: BigInt(2) },
      ]);
      mockPrismaService.contractDataProtection.aggregate.mockResolvedValue({
        _avg: { confidence: 0.82 },
      });

      const result = await service.getDataProtectionStats();

      expect(result.total).toBe(10);
      expect(result.involvingPersonalData).toBe(6);
      expect(result.byRiskLevel).toHaveLength(4);
      expect(result.avgConfidence).toBe(0.82);
    });

    it('should handle empty stats', async () => {
      mockPrismaService.contractDataProtection.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.contractDataProtection.aggregate.mockResolvedValue({
        _avg: { confidence: null },
      });

      const result = await service.getDataProtectionStats();

      expect(result.total).toBe(0);
      expect(result.involvingPersonalData).toBe(0);
      expect(result.byRiskLevel).toHaveLength(4); // All levels with 0 count
      expect(result.avgConfidence).toBe(0);
    });
  });

  describe('upsertDataProtection', () => {
    it('should create new data protection when not exists', async () => {
      mockPrismaService.contractDataProtection.upsert.mockResolvedValue(mockContractDataProtection);

      const result = await service.upsertDataProtection('test-contract-id', {
        involvesPersonalData: true,
        personalDataType: '用户姓名、联系方式',
        riskLevel: DataProtectionRisk.LOW,
      });

      expect(result.involvesPersonalData).toBe(true);
      expect(mockPrismaService.contractDataProtection.upsert).toHaveBeenCalledWith({
        where: { contractId: 'test-contract-id' },
        create: {
          contractId: 'test-contract-id',
          involvesPersonalData: true,
          personalDataType: '用户姓名、联系方式',
          riskLevel: DataProtectionRisk.LOW,
        },
        update: {
          involvesPersonalData: true,
          personalDataType: '用户姓名、联系方式',
          riskLevel: DataProtectionRisk.LOW,
        },
      });
    });
  });

  describe('deleteDataProtection', () => {
    it('should delete data protection', async () => {
      mockPrismaService.contractDataProtection.delete.mockResolvedValue(mockContractDataProtection);

      const result = await service.deleteDataProtection('test-contract-id');

      expect(result.contractId).toBe('test-contract-id');
      expect(mockPrismaService.contractDataProtection.delete).toHaveBeenCalledWith({
        where: { contractId: 'test-contract-id' },
      });
    });
  });

  describe('calculateRiskLevel', () => {
    it('should calculate NONE when no personal data', async () => {
      // 通过extractWithLlm的返回值验证风险计算
      // 如果involvesPersonalData为false，riskLevel应该是NONE
      expect(service['calculateRiskLevel']({
        involvesPersonalData: false,
        riskLevel: DataProtectionRisk.NONE,
      })).toBe(DataProtectionRisk.NONE);
    });

    it('should calculate LOW for personal data without cross border', async () => {
      expect(service['calculateRiskLevel']({
        involvesPersonalData: true,
        personalDataType: '用户姓名、联系方式',
        crossBorderTransfer: undefined,
        riskLevel: DataProtectionRisk.LOW,
      })).toBe(DataProtectionRisk.LOW);
    });

    it('should calculate MEDIUM for cross border transfer', async () => {
      expect(service['calculateRiskLevel']({
        involvesPersonalData: true,
        personalDataType: '用户姓名、联系方式',
        crossBorderTransfer: '需获得用户同意',
        riskLevel: DataProtectionRisk.MEDIUM,
      })).toBe(DataProtectionRisk.MEDIUM);
    });

    it('should calculate HIGH for sensitive data with cross border', async () => {
      expect(service['calculateRiskLevel']({
        involvesPersonalData: true,
        personalDataType: '身份证号、生物识别信息',
        crossBorderTransfer: '需通过安全评估',
        riskLevel: DataProtectionRisk.HIGH,
      })).toBe(DataProtectionRisk.HIGH);
    });
  });
});
