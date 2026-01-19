import { Test, TestingModule } from '@nestjs/testing';
import { IdentificationExtractor } from './identification.extractor';

describe('IdentificationExtractor', () => {
  let extractor: IdentificationExtractor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdentificationExtractor],
    }).compile();

    extractor = module.get<IdentificationExtractor>(IdentificationExtractor);
  });

  it('should be defined', () => {
    expect(extractor).toBeDefined();
  });

  describe('extractContractNumber', () => {
    // TEST-001: Standard contract number format
    it('should extract standard Chinese contract number format', () => {
      const text = '合同编号：CTR-2026-001';
      const result = extractor.extract(text);

      expect(result.contractNumber).toBe('CTR-2026-001');
    });

    // TEST-002: English format
    it('should extract English contract number format', () => {
      const text = 'Contract No: ABC123';
      const result = extractor.extract(text);

      expect(result.contractNumber).toBe('ABC123');
    });

    // TEST-003: No contract number
    it('should return null when no contract number found', () => {
      const text = '这是一份没有编号的合同';
      const result = extractor.extract(text);

      expect(result.contractNumber).toBeNull();
    });

    // TEST-004: Multiple number formats
    it('should extract first matching contract number when multiple formats present', () => {
      const text = '合同编号：CTR-001\n编号：ALT-002';
      const result = extractor.extract(text);

      expect(result.contractNumber).toBe('CTR-001');
    });

    it('should handle contract number with slashes', () => {
      const text = '合同编号：2026/SW/001';
      const result = extractor.extract(text);

      expect(result.contractNumber).toBe('2026/SW/001');
    });

    it('should ignore placeholder values', () => {
      const text = '合同编号：____';
      const result = extractor.extract(text);

      expect(result.contractNumber).toBeNull();
    });
  });

  describe('extractContractTitle', () => {
    // TEST-005: Extract contract title
    it('should extract contract title', () => {
      const text = '软件开发服务合同\n\n合同编号：CTR-001';
      const result = extractor.extract(text);

      expect(result.contractTitle).toBe('软件开发服务合同');
    });

    it('should extract title from contract name field', () => {
      const text = '合同名称：系统集成服务协议';
      const result = extractor.extract(text);

      expect(result.contractTitle).toBe('系统集成服务协议');
    });

    it('should extract title from book title marks', () => {
      const text = '本《人力外包服务合同》由双方签订';
      const result = extractor.extract(text);

      expect(result.contractTitle).toBe('人力外包服务合同');
    });
  });

  describe('detectContractType', () => {
    // TEST-006: Staff augmentation type
    it('should detect STAFF_AUGMENTATION type', () => {
      const text = '人力外包服务合同';
      const result = extractor.extract(text);

      expect(result.contractType).toBe('STAFF_AUGMENTATION');
    });

    // TEST-007: Project outsourcing type
    it('should detect PROJECT_OUTSOURCING type', () => {
      const text = '软件开发服务合同';
      const result = extractor.extract(text);

      expect(result.contractType).toBe('PROJECT_OUTSOURCING');
    });

    // TEST-008: Product sales type
    it('should detect PRODUCT_SALES type', () => {
      const text = '设备采购合同';
      const result = extractor.extract(text);

      expect(result.contractType).toBe('PRODUCT_SALES');
    });

    // TEST-009: Unrecognized type
    it('should return null for unrecognized contract type', () => {
      const text = '保密协议';
      const result = extractor.extract(text);

      expect(result.contractType).toBeNull();
    });

    it('should detect type based on keyword frequency', () => {
      const text = '项目外包合同\n包含软件开发和系统集成';
      const result = extractor.extract(text);

      expect(result.contractType).toBe('PROJECT_OUTSOURCING');
    });
  });

  describe('detectLanguage', () => {
    // TEST-010: Chinese contract
    it('should detect Chinese language', () => {
      const text = '本合同由双方于二零二六年一月签订，用于软件开发服务的购买与交付。';
      const result = extractor.extract(text);

      expect(result.effectiveLanguage).toBe('zh');
    });

    // TEST-011: English contract
    it('should detect English language', () => {
      const text = 'This Agreement is entered into by and between the parties for the purpose of software development services.';
      const result = extractor.extract(text);

      expect(result.effectiveLanguage).toBe('en');
    });

    // TEST-012: Bilingual contract
    it('should detect bilingual contract', () => {
      const text = '软件开发服务合同\nSoftware Development Agreement\n本合同由双方签订。This Agreement is entered into by the parties.';
      const result = extractor.extract(text);

      expect(result.effectiveLanguage).toBe('bilingual');
    });

    it('should return null for empty text', () => {
      const text = '';
      const result = extractor.extract(text);

      expect(result.effectiveLanguage).toBeNull();
    });
  });

  describe('extractVersionNumber', () => {
    it('should extract version number', () => {
      const text = '版本：v2.1';
      const result = extractor.extract(text);

      expect(result.versionNumber).toBe('v2.1');
    });

    it('should extract Chinese version format', () => {
      const text = '第3版';
      const result = extractor.extract(text);

      expect(result.versionNumber).toBe('3');
    });

    it('should return null when no version found', () => {
      const text = '合同编号：CTR-001';
      const result = extractor.extract(text);

      expect(result.versionNumber).toBeNull();
    });
  });

  describe('extractSubType', () => {
    it('should extract contract subtype', () => {
      const text = '合同类型：技术开发委托合同';
      const result = extractor.extract(text);

      expect(result.subType).toBe('技术开发委托合同');
    });

    it('should extract service type as subtype', () => {
      const text = '服务类型：驻场开发服务';
      const result = extractor.extract(text);

      expect(result.subType).toBe('驻场开发服务');
    });
  });

  describe('extractWithConfidence', () => {
    it('should return high confidence for complete extraction', () => {
      const text = `软件开发服务合同
合同编号：CTR-2026-001
版本：v1.0`;
      const { data, confidence } = extractor.extractWithConfidence(text);

      expect(data.contractNumber).toBe('CTR-2026-001');
      expect(data.contractTitle).toBe('软件开发服务合同');
      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should return low confidence for minimal extraction', () => {
      const text = '这是一段普通文本';
      const { confidence } = extractor.extractWithConfidence(text);

      expect(confidence).toBeLessThan(0.3);
    });
  });

  describe('edge cases', () => {
    it('should handle text with special characters', () => {
      const text = '合同编号：CTR-2026/001-A&B';
      const result = extractor.extract(text);

      expect(result.contractNumber).not.toBeNull();
    });

    it('should handle multiline contract titles', () => {
      const text = '合同名称：\n  软件开发服务合同';
      const result = extractor.extract(text);

      expect(result.contractTitle).not.toBeNull();
    });

    it('should handle Chinese colon', () => {
      const text = '合同编号：CTR-2026-001';
      const result = extractor.extract(text);

      expect(result.contractNumber).toBe('CTR-2026-001');
    });
  });
});
