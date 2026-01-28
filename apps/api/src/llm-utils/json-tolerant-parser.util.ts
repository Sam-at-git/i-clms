import { Injectable, Logger } from '@nestjs/common';

/**
 * 字段名变体映射表
 * 用于处理 LLM 返回的各种字段名变体
 */
const FIELD_VARIANTS: Record<string, string[]> = {
  customerName: ['customer_name', 'CustomerName', 'CUSTOMERNAME', 'partyA', 'party_a', '甲方', '委托方', '发包方', '买方'],
  ourEntity: ['our_entity', 'OurEntity', 'OURENTITY', 'partyB', 'party_b', '乙方', '受托方', '承包方', '卖方', '供应商'],
  contractNo: ['contract_no', 'contractNo', 'ContractNo', 'CONTRACTNO', 'contract_number', '合同编号', '编号', 'no', 'No'],
  contractName: ['contract_name', 'ContractName', 'CONTRACTNAME', '合同名称', '项目名称', 'title', 'Title'],
  contractType: ['contract_type', 'ContractType', 'CONTRACTTYPE', '合同类型', 'type', 'Type'],
  amountWithTax: ['amount_with_tax', 'AmountWithTax', 'AMOUNTWITHTAX', '含税金额', 'total_amount', '合同金额', '总价', 'price'],
  amountWithoutTax: ['amount_without_tax', 'AmountWithoutTax', 'AMOUNTWITHOUTTAX', '不含税金额', 'net_amount', '净价'],
  taxRate: ['tax_rate', 'TaxRate', 'TAXRATE', '税率', 'rate'],
  currency: ['Currency', 'CURRENCY', '币种', '货币', 'unit'],
  paymentMethod: ['payment_method', 'PaymentMethod', 'PAYMENTMETHOD', '付款方式', '支付方式'],
  paymentTerms: ['payment_terms', 'PaymentTerms', 'PAYMENTTERMS', '付款条件', '付款条款'],
  signedAt: ['signed_at', 'SignedAt', 'SIGNEDAT', '签订日期', '签署日期', 'sign_date', 'signDate'],
  effectiveAt: ['effective_at', 'EffectiveAt', 'EFFECTIVEAT', '生效日期', '开始日期', 'start_date', 'startDate'],
  expiresAt: ['expires_at', 'ExpiresAt', 'EXPIRESAT', '终止日期', '结束日期', 'end_date', 'endDate', 'expiry_date'],
  duration: ['Duration', 'DURATION', '合同期限', '有效期', 'period'],
  milestones: ['Milestones', 'MILESTONES', '里程碑', 'payment_milestones'],
  rateItems: ['rate_items', 'RateItems', 'RATEITEMS', '费率表', 'rates', 'Rates', '费率项'],
  lineItems: ['line_items', 'LineItems', 'LINEITEMS', '产品清单', 'items', 'Items', '产品项'],
  deliverables: ['Deliverables', 'DELIVERABLES', '交付物', 'deliverable_list'],
  sowSummary: ['sow_summary', 'SowSummary', 'SOWSUMMARY', '工作范围', 'scope', 'work_scope'],
  riskClauses: ['risk_clauses', 'RiskClauses', 'RISKCLAUSES', '风险条款'],
  penaltyClauses: ['penalty_clauses', 'PenaltyClauses', 'PENALTYCLAUSES', '违约条款', '违约责任'],
  terminationClauses: ['termination_clauses', 'TerminationClauses', 'TERMINATIONCLAUSES', '终止条款'],
};

/**
 * 验证Schema定义
 */
export interface ValidationSchema {
  required?: string[];      // 必填字段列表
  optional?: string[];      // 可选字段列表
  arrays?: string[];        // 数组字段列表
  objects?: string[];       // 对象字段列表
  enums?: Record<string, string[]>;  // 枚举字段及其允许值
}

/**
 * 验证结果
 */
export interface ValidationResult<T> {
  valid: boolean;
  result: T;
  errors: string[];
  warnings: string[];
}

/**
 * JSON容错解析器
 *
 * 功能：
 * 1. 处理Markdown代码块包裹（```json{}```）
 * 2. 处理字段名变体（customer_name → customerName）
 * 3. 处理中文引号（"value" → "value"）
 * 4. 处理缺失引号（{name: "x"} → {"name": "x"}）
 * 5. 处理括号不匹配、多余逗号
 * 6. 处理 NaN/Infinity
 * 7. 处理注释
 *
 * 用途：提高LLM返回JSON的解析成功率
 */
