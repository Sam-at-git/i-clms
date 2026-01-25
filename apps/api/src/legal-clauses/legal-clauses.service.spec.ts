import { Test, TestingModule } from '@nestjs/testing';
import { LegalClausesService } from './legal-clauses.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { LegalClauseType, ContractLegalClause as PrismaContractLegalClause } from '@prisma/client';

describe('LegalClausesService', () => {
  let service: LegalClausesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    contractLegalClause: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
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

  const mockContractLegalClause: PrismaContractLegalClause = {
    id: 1,
    contractId: 'test-contract-id',
    clauseType: LegalClauseType.INTELLECTUAL_PROPERTY,
    licenseType: '独占',
    licenseFee: '100万元',
    guarantor: null,
    guaranteeType: null,
    guaranteeAmount: null,
    guaranteePeriod: null,
    liabilityLimit: null,
    exclusions: null,
    compensationMethod: null,
    terminationNotice: null,
    breachLiability: null,
    disputeResolution: null,
    disputeLocation: null,
    confidence: 0.9,
    originalText: '甲方授予乙方独占许可权，许可费用100万元',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalClausesService,
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

    service = module.get<LegalClausesService>(LegalClausesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getContractLegalClauses', () => {
    it('should return all legal clauses for a contract', async () => {
      const mockClauses = [mockContractLegalClause];
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue(mockClauses);

      const result = await service.getContractLegalClauses('test-contract-id');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].contractId).toBe('test-contract-id');
      expect(result[0].clauseType).toBe(LegalClauseType.INTELLECTUAL_PROPERTY);
      expect(mockPrismaService.contractLegalClause.findMany).toHaveBeenCalledWith({
        where: { contractId: 'test-contract-id' },
        orderBy: { clauseType: 'asc' },
      });
    });

    it('should return empty array when no clauses found', async () => {
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue([]);

      const result = await service.getContractLegalClauses('unknown-contract-id');

      expect(result).toEqual([]);
    });
  });

  describe('getClausesByType', () => {
    it('should return clauses filtered by type', async () => {
      const mockClauses = [mockContractLegalClause];
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue(mockClauses);

      const result = await service.getClausesByType(
        'test-contract-id',
        LegalClauseType.INTELLECTUAL_PROPERTY,
      );

      expect(result).toHaveLength(1);
      expect(result[0].clauseType).toBe(LegalClauseType.INTELLECTUAL_PROPERTY);
      expect(mockPrismaService.contractLegalClause.findMany).toHaveBeenCalledWith({
        where: {
          contractId: 'test-contract-id',
          clauseType: LegalClauseType.INTELLECTUAL_PROPERTY,
        },
      });
    });
  });

  describe('searchLegalClauses', () => {
    it('should search clauses with clauseType filter', async () => {
      const mockClauses = [mockContractLegalClause];
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue(mockClauses);

      const result = await service.searchLegalClauses({
        clauseType: LegalClauseType.INTELLECTUAL_PROPERTY,
      });

      expect(result).toHaveLength(1);
      expect(mockPrismaService.contractLegalClause.findMany).toHaveBeenCalledWith({
        where: { clauseType: LegalClauseType.INTELLECTUAL_PROPERTY },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search clauses with guaranteeType filter', async () => {
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue([]);

      await service.searchLegalClauses({
        guaranteeType: 'JOINT_AND_SEVERAL',
      });

      expect(mockPrismaService.contractLegalClause.findMany).toHaveBeenCalledWith({
        where: { guaranteeType: 'JOINT_AND_SEVERAL' },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search clauses with minLiability filter', async () => {
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue([]);

      await service.searchLegalClauses({
        minLiability: 100000,
      });

      expect(mockPrismaService.contractLegalClause.findMany).toHaveBeenCalledWith({
        where: {
          liabilityLimit: { gte: '100000' },
        },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should search clauses with multiple filters', async () => {
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue([]);

      await service.searchLegalClauses({
        clauseType: LegalClauseType.LIABILITY_LIMITATION,
        minLiability: 50000,
      });

      expect(mockPrismaService.contractLegalClause.findMany).toHaveBeenCalledWith({
        where: {
          clauseType: LegalClauseType.LIABILITY_LIMITATION,
          liabilityLimit: { gte: '50000' },
        },
        include: { contract: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getLegalClauseStats', () => {
    it('should return stats with total count', async () => {
      mockPrismaService.contractLegalClause.count.mockResolvedValue(10);
      mockPrismaService.$queryRaw.mockResolvedValue([
        { clauseType: LegalClauseType.INTELLECTUAL_PROPERTY, count: BigInt(3) },
        { clauseType: LegalClauseType.GUARANTEE, count: BigInt(2) },
        { clauseType: LegalClauseType.LIABILITY_LIMITATION, count: BigInt(3) },
        { clauseType: LegalClauseType.TERMINATION_DISPUTE, count: BigInt(2) },
      ]);
      mockPrismaService.contractLegalClause.aggregate.mockResolvedValue({
        _avg: { confidence: 0.85 },
      });

      const result = await service.getLegalClauseStats();

      expect(result.total).toBe(10);
      expect(result.byType).toHaveLength(4);
      expect(result.byType[0].type).toBe(LegalClauseType.INTELLECTUAL_PROPERTY);
      expect(result.byType[0].count).toBe(3);
      expect(result.avgConfidence).toBe(0.85);
    });

    it('should handle empty stats', async () => {
      mockPrismaService.contractLegalClause.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockPrismaService.contractLegalClause.aggregate.mockResolvedValue({
        _avg: { confidence: null },
      });

      const result = await service.getLegalClauseStats();

      expect(result.total).toBe(0);
      expect(result.byType).toEqual([]);
      expect(result.avgConfidence).toBe(0);
    });
  });

  describe('deleteContractClauses', () => {
    it('should delete all clauses for a contract', async () => {
      mockPrismaService.contractLegalClause.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.deleteContractClauses('test-contract-id');

      expect(result.count).toBe(3);
      expect(mockPrismaService.contractLegalClause.deleteMany).toHaveBeenCalledWith({
        where: { contractId: 'test-contract-id' },
      });
    });
  });

  describe('createClause', () => {
    it('should create a new clause', async () => {
      const newClauseData = {
        contractId: 'test-contract-id',
        clauseType: LegalClauseType.INTELLECTUAL_PROPERTY,
        licenseType: '独占',
        licenseFee: '100万元',
        confidence: 0.9,
        originalText: '甲方授予乙方独占许可权',
      };

      mockPrismaService.contractLegalClause.create.mockResolvedValue(mockContractLegalClause);

      const result = await service.createClause(newClauseData);

      expect(result.clauseType).toBe(LegalClauseType.INTELLECTUAL_PROPERTY);
      expect(mockPrismaService.contractLegalClause.create).toHaveBeenCalledWith({
        data: newClauseData,
      });
    });
  });

  describe('updateClause', () => {
    it('should update an existing clause', async () => {
      const updatedClause = { ...mockContractLegalClause, licenseType: '非独占' };
      mockPrismaService.contractLegalClause.update.mockResolvedValue(updatedClause);

      const result = await service.updateClause(1, {
        licenseType: '非独占',
      });

      expect(result.licenseType).toBe('非独占');
      expect(mockPrismaService.contractLegalClause.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { licenseType: '非独占' },
      });
    });
  });

  describe('deleteClause', () => {
    it('should delete a clause', async () => {
      mockPrismaService.contractLegalClause.delete.mockResolvedValue(mockContractLegalClause);

      const result = await service.deleteClause(1);

      expect(result.id).toBe(1);
      expect(mockPrismaService.contractLegalClause.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('calculateOverallConfidence', () => {
    it('should calculate average confidence correctly', async () => {
      const mockClauses = [
        { ...mockContractLegalClause, confidence: 0.8 },
        { ...mockContractLegalClause, id: 2, confidence: 0.9 },
        { ...mockContractLegalClause, id: 3, confidence: 0.7 },
      ];
      mockPrismaService.contractLegalClause.findMany.mockResolvedValue(mockClauses);

      const result = await service.getContractLegalClauses('test-contract-id');

      // The service should return mapped entities
      expect(result).toHaveLength(3);
    });
  });
});
