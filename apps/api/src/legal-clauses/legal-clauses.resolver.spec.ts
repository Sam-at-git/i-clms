import { Test, TestingModule } from '@nestjs/testing';
import { LegalClausesResolver } from './legal-clauses.resolver';
import { LegalClausesService } from './legal-clauses.service';
import { LegalClauseType } from '@prisma/client';
import {
  ContractLegalClause,
  LegalClausesExtractionResult,
  LegalClauseStats,
} from './dto';

describe('LegalClausesResolver', () => {
  let resolver: LegalClausesResolver;
  let service: LegalClausesService;

  const mockLegalClause: ContractLegalClause = {
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

  const mockExtractionResult: LegalClausesExtractionResult = {
    extracted: [mockLegalClause],
    confidence: 0.9,
    llmModel: 'gpt-4o',
    llmProvider: 'openai',
    processingTimeMs: 1500,
  };

  const mockLegalClauseStats: LegalClauseStats = {
    total: 10,
    byType: [
      { type: LegalClauseType.INTELLECTUAL_PROPERTY, count: 3 },
      { type: LegalClauseType.GUARANTEE, count: 2 },
      { type: LegalClauseType.LIABILITY_LIMITATION, count: 3 },
      { type: LegalClauseType.TERMINATION_DISPUTE, count: 2 },
    ],
    avgConfidence: 0.85,
  };

  const mockLegalClausesService = {
    getContractLegalClauses: jest.fn(),
    getClausesByType: jest.fn(),
    searchLegalClauses: jest.fn(),
    getLegalClauseStats: jest.fn(),
    extractLegalClauses: jest.fn(),
    createClause: jest.fn(),
    updateClause: jest.fn(),
    deleteClause: jest.fn(),
    deleteContractClauses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalClausesResolver,
        {
          provide: LegalClausesService,
          useValue: mockLegalClausesService,
        },
      ],
    }).compile();

    resolver = module.get<LegalClausesResolver>(LegalClausesResolver);
    service = module.get<LegalClausesService>(LegalClausesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('contractLegalClauses query', () => {
    it('should return all legal clauses for a contract', async () => {
      mockLegalClausesService.getContractLegalClauses.mockResolvedValue([mockLegalClause]);

      const result = await resolver.contractLegalClauses('test-contract-id');

      expect(result).toEqual([mockLegalClause]);
      expect(service.getContractLegalClauses).toHaveBeenCalledWith('test-contract-id');
    });

    it('should return empty array when no clauses found', async () => {
      mockLegalClausesService.getContractLegalClauses.mockResolvedValue([]);

      const result = await resolver.contractLegalClauses('unknown-contract-id');

      expect(result).toEqual([]);
    });
  });

  describe('legalClausesByType query', () => {
    it('should return clauses filtered by type', async () => {
      mockLegalClausesService.getClausesByType.mockResolvedValue([mockLegalClause]);

      const result = await resolver.legalClausesByType(
        'test-contract-id',
        LegalClauseType.INTELLECTUAL_PROPERTY,
      );

      expect(result).toEqual([mockLegalClause]);
      expect(service.getClausesByType).toHaveBeenCalledWith(
        'test-contract-id',
        LegalClauseType.INTELLECTUAL_PROPERTY,
      );
    });
  });

  describe('searchLegalClauses query', () => {
    it('should search with clauseType filter', async () => {
      mockLegalClausesService.searchLegalClauses.mockResolvedValue([mockLegalClause]);

      const result = await resolver.searchLegalClauses(
        LegalClauseType.INTELLECTUAL_PROPERTY,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual([mockLegalClause]);
      expect(service.searchLegalClauses).toHaveBeenCalledWith({
        clauseType: LegalClauseType.INTELLECTUAL_PROPERTY,
      });
    });

    it('should search with guaranteeType filter', async () => {
      mockLegalClausesService.searchLegalClauses.mockResolvedValue([]);

      await resolver.searchLegalClauses(
        undefined,
        'JOINT_AND_SEVERAL',
        undefined,
        undefined,
      );

      expect(service.searchLegalClauses).toHaveBeenCalledWith({
        guaranteeType: 'JOINT_AND_SEVERAL',
      });
    });

    it('should search with minLiability filter', async () => {
      mockLegalClausesService.searchLegalClauses.mockResolvedValue([]);

      await resolver.searchLegalClauses(
        undefined,
        undefined,
        undefined,
        100000,
      );

      expect(service.searchLegalClauses).toHaveBeenCalledWith({
        minLiability: 100000,
      });
    });

    it('should search with multiple filters', async () => {
      mockLegalClausesService.searchLegalClauses.mockResolvedValue([]);

      await resolver.searchLegalClauses(
        LegalClauseType.LIABILITY_LIMITATION,
        undefined,
        'ARBITRATION',
        50000,
      );

      expect(service.searchLegalClauses).toHaveBeenCalledWith({
        clauseType: LegalClauseType.LIABILITY_LIMITATION,
        minLiability: 50000,
        disputeResolution: 'ARBITRATION',
      });
    });
  });

  describe('legalClauseStats query', () => {
    it('should return legal clause statistics', async () => {
      const serviceStats = {
        total: 10,
        byType: [
          { type: LegalClauseType.INTELLECTUAL_PROPERTY, count: 3 },
          { type: LegalClauseType.GUARANTEE, count: 2 },
          { type: LegalClauseType.LIABILITY_LIMITATION, count: 3 },
          { type: LegalClauseType.TERMINATION_DISPUTE, count: 2 },
        ],
        avgConfidence: 0.85,
      };

      mockLegalClausesService.getLegalClauseStats.mockResolvedValue(serviceStats);

      const result = await resolver.legalClauseStats();

      expect(result).toEqual(mockLegalClauseStats);
      expect(service.getLegalClauseStats).toHaveBeenCalled();
    });
  });

  describe('extractLegalClauses mutation', () => {
    it('should extract legal clauses from contract text', async () => {
      mockLegalClausesService.extractLegalClauses.mockResolvedValue(mockExtractionResult);

      const contractText = '甲方授予乙方独占许可权...';
      const result = await resolver.extractLegalClauses('test-contract-id', contractText);

      expect(result).toEqual(mockExtractionResult);
      expect(service.extractLegalClauses).toHaveBeenCalledWith('test-contract-id', contractText);
    });
  });

  describe('createLegalClause mutation', () => {
    it('should create a new legal clause', async () => {
      const input = {
        contractId: 'test-contract-id',
        clauseType: LegalClauseType.INTELLECTUAL_PROPERTY,
        licenseType: '独占',
        licenseFee: '100万元',
      };

      mockLegalClausesService.createClause.mockResolvedValue(mockLegalClause);

      const result = await resolver.createLegalClause(input);

      expect(result).toEqual(mockLegalClause);
      expect(service.createClause).toHaveBeenCalledWith(input);
    });
  });

  describe('updateLegalClause mutation', () => {
    it('should update an existing legal clause', async () => {
      const updatedClause = { ...mockLegalClause, licenseType: '非独占' };
      mockLegalClausesService.updateClause.mockResolvedValue(updatedClause);

      const result = await resolver.updateLegalClause(1, '非独占');

      expect(result.licenseType).toBe('非独占');
      expect(service.updateClause).toHaveBeenCalledWith(1, {
        licenseType: '非独占',
      });
    });

    it('should update multiple fields', async () => {
      const updatedClause = {
        ...mockLegalClause,
        licenseType: '普通',
        licenseFee: '50万元',
      };
      mockLegalClausesService.updateClause.mockResolvedValue(updatedClause);

      const result = await resolver.updateLegalClause(
        1,
        '普通',
        '50万元',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(result.licenseType).toBe('普通');
      expect(result.licenseFee).toBe('50万元');
      expect(service.updateClause).toHaveBeenCalledWith(1, {
        licenseType: '普通',
        licenseFee: '50万元',
      });
    });
  });

  describe('deleteLegalClause mutation', () => {
    it('should delete a legal clause', async () => {
      mockLegalClausesService.deleteClause.mockResolvedValue(mockLegalClause);

      const result = await resolver.deleteLegalClause(1);

      expect(result).toEqual(mockLegalClause);
      expect(service.deleteClause).toHaveBeenCalledWith(1);
    });
  });

  describe('deleteContractLegalClauses mutation', () => {
    it('should delete all clauses for a contract', async () => {
      mockLegalClausesService.deleteContractClauses.mockResolvedValue({ count: 3 });

      const result = await resolver.deleteContractLegalClauses('test-contract-id');

      expect(result).toBe('Deleted 3 legal clause(s)');
      expect(service.deleteContractClauses).toHaveBeenCalledWith('test-contract-id');
    });

    it('should return appropriate message for single clause', async () => {
      mockLegalClausesService.deleteContractClauses.mockResolvedValue({ count: 1 });

      const result = await resolver.deleteContractLegalClauses('test-contract-id');

      expect(result).toBe('Deleted 1 legal clause(s)');
    });

    it('should return appropriate message for no clauses', async () => {
      mockLegalClausesService.deleteContractClauses.mockResolvedValue({ count: 0 });

      const result = await resolver.deleteContractLegalClauses('test-contract-id');

      expect(result).toBe('Deleted 0 legal clause(s)');
    });
  });
});
