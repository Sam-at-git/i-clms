import { Test, TestingModule } from '@nestjs/testing';
import { DataProtectionResolver } from './data-protection.resolver';
import { DataProtectionService } from './data-protection.service';
import { DataProtectionRisk } from '@prisma/client';
import {
  ContractDataProtection,
  DataProtectionExtractionResult,
  DataProtectionStats,
} from './dto';

describe('DataProtectionResolver', () => {
  let resolver: DataProtectionResolver;
  let service: DataProtectionService;

  const mockContractDataProtection: ContractDataProtection = {
    id: 1,
    contractId: 'test-contract-id',
    involvesPersonalData: true,
    personalDataType: '用户姓名、联系方式、身份证号',
    processingLocation: '仅限中国大陆境内',
    crossBorderTransfer: '需获得用户单独同意',
    securityMeasures: '数据加密存储',
    dataRetention: '合同终止后3年',
    riskLevel: DataProtectionRisk.MEDIUM,
    confidence: 0.85,
    originalText: '甲方承诺对用户个人信息进行加密存储...',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExtractionResult: DataProtectionExtractionResult = {
    involvesPersonalData: true,
    riskLevel: DataProtectionRisk.MEDIUM,
    dataProtection: mockContractDataProtection,
    confidence: 0.85,
    llmModel: 'gpt-4o',
    llmProvider: 'openai',
    processingTimeMs: 1200,
  };

  const mockDataProtectionStats: DataProtectionStats = {
    total: 10,
    involvingPersonalData: 6,
    byRiskLevel: [
      { level: DataProtectionRisk.NONE, count: 2 },
      { level: DataProtectionRisk.LOW, count: 2 },
      { level: DataProtectionRisk.MEDIUM, count: 4 },
      { level: DataProtectionRisk.HIGH, count: 2 },
    ],
    avgConfidence: 0.82,
  };

  const mockDataProtectionService = {
    getContractDataProtection: jest.fn(),
    getByRiskLevel: jest.fn(),
    getInvolvingPersonalData: jest.fn(),
    searchDataProtection: jest.fn(),
    getDataProtectionStats: jest.fn(),
    extractDataProtection: jest.fn(),
    upsertDataProtection: jest.fn(),
    updateDataProtection: jest.fn(),
    deleteDataProtection: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataProtectionResolver,
        {
          provide: DataProtectionService,
          useValue: mockDataProtectionService,
        },
      ],
    }).compile();

    resolver = module.get<DataProtectionResolver>(DataProtectionResolver);
    service = module.get<DataProtectionService>(DataProtectionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('contractDataProtection query', () => {
    it('should return data protection for a contract', async () => {
      mockDataProtectionService.getContractDataProtection.mockResolvedValue(mockContractDataProtection);

      const result = await resolver.contractDataProtection('test-contract-id');

      expect(result).toEqual(mockContractDataProtection);
      expect(service.getContractDataProtection).toHaveBeenCalledWith('test-contract-id');
    });

    it('should return null when no data protection found', async () => {
      mockDataProtectionService.getContractDataProtection.mockResolvedValue(null);

      const result = await resolver.contractDataProtection('unknown-contract-id');

      expect(result).toBeNull();
    });
  });

  describe('dataProtectionByRiskLevel query', () => {
    it('should return data protection filtered by risk level', async () => {
      mockDataProtectionService.getByRiskLevel.mockResolvedValue([mockContractDataProtection]);

      const result = await resolver.dataProtectionByRiskLevel(DataProtectionRisk.MEDIUM);

      expect(result).toEqual([mockContractDataProtection]);
      expect(service.getByRiskLevel).toHaveBeenCalledWith(DataProtectionRisk.MEDIUM);
    });
  });

  describe('contractsWithPersonalData query', () => {
    it('should return contracts involving personal data', async () => {
      mockDataProtectionService.getInvolvingPersonalData.mockResolvedValue([mockContractDataProtection]);

      const result = await resolver.contractsWithPersonalData();

      expect(result).toEqual([mockContractDataProtection]);
      expect(service.getInvolvingPersonalData).toHaveBeenCalled();
    });
  });

  describe('searchDataProtection query', () => {
    it('should search with riskLevel filter', async () => {
      mockDataProtectionService.searchDataProtection.mockResolvedValue([mockContractDataProtection]);

      const result = await resolver.searchDataProtection(
        DataProtectionRisk.HIGH,
        undefined,
        undefined,
      );

      expect(result).toEqual([mockContractDataProtection]);
      expect(service.searchDataProtection).toHaveBeenCalledWith({
        riskLevel: DataProtectionRisk.HIGH,
      });
    });

    it('should search with involvesPersonalData filter', async () => {
      mockDataProtectionService.searchDataProtection.mockResolvedValue([]);

      await resolver.searchDataProtection(
        undefined,
        true,
        undefined,
      );

      expect(service.searchDataProtection).toHaveBeenCalledWith({
        involvesPersonalData: true,
      });
    });

    it('should search with hasCrossBorderTransfer filter', async () => {
      mockDataProtectionService.searchDataProtection.mockResolvedValue([]);

      await resolver.searchDataProtection(
        undefined,
        undefined,
        true,
      );

      expect(service.searchDataProtection).toHaveBeenCalledWith({
        hasCrossBorderTransfer: true,
      });
    });

    it('should search with multiple filters', async () => {
      mockDataProtectionService.searchDataProtection.mockResolvedValue([]);

      await resolver.searchDataProtection(
        DataProtectionRisk.HIGH,
        true,
        false,
      );

      expect(service.searchDataProtection).toHaveBeenCalledWith({
        riskLevel: DataProtectionRisk.HIGH,
        involvesPersonalData: true,
        hasCrossBorderTransfer: false,
      });
    });
  });

  describe('dataProtectionStats query', () => {
    it('should return data protection statistics', async () => {
      const serviceStats = {
        total: 10,
        involvingPersonalData: 6,
        byRiskLevel: [
          { level: DataProtectionRisk.NONE, count: 2 },
          { level: DataProtectionRisk.LOW, count: 2 },
          { level: DataProtectionRisk.MEDIUM, count: 4 },
          { level: DataProtectionRisk.HIGH, count: 2 },
        ],
        avgConfidence: 0.82,
      };

      mockDataProtectionService.getDataProtectionStats.mockResolvedValue(serviceStats);

      const result = await resolver.dataProtectionStats();

      expect(result).toEqual(mockDataProtectionStats);
      expect(service.getDataProtectionStats).toHaveBeenCalled();
    });
  });

  describe('extractDataProtection mutation', () => {
    it('should extract data protection from contract text', async () => {
      mockDataProtectionService.extractDataProtection.mockResolvedValue(mockExtractionResult);

      const contractText = '本合同涉及用户个人信息的处理...';
      const result = await resolver.extractDataProtection('test-contract-id', contractText);

      expect(result).toEqual(mockExtractionResult);
      expect(service.extractDataProtection).toHaveBeenCalledWith('test-contract-id', contractText);
    });
  });

  describe('upsertDataProtection mutation', () => {
    it('should upsert data protection', async () => {
      const input = {
        contractId: 'test-contract-id',
        involvesPersonalData: true,
        personalDataType: '用户姓名、联系方式',
        riskLevel: DataProtectionRisk.LOW,
      };

      mockDataProtectionService.upsertDataProtection.mockResolvedValue(mockContractDataProtection);

      const result = await resolver.upsertDataProtection(input);

      expect(result).toEqual(mockContractDataProtection);
      expect(service.upsertDataProtection).toHaveBeenCalledWith('test-contract-id', {
        involvesPersonalData: true,
        personalDataType: '用户姓名、联系方式',
        riskLevel: DataProtectionRisk.LOW,
      });
    });
  });

  describe('updateDataProtection mutation', () => {
    it('should update data protection', async () => {
      const updated = { ...mockContractDataProtection, riskLevel: DataProtectionRisk.HIGH };
      mockDataProtectionService.upsertDataProtection.mockResolvedValue(updated);

      const result = await resolver.updateDataProtection(
        'test-contract-id',
        true,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        DataProtectionRisk.HIGH,
        undefined,
        undefined,
      );

      expect(result.riskLevel).toBe(DataProtectionRisk.HIGH);
      expect(service.upsertDataProtection).toHaveBeenCalledWith('test-contract-id', {
        involvesPersonalData: true,
        riskLevel: DataProtectionRisk.HIGH,
      });
    });
  });

  describe('deleteDataProtection mutation', () => {
    it('should delete data protection', async () => {
      mockDataProtectionService.deleteDataProtection.mockResolvedValue(mockContractDataProtection);

      const result = await resolver.deleteDataProtection('test-contract-id');

      expect(result).toEqual(mockContractDataProtection);
      expect(service.deleteDataProtection).toHaveBeenCalledWith('test-contract-id');
    });
  });
});
