import {
  desensitizeAmount,
  desensitizeCustomerName,
  desensitizeIndustry,
  generateProjectDetails,
  buildUserPrompt,
  generateFullMarkdown,
  CONTRACT_TYPE_DISPLAY,
} from './case-study-generation.prompt';

describe('Case Study Generation Prompts', () => {
  describe('desensitizeAmount', () => {
    it('should return "数万级项目" for amounts < 100,000', () => {
      expect(desensitizeAmount(50000)).toBe('数万级项目');
      expect(desensitizeAmount(99999)).toBe('数万级项目');
    });

    it('should return "数十万级项目" for amounts 100,000 - 999,999', () => {
      expect(desensitizeAmount(100000)).toBe('数十万级项目');
      expect(desensitizeAmount(500000)).toBe('数十万级项目');
      expect(desensitizeAmount(999999)).toBe('数十万级项目');
    });

    it('should return "百万级项目" for amounts 1,000,000 - 4,999,999', () => {
      expect(desensitizeAmount(1000000)).toBe('百万级项目');
      expect(desensitizeAmount(3000000)).toBe('百万级项目');
      expect(desensitizeAmount(4999999)).toBe('百万级项目');
    });

    it('should return "数百万级项目" for amounts 5,000,000 - 9,999,999', () => {
      expect(desensitizeAmount(5000000)).toBe('数百万级项目');
      expect(desensitizeAmount(8000000)).toBe('数百万级项目');
      expect(desensitizeAmount(9999999)).toBe('数百万级项目');
    });

    it('should return "千万级项目" for amounts 10,000,000 - 99,999,999', () => {
      expect(desensitizeAmount(10000000)).toBe('千万级项目');
      expect(desensitizeAmount(50000000)).toBe('千万级项目');
      expect(desensitizeAmount(99999999)).toBe('千万级项目');
    });

    it('should return "亿级项目" for amounts >= 100,000,000', () => {
      expect(desensitizeAmount(100000000)).toBe('亿级项目');
      expect(desensitizeAmount(500000000)).toBe('亿级项目');
    });
  });

  describe('desensitizeCustomerName', () => {
    it('should detect industry from industry parameter', () => {
      expect(desensitizeCustomerName('ABC公司', '金融')).toBe('某金融企业');
      expect(desensitizeCustomerName('XYZ公司', '互联网')).toBe('某互联网企业');
      expect(desensitizeCustomerName('测试公司', '医疗')).toBe('某医疗企业');
    });

    it('should detect industry from customer name when industry not provided', () => {
      expect(desensitizeCustomerName('中国工商银行')).toBe('某金融机构');
      expect(desensitizeCustomerName('阿里巴巴互联网公司')).toBe('某互联网企业');
      expect(desensitizeCustomerName('某科技集团')).toBe('某科技集团');
    });

    it('should detect enterprise type', () => {
      expect(desensitizeCustomerName('某金融集团', '金融')).toBe('某金融集团');
      expect(desensitizeCustomerName('中国银行', '银行')).toBe('某金融机构');
      expect(desensitizeCustomerName('北京大学', '教育')).toBe('某教育院校');
      expect(desensitizeCustomerName('某市人民医院', '医疗')).toBe('某医疗医院');
      expect(desensitizeCustomerName('财政局', '政府')).toBe('某政务机构');
    });

    it('should return default for unknown industry', () => {
      expect(desensitizeCustomerName('未知公司')).toBe('某知名企业');
    });
  });

  describe('desensitizeIndustry', () => {
    it('should map industry keywords to display names', () => {
      expect(desensitizeIndustry('金融')).toBe('金融服务行业');
      expect(desensitizeIndustry('银行业')).toBe('金融服务行业');
      expect(desensitizeIndustry('互联网')).toBe('互联网行业');
      expect(desensitizeIndustry('科技创新')).toBe('科技行业');
      expect(desensitizeIndustry('电商零售')).toBe('电子商务行业');
      expect(desensitizeIndustry('制造业')).toBe('制造业');
    });

    it('should return original or default for unknown industry', () => {
      expect(desensitizeIndustry('未知行业')).toBe('未知行业');
      expect(desensitizeIndustry('')).toBe('企业服务领域');
    });
  });

  describe('generateProjectDetails', () => {
    it('should generate details for staff augmentation contracts', () => {
      const contract = {
        staffAugmentation: {
          rateItems: [
            { role: '高级工程师' },
            { role: '项目经理' },
          ],
          estimatedTotalHours: 2000,
          settlementCycle: '月结',
        },
      };

      const details = generateProjectDetails(contract);

      expect(details).toContain('高级工程师');
      expect(details).toContain('项目经理');
      expect(details).toContain('2000小时');
      expect(details).toContain('月结');
    });

    it('should generate details for project outsourcing contracts', () => {
      const contract = {
        projectOutsourcing: {
          sowSummary: 'SOW范围描述',
          deliverables: '交付物清单',
          milestones: [
            { name: '需求分析' },
            { name: '系统开发' },
          ],
        },
      };

      const details = generateProjectDetails(contract);

      expect(details).toContain('SOW范围');
      expect(details).toContain('交付物');
      expect(details).toContain('需求分析');
      expect(details).toContain('系统开发');
    });

    it('should generate details for product sales contracts', () => {
      const contract = {
        productSales: {
          lineItems: [
            { productName: '软件许可', quantity: 100, unit: '套' },
          ],
          warrantyPeriod: '2年',
        },
      };

      const details = generateProjectDetails(contract);

      expect(details).toContain('软件许可');
      expect(details).toContain('100套');
      expect(details).toContain('2年');
    });

    it('should return placeholder for empty contracts', () => {
      const contract = {};

      const details = generateProjectDetails(contract);

      expect(details).toBe('（无详细信息）');
    });
  });

  describe('buildUserPrompt', () => {
    const mockContract = {
      name: '测试合同',
      type: 'PROJECT_OUTSOURCING',
      ourEntity: '测试公司',
      amountWithTax: 1500000,
      currency: 'CNY',
      industry: '金融',
      duration: '12个月',
      signedAt: new Date('2024-01-01'),
      customer: {
        name: '某金融集团',
        industry: '金融',
      },
      projectOutsourcing: {
        sowSummary: 'SOW范围',
        milestones: [],
      },
    };

    it('should build prompt with desensitization enabled', () => {
      const prompt = buildUserPrompt(mockContract, { desensitize: true });

      expect(prompt).toContain('测试合同');
      expect(prompt).toContain('项目外包服务');
      expect(prompt).toContain('某金融');
      expect(prompt).toContain('百万级项目');
      expect(prompt).toContain('金融服务行业');
    });

    it('should build prompt without desensitization', () => {
      const prompt = buildUserPrompt(mockContract, { desensitize: false });

      expect(prompt).toContain('某金融集团');
      expect(prompt).toContain('1,500,000');
    });

    it('should include custom display values when provided', () => {
      const prompt = buildUserPrompt(mockContract, {
        desensitize: true,
        displayCustomerName: '自定义客户名',
        displayAmount: '自定义金额',
        displayIndustry: '自定义行业',
      });

      expect(prompt).toContain('自定义客户名');
      expect(prompt).toContain('自定义金额');
      expect(prompt).toContain('自定义行业');
    });
  });

  describe('generateFullMarkdown', () => {
    it('should generate complete markdown document', () => {
      const data = {
        title: '案例标题',
        subtitle: '副标题',
        summary: '项目概述',
        challenges: '客户挑战',
        solution: '解决方案',
        results: '项目成果',
        testimonial: '客户评价',
        techStack: 'React, Node.js',
        timeline: '3个月',
        teamSize: '5人',
        displayIndustry: '金融服务行业',
        tags: ['标签1', '标签2'],
      };

      const markdown = generateFullMarkdown(data);

      expect(markdown).toContain('# 案例标题');
      expect(markdown).toContain('*副标题*');
      expect(markdown).toContain('## 项目概述');
      expect(markdown).toContain('## 客户挑战');
      expect(markdown).toContain('## 解决方案');
      expect(markdown).toContain('## 项目成果');
      expect(markdown).toContain('## 客户评价');
      expect(markdown).toContain('> 客户评价');
      expect(markdown).toContain('**技术栈**: React, Node.js');
      expect(markdown).toContain('**项目周期**: 3个月');
      expect(markdown).toContain('**团队规模**: 5人');
      expect(markdown).toContain('**行业**: 金融服务行业');
      expect(markdown).toContain('**标签**: 标签1, 标签2');
      expect(markdown).toContain('i-CLMS 智能合同管理系统');
    });

    it('should handle optional fields', () => {
      const data = {
        title: '简单案例',
        summary: '项目概述',
      };

      const markdown = generateFullMarkdown(data);

      expect(markdown).toContain('# 简单案例');
      expect(markdown).toContain('## 项目概述');
      expect(markdown).not.toContain('## 客户挑战');
      expect(markdown).not.toContain('## 解决方案');
    });
  });

  describe('CONTRACT_TYPE_DISPLAY', () => {
    it('should have correct mappings', () => {
      expect(CONTRACT_TYPE_DISPLAY.STAFF_AUGMENTATION).toBe('人力外包服务');
      expect(CONTRACT_TYPE_DISPLAY.PROJECT_OUTSOURCING).toBe('项目外包服务');
      expect(CONTRACT_TYPE_DISPLAY.PRODUCT_SALES).toBe('产品购销服务');
    });
  });
});