@Injectable()
export class JsonTolerantParser {
  private readonly logger = new Logger(JsonTolerantParser.name);

  /**
   * 容错解析JSON
   *
   * @param content 可能包含格式问题的JSON字符串
   * @param expectedFields 期望的字段名列表（用于字段名规范化）
   * @returns 解析后的对象
   */
  static parse<T = any>(content: string, expectedFields?: string[]): T {
    if (!content || typeof content !== 'string') {
      throw new Error('Content is empty or not a string');
    }

    let processedContent = content.trim();

    // 1. 提取Markdown代码块中的JSON
    processedContent = this.extractFromCodeBlock(processedContent);

    // 2. 处理中文引号
    processedContent = this.fixChineseQuotes(processedContent);

    // 3. 处理缺失引号（键名和简单字符串值）
    processedContent = this.fixMissingQuotes(processedContent);

    // 4. 移除多余逗号（对象和数组末尾的逗号）
    processedContent = this.removeTrailingCommas(processedContent);

    // 5. 处理NaN和Infinity
    processedContent = this.fixNaNInfinity(processedContent);

    // 6. 移除JavaScript注释
    processedContent = this.removeComments(processedContent);

    // 7. 处理特殊值（undefined, null等）
    processedContent = this.fixSpecialValues(processedContent);

    // 8. 尝试解析
    try {
      const result = JSON.parse(processedContent);

      // 9. 字段名规范化
      if (expectedFields && expectedFields.length > 0) {
        return this.normalizeFieldNames(result, expectedFields);
      }

      return result as T;
    } catch (error) {
      // 如果仍然解析失败，尝试更激进的修复
      return this.parseWithAggressiveFixes(processedContent, expectedFields) as T;
    }
  }

  /**
   * 验证并自动修正结果
   *
   * @param result 待验证的结果
   * @param schema 验证规则
   * @returns 验证结果
   */
  static validateAndFix<T extends Record<string, any>>(
    result: T,
    schema: ValidationSchema
  ): ValidationResult<T> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fixed = { ...result } as any;

