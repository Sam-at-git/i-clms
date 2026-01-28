import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'openai';
import { LlmConfigService } from './config/llm-config.service';
import { ExtractTopic, ExtractTopicNames } from './topics/topics.const';

/**
 * 验证问题
 */
interface ValidationError {
  field: string;
  issue: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

/**
 * 验证结果
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  score: number; // 0-100
}

/**
 * 重试配置
 */
interface RetryConfig {
  maxRetries: number;
  retryOnError: boolean;
  retryOnWarning: boolean;
}

/**
 * Few-Shot 示例数据
 * 包含正面示例和负面示例（常见错误）
 */
const FEW_SHOT_EXAMPLES: Partial<Record<ExtractTopic, string>> = {
  BASIC_INFO: `
【示例1 - 正确】
输入："合同编号：HT-2024-001，甲方向乙方支付...甲方：北京XX科技有限公司（地址：北京市朝阳区XX路XX号）..."
输出：
{
  "contractNo": "HT-2024-001",
  "customerName": "北京XX科技有限公司"
}

【示例2 - 正确】
输入："编号：PROJ-2024-056，甲方：上海YY股份有限公司，联系人：张三"
输出：
{
  "contractNo": "PROJ-2024-056",
  "customerName": "上海YY股份有限公司"
}

【示例3 - 正确】
输入："CONTRACT NO: SIG-2024-Q1，乙方：我司（深圳智能技术有限公司）"
输出：
{
  "contractNo": "SIG-2024-Q1",
  "ourEntity": "深圳智能技术有限公司"
}

【示例4 - 正确】
输入："技术服务协议，发包方：杭州XX集团"
输出：
{
  "contractName": "技术服务协议",
  "customerName": "杭州XX集团",
  "contractType": "STAFF_AUGMENTATION"
}

【示例5 - 错误示范❌ 常见错误：公司名混入地址】
输入："甲方：北京XX科技有限公司（地址：北京市朝阳区XX路XX号）"
❌ 错误输出：{"customerName": "北京XX科技有限公司（地址：北京市朝阳区XX路XX号）"}
✅ 正确输出：{"customerName": "北京XX科技有限公司"}

【示例6 - 错误示范❌ 常见错误：公司名混入联系人】
输入："甲方：上海YY股份有限公司，联系人：张三，电话：13800138000"
❌ 错误输出：{"customerName": "上海YY股份有限公司，联系人：张三"}
✅ 正确输出：{"customerName": "上海YY股份有限公司"}

【示例7 - 错误示范❌ 常见错误：混入标签文字】
输入："合同编号：HT-2024-001"
❌ 错误输出：{"contractNo": "合同编号：HT-2024-001"}
✅ 正确输出：{"contractNo": "HT-2024-001"}

【示例8 - 错误示范❌ 常见错误：甲乙方混淆】
输入："甲方：北京XX科技有限公司（客户），乙方：深圳YY技术有限公司（供应商）"
❌ 错误输出：{"customerName": "深圳YY技术有限公司", "ourEntity": "北京XX科技有限公司"}
✅ 正确输出：{"customerName": "北京XX科技有限公司", "ourEntity": "深圳YY技术有限公司"}
⚠️ 重要提示：customerName = 甲方 = 客户，ourEntity = 乙方 = 供应商

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,

  FINANCIAL: `
【示例1 - 正确】
输入："合同总价：人民币壹佰贰拾叁万元整（¥1,230,000.00），含6%增值税"
输出：
{
  "amountWithTax": "1230000",
  "currency": "CNY",
  "taxRate": "0.06"
}

【示例2 - 正确】
输入："服务费用总额为50万元（不含税），税率13%"
输出：
{
  "amountWithoutTax": "500000",
  "taxRate": "0.13"
}

【示例3 - 正确】
输入："合同金额：$100,000 USD，含税"
输出：
{
  "amountWithTax": "100000",
  "currency": "USD"
}

【示例4 - 正确】
输入："总价：伍拾万元整，免税"
输出：
{
  "amountWithTax": "500000",
  "taxRate": "0"
}

【示例5 - 错误示范❌ 常见错误：金额包含货币符号】
输入："合同总价：¥1,230,000元"
❌ 错误输出：{"amountWithTax": "¥1,230,000"}
✅ 正确输出：{"amountWithTax": "1230000"}

【示例6 - 错误示范❌ 常见错误：税率格式错误】
输入："税率6%"
❌ 错误输出：{"taxRate": "6"} 或 {"taxRate": "6%"}
✅ 正确输出：{"taxRate": "0.06"}

【示例7 - 错误示范❌ 常见错误：万元未转换】
输入："服务费50万元"
❌ 错误输出：{"amountWithTax": "50"}
✅ 正确输出：{"amountWithTax": "500000"}

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,

  MILESTONES: `
【示例1 - 正确】
输入："（1）第一期：合同生效后7日内支付30%即¥150,000元；（2）第二期：需求确认后支付30%..."
输出：
{
  "milestones": [
    {"sequence": 1, "name": "合同生效后", "amount": "150000", "paymentPercentage": "30"},
    {"sequence": 2, "name": "需求确认后", "amount": "150000", "paymentPercentage": "30"}
  ]
}

【示例2 - 正确】
输入："分三期支付：签约时付20%，系统上线验收后付50%，正常运行3个月后付30%"
输出：
{
  "milestones": [
    {"sequence": 1, "name": "签约时", "paymentPercentage": "20"},
    {"sequence": 2, "name": "系统上线验收后", "paymentPercentage": "50"},
    {"sequence": 3, "name": "正常运行3个月后", "paymentPercentage": "30"}
  ]
}

【示例3 - 正确】
输入："节点1：需求确认，支付20%；节点2：系统上线，支付50%；节点3：终验，支付30%"
输出：
{
  "milestones": [
    {"sequence": 1, "name": "需求确认", "paymentPercentage": "20"},
    {"sequence": 2, "name": "系统上线", "paymentPercentage": "50"},
    {"sequence": 3, "name": "终验", "paymentPercentage": "30"}
  ]
}

【示例4 - 正确】
输入："首付30%，进度款50%，尾款20%"
输出：
{
  "milestones": [
    {"sequence": 1, "name": "首付", "paymentPercentage": "30"},
    {"sequence": 2, "name": "进度款", "paymentPercentage": "50"},
    {"sequence": 3, "name": "尾款", "paymentPercentage": "20"}
  ]
}

【示例5 - 错误示范❌ 常见错误：name包含时间限制】
输入："第一期：合同生效后2个工作日内..."
❌ 错误输出：{"name": "合同生效后2个工作日内"}
✅ 正确输出：{"name": "合同生效后"}

【示例6 - 错误示范❌ 常见错误：百分比包含%符号】
输入："支付30%"
❌ 错误输出：{"paymentPercentage": "30%"}
✅ 正确输出：{"paymentPercentage": "30"}

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,

  RATE_ITEMS: `
【示例1 - 正确】
输入："高级工程师800元/小时，项目经理45000元/人月"
输出：
{
  "rateItems": [
    {"role": "高级工程师", "rateType": "HOURLY", "rate": "800"},
    {"role": "项目经理", "rateType": "MONTHLY", "rate": "45000"}
  ]
}

【示例2 - 正确】
输入："人员配置及单价：Java开发（高级）：600元/时；测试工程师（中级）：400元/时"
输出：
{
  "rateItems": [
    {"role": "Java开发（高级）", "rateType": "HOURLY", "rate": "600"},
    {"role": "测试工程师（中级）", "rateType": "HOURLY", "rate": "400"}
  ]
}

【示例3 - 正确】
输入："商务分析师：1200元/天，架构师：30000元/月"
输出：
{
  "rateItems": [
    {"role": "商务分析师", "rateType": "DAILY", "rate": "1200"},
    {"role": "架构师", "rateType": "MONTHLY", "rate": "30000"}
  ]
}

【示例4 - 正确】
输入："初级开发：500元/时，高级开发：800元/时，技术专家：1200元/时"
输出：
{
  "rateItems": [
    {"role": "初级开发", "rateType": "HOURLY", "rate": "500"},
    {"role": "高级开发", "rateType": "HOURLY", "rate": "800"},
    {"role": "技术专家", "rateType": "HOURLY", "rate": "1200"}
  ]
}

【示例5 - 错误示范❌ 常见错误：rateType枚举值错误】
输入："高级工程师800元/小时"
❌ 错误输出：{"rateType": "hour"} 或 {"rateType": "HOUR"}
✅ 正确输出：{"rateType": "HOURLY"}

【示例6 - 错误示范❌ 常见错误：rate包含单位】
输入："高级工程师800元/小时"
❌ 错误输出：{"rate": "800元/小时"}
✅ 正确输出：{"rate": "800"}

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,

  LINE_ITEMS: `
【示例1 - 正确】
输入："管理软件V1.0，100用户，500元/用户"
输出：
{
  "lineItems": [
    {"productName": "管理软件V1.0", "quantity": 100, "unit": "用户", "unitPriceWithTax": "500"}
  ]
}

【示例2 - 正确】
输入："产品名称：服务器（型号Dell R740），数量：2台，单价：35000元"
输出：
{
  "lineItems": [
    {"productName": "服务器（型号Dell R740）", "quantity": 2, "unit": "台", "unitPriceWithTax": "35000"}
  ]
}

【示例3 - 正确】
输入："1. 办公软件授权，100套，每套500元；2. 技术服务，1项，50000元"
输出：
{
  "lineItems": [
    {"productName": "办公软件授权", "quantity": 100, "unit": "套", "unitPriceWithTax": "500"},
    {"productName": "技术服务", "quantity": 1, "unit": "项", "unitPriceWithTax": "50000"}
  ]
}

【示例4 - 正确】
输入："交换机设备，10台，单价8000元/台"
输出：
{
  "lineItems": [
    {"productName": "交换机设备", "quantity": 10, "unit": "台", "unitPriceWithTax": "8000"}
  ]
}

【示例5 - 错误示范❌ 常见错误：quantity包含单位】
输入："100用户"
❌ 错误输出：{"quantity": "100用户"}
✅ 正确输出：{"quantity": 100}

【示例6 - 错误示范❌ 常见错误：unitPrice包含货币符号】
输入："500元/用户"
❌ 错误输出：{"unitPriceWithTax": "500元"}
✅ 正确输出：{"unitPriceWithTax": "500"}

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,

  TIME_INFO: `
【示例1 - 正确】
输入："签订日期：2024年03月15日，自2024年4月1日起至2025年3月31日止"
输出：
{
  "signDate": "2024-03-15",
  "startDate": "2024-04-01",
  "endDate": "2025-03-31",
  "duration": "1年"
}

【示例2 - 正确】
输入："合同期限3年，自2024.1.1生效"
输出：
{
  "startDate": "2024-01-01",
  "duration": "3年"
}

【示例3 - 正确】
输入："本合同自签署之日起生效，有效期为两年"
输出：
{
  "duration": "两年"
}

【示例4 - 正确】
输入："2024年6月1日签署，合同期自2024-07-01至2026-06-30"
输出：
{
  "signDate": "2024-06-01",
  "startDate": "2024-07-01",
  "endDate": "2026-06-30",
  "duration": "2年"
}

【示例5 - 错误示范❌ 常见错误：日期格式未转换】
输入："2024年3月15日"
❌ 错误输出：{"signDate": "2024年3月15日"}
✅ 正确输出：{"signDate": "2024-03-15"}

【示例6 - 错误示范❌ 常见错误：月份日期未补0】
输入："2024-3-5"
❌ 错误输出：{"signDate": "2024-3-5"}
✅ 正确输出：{"signDate": "2024-03-05"}

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,

  DELIVERABLES: `
【示例1 - 正确】
输入："交付物包括：1.需求规格说明书 2.系统设计文档 3.源代码 4.用户手册"
输出：
{
  "deliverables": "需求规格说明书, 系统设计文档, 源代码, 用户手册"
}

【示例2 - 正确】
输入："乙方应完成系统开发、测试、部署和培训工作"
输出：
{
  "deliverables": "系统开发, 测试, 部署, 培训"
}

【示例3 - 正确】
输入："工作范围：为客户提供ERP系统定制开发，包括需求分析、系统设计、功能开发、数据迁移"
输出：
{
  "sowSummary": "为客户提供ERP系统定制开发，包括需求分析、系统设计、功能开发、数据迁移"
}

【示例4 - 正确】
输入："交付清单：软件安装包、技术文档、源代码光盘、培训教材"
输出：
{
  "deliverables": "软件安装包, 技术文档, 源代码光盘, 培训教材"
}

【示例5 - 错误示范❌ 常见错误：deliverables返回数组】
输入："交付物：需求文档、设计文档、源代码"
❌ 错误输出：{"deliverables": ["需求文档", "设计文档", "源代码"]}
✅ 正确输出：{"deliverables": "需求文档, 设计文档, 源代码"}

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,

  RISK_CLAUSES: `
【示例1 - 正确】
输入："违约责任：任何一方违反本合同约定，应向守约方支付合同总额5%的违约金"
输出：
{
  "penaltyClauses": "任何一方违反本合同约定，应向守约方支付合同总额5%的违约金"
}

【示例2 - 正确】
输入："保密条款：双方应对在合作过程中获悉的对方商业秘密承担保密义务"
输出：
{
  "riskClauses": ["双方应对在合作过程中获悉的对方商业秘密承担保密义务"]
}

【示例3 - 正确】
输入："合同终止：任一方可提前30日书面通知对方终止本合同"
输出：
{
  "terminationClauses": "任一方可提前30日书面通知对方终止本合同"
}

【示例4 - 正确】
输入："知识产权：本合同开发产生的所有知识产权归甲方所有"
输出：
{
  "riskClauses": ["本合同开发产生的所有知识产权归甲方所有"]
}

【示例5 - 正确】
输入："不可抗力：因不可抗力导致合同无法履行的，双方不承担违约责任"
输出：
{
  "riskClauses": ["因不可抗力导致合同无法履行的，双方不承担违约责任"]
}

⚠️ 以上仅为格式示例，你必须从用户上传的文档中提取真实数据，绝对不要使用示例中的值！
`,
};

/**
 * 结果验证与重试服务
 *
 * 验证 LLM 提取结果的合理性，失败时自动重试
 */
@Injectable()
export class ResultValidatorService {
  private readonly logger = new Logger(ResultValidatorService.name);
  private openai: OpenAI | null = null;

  private readonly retryConfig: RetryConfig = {
    maxRetries: 2,
    retryOnError: true,
    retryOnWarning: false,
  };

  constructor(private readonly llmConfigService: LlmConfigService) {
    // 延迟初始化 OpenAI 客户端
    setTimeout(() => this.initClient(), 0);
  }

  private initClient() {
    const config = this.llmConfigService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
    });
  }

  /**
   * 验证结果并在必要时重试
   */
  async validateWithRetry<T>(
    result: T,
    contractText: string,
    topic: ExtractTopic,
    originalPrompt?: string
  ): Promise<{ result: T; retryCount: number; validation: ValidationResult }> {
    let retryCount = 0;
    let currentResult = result;
    let validation = this.validate(currentResult, topic, contractText);

    this.logger.log(`[Validation] Initial validation: score=${validation.score}, errors=${validation.errors.length}, warnings=${validation.warnings.length}`);

    // 决定是否需要重试
    const shouldRetry = this.shouldRetry(validation);

    if (!shouldRetry) {
      return { result: currentResult, retryCount, validation };
    }

    // 执行重试
    while (retryCount < this.retryConfig.maxRetries && this.shouldRetry(validation)) {
      retryCount++;
      this.logger.log(`[Validation] Retry attempt ${retryCount}/${this.retryConfig.maxRetries}`);

      const retryPrompt = this.buildRetryPrompt(currentResult, validation, contractText, topic);
      currentResult = await this.retryWithPrompt<T>(retryPrompt);
      validation = this.validate(currentResult, topic, contractText);

      this.logger.log(`[Validation] Retry ${retryCount} result: score=${validation.score}`);

      // 如果分数提高了，继续尝试
      if (validation.score >= 85) {
        break;
      }
    }

    return { result: currentResult, retryCount, validation };
  }

  /**
   * 验证提取结果的合理性
   */
  validate(result: any, topic: ExtractTopic, contractText?: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    switch (topic) {
      case ExtractTopic.BASIC_INFO:
        this.validateBasicInfo(result, errors, warnings);
        break;
      case ExtractTopic.FINANCIAL:
        this.validateFinancial(result, errors, warnings);
        break;
      case ExtractTopic.MILESTONES:
        this.validateMilestones(result, errors, warnings, contractText);
        break;
      case ExtractTopic.RATE_ITEMS:
        this.validateRateItems(result, errors, warnings);
        break;
      case ExtractTopic.TIME_INFO:
        this.validateTimeInfo(result, errors, warnings);
        break;
      case ExtractTopic.LINE_ITEMS:
        this.validateLineItems(result, errors, warnings);
        break;
      default:
        break;
    }

    // 通用验证
    this.validateGeneric(result, errors, warnings);

    // 计算得分
    const score = this.calculateScore(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  }

  /**
   * 验证基本信息
   */
  private validateBasicInfo(result: any, errors: ValidationError[], warnings: ValidationError[]): void {
    // 合同编号验证
    if (result.contractNumber) {
      if (result.contractNumber.length > 50) {
        errors.push({
          field: 'contractNumber',
          issue: '合同编号过长',
          severity: 'error',
          suggestion: '可能包含额外内容',
        });
      }
      if (result.contractNumber.length < 3) {
        warnings.push({
          field: 'contractNumber',
          issue: '合同编号过短',
          severity: 'warning',
        });
      }
    }

    // 甲方名称验证
    if (result.firstPartyName) {
      if (result.firstPartyName.length > 100) {
        errors.push({
          field: 'firstPartyName',
          issue: `甲方名称过长(${result.firstPartyName.length}字符)`,
          severity: 'error',
          suggestion: '可能包含地址、联系人等额外信息',
        });
      }
      if (result.firstPartyName.includes('地址') || result.firstPartyName.includes('联系') ||
          result.firstPartyName.includes('电话') || result.firstPartyName.includes('身份证')) {
        errors.push({
          field: 'firstPartyName',
          issue: '甲方名称包含非公司信息',
          severity: 'error',
          suggestion: '只应包含公司名称，去掉地址、联系人等',
        });
      }
    }

    // 乙方名称验证（同上）
    if (result.secondPartyName) {
      if (result.secondPartyName.length > 100) {
        errors.push({
          field: 'secondPartyName',
          issue: `乙方名称过长(${result.secondPartyName.length}字符)`,
          severity: 'error',
          suggestion: '可能包含地址、联系人等额外信息',
        });
      }
    }
  }

  /**
   * 验证财务信息
   */
  private validateFinancial(result: any, errors: ValidationError[], warnings: ValidationError[]): void {
    // 金额验证
    if (result.totalAmount) {
      const amount = parseFloat(String(result.totalAmount).replace(/[^0-9.-]/g, ''));
      if (isNaN(amount)) {
        errors.push({
          field: 'totalAmount',
          issue: `无法解析的金额: ${result.totalAmount}`,
          severity: 'error',
          suggestion: '应只包含数字',
        });
      } else if (amount < 100) {
        warnings.push({
          field: 'totalAmount',
          issue: `金额偏小: ${amount}，可能单位错误`,
          severity: 'warning',
        });
      } else if (amount > 1e10) {
        warnings.push({
          field: 'totalAmount',
          issue: `金额过大: ${amount}，可能单位错误`,
          severity: 'warning',
        });
      }
    }

    // 税率验证（常见值）
    if (result.taxRate !== null && result.taxRate !== undefined) {
      const taxRate = parseFloat(String(result.taxRate));
      const validTaxRates = [0, 0.01, 0.03, 0.04, 0.05, 0.06, 0.09, 0.11, 0.13, 0.16, 0.17];
      if (!isNaN(taxRate) && !validTaxRates.includes(taxRate) && taxRate < 1) {
        warnings.push({
          field: 'taxRate',
          issue: `税率 ${taxRate} 不在常见范围内`,
          severity: 'warning',
          suggestion: '常见税率: 0%, 1%, 3%, 4%, 5%, 6%, 9%, 11%, 13%, 16%, 17%',
        });
      }
      if (taxRate > 1) {
        errors.push({
          field: 'taxRate',
          issue: `税率格式错误: ${taxRate}`,
          severity: 'error',
          suggestion: '应使用小数格式，如 0.06 表示6%',
        });
      }
    }

    // 币种验证
    if (result.currency && !['CNY', 'USD', 'EUR', 'JPY', 'HKD'].includes(result.currency)) {
      warnings.push({
        field: 'currency',
        issue: `非常见币种: ${result.currency}`,
        severity: 'warning',
      });
    }
  }

  /**
   * 验证里程碑信息
   */
  private validateMilestones(result: any, errors: ValidationError[], warnings: ValidationError[], contractText?: string): void {
    if (!result.milestones || result.milestones.length === 0) {
      return;
    }

    // 验证数组结构
    if (!Array.isArray(result.milestones)) {
      errors.push({
        field: 'milestones',
        issue: 'milestones 应该是数组',
        severity: 'error',
      });
      return;
    }

    // 金额和比例验证
    let totalAmount = 0;
    let totalPercent = 0;

    for (let i = 0; i < result.milestones.length; i++) {
      const m = result.milestones[i];

      // sequence 验证
      if (m.sequence !== undefined && m.sequence !== i + 1) {
        warnings.push({
          field: `milestones[${i}].sequence`,
          issue: `顺序号应为 ${i + 1}，当前为 ${m.sequence}`,
          severity: 'warning',
        });
      }

      // 金额验证
      if (m.amount) {
        const amount = parseFloat(String(m.amount).replace(/[^0-9.-]/g, ''));
        if (!isNaN(amount)) {
          totalAmount += amount;
        }
      }

      // 百分比验证
      if (m.paymentPercentage) {
        const percent = parseFloat(String(m.paymentPercentage).replace(/[^0-9.-]/g, ''));
        if (!isNaN(percent)) {
          totalPercent += percent;
        }
      }

      // 名称不应为空
      if (!m.name || m.name.trim() === '') {
        errors.push({
          field: `milestones[${i}].name`,
          issue: '里程碑名称不能为空',
          severity: 'error',
        });
      }

      // 名称长度检查
      if (m.name && m.name.length > 100) {
        warnings.push({
          field: `milestones[${i}].name`,
          issue: '里程碑名称过长，可能包含过多内容',
          severity: 'warning',
        });
      }
    }

    // 总比例验证
    if (totalPercent > 0) {
      if (Math.abs(totalPercent - 100) > 5) {
        errors.push({
          field: 'milestones',
          issue: `付款比例总和=${totalPercent.toFixed(0)}%，应接近100%`,
          severity: 'error',
          suggestion: '请检查每个里程碑的 paymentPercentage 字段',
        });
      } else if (Math.abs(totalPercent - 100) > 1) {
        warnings.push({
          field: 'milestones',
          issue: `付款比例总和=${totalPercent.toFixed(1)}%，接近但不是100%`,
          severity: 'warning',
        });
      }
    }
  }

  /**
   * 验证费率信息
   */
  private validateRateItems(result: any, errors: ValidationError[], warnings: ValidationError[]): void {
    if (!result.rateItems || result.rateItems.length === 0) {
      return;
    }

    if (!Array.isArray(result.rateItems)) {
      errors.push({
        field: 'rateItems',
        issue: 'rateItems 应该是数组',
        severity: 'error',
      });
      return;
    }

    for (let i = 0; i < result.rateItems.length; i++) {
      const item = result.rateItems[i];

      // rateType 验证
      if (item.rateType && !['HOURLY', 'DAILY', 'MONTHLY'].includes(item.rateType)) {
        errors.push({
          field: `rateItems[${i}].rateType`,
          issue: `无效的费率类型: ${item.rateType}`,
          severity: 'error',
          suggestion: '应为 HOURLY(按时)、DAILY(按天) 或 MONTHLY(按月)',
        });
      }

      // rate 验证
      if (item.rate) {
        const rate = parseFloat(String(item.rate).replace(/[^0-9.]/g, ''));
        if (isNaN(rate)) {
          errors.push({
            field: `rateItems[${i}].rate`,
            issue: `无法解析的费率: ${item.rate}`,
            severity: 'error',
          });
        } else if (rate < 10) {
          warnings.push({
            field: `rateItems[${i}].rate`,
            issue: `费率偏低: ${rate}，请确认单位`,
            severity: 'warning',
          });
        } else if (rate > 100000) {
          warnings.push({
            field: `rateItems[${i}].rate`,
            issue: `费率偏高: ${rate}，请确认单位`,
            severity: 'warning',
          });
        }
      }

      // role 验证
      if (!item.role || item.role.trim() === '') {
        errors.push({
          field: `rateItems[${i}].role`,
          issue: '角色/职位不能为空',
          severity: 'error',
        });
      }
    }
  }

  /**
   * 验证时间信息
   */
  private validateTimeInfo(result: any, errors: ValidationError[], warnings: ValidationError[]): void {
    // 日期格式验证
    const dateFields = ['signDate', 'startDate', 'endDate'];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (const field of dateFields) {
      if (result[field] && result[field] !== null) {
        if (!dateRegex.test(result[field])) {
          errors.push({
            field,
            issue: `日期格式错误: ${result[field]}`,
            severity: 'error',
            suggestion: '应为 YYYY-MM-DD 格式，如 2024-03-15',
          });
        } else {
          // 日期合理性验证
          const date = new Date(result[field]);
          const year = date.getFullYear();
          if (year < 2000 || year > 2100) {
            warnings.push({
              field,
              issue: `日期年份异常: ${year}`,
              severity: 'warning',
            });
          }
        }
      }
    }

    // 日期逻辑验证
    if (result.startDate && result.endDate) {
      const start = new Date(result.startDate).getTime();
      const end = new Date(result.endDate).getTime();
      if (start > end) {
        errors.push({
          field: 'endDate',
          issue: '终止日期早于开始日期',
          severity: 'error',
        });
      }
    }

    // 签订日期应在开始日期之前或当天
    if (result.signDate && result.startDate) {
      const sign = new Date(result.signDate).getTime();
      const start = new Date(result.startDate).getTime();
      if (sign > start) {
        warnings.push({
          field: 'signDate',
          issue: '签订日期晚于开始日期',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * 验证产品清单
   */
  private validateLineItems(result: any, errors: ValidationError[], warnings: ValidationError[]): void {
    if (!result.lineItems || result.lineItems.length === 0) {
      return;
    }

    if (!Array.isArray(result.lineItems)) {
      errors.push({
        field: 'lineItems',
        issue: 'lineItems 应该是数组',
        severity: 'error',
      });
      return;
    }

    for (let i = 0; i < result.lineItems.length; i++) {
      const item = result.lineItems[i];

      // 必需字段验证
      if (!item.productName || item.productName.trim() === '') {
        errors.push({
          field: `lineItems[${i}].productName`,
          issue: '产品名称不能为空',
          severity: 'error',
        });
      }

      // 数量验证
      if (item.quantity !== undefined) {
        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          errors.push({
            field: `lineItems[${i}].quantity`,
            issue: `无效的数量: ${item.quantity}`,
            severity: 'error',
          });
        }
      }

      // 单价验证
      if (item.unitPriceWithTax) {
        const price = parseFloat(String(item.unitPriceWithTax).replace(/[^0-9.]/g, ''));
        if (isNaN(price) || price <= 0) {
          warnings.push({
            field: `lineItems[${i}].unitPriceWithTax`,
            issue: `单价解析失败: ${item.unitPriceWithTax}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  /**
   * 通用验证
   */
  private validateGeneric(result: any, errors: ValidationError[], warnings: ValidationError[]): void {
    // 检查是否包含 Markdown 残留符号
    const jsonStr = JSON.stringify(result);
    if (/\*\*|__|##|# |```/.test(jsonStr)) {
      warnings.push({
        field: 'format',
        issue: '结果可能包含 Markdown 格式符号',
        severity: 'warning',
      });
    }
  }

  /**
   * 计算验证得分 (0-100)
   */
  private calculateScore(errors: ValidationError[], warnings: ValidationError[]): number {
    let score = 100;

    // 每个错误扣 20 分
    score -= errors.length * 20;

    // 每个警告扣 5 分
    score -= warnings.length * 5;

    return Math.max(0, score);
  }

  /**
   * 判断是否需要重试
   */
  private shouldRetry(validation: ValidationResult): boolean {
    if (!validation.isValid && this.retryConfig.retryOnError) {
      return true;
    }

    if (validation.warnings.length > 2 && this.retryConfig.retryOnWarning) {
      return true;
    }

    if (validation.score < 70) {
      return true;
    }

    return false;
  }

  /**
   * 构建重试 prompt
   */
  private buildRetryPrompt<T>(
    originalResult: T,
    validation: ValidationResult,
    contractText: string,
    topic: ExtractTopic
  ): string {
    const topicName = ExtractTopicNames[topic];

    let prompt = `# ${topicName} - 提取结果修正

你之前的提取结果存在以下问题：

`;

    // 添加错误
    if (validation.errors.length > 0) {
      prompt += `\n## 错误（必须修正）\n`;
      for (const error of validation.errors) {
        prompt += `- **${error.field}**: ${error.issue}`;
        if (error.suggestion) {
          prompt += ` 建议：${error.suggestion}`;
        }
        prompt += '\n';
      }
    }

    // 添加警告
    if (validation.warnings.length > 0) {
      prompt += `\n## 警告（建议检查）\n`;
      for (const warning of validation.warnings.slice(0, 3)) { // 只显示前3个
        prompt += `- **${warning.field}**: ${warning.issue}`;
        if (warning.suggestion) {
          prompt += ` 建议：${warning.suggestion}`;
        }
        prompt += '\n';
      }
    }

    prompt += `\n## 你的第一次提取结果\n\`\`\`json\n${JSON.stringify(originalResult, null, 2)}\n\`\`\``;

    // Few-Shot 示例已禁用，防止LLM复制示例值
    // if (FEW_SHOT_EXAMPLES[topic]) {
    //   prompt += `\n## 参考示例\n${FEW_SHOT_EXAMPLES[topic]}`;
    // }

    // 添加合同文本（截取前 3000 字符）
    const textSnippet = contractText.substring(0, 3000);
    prompt += `\n## 合同文本（前3000字符）\n${textSnippet}\n`;

    prompt += `
## 要求
1. 仔细检查上述问题并修正
2. 只输出修正后的 JSON
3. 不要输出任何解释文字
4. 确保所有格式符合要求
`;

    return prompt;
  }

  /**
   * 使用重试 prompt 调用 LLM
   */
  private async retryWithPrompt<T>(prompt: string): Promise<T> {
    if (!this.openai) {
      this.initClient();
    }

    if (!this.openai) {
      throw new Error('OpenAI client initialization failed');
    }

    const config = this.llmConfigService.getActiveConfig();

    try {
      const response = await this.openai.chat.completions.create(
        {
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1, // 低温度提高一致性
          max_tokens: config.maxTokens || 4000,
        },
        { timeout: config.timeout || 60000 }
      );

      const content = response.choices[0]?.message?.content || '';
      return this.extractJson<T>(content);
    } catch (error) {
      this.logger.error(`[Retry] LLM call failed:`, error);
      throw error;
    }
  }

  /**
   * 从响应中提取 JSON
   */
  private extractJson<T>(content: string): T {
    // 尝试直接解析
    try {
      return JSON.parse(content) as T;
    } catch {
      // 尝试提取代码块中的 JSON
      const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]) as T;
      }
      // 尝试提取 { ... }
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]) as T;
      }
      throw new Error('无法从响应中提取 JSON');
    }
  }

  /**
   * 获取 Few-Shot 示例
   */
  getFewShotExamples(topic: ExtractTopic): string {
    return FEW_SHOT_EXAMPLES[topic] || '';
  }

  /**
   * 为初始请求添加 Few-Shot 示例
   * 注意：由于当前LLM模型会直接复制示例值而非从文档提取，暂时禁用Few-Shot示例
   */
  enhancePromptWithFewShots(basePrompt: string, topic: ExtractTopic): string {
    // 暂时禁用Few-Shot示例，直接返回基础提示词
    // TODO: 考虑使用更强的LLM模型后重新启用
    return basePrompt;

    /* 原始代码（已禁用）
    const examples = this.getFewShotExamples(topic);
    if (!examples) {
      return basePrompt;
    }

    return `${basePrompt}

## ⚠️ 格式参考示例（仅展示输出结构）
以下示例仅用于展示JSON结构和字段格式，**绝对不要使用示例中的具体数据值**！
你必须从用户上传的文档中提取真实的合同数据，而不是复制示例中的占位符或示例值。
${examples}
`;
    */
  }
}
