import { Test, TestingModule } from '@nestjs/testing';
import { FieldExtractorService } from './field-extractor.service';
import { IdentificationExtractor } from './basic/identification.extractor';
import { PartiesExtractor } from './basic/parties.extractor';
import { TermExtractor } from './basic/term.extractor';

// Sample contract text for testing
const sampleContractTextChinese = `
软件开发服务合同

合同编号：CTR-2026-001

甲方：上海某某科技有限公司
统一社会信用代码：91310000MA1XXXXXX
地址：上海市浦东新区张江高科技园区
联系人：张三
职务：采购经理
电话：021-12345678
邮箱：zhangsan@example.com

乙方：某某软件股份有限公司
统一社会信用代码：91310000MA1YYYYYY
地址：上海市徐汇区漕河泾开发区
联系人：李四
职务：项目总监
电话：021-87654321
邮箱：lisi@example.com

合同期限为12个月，自2026年2月1日起至2027年1月31日止。
签署日期：2026年1月15日

本合同到期后，如双方无异议，自动续约1年。
`;

const sampleContractTextEnglish = `
SOFTWARE DEVELOPMENT AGREEMENT

Contract No: ABC-2026-001

Party A: Shanghai Technology Co., Ltd
Registration No: 91310000MA1XXXXXX
Address: Zhangjiang Hi-Tech Park, Pudong, Shanghai
Contact Person: John Smith
Title: Procurement Manager
Tel: 021-12345678
Email: john@example.com

Party B: Software Solutions Inc.
Registration No: 91310000MA1YYYYYY
Address: Caohejing Development Zone, Xuhui, Shanghai

Term: 12 months
Execution Date: 2026-01-15
`;

describe('FieldExtractorService', () => {
  let service: FieldExtractorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FieldExtractorService,
        IdentificationExtractor,
        PartiesExtractor,
        TermExtractor,
      ],
    }).compile();

    service = module.get<FieldExtractorService>(FieldExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractBasicFields', () => {
    // TEST-037: Complete contract text extraction
    it('should extract all fields from complete Chinese contract', () => {
      const result = service.extractBasicFields(sampleContractTextChinese);

      // Contract identification
      expect(result.identification.contractNumber).toBe('CTR-2026-001');
      expect(result.identification.contractType).toBe('PROJECT_OUTSOURCING');

      // Party information
      expect(result.parties.firstParty.name).toBe('上海某某科技有限公司');
      expect(result.parties.secondParty.name).toBe('某某软件股份有限公司');

      // Term information
      expect(result.term.executionDate).toBe('2026-01-15');
      expect(result.term.renewal?.automaticRenewal).toBe(true);
    });

    it('should extract fields from English contract', () => {
      const result = service.extractBasicFields(sampleContractTextEnglish);

      expect(result.identification.contractNumber).toBe('ABC-2026-001');
      expect(result.identification.effectiveLanguage).toBe('en');

      // Party extraction from English format
      expect(result.parties.firstParty.name).toBe('Shanghai Technology Co., Ltd');
      expect(result.parties.secondParty.name).toBe('Software Solutions Inc.');
    });

    // TEST-038: Confidence calculation
    it('should calculate overall confidence based on field fill rate', () => {
      const result = service.extractBasicFields(sampleContractTextChinese);

      expect(result.extractionConfidence).toBeGreaterThan(0.3);
      expect(result.extractionConfidence).toBeLessThanOrEqual(1);
    });

    // TEST-039: Empty text input
    it('should return empty result for empty text', () => {
      const result = service.extractBasicFields('');

      expect(result.identification.contractNumber).toBeNull();
      expect(result.parties.firstParty.name).toBeNull();
      expect(result.term.duration).toBeNull();
      expect(result.extractionConfidence).toBe(0);
    });

    // TEST-040: Special character handling
    it('should handle text with special characters', () => {
      const textWithSpecialChars = `
合同编号：CTR-2026/001&A
甲方：上海"科技"公司（简称甲方）
乙方：某某软件<公司>
`;
      const result = service.extractBasicFields(textWithSpecialChars);

      expect(result.identification.contractNumber).not.toBeNull();
      expect(result.parties.firstParty.name).not.toBeNull();
    });

    it('should handle whitespace-only text', () => {
      const result = service.extractBasicFields('   \n\n   ');

      expect(result.extractionConfidence).toBe(0);
    });
  });

  describe('extractWithMetrics', () => {
    it('should return extraction metrics', () => {
      const { data, metrics } = service.extractWithMetrics(sampleContractTextChinese);

      expect(metrics.identificationConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.partiesConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.termConfidence).toBeGreaterThanOrEqual(0);
      expect(metrics.overallConfidence).toBeGreaterThan(0);
      expect(metrics.fieldsExtracted).toBeGreaterThan(0);
      expect(metrics.totalFields).toBeGreaterThan(0);
    });

    it('should count fields correctly', () => {
      const { metrics } = service.extractWithMetrics(sampleContractTextChinese);

      expect(metrics.fieldsExtracted).toBeLessThanOrEqual(metrics.totalFields);
    });
  });

  describe('toFlatRecord', () => {
    it('should convert extracted fields to flat record', () => {
      const fields = service.extractBasicFields(sampleContractTextChinese);
      const record = service.toFlatRecord(fields);

      expect(record.contractNumber).toBe('CTR-2026-001');
      expect(record.firstPartyName).toBe('上海某某科技有限公司');
      expect(record.secondPartyName).toBe('某某软件股份有限公司');
    });

    it('should only include non-null fields in flat record', () => {
      const fields = service.extractBasicFields('');
      const record = service.toFlatRecord(fields);

      expect(Object.keys(record).length).toBe(0);
    });

    it('should format duration correctly when present', () => {
      const fields = service.extractBasicFields(sampleContractTextChinese);
      const record = service.toFlatRecord(fields);

      if (record.duration) {
        expect(typeof record.duration).toBe('string');
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle minimal contract info', () => {
      const minimalText = '合同编号：MIN-001';
      const result = service.extractBasicFields(minimalText);

      expect(result.identification.contractNumber).toBe('MIN-001');
      expect(result.parties.firstParty.name).toBeNull();
      expect(result.term.duration).toBeNull();
    });

    it('should handle contract with only party info', () => {
      const partyOnlyText = '甲方：客户公司\n乙方：服务公司';
      const result = service.extractBasicFields(partyOnlyText);

      expect(result.parties.firstParty.name).toBe('客户公司');
      expect(result.parties.secondParty.name).toBe('服务公司');
      expect(result.identification.contractNumber).toBeNull();
    });

    it('should handle bilingual contract', () => {
      const bilingualText = `
软件开发服务合同
SOFTWARE DEVELOPMENT AGREEMENT

合同编号 Contract No: CTR-2026-001

甲方 Party A: 上海科技公司 Shanghai Tech Co.
乙方 Party B: 软件公司 Software Inc.
`;
      const result = service.extractBasicFields(bilingualText);

      expect(result.identification.effectiveLanguage).toBe('bilingual');
      expect(result.identification.contractNumber).toBe('CTR-2026-001');
    });
  });
});