    // 检查必填字段
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in result) || result[field as keyof T] === null || result[field as keyof T] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // 检查枚举值
    if (schema.enums) {
      for (const [field, allowedValues] of Object.entries(schema.enums)) {
        const value = (result as any)[field];
        if (value !== null && value !== undefined && !allowedValues.includes(value)) {
          warnings.push(`Field ${field} has invalid value: ${value}. Allowed: ${allowedValues.join(', ')}`);
          // 尝试修正：大小写不匹配
          const normalized = this.normalizeEnumValue(value, allowedValues);
          if (normalized) {
            fixed[field] = normalized;
            warnings.push(`Auto-corrected ${field}: ${value} → ${normalized}`);
          }
        }
      }
    }

    // 验证数组字段
    if (schema.arrays) {
      for (const field of schema.arrays) {
        const value = (result as any)[field];
        if (value !== null && value !== undefined && !Array.isArray(value)) {
          warnings.push(`Field ${field} should be an array, got ${typeof value}. Converting to array.`);
          fixed[field] = [value];
        }
      }
    }

    // 移除未定义的字段（如果schema很严格）
    const allDefinedFields = new Set([
      ...(schema.required || []),
      ...(schema.optional || []),
    ]);

    // 验证结果
    const valid = errors.length === 0;

    return {
      valid,
      result: valid ? fixed : result,
      errors,
      warnings,
    };
  }

  /**
   * 从Markdown代码块中提取JSON
   *
   * 处理以下格式：
   * ```json\n{...}\n```
   * ```\n{...}\n```
   * <json>{...}</json>
   */
  private static extractFromCodeBlock(content: string): string {
    let extracted = content;

    // 先移除 DeepSeek-R1 的思考标签
    // 格式1: <think>...</think> (英文标签)
    extracted = extracted.replace(/<think>\s*[\s\S]*?<\/think>/gi, '');
    // 格式2: <思考>...</思考> (中文标签)
    extracted = extracted.replace(/<思考>\s*[\s\S]*?<\/思考>/gi, '');

    // 提取 ```json ... ``` 代码块
    const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
    const match = extracted.match(codeBlockRegex);
    if (match && match[1]) {
      extracted = match[1].trim();
    }

    // 提取 <json>...</json> 标签
    const jsonTagRegex = /<json>([\s\S]*?)<\/json>/i;
    const tagMatch = extracted.match(jsonTagRegex);
    if (tagMatch && tagMatch[1]) {
      extracted = tagMatch[1].trim();
    }

    // 查找第一个 { 和最后一个 } 之间的内容（兜底方案）
    if (!match && !tagMatch) {
      const firstBrace = extracted.indexOf('{');
      const lastBrace = extracted.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        extracted = extracted.substring(firstBrace, lastBrace + 1);
      }
    }

    return extracted;
  }

  /**
   * 修复中文引号
   *
   * "value" → "value"
   * 'value' → "value"
   */
  private static fixChineseQuotes(content: string): string {
    let fixed = content;
    // 中文双引号 → 英文双引号
    fixed = fixed.replace(/"/g, '"');
    fixed = fixed.replace(/"/g, '"');
    // 中文单引号 → 英文单引号（然后统一转为双引号）
    fixed = fixed.replace(/'/g, "'");
    fixed = fixed.replace(/'/g, "'");
    // 单引号 → 双引号（JSON只支持双引号）
    fixed = fixed.replace(/'/g, '"');
    return fixed;
  }

  /**
   * 修复缺失引号
   *
   * {name: "value"} → {"name": "value"}
   * {name: value} → {"name": "value"} (简单字符串值)
   */
  private static fixMissingQuotes(content: string): string {
    let fixed = content;

    // 修复对象键名的引号：{key: "value"} → {"key": "value"}
    // 匹配：开头{或逗号，然后是标识符（字母/数字/下划线/中文），然后是冒号
    fixed = fixed.replace(/([{\s,])([a-zA-Z_$][a-zA-Z0-9_$\u4e00-\u9fa5]*)\s*:/g, '$1"$2":');

    // 修复简单的字符串值（无特殊字符，无空格）的引号
    // 只在值后面紧跟逗号或右括号时处理
    // 例如：{name: value} → {name: "value"}
    // 正则解释：冒号后面跟着非特殊字符的字符串，后面紧跟逗号或右括号
    fixed = fixed.replace(/:\s*([a-zA-Z0-9_$\u4e00-\u9fa5]+)([,\]\}])/g, ': "$1"$2');

    return fixed;
  }

  /**
   * 移除多余逗号
   *
   * {a: 1,} → {a: 1}
   * [1, 2,] → [1, 2]
   * {a: 1,, b: 2} → {a: 1, b: 2}
   */
  private static removeTrailingCommas(content: string): string {
    let fixed = content;

    // 移除对象/数组末尾的逗号
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    // 移除连续逗号
    fixed = fixed.replace(/,+/g, ',');

    return fixed;
  }

  /**
   * 修复NaN和Infinity
   *
   * NaN → null
   * Infinity → null
   * -Infinity → null
   */
  private static fixNaNInfinity(content: string): string {
    let fixed = content;

    // 匹配独立的 NaN/Infinity（不是字符串的一部分）
    fixed = fixed.replace(/\bNaN\b/g, 'null');
    fixed = fixed.replace(/(-)?\bInfinity\b/g, (_match, minus) => minus ? 'null' : 'null');

    return fixed;
  }

  /**
   * 移除JavaScript注释
   *
   * // comment
   * /* comment *\/
   */
  private static removeComments(content: string): string {
    let fixed = content;

    // 移除单行注释
    fixed = fixed.replace(/\/\/.*$/gm, '');

    // 移除多行注释
    fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

    return fixed;
  }

  /**
   * 修复特殊值
   *
   * undefined → null
   * true/false → true/false（已正确）
   */
  private static fixSpecialValues(content: string): string {
    let fixed = content;

    // undefined → null
    fixed = fixed.replace(/\bundefined\b/g, 'null');

    // 确保布尔值和null的小写正确
    fixed = fixed.replace(/\bTrue\b/g, 'true');
    fixed = fixed.replace(/\bFalse\b/g, 'false');
    fixed = fixed.replace(/\bNull\b/g, 'null');

    return fixed;
  }

  /**
   * 字段名规范化
   *
   * 将各种字段名变体映射到标准字段名
   * 例如：customer_name → customerName
   */
  private static normalizeFieldNames<T>(result: any, expectedFields: string[]): T {
    const normalized: any = {};

    // 首先处理原始字段
    for (const key of Object.keys(result)) {
      let normalizedKey = key;

      // 检查是否需要映射
      for (const [standardField, variants] of Object.entries(FIELD_VARIANTS)) {
        if (variants.includes(key) || key.toLowerCase() === standardField.toLowerCase()) {
          normalizedKey = standardField;
          break;
        }
      }

      // 尝试驼峰命名转换（snake_case → camelCase）
      if (!expectedFields.includes(normalizedKey)) {
        const camelCase = this.toCamelCase(key);
        if (expectedFields.includes(camelCase)) {
          normalizedKey = camelCase;
        }
      }

      normalized[normalizedKey] = result[key];
    }

    return normalized as T;
  }

  /**
   * 将snake_case转换为camelCase
   */
  private static toCamelCase(str: string): string {
    return str.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
  }

  /**
   * 规范化枚举值
   *
   * 尝试将值匹配到允许的枚举值（处理大小写问题）
   */
  private static normalizeEnumValue(value: string, allowedValues: string[]): string | null {
    if (!value || typeof value !== 'string') return null;

    // 精确匹配（忽略大小写）
    const upperValue = value.toUpperCase();
    for (const allowed of allowedValues) {
      if (allowed.toUpperCase() === upperValue) {
        return allowed;
      }
    }

    // 部分匹配
    for (const allowed of allowedValues) {
      if (allowed.toUpperCase().includes(upperValue) ||
          upperValue.includes(allowed.toUpperCase())) {
        return allowed;
      }
    }

    return null;
  }

  /**
   * 更激进的修复（当常规解析失败时使用）
   *
   * 尝试处理各种边缘情况
   */
  private static parseWithAggressiveFixes(content: string, expectedFields?: string[]): any {
    let fixedContent = content;

    // 1. 尝试修复括号不匹配
    fixedContent = this.fixMismatchedBrackets(fixedContent);

    // 2. 尝试修复字符串中的未转义引号
    fixedContent = this.fixUnescapedQuotes(fixedContent);

    // 3. 尝试移除所有控制字符
    fixedContent = fixedContent.replace(/[\x00-\x1F\x7F]/g, '');

    // 4. 尝试解析
    try {
      const result = JSON.parse(fixedContent);
      if (expectedFields) {
        return this.normalizeFieldNames(result, expectedFields);
      }
      return result;
    } catch (error) {
      // 最后尝试：使用eval（不安全，但作为最后手段）
      try {
        // eslint-disable-next-line no-eval
        const result = eval(`(${fixedContent})`);
        if (expectedFields) {
          return this.normalizeFieldNames(result, expectedFields);
        }
        return result;
      } catch (evalError) {
        throw new Error(`Failed to parse JSON. Original error: ${(error as Error).message}. Eval error: ${(evalError as Error).message}`);
      }
    }
  }

  /**
   * 修复括号不匹配
   */
  private static fixMismatchedBrackets(content: string): string {
    let fixed = content;

    // 计算括号数量
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    // 补充缺失的右括号
    if (openBraces > closeBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      fixed += ']'.repeat(openBrackets - closeBrackets);
    }

    return fixed;
  }

  /**
   * 修复未转义的引号
   *
   * 处理字符串内部有引号但未转义的情况
   */
  private static fixUnescapedQuotes(content: string): string {
    // 这个操作比较复杂，需要智能判断哪些引号需要转义
    // 简化处理：尝试平衡引号

    let fixed = content;
    const lines = fixed.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const quoteCount = (line.match(/"/g) || []).length;

      // 如果引号数量是奇数，可能有一个未转义的引号
      if (quoteCount % 2 !== 0) {
        // 尝试在行末补充引号
        if (!line.trim().endsWith('"')) {
          lines[i] = line + '"';
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * 安全解析（带异常处理）
   *
   * @param content JSON字符串
   * @param defaultValue 解析失败时的默认值
   * @returns 解析结果或默认值
   */
  static safeParse<T = any>(content: string, defaultValue: T): T {
    try {
      return this.parse<T>(content);
    } catch (error) {
      this.logParseError(content, error as Error);
      return defaultValue;
    }
  }

  /**
   * 记录解析错误（用于调试）
   */
  private static logParseError(content: string, error: Error): void {
    // 只记录前500个字符
    const preview = content.substring(0, 500);
    const errorMessage = `JSON parse failed: ${error.message}\nContent preview: ${preview}`;
    // 在实际使用中，可以写入日志文件
    console.error(errorMessage);
  }
}
