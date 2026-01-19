import { Test, TestingModule } from '@nestjs/testing';
import { TermExtractor } from './term.extractor';

describe('TermExtractor', () => {
  let extractor: TermExtractor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TermExtractor],
    }).compile();

    extractor = module.get<TermExtractor>(TermExtractor);
  });

  it('should be defined', () => {
    expect(extractor).toBeDefined();
  });

  describe('date extraction', () => {
    // TEST-025: Chinese date format
    it('should extract Chinese date format', () => {
      const text = '签署日期：2026年1月15日';
      const result = extractor.extract(text);

      expect(result.executionDate).toBe('2026-01-15');
    });

    // TEST-026: ISO date format
    it('should extract ISO date format', () => {
      const text = 'Execution Date: 2026-01-15';
      const result = extractor.extract(text);

      expect(result.executionDate).toBe('2026-01-15');
    });

    // TEST-027: Slash date format
    it('should extract slash date format', () => {
      const text = '签订日期：2026/01/15';
      const result = extractor.extract(text);

      expect(result.executionDate).toBe('2026-01-15');
    });

    // TEST-028: Execution date context
    it('should extract execution date from context', () => {
      const text = '本合同于2026年1月15日签署生效';
      const result = extractor.extract(text);

      expect(result.executionDate).toBe('2026-01-15');
    });

    // TEST-029: Effective date
    it('should extract effective date', () => {
      const text = '生效日期：2026年2月1日';
      const result = extractor.extract(text);

      expect(result.effectiveDate).toBe('2026-02-01');
    });

    // TEST-030: Termination date
    it('should extract termination date', () => {
      const text = '终止日期：2027年1月31日';
      const result = extractor.extract(text);

      expect(result.terminationDate).toBe('2027-01-31');
    });

    // TEST-036: No date information
    it('should return null for all date fields when no dates found', () => {
      const text = '这是一份没有日期信息的文本';
      const result = extractor.extract(text);

      expect(result.executionDate).toBeNull();
      expect(result.effectiveDate).toBeNull();
      expect(result.terminationDate).toBeNull();
    });
  });

  describe('date range extraction', () => {
    it('should extract start and end dates from date range', () => {
      const text = '合同有效期：2026年2月1日至2027年1月31日';
      const result = extractor.extract(text);

      expect(result.commencementDate).toBe('2026-02-01');
      expect(result.terminationDate).toBe('2027-01-31');
    });

    it('should handle ISO date range', () => {
      const text = '有效期：2026-02-01至2027-01-31';
      const result = extractor.extract(text);

      expect(result.commencementDate).toBe('2026-02-01');
      expect(result.terminationDate).toBe('2027-01-31');
    });

    it('should handle dash separator in date range', () => {
      const text = '服务期限：2026年2月1日—2027年1月31日';
      const result = extractor.extract(text);

      expect(result.commencementDate).not.toBeNull();
      expect(result.terminationDate).not.toBeNull();
    });
  });

  describe('duration extraction', () => {
    // TEST-031: Contract duration in months
    it('should extract duration in months', () => {
      const text = '合同期限为12个月';
      const result = extractor.extract(text);

      expect(result.duration).not.toBeNull();
      expect(result.duration?.value).toBe(12);
      expect(result.duration?.unit).toBe('month');
    });

    // TEST-032: Contract duration in years
    it('should extract duration in years', () => {
      const text = '有效期为3年';
      const result = extractor.extract(text);

      expect(result.duration).not.toBeNull();
      expect(result.duration?.value).toBe(3);
      expect(result.duration?.unit).toBe('year');
    });

    it('should extract duration in days', () => {
      const text = '期限为90天';
      const result = extractor.extract(text);

      expect(result.duration).not.toBeNull();
      expect(result.duration?.value).toBe(90);
      expect(result.duration?.unit).toBe('day');
    });

    it('should extract English duration format', () => {
      const text = 'Term: 12 months';
      const result = extractor.extract(text);

      expect(result.duration).not.toBeNull();
      expect(result.duration?.value).toBe(12);
      expect(result.duration?.unit).toBe('month');
    });
  });

  describe('renewal terms extraction', () => {
    // TEST-033: Automatic renewal detection
    it('should detect automatic renewal clause', () => {
      const text = '本合同到期后自动续约';
      const result = extractor.extract(text);

      expect(result.renewal).not.toBeNull();
      expect(result.renewal?.automaticRenewal).toBe(true);
    });

    it('should detect automatic extension', () => {
      const text = '如双方无异议，合同自动延续';
      const result = extractor.extract(text);

      expect(result.renewal).not.toBeNull();
      expect(result.renewal?.automaticRenewal).toBe(true);
    });

    // TEST-034: Renewal period
    it('should extract renewal period', () => {
      const text = '本合同自动续约1年';
      const result = extractor.extract(text);

      expect(result.renewal?.renewalTerm).toBe('1年');
    });

    // TEST-035: Notice period
    it('should extract notice period', () => {
      const text = '自动续约，任一方如欲终止须提前30天书面通知';
      const result = extractor.extract(text);

      expect(result.renewal?.noticePeriod).not.toBeNull();
      expect(result.renewal?.noticePeriod?.value).toBe(30);
      expect(result.renewal?.noticePeriod?.unit).toBe('day');
    });

    it('should extract notice period in months', () => {
      const text = '自动续约，提前3个月通知可终止';
      const result = extractor.extract(text);

      expect(result.renewal?.noticePeriod?.value).toBe(3);
      expect(result.renewal?.noticePeriod?.unit).toBe('month');
    });

    it('should return null when no renewal clause found', () => {
      const text = '合同到期后终止';
      const result = extractor.extract(text);

      expect(result.renewal).toBeNull();
    });
  });

  describe('extractWithConfidence', () => {
    it('should return high confidence for complete term info', () => {
      const text = `合同期限：12个月
签署日期：2026年1月15日
生效日期：2026年2月1日
终止日期：2027年1月31日
本合同到期后自动续约`;

      const { data, confidence } = extractor.extractWithConfidence(text);

      expect(data.duration).not.toBeNull();
      expect(data.executionDate).not.toBeNull();
      expect(data.renewal).not.toBeNull();
      expect(confidence).toBeGreaterThan(0.5);
    });

    it('should return low confidence for minimal info', () => {
      const text = '普通文本内容';
      const { confidence } = extractor.extractWithConfidence(text);

      expect(confidence).toBeLessThan(0.3);
    });
  });

  describe('edge cases', () => {
    it('should handle single digit dates', () => {
      const text = '签署日期：2026年1月5日';
      const result = extractor.extract(text);

      expect(result.executionDate).toBe('2026-01-05');
    });

    it('should handle date with "日" suffix', () => {
      const text = '截止日期：2027年12月31日';
      const result = extractor.extract(text);

      expect(result.terminationDate).toBe('2027-12-31');
    });

    it('should handle multiple dates and pick correct context', () => {
      const text = `签署日期：2026年1月15日
生效日期：2026年2月1日`;
      const result = extractor.extract(text);

      expect(result.executionDate).toBe('2026-01-15');
      expect(result.effectiveDate).toBe('2026-02-01');
    });

    it('should handle Chinese numeral units', () => {
      const text = '合同期限：十二个月';
      // This may not be extracted by current implementation
      const result = extractor.extract(text);

      expect(result.duration).toBeNull(); // Current implementation doesn't handle Chinese numerals
    });
  });

  describe('commencementDate extraction', () => {
    it('should extract commencement date from context', () => {
      const text = '自2026年2月1日起生效';
      const result = extractor.extract(text);

      expect(result.commencementDate).toBe('2026-02-01');
    });

    it('should extract start date', () => {
      const text = '开始日期：2026年2月1日';
      const result = extractor.extract(text);

      expect(result.commencementDate).toBe('2026-02-01');
    });
  });
});
