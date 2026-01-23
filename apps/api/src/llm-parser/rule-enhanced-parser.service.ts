import { Injectable, Logger } from '@nestjs/common';
import { ExtractTopic } from './topics/topics.const';

/**
 * 字段提取规则
 */
interface ExtractionRule {
  pattern: RegExp;
  priority: number;
  postProcess?: (match: RegExpMatchArray) => string;
}

/**
 * 规则提取结果
 */
interface RuleExtractionResult {
  field: string;
  value: string | null;
  confidence: number;
  method: 'regex' | 'keyword';
  source: string; // 原始文本片段
}

/**
 * 字段提取规则库
 */
const FIELD_EXTRACTION_RULES: Record<string, ExtractionRule[]> = {
  // 合同编号
  contractNo: [
    { pattern: /合同[编号号码][:：]\s*([A-Z0-9\-]+)/i, priority: 1 },
    { pattern: /编号[:：]\s*([A-Z0-9\-]+)/i, priority: 2 },
    { pattern: /No\.?\s*([A-Z0-9\-]+)/i, priority: 3 },
    { pattern: /合约编号[:：]\s*([A-Z0-9\-]+)/i, priority: 4 },
  ],

  // 合同名称
  contractName: [
    { pattern: /合同名称[:：]\s*([^\n]+)/, priority: 1 },
    { pattern: /项目名称[:：]\s*([^\n]+)/, priority: 2 },
    { pattern: /^#\s+([^\n]+)/, priority: 3 }, // Markdown标题
  ],

  // 甲方名称（客户）
  firstPartyName: [
    { pattern: /甲方[:：]\s*([^\n甲乙]+?)(?:\s|地址|联系|电话|身份证|统一|$)/i, priority: 1 },
    { pattern: /发包方[:：]\s*([^\n]+?)(?:\s|地址|联系|$)/i, priority: 2 },
    { pattern: /委托方[:：]\s*([^\n]+?)(?:\s|地址|联系|$)/i, priority: 3 },
  ],

  // 乙方名称（我方）
  secondPartyName: [
    { pattern: /乙方[:：]\s*([^\n甲乙]+?)(?:\s|地址|联系|电话|身份证|统一|$)/i, priority: 1 },
    { pattern: /承包方[:：]\s*([^\n]+?)(?:\s|地址|联系|$)/i, priority: 2 },
    { pattern: /受托方[:：]\s*([^\n]+?)(?:\s|地址|联系|$)/i, priority: 3 },
  ],

  // 合同金额
  totalAmount: [
    { pattern: /合同[总额价款][:：]\s*[^0-9]*([0-9.,]+)\s*[元万元]/i, priority: 1 },
    { pattern: /总[价款额][:：]\s*[^0-9]*([0-9.,]+)\s*[元万元]/i, priority: 2 },
    { pattern: /金额[:：]\s*[^0-9]*([0-9.,]+)\s*元/i, priority: 3 },
    { pattern: /服务费[总额][:：]\s*[^0-9]*([0-9.,]+)\s*[元万元]/i, priority: 4 },
  ],

  // 税率
  taxRate: [
    { pattern: /税率[:：]\s*([0-9.]+)%?/i, priority: 1 },
    { pattern: /增值税税?率[:：]\s*([0-9.]+)%?/i, priority: 2 },
    { pattern: /含税.*?([0-9.]+)%/i, priority: 3 },
  ],

  // 币种
  currency: [
    { pattern: /(人民币|CNY|元)/i, priority: 1, postProcess: () => 'CNY' },
    { pattern: /(美元|USD|\$)/i, priority: 2, postProcess: () => 'USD' },
    { pattern: /(欧元|EUR|€)/i, priority: 3, postProcess: () => 'EUR' },
  ],

  // 付款方式
  paymentMethod: [
    { pattern: /(银行转账|汇款|转账)/i, priority: 1, postProcess: () => '银行转账' },
    { pattern: /(现金|现汇)/i, priority: 2, postProcess: () => '现金' },
    { pattern: /(承兑汇票|汇票|票据)/i, priority: 3, postProcess: () => '承兑汇票' },
  ],

  // 签订日期
  signDate: [
    { pattern: /签订日期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 1 },
    { pattern: /签署日期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 2 },
    { pattern: /合同签订于[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 3 },
  ],

  // 生效日期
  startDate: [
    { pattern: /生效日期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 1 },
    { pattern: /合同生效期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 2 },
    { pattern: /自[起从](\d{4}[-/年]\d{1,2}[-/月]\d{1,2})[日起]/, priority: 3 },
  ],

  // 终止日期
  endDate: [
    { pattern: /终止日期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 1 },
    { pattern: /有效期至[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 2 },
    { pattern: /合同期限[:：至到]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/, priority: 3 },
  ],

  // 合同期限
  duration: [
    { pattern: /合同期限[:：]\s*([^\n]+)/, priority: 1 },
    { pattern: /履行期限[:：]\s*([^\n]+)/, priority: 2 },
    { pattern: /有效期[:：]\s*([^\n]+)/, priority: 3 },
  ],

  // 行业
  industry: [
    { pattern: /(软件开发|信息技术|互联网|金融|医疗|教育|制造业|零售|物流)/i, priority: 1 },
  ],

  // 里程碑检测（用于判断是否存在）
  hasMilestones: [
    { pattern: /里程碑|付款节点|分期[付款支付]|第[一二三四五六七八九十\d]+期.*支付/i, priority: 1 },
  ],

  // 费率检测（用于人力合同）
  hasRateItems: [
    { pattern: /费率|单价|工时单价|人月|人天|hourly|daily.*rate/i, priority: 1 },
  ],

  // 产品清单检测（用于产品销售合同）
  hasLineItems: [
    { pattern: /产品清单|采购清单|设备清单|产品名称|规格型号/i, priority: 1 },
  ],
};

/**
 * 关键词定位器
 * 帮助 LLM 快速定位关键条款所在位置
 */
const SECTION_KEYWORDS = {
  header: ['合同', '协议', '名称', '编号'],
  parties: ['甲方', '乙方', '委托方', '受托方', '发包方', '承包方'],
  financial: ['金额', '价款', '费用', '支付', '付款', '结算', '货币', '税率'],
  schedule: ['签订', '生效', '终止', '期限', '有效期', '履行期', '交付'],
  milestones: ['里程碑', '付款节点', '分期支付', '验收', '交付物'],
  rate: ['费率', '单价', '工时', '人月', '人天', '级别'],
  deliverables: ['交付物', '验收标准', '工作范围', 'SOW', '服务内容'],
  risk: ['违约', '赔偿', '责任', '保密', '知识产权', '争议'],
};

/**
 * 规则增强解析服务
 *
 * 使用预定义规则对合同文本进行预处理，为 LLM 提供提取线索
 */
@Injectable()
export class RuleEnhancedParserService {
  private readonly logger = new Logger(RuleEnhancedParserService.name);

  /**
   * 使用规则提取字段
   */
  extractByRules(text: string, field: string): RuleExtractionResult | null {
    const rules = FIELD_EXTRACTION_RULES[field];
    if (!rules) {
      return null;
    }

    // 按优先级排序
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      const match = text.match(rule.pattern);
      if (match) {
        const value = rule.postProcess ? rule.postProcess(match) : match[1];
        const cleaned = this.postProcessValue(value, field);

        if (cleaned) {
          this.logger.debug('[Rule Extraction] ' + field + ' = "' + cleaned + '" (priority ' + rule.priority + ')');
          return {
            field,
            value: cleaned,
            confidence: this.calculateConfidence(rule.priority),
            method: 'regex',
            source: this.extractContext(text, match.index || 0, 100),
          };
        }
      }
    }

    return null;
  }

  /**
   * 批量提取多个字段
   */
  extractMultiple(text: string, fields: string[]): Record<string, RuleExtractionResult> {
    const results: Record<string, RuleExtractionResult> = {};

    for (const field of fields) {
      const result = this.extractByRules(text, field);
      if (result) {
        results[field] = result;
      }
    }

    this.logger.log('[Rule Extraction] Extracted ' + Object.keys(results).length + '/' + fields.length + ' fields');
    return results;
  }

  /**
   * 为 LLM prompt 生成规则增强文本
   */
  enhancePromptWithRules(text: string, targetFields: string[]): string {
    const clues: string[] = [];
    const missing: string[] = [];

    for (const field of targetFields) {
      const result = this.extractByRules(text, field);
      if (result && result.value) {
        clues.push('✓ ' + field + ': 规则提取="' + result.value + '" (置信度:' + result.confidence.toFixed(2) + ')');
      } else {
        missing.push('✗ ' + field + ': 未找到明确标识，请仔细搜索合同');
      }
    }

    if (clues.length === 0 && missing.length === 0) {
      return '';
    }

    let result = "\n## 规则提取线索\n\n";
    if (clues.length > 0) {
      result += "以下字段已通过规则提取，请验证其正确性：\n" + clues.join("\n") + "\n";
    }
    if (missing.length > 0) {
      result += "以下字段未找到明确标识：\n" + missing.join("\n");
    }
    result += "\n**注意**：规则提取的值可能不准确，请与合同原文核对。\n";
    return result;
  }

  /**
   * 定位合同中的关键区域
   */
  locateKeySections(text: string): Record<string, { start: number; end: number; preview: string }> {
    const sections: Record<string, { start: number; end: number; preview: string }> = {};

    // 查找包含关键词的段落
    for (const [sectionName, keywords] of Object.entries(SECTION_KEYWORDS)) {
      for (const keyword of keywords) {
        const index = text.indexOf(keyword);
        if (index !== -1) {
          // 提取该位置周围的文本
          const start = Math.max(0, index - 200);
          const end = Math.min(text.length, index + 800);
          const preview = text.substring(start, end).replace(/\n/g, ' ').substring(0, 200);

          sections[sectionName] = { start, end, preview: '...' + preview + '...' };
          break; // 找到第一个匹配的关键词即可
        }
      }
    }

    return sections;
  }

  /**
   * 检测合同类型特征
   */
  detectContractTypeFeatures(text: string): {
    hasMilestones: boolean;
    hasRateItems: boolean;
    hasLineItems: boolean;
    confidence: Record<string, number>;
  } {
    const checks = {
      hasMilestones: false,
      hasRateItems: false,
      hasLineItems: false,
      confidence: {} as Record<string, number>,
    };

    // 检查里程碑特征
    const milestoneResult = this.extractByRules(text, 'hasMilestones');
    checks.hasMilestones = !!milestoneResult;
    checks.confidence.PROJECT_OUTSOURCING = milestoneResult ? 0.7 : 0;

    // 检查费率特征
    const rateResult = this.extractByRules(text, 'hasRateItems');
    checks.hasRateItems = !!rateResult;
    checks.confidence.STAFF_AUGMENTATION = rateResult ? 0.7 : 0;

    // 检查产品清单特征
    const lineItemsResult = this.extractByRules(text, 'hasLineItems');
    checks.hasLineItems = !!lineItemsResult;
    checks.confidence.PRODUCT_SALES = lineItemsResult ? 0.7 : 0;

    return checks;
  }

  /**
   * 预处理合同文本，添加结构标注
   */
  preprocessText(text: string): { processed: string; metadata: any } {
    let processed = text;
    const annotations: string[] = [];

    // 标注关键段落位置
    const sections = this.locateKeySections(text);
    for (const [name, info] of Object.entries(sections)) {
      const marker = '\n<!-- SECTION:' + name + ' -->';
      processed = processed.substring(0, info.start) + marker + processed.substring(info.start);
      annotations.push(name + ': 位置' + info.start + '-' + info.end);
    }

    // 提取元数据
    const metadata = {
      totalLength: text.length,
      sectionCount: (text.match(/^##/gm) || []).length,
      hasTables: /\|.*\|/.test(text),
      hasLists: /^\s*[-*+]\s/m.test(text),
      annotations,
      features: this.detectContractTypeFeatures(text),
    };

    this.logger.log('[Preprocessing] Added ' + annotations.length + ' section markers, metadata:', metadata);

    return { processed, metadata };
  }

  /**
   * 后处理提取的值
   */
  private postProcessValue(value: string, field: string): string | null {
    if (!value) return null;

    let cleaned = value.trim();

    // 移除多余空格和换行
    cleaned = cleaned.replace(/\s+/g, ' ');

    // 金额格式化：移除逗号、货币符号
    if (['totalAmount', 'amount', 'subtotal'].includes(field)) {
      cleaned = cleaned.replace(/[¥$,\s]/g, '');
      // 处理"万元"、"元"等单位
      if (cleaned.includes('万')) {
        const num = parseFloat(cleaned.replace(/[^0-9.]/g, ''));
        cleaned = (num * 10000).toString();
      } else {
        cleaned = cleaned.replace(/[^0-9.]/g, '');
      }
    }

    // 百分比格式化
    if (field === 'taxRate') {
      cleaned = cleaned.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (num > 1) {
        cleaned = (num / 100).toString(); // "6" → "0.06"
      }
    }

    // 日期格式化
    if (['signDate', 'startDate', 'endDate'].includes(field)) {
      cleaned = cleaned
        .replace(/年/g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '');
      // 确保 YYYY-MM-DD 格式
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(cleaned)) {
        const parts = cleaned.split('-');
        cleaned = parts[0] + '-' + parts[1].padStart(2, '0') + '-' + parts[2].padStart(2, '0');
      }
    }

    return cleaned || null;
  }

  /**
   * 计算置信度（基于规则优先级）
   */
  private calculateConfidence(priority: number): number {
    // 优先级1 → 0.9, 优先级2 → 0.8, 优先级3 → 0.7, 优先级4 → 0.6
    return Math.max(0.5, 0.95 - (priority - 1) * 0.1);
  }

  /**
   * 提取上下文
   */
  private extractContext(text: string, index: number, length: number): string {
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + length);
    let context = text.substring(start, end).replace(/\n/g, ' ');
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    return context;
  }

  /**
   * 为特定主题构建增强 prompt
   */
  buildTopicEnhancedPrompt(topic: ExtractTopic, text: string): string {
    const topicFields = this.getFieldsForTopic(topic);
    const rulesEnhancement = this.enhancePromptWithRules(text, topicFields);
    const sections = this.locateKeySections(text);

    let enhancement = '\n## 文档结构分析\n';

    // 添加相关章节位置
    for (const [sectionName, keywords] of Object.entries(SECTION_KEYWORDS)) {
      if (this.isSectionRelevantToTopic(sectionName, topic)) {
        const section = sections[sectionName];
        if (section) {
          enhancement += '- ' + sectionName + ': ' + section.preview + '\n';
        }
      }
    }

    enhancement += rulesEnhancement;

    return enhancement;
  }

  /**
   * 获取主题对应的目标字段
   */
  private getFieldsForTopic(topic: ExtractTopic): string[] {
    const topicFieldMap: Record<string, string[]> = {
      [ExtractTopic.BASIC_INFO]: ['contractNo', 'contractName', 'firstPartyName', 'secondPartyName'],
      [ExtractTopic.FINANCIAL]: ['totalAmount', 'currency', 'taxRate', 'paymentMethod', 'paymentTerms'],
      [ExtractTopic.TIME_INFO]: ['signDate', 'startDate', 'endDate', 'duration'],
      [ExtractTopic.MILESTONES]: ['hasMilestones'], // 检测是否有里程碑
      [ExtractTopic.RATE_ITEMS]: ['hasRateItems'], // 检测是否有费率
      [ExtractTopic.LINE_ITEMS]: ['hasLineItems'], // 检测是否有产品清单
      [ExtractTopic.RISK_CLAUSES]: [],
      [ExtractTopic.DELIVERABLES]: [],
    };

    return topicFieldMap[topic] || [];
  }

  /**
   * 判断章节是否与主题相关
   */
  private isSectionRelevantToTopic(section: string, topic: ExtractTopic): boolean {
    const relevance: Record<string, ExtractTopic[]> = {
      header: [ExtractTopic.BASIC_INFO],
      parties: [ExtractTopic.BASIC_INFO],
      financial: [ExtractTopic.FINANCIAL, ExtractTopic.MILESTONES],
      schedule: [ExtractTopic.TIME_INFO],
      milestones: [ExtractTopic.MILESTONES],
      rate: [ExtractTopic.RATE_ITEMS],
      deliverables: [ExtractTopic.DELIVERABLES],
      risk: [ExtractTopic.RISK_CLAUSES],
    };

    const relevantTopics = relevance[section] || [];
    return relevantTopics.includes(topic);
  }
}
