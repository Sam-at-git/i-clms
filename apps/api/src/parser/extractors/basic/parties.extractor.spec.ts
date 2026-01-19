import { Test, TestingModule } from '@nestjs/testing';
import { PartiesExtractor } from './parties.extractor';

describe('PartiesExtractor', () => {
  let extractor: PartiesExtractor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartiesExtractor],
    }).compile();

    extractor = module.get<PartiesExtractor>(PartiesExtractor);
  });

  it('should be defined', () => {
    expect(extractor).toBeDefined();
  });

  describe('extractPartyName', () => {
    // TEST-013: Standard first party format
    it('should extract first party name from standard Chinese format', () => {
      const text = '甲方：上海某某科技有限公司';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('上海某某科技有限公司');
    });

    // TEST-014: English format
    it('should extract party name from English format', () => {
      const text = 'Party A: Shanghai Technology Co., Ltd';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('Shanghai Technology Co., Ltd');
    });

    // TEST-015: Buyer/seller format
    it('should recognize buyer as first party', () => {
      const text = '买方：采购公司\n卖方：销售公司';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('采购公司');
      expect(result.secondParty.name).toBe('销售公司');
    });

    it('should extract second party name', () => {
      const text = '乙方：某某软件股份有限公司';
      const result = extractor.extract(text);

      expect(result.secondParty.name).toBe('某某软件股份有限公司');
    });

    it('should handle parentheses in party designation', () => {
      const text = '甲方（委托方）：上海科技公司';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('上海科技公司');
    });
  });

  describe('extractRegistrationNumber', () => {
    // TEST-016: Unified social credit code
    it('should extract unified social credit code (18 chars)', () => {
      const text = '甲方：某公司\n统一社会信用代码：91310000MA1XXXXXX';
      const result = extractor.extract(text);

      expect(result.firstParty.registrationNumber).toBe('91310000MA1XXXXXX');
    });

    it('should extract registration number in English', () => {
      const text = 'Party A: Company Ltd\nRegistration No: 12345678901234567X';
      const result = extractor.extract(text);

      expect(result.firstParty.registrationNumber).toBe('12345678901234567X');
    });
  });

  describe('extractAddress', () => {
    // TEST-017: Address extraction
    it('should extract registered address', () => {
      const text = '甲方：某公司\n地址：上海市浦东新区张江高科技园区';
      const result = extractor.extract(text);

      expect(result.firstParty.registeredAddress).toBe('上海市浦东新区张江高科技园区');
    });

    it('should handle English address format', () => {
      const text = 'Party A: Company\nAddress: 123 Main Street, Shanghai';
      const result = extractor.extract(text);

      expect(result.firstParty.registeredAddress).toBe('123 Main Street, Shanghai');
    });
  });

  describe('extractContactPerson', () => {
    // TEST-018: Contact person information
    it('should extract contact person with all fields', () => {
      const text = `甲方：某公司
联系人：张三
职务：采购经理
电话：021-12345678
邮箱：zhangsan@example.com`;
      const result = extractor.extract(text);

      expect(result.firstParty.contactPerson).not.toBeNull();
      expect(result.firstParty.contactPerson?.name).toBe('张三');
      expect(result.firstParty.contactPerson?.title).toBe('采购经理');
      expect(result.firstParty.contactPerson?.phone).toBe('021-12345678');
      expect(result.firstParty.contactPerson?.email).toBe('zhangsan@example.com');
    });

    it('should return null when no contact person found', () => {
      const text = '甲方：某公司';
      const result = extractor.extract(text);

      expect(result.firstParty.contactPerson).toBeNull();
    });

    // TEST-024: Email format validation
    it('should only extract valid email addresses', () => {
      const text = '甲方：某公司\n联系人：张三\n邮箱：valid@example.com';
      const result = extractor.extract(text);

      expect(result.firstParty.contactPerson?.email).toBe('valid@example.com');
    });

    it('should not extract invalid email formats', () => {
      const text = '甲方：某公司\n联系人：张三\n邮箱：invalid-email';
      const result = extractor.extract(text);

      // Since invalid email won't match the email regex,
      // but contact person may still be extracted with null email
      if (result.firstParty.contactPerson) {
        expect(result.firstParty.contactPerson.email).toBeNull();
      }
    });
  });

  describe('extractAuthorizedSignatory', () => {
    // TEST-019: Signatory information
    it('should extract authorized signatory', () => {
      const text = '甲方：某公司\n法定代表人：王总';
      const result = extractor.extract(text);

      expect(result.firstParty.authorizedSignatory).not.toBeNull();
      expect(result.firstParty.authorizedSignatory?.name).toBe('王总');
    });

    it('should extract signatory with signature date', () => {
      const text = '甲方：某公司\n授权代表：李总\n签署日期：2026年1月15日';
      const result = extractor.extract(text);

      expect(result.firstParty.authorizedSignatory?.name).toBe('李总');
    });
  });

  describe('incomplete party info', () => {
    // TEST-020: Incomplete first party info
    it('should handle incomplete first party info', () => {
      const text = '甲方：某公司';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('某公司');
      expect(result.firstParty.registrationNumber).toBeNull();
      expect(result.firstParty.registeredAddress).toBeNull();
    });

    // TEST-021: Incomplete second party info
    it('should handle incomplete second party info', () => {
      const text = '乙方：另一公司';
      const result = extractor.extract(text);

      expect(result.secondParty.name).toBe('另一公司');
      expect(result.secondParty.registrationNumber).toBeNull();
    });
  });

  describe('additionalParties', () => {
    // TEST-022: Extract guarantor as additional party
    it('should extract guarantor as additional party', () => {
      const text = '甲方：某公司\n乙方：另一公司\n担保方：担保公司';
      const result = extractor.extract(text);

      expect(result.additionalParties).toHaveLength(1);
      expect(result.additionalParties[0].role).toBe('担保方');
      expect(result.additionalParties[0].info.name).toBe('担保公司');
    });

    // TEST-023: No additional parties
    it('should return empty array when no additional parties', () => {
      const text = '甲方：某公司\n乙方：另一公司';
      const result = extractor.extract(text);

      expect(result.additionalParties).toHaveLength(0);
    });

    it('should extract Party C', () => {
      const text = '甲方：A公司\n乙方：B公司\n丙方：C公司';
      const result = extractor.extract(text);

      expect(result.additionalParties).toHaveLength(1);
      expect(result.additionalParties[0].role).toBe('丙方');
    });
  });

  describe('legalEntityType', () => {
    it('should detect legal entity type', () => {
      const text = '甲方：某某科技有限公司';
      const result = extractor.extract(text);

      expect(result.firstParty.legalEntityType).toBe('有限公司');
    });

    it('should detect shareholding company', () => {
      const text = '乙方：某某股份有限公司';
      const result = extractor.extract(text);

      expect(result.secondParty.legalEntityType).toBe('股份有限公司');
    });

    it('should detect English legal entity types', () => {
      const text = 'Party A: ABC Company Ltd';
      const result = extractor.extract(text);

      expect(result.firstParty.legalEntityType).toBe('Ltd');
    });
  });

  describe('extractWithConfidence', () => {
    it('should return high confidence for complete party info', () => {
      const text = `甲方：上海科技有限公司
统一社会信用代码：91310000MA1XXXXXX
地址：上海市浦东新区
联系人：张三
乙方：另一公司
地址：上海市徐汇区`;

      const { data, confidence } = extractor.extractWithConfidence(text);

      expect(data.firstParty.name).not.toBeNull();
      expect(data.secondParty.name).not.toBeNull();
      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should return low confidence for minimal info', () => {
      const text = '某些普通文本内容';
      const { confidence } = extractor.extractWithConfidence(text);

      expect(confidence).toBeLessThan(0.3);
    });
  });

  describe('edge cases', () => {
    it('should handle text with company name in parentheses', () => {
      const text = '甲方（全称）：上海科技有限公司';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('上海科技有限公司');
    });

    it('should handle delegate/client format', () => {
      const text = '委托方：客户公司\n受托方：服务公司';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('客户公司');
      expect(result.secondParty.name).toBe('服务公司');
    });

    it('should clean up trailing content after party name', () => {
      const text = '甲方：某某科技公司（以下简称"甲方"）';
      const result = extractor.extract(text);

      expect(result.firstParty.name).toBe('某某科技公司');
    });
  });
});
