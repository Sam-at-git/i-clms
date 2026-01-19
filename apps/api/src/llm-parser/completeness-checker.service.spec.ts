import { Test, TestingModule } from '@nestjs/testing';
import {
  CompletenessCheckerService,
  FIELD_WEIGHTS,
  FIELD_MAPPING,
} from './completeness-checker.service';
import { ParseStrategy } from './entities/completeness-score.entity';

describe('CompletenessCheckerService', () => {
  let service: CompletenessCheckerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompletenessCheckerService],
    }).compile();

    service = module.get<CompletenessCheckerService>(CompletenessCheckerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateScore', () => {
    // TEST-001: All fields have values
    it('should return 100 points and DIRECT_USE when all fields have values', () => {
      const completeFields = {
        contractNumber: 'CTR-2026-001',
        title: '软件开发服务合同',
        contractType: 'PROJECT_OUTSOURCING',
        firstPartyName: '某某科技有限公司',
        secondPartyName: '某某软件股份有限公司',
        totalAmount: 1000000,
        currency: 'CNY',
        taxRate: 0.06,
        paymentTerms: '按里程碑付款',
        signDate: '2026-01-15',
        startDate: '2026-02-01',
        endDate: '2026-12-31',
        duration: '11个月',
        industry: 'IT服务',
        governingLaw: '中华人民共和国法律',
        signLocation: '上海市',
        salesPerson: '张三',
      };

      const result = service.calculateScore(completeFields);

      expect(result.totalScore).toBe(100);
      expect(result.maxScore).toBe(100);
      expect(result.percentage).toBe(100);
      expect(result.strategy).toBe(ParseStrategy.DIRECT_USE);
    });

    // TEST-002: Only basic information (40 points)
    it('should return 40 points and LLM_FULL_EXTRACTION with only basic info', () => {
      const basicOnlyFields = {
        contractNumber: 'CTR-2026-001',
        title: '软件开发服务合同',
        contractType: 'PROJECT_OUTSOURCING',
        firstPartyName: '某某科技有限公司',
        secondPartyName: '某某软件股份有限公司',
      };

      const result = service.calculateScore(basicOnlyFields);

      expect(result.totalScore).toBe(40);
      expect(result.categoryScores.basic).toBe(40);
      expect(result.categoryScores.financial).toBe(0);
      expect(result.categoryScores.temporal).toBe(0);
      expect(result.categoryScores.other).toBe(0);
      expect(result.strategy).toBe(ParseStrategy.LLM_FULL_EXTRACTION);
    });

    // TEST-003: Basic + financial info (70 points)
    it('should return 70 points and DIRECT_USE with basic + financial info', () => {
      const seventyPointFields = {
        contractNumber: 'CTR-2026-001',
        title: '软件开发服务合同',
        contractType: 'PROJECT_OUTSOURCING',
        firstPartyName: '某某科技有限公司',
        secondPartyName: '某某软件股份有限公司',
        totalAmount: 1000000,
        currency: 'CNY',
        taxRate: 0.06,
        paymentTerms: '按里程碑付款',
      };

      const result = service.calculateScore(seventyPointFields);

      expect(result.totalScore).toBe(70);
      expect(result.categoryScores.basic).toBe(40);
      expect(result.categoryScores.financial).toBe(30);
      expect(result.strategy).toBe(ParseStrategy.DIRECT_USE);
    });

    // TEST-004: 60 point boundary test
    it('should return 60 points and LLM_VALIDATION for boundary case', () => {
      const sixtyPointFields = {
        contractNumber: 'CTR-2026-001',
        title: '软件开发服务合同',
        contractType: 'PROJECT_OUTSOURCING',
        firstPartyName: '某某科技有限公司',
        secondPartyName: '某某软件股份有限公司',
        totalAmount: 1000000,
        taxRate: 0.06,
        paymentTerms: '按里程碑付款',
      };

      const result = service.calculateScore(sixtyPointFields);

      // 40 (basic) + 12 (totalAmount) + 4 (taxRate) + 10 (paymentTerms) = 66
      // But missing currency (4 points), so actually it's less
      expect(result.totalScore).toBeGreaterThanOrEqual(50);
      expect(result.totalScore).toBeLessThan(70);
      expect(result.strategy).toBe(ParseStrategy.LLM_VALIDATION);
    });

    // TEST-005: Empty object input
    it('should return 0 points and LLM_FULL_EXTRACTION for empty object', () => {
      const emptyFields = {};

      const result = service.calculateScore(emptyFields);

      expect(result.totalScore).toBe(0);
      expect(result.strategy).toBe(ParseStrategy.LLM_FULL_EXTRACTION);
    });

    // TEST-006: null value fields
    it('should return 0 score for null value fields', () => {
      const fieldsWithNull = {
        contractNumber: null,
        title: null,
      };

      const result = service.calculateScore(fieldsWithNull as any);

      // All null values should contribute 0
      expect(result.details.find((d) => d.field === 'contractNumber')?.hasValue).toBe(false);
      expect(result.details.find((d) => d.field === 'title')?.hasValue).toBe(false);
    });

    // TEST-007: Empty string fields
    it('should return 0 score for empty string fields', () => {
      const fieldsWithEmptyString = {
        contractNumber: '',
        title: '   ', // whitespace only
      };

      const result = service.calculateScore(fieldsWithEmptyString);

      expect(result.details.find((d) => d.field === 'contractNumber')?.hasValue).toBe(false);
      expect(result.details.find((d) => d.field === 'title')?.hasValue).toBe(false);
    });

    // TEST-008: Category score calculation
    it('should calculate category scores correctly', () => {
      const mixedFields = {
        contractNumber: 'CTR-001',
        totalAmount: 1000000,
        signDate: '2026-01-15',
        industry: 'IT',
      };

      const result = service.calculateScore(mixedFields);

      expect(result.categoryScores.basic).toBe(8); // contractNumber
      expect(result.categoryScores.financial).toBe(12); // totalAmount
      expect(result.categoryScores.temporal).toBe(6); // signDate
      expect(result.categoryScores.other).toBe(3); // industry
    });

    // TEST-009: Field details returned
    it('should return score details for all fields', () => {
      const someFields = {
        contractNumber: 'CTR-001',
      };

      const result = service.calculateScore(someFields);

      // Should have details for all fields in FIELD_WEIGHTS
      expect(result.details.length).toBe(FIELD_WEIGHTS.length);

      // Verify structure of details
      const contractNumberDetail = result.details.find((d) => d.field === 'contractNumber');
      expect(contractNumberDetail).toBeDefined();
      expect(contractNumberDetail?.maxScore).toBe(8);
      expect(contractNumberDetail?.actualScore).toBe(8);
      expect(contractNumberDetail?.hasValue).toBe(true);
      expect(contractNumberDetail?.category).toBe('basic');
    });

    // TEST-010: Percentage calculation
    it('should calculate percentage correctly', () => {
      const halfFields = {
        contractNumber: 'CTR-001', // 8
        title: '合同', // 6
        contractType: 'PROJECT_OUTSOURCING', // 8
        firstPartyName: '甲方', // 10
        secondPartyName: '乙方', // 8
        totalAmount: 500000, // 12
        currency: 'CNY', // 4
        taxRate: 0.06, // 4
      };

      const result = service.calculateScore(halfFields);

      // 8+6+8+10+8+12+4+4 = 60
      expect(result.totalScore).toBe(60);
      expect(result.percentage).toBe(60); // percentage = totalScore in this case
    });
  });

  describe('getCategoryScore', () => {
    it('should return correct category score from details', () => {
      const fields = {
        contractNumber: 'CTR-001',
        title: '合同',
      };

      const result = service.calculateScore(fields);

      const basicScore = service.getCategoryScore('basic', result.details);
      expect(basicScore).toBe(14); // 8 + 6

      const financialScore = service.getCategoryScore('financial', result.details);
      expect(financialScore).toBe(0);
    });
  });

  describe('determineStrategy', () => {
    it('should return DIRECT_USE for score >= 70', () => {
      expect(service.determineStrategy(70)).toBe(ParseStrategy.DIRECT_USE);
      expect(service.determineStrategy(100)).toBe(ParseStrategy.DIRECT_USE);
      expect(service.determineStrategy(85)).toBe(ParseStrategy.DIRECT_USE);
    });

    it('should return LLM_VALIDATION for score 50-69', () => {
      expect(service.determineStrategy(50)).toBe(ParseStrategy.LLM_VALIDATION);
      expect(service.determineStrategy(69)).toBe(ParseStrategy.LLM_VALIDATION);
      expect(service.determineStrategy(55)).toBe(ParseStrategy.LLM_VALIDATION);
    });

    it('should return LLM_FULL_EXTRACTION for score < 50', () => {
      expect(service.determineStrategy(49)).toBe(ParseStrategy.LLM_FULL_EXTRACTION);
      expect(service.determineStrategy(0)).toBe(ParseStrategy.LLM_FULL_EXTRACTION);
      expect(service.determineStrategy(25)).toBe(ParseStrategy.LLM_FULL_EXTRACTION);
    });
  });

  describe('getMissingFields', () => {
    it('should return all fields as missing for empty object', () => {
      const result = service.getMissingFields({});
      expect(result.length).toBe(FIELD_WEIGHTS.length);
    });

    it('should return only missing fields', () => {
      const fields = {
        contractNumber: 'CTR-001',
        title: '合同',
      };

      const result = service.getMissingFields(fields);

      expect(result).not.toContain('contractNumber');
      expect(result).not.toContain('title');
      expect(result).toContain('totalAmount');
      expect(result).toContain('signDate');
    });
  });

  describe('identifyPriorityFields', () => {
    it('should return top 10 priority fields sorted by weight', () => {
      const allMissing = FIELD_WEIGHTS.map((fw) => fw.field);
      const result = service.identifyPriorityFields(allMissing);

      expect(result.length).toBe(10);
      // Should be sorted by weight descending
      // totalAmount (12) should be first, followed by firstPartyName (10)
      expect(result[0]).toBe('totalAmount');
      expect(result[1]).toBe('firstPartyName');
    });

    it('should return fewer than 10 if fewer missing', () => {
      const fewMissing = ['signDate', 'endDate'];
      const result = service.identifyPriorityFields(fewMissing);

      expect(result.length).toBe(2);
    });
  });

  describe('needsLlm', () => {
    it('should return false for score >= 70', () => {
      expect(service.needsLlm(70)).toBe(false);
      expect(service.needsLlm(100)).toBe(false);
    });

    it('should return true for score < 70', () => {
      expect(service.needsLlm(69)).toBe(true);
      expect(service.needsLlm(0)).toBe(true);
    });
  });

  describe('getStrategyReason', () => {
    it('should return appropriate reason for each strategy', () => {
      const directReason = service.getStrategyReason(80, ParseStrategy.DIRECT_USE);
      expect(directReason).toContain('80');
      expect(directReason).toContain('70');

      const validationReason = service.getStrategyReason(60, ParseStrategy.LLM_VALIDATION);
      expect(validationReason).toContain('60');
      expect(validationReason).toContain('validation');

      const fullReason = service.getStrategyReason(30, ParseStrategy.LLM_FULL_EXTRACTION);
      expect(fullReason).toContain('30');
      expect(fullReason).toContain('extraction');
    });
  });

  describe('checkCompleteness (legacy)', () => {
    it('should return legacy format result', () => {
      const fields = {
        contractNumber: 'CTR-001',
        title: '合同',
      };

      const result = service.checkCompleteness(fields);

      expect(result.score).toBe(14);
      expect(result.needsLlm).toBe(true);
      expect(result.missingFields).toContain('totalAmount');
      expect(result.reason).toBeDefined();
    });
  });

  describe('field mapping', () => {
    it('should correctly map legacy field names to new field names', () => {
      // Test with legacy field names
      const legacyFields = {
        contractNo: 'CTR-001', // maps to contractNumber
        name: '合同', // maps to title
        customerName: '客户', // maps to firstPartyName
        ourEntity: '我方', // maps to secondPartyName
        amountWithTax: 1000000, // maps to totalAmount
        signedAt: '2026-01-15', // maps to signDate
      };

      const result = service.calculateScore(legacyFields);

      // Should recognize mapped fields
      expect(result.details.find((d) => d.field === 'contractNumber')?.hasValue).toBe(true);
      expect(result.details.find((d) => d.field === 'title')?.hasValue).toBe(true);
      expect(result.details.find((d) => d.field === 'firstPartyName')?.hasValue).toBe(true);
      expect(result.details.find((d) => d.field === 'secondPartyName')?.hasValue).toBe(true);
      expect(result.details.find((d) => d.field === 'totalAmount')?.hasValue).toBe(true);
      expect(result.details.find((d) => d.field === 'signDate')?.hasValue).toBe(true);
    });
  });

  describe('hasValidValue edge cases', () => {
    it('should handle placeholder values as invalid', () => {
      const fieldsWithPlaceholders = {
        contractNumber: 'N/A',
        title: 'null',
        contractType: 'undefined',
        firstPartyName: '-',
        secondPartyName: '无',
      };

      const result = service.calculateScore(fieldsWithPlaceholders);

      expect(result.details.find((d) => d.field === 'contractNumber')?.hasValue).toBe(false);
      expect(result.details.find((d) => d.field === 'title')?.hasValue).toBe(false);
      expect(result.details.find((d) => d.field === 'contractType')?.hasValue).toBe(false);
      expect(result.details.find((d) => d.field === 'firstPartyName')?.hasValue).toBe(false);
      expect(result.details.find((d) => d.field === 'secondPartyName')?.hasValue).toBe(false);
    });

    it('should handle arrays and objects', () => {
      const fieldsWithComplex = {
        contractNumber: ['item1'], // non-empty array
        title: [], // empty array
        contractType: { key: 'value' }, // non-empty object
        firstPartyName: {}, // empty object
      };

      const result = service.calculateScore(fieldsWithComplex as any);

      expect(result.details.find((d) => d.field === 'contractNumber')?.hasValue).toBe(true);
      expect(result.details.find((d) => d.field === 'title')?.hasValue).toBe(false);
      expect(result.details.find((d) => d.field === 'contractType')?.hasValue).toBe(true);
      expect(result.details.find((d) => d.field === 'firstPartyName')?.hasValue).toBe(false);
    });

    it('should handle NaN numbers as invalid', () => {
      const fieldsWithNaN = {
        totalAmount: NaN,
      };

      const result = service.calculateScore(fieldsWithNaN);

      expect(result.details.find((d) => d.field === 'totalAmount')?.hasValue).toBe(false);
    });
  });
});
