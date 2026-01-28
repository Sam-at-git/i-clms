import { ExtractTopic } from '../topics/topics.const';

/**
 * JSON Schema 类型定义
 *
 * 用于 Ollama 原生 format 参数的 JSON Schema 定义。
 * 遵循 JSON Schema Draft-07 规范。
 */
export interface JsonSchema {
  type: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: (string | number | boolean | null)[];
  description?: string;
  format?: string;
  default?: unknown;
  additionalProperties?: boolean;
}

/**
 * BASIC_INFO 主题 JSON Schema（扩展版）
 *
 * 提取合同基本信息：编号、名称、类型、签约方、甲乙双方详细信息、项目信息、时间信息、验收信息、保密条款、通用条款等
 */
const BASIC_INFO_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    // ===== 现有字段 =====
    contractNo: {
      type: ['string', 'null'],
      description: '合同编号/合同号',
    },
    contractName: {
      type: ['string', 'null'],
      description: '合同名称/标题',
    },
    contractType: {
      type: ['string', 'null'],
      enum: ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES', null],
      description: '合同类型: STAFF_AUGMENTATION(人力外包), PROJECT_OUTSOURCING(项目外包), PRODUCT_SALES(产品销售)',
    },
    customerName: {
      type: ['string', 'null'],
      description: '甲方名称(委托方/发包方/买方/客户)',
    },
    ourEntity: {
      type: ['string', 'null'],
      description: '乙方名称(受托方/承包方/卖方/供应商)',
    },

    // ===== 合同元数据 =====
    version: {
      type: ['string', 'null'],
      description: '版本号(如: 1.0, 2.0)',
    },
    governingLanguage: {
      type: ['string', 'null'],
      description: '管辖语言(如: 中文、英文)',
      default: '中文',
    },

    // ===== 甲方详细信息 =====
    clientLegalRep: {
      type: ['string', 'null'],
      description: '甲方法定代表人',
    },
    clientRegistrationNumber: {
      type: ['string', 'null'],
      description: '甲方注册号/统一社会信用代码',
    },
    clientBusinessLicense: {
      type: ['string', 'null'],
      description: '甲方营业执照号',
    },
    clientAddress: {
      type: ['string', 'null'],
      description: '甲方地址',
    },
    clientContactPerson: {
      type: ['string', 'null'],
      description: '甲方联系人',
    },
    clientPhone: {
      type: ['string', 'null'],
      description: '甲方电话',
    },
    clientEmail: {
      type: ['string', 'null'],
      description: '甲方邮箱',
    },
    clientFax: {
      type: ['string', 'null'],
      description: '甲方传真',
    },
    clientBankName: {
      type: ['string', 'null'],
      description: '甲方开户行',
    },
    clientBankAccount: {
      type: ['string', 'null'],
      description: '甲方银行账号',
    },
    clientAccountName: {
      type: ['string', 'null'],
      description: '甲方账户名称',
    },

    // ===== 乙方详细信息 =====
    vendorLegalRep: {
      type: ['string', 'null'],
      description: '乙方法定代表人',
    },
    vendorRegistrationNumber: {
      type: ['string', 'null'],
      description: '乙方注册号/统一社会信用代码',
    },
    vendorBusinessLicense: {
      type: ['string', 'null'],
      description: '乙方营业执照号',
    },
    vendorAddress: {
      type: ['string', 'null'],
      description: '乙方地址',
    },
    vendorContactPerson: {
      type: ['string', 'null'],
      description: '乙方联系人',
    },
    vendorPhone: {
      type: ['string', 'null'],
      description: '乙方电话',
    },
    vendorEmail: {
      type: ['string', 'null'],
      description: '乙方邮箱',
    },
    vendorFax: {
      type: ['string', 'null'],
      description: '乙方传真',
    },
    vendorBankName: {
      type: ['string', 'null'],
      description: '乙方开户行',
    },
    vendorBankAccount: {
      type: ['string', 'null'],
      description: '乙方银行账号',
    },
    vendorAccountName: {
      type: ['string', 'null'],
      description: '乙方账户名称',
    },

    // ===== 项目基本信息 =====
    projectName: {
      type: ['string', 'null'],
      description: '项目名称',
    },
    projectOverview: {
      type: ['string', 'null'],
      description: '项目概述或者合作背景',
    },

    // ===== 时间信息 =====
    projectStartDate: {
      type: ['string', 'null'],
      format: 'date',
      description: '项目开始日期(YYYY-MM-DD格式)',
    },
    projectEndDate: {
      type: ['string', 'null'],
      format: 'date',
      description: '项目结束日期(YYYY-MM-DD格式)',
    },
    warrantyStartDate: {
      type: ['string', 'null'],
      format: 'date',
      description: '质保期开始日期(YYYY-MM-DD格式)',
    },
    warrantyPeriodMonths: {
      type: ['integer', 'null'],
      description: '质保期(月)',
      default: 12,
    },

    // ===== 财务信息 =====
    isTaxInclusive: {
      type: ['boolean', 'null'],
      description: '是否含税',
      default: true,
    },
    pricingModel: {
      type: ['string', 'null'],
      enum: ['FIXED_PRICE', 'TIME_MATERIAL', 'MIXED', null],
      description: '定价模式: FIXED_PRICE(固定价格), TIME_MATERIAL(工时材料), MIXED(混合)',
    },

    // ===== 验收信息 =====
    acceptanceMethod: {
      type: ['string', 'null'],
      description: '验收方法',
    },
    acceptancePeriodDays: {
      type: ['integer', 'null'],
      description: '验收期(天)',
      default: 15,
    },
    deemedAcceptanceRule: {
      type: ['string', 'null'],
      description: '视为验收规则',
    },

    // ===== 保密条款 =====
    confidentialityTermYears: {
      type: ['integer', 'null'],
      description: '保密期限(年)',
      default: 3,
    },
    confidentialityDefinition: {
      type: ['string', 'null'],
      description: '保密信息定义',
    },
    confidentialityObligation: {
      type: ['string', 'null'],
      description: '保密义务描述',
    },

    // ===== 通用条款 =====
    governingLaw: {
      type: ['string', 'null'],
      description: '管辖法律',
    },
    disputeResolutionMethod: {
      type: ['string', 'null'],
      description: '争议解决方式',
    },
    noticeRequirements: {
      type: ['string', 'null'],
      description: '通知要求',
    },
  },
  required: [],
  additionalProperties: false,
};

/**
 * FINANCIAL 主题 JSON Schema
 *
 * 提取财务信息：金额、币种、税率、付款条款等
 */
const FINANCIAL_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    totalAmount: {
      type: ['number', 'string', 'null'],
      description: '合同总金额(纯数字，不含单位)',
    },
    currency: {
      type: ['string', 'null'],
      description: '币种(CNY/USD/EUR等)',
      default: 'CNY',
    },
    taxRate: {
      type: ['number', 'string', 'null'],
      description: '税率(百分比数值，如6、13)',
    },
    paymentTerms: {
      type: ['string', 'null'],
      description: '付款条款描述',
    },
    paymentMethod: {
      type: ['string', 'null'],
      description: '付款方式(银行转账/支票等)',
    },
  },
  required: ['totalAmount'],
  additionalProperties: false,
};

/**
 * TIME_INFO 主题 JSON Schema
 *
 * 提取时间信息：签约日期、起止日期、期限、续约等
 */
const TIME_INFO_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    signDate: {
      type: ['string', 'null'],
      format: 'date',
      description: '签约日期(YYYY-MM-DD格式)',
    },
    startDate: {
      type: ['string', 'null'],
      format: 'date',
      description: '合同开始日期(YYYY-MM-DD格式)',
    },
    endDate: {
      type: ['string', 'null'],
      format: 'date',
      description: '合同结束日期(YYYY-MM-DD格式)',
    },
    duration: {
      type: ['string', 'null'],
      description: '合同期限(如"1年"、"6个月")',
    },
    autoRenewal: {
      type: ['boolean', 'null'],
      description: '是否自动续约',
    },
  },
  required: ['signDate', 'startDate', 'endDate'],
  additionalProperties: false,
};

/**
 * MILESTONES 主题 JSON Schema (PROJECT_OUTSOURCING)
 *
 * 提取项目里程碑信息
 */
const MILESTONES_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sequence: {
            type: 'integer',
            description: '里程碑序号',
          },
          name: {
            type: 'string',
            description: '里程碑名称/阶段名称',
          },
          deliverables: {
            type: ['string', 'null'],
            description: '交付物描述',
          },
          amount: {
            type: ['number', 'string', 'null'],
            description: '里程碑金额',
          },
          paymentPercentage: {
            type: ['number', 'string', 'null'],
            description: '付款比例(百分比)',
          },
          plannedDate: {
            type: ['string', 'null'],
            format: 'date',
            description: '计划完成日期',
          },
          acceptanceCriteria: {
            type: ['string', 'null'],
            description: '验收标准',
          },
        },
        required: ['sequence', 'name'],
      },
      description: '里程碑列表',
    },
  },
  required: ['milestones'],
  additionalProperties: false,
};

/**
 * RATE_ITEMS 主题 JSON Schema (STAFF_AUGMENTATION)
 *
 * 提取人力费率信息
 */
const RATE_ITEMS_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    rateItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            description: '角色/职位名称',
          },
          rateType: {
            type: 'string',
            enum: ['HOURLY', 'DAILY', 'MONTHLY'],
            description: '费率类型: HOURLY(时薪), DAILY(日薪), MONTHLY(月薪)',
          },
          rate: {
            type: ['number', 'string'],
            description: '费率金额(纯数字)',
          },
          currency: {
            type: ['string', 'null'],
            description: '币种',
            default: 'CNY',
          },
          rateEffectiveFrom: {
            type: ['string', 'null'],
            format: 'date',
            description: '费率生效开始日期',
          },
          rateEffectiveTo: {
            type: ['string', 'null'],
            format: 'date',
            description: '费率生效结束日期',
          },
          quantity: {
            type: ['integer', 'null'],
            description: '人数',
          },
        },
        required: ['role', 'rateType', 'rate'],
      },
      description: '人力费率列表',
    },
  },
  required: ['rateItems'],
  additionalProperties: false,
};

/**
 * LINE_ITEMS 主题 JSON Schema (PRODUCT_SALES)
 *
 * 提取产品/商品明细
 */
const LINE_ITEMS_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productName: {
            type: 'string',
            description: '产品/商品名称',
          },
          specification: {
            type: ['string', 'null'],
            description: '规格/型号',
          },
          quantity: {
            type: 'integer',
            description: '数量',
          },
          unit: {
            type: ['string', 'null'],
            description: '单位(个/台/套等)',
          },
          unitPriceWithTax: {
            type: ['number', 'string', 'null'],
            description: '含税单价',
          },
          unitPriceWithoutTax: {
            type: ['number', 'string', 'null'],
            description: '不含税单价',
          },
          subtotal: {
            type: ['number', 'string', 'null'],
            description: '小计金额',
          },
        },
        required: ['productName', 'quantity'],
      },
      description: '产品/商品行项目列表',
    },
  },
  required: ['lineItems'],
  additionalProperties: false,
};

/**
 * RISK_CLAUSES 主题 JSON Schema
 *
 * 提取风险相关条款
 */
const RISK_CLAUSES_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    penaltyClause: {
      type: ['string', 'null'],
      description: '违约条款/违约责任描述',
    },
    confidentialityClause: {
      type: ['string', 'null'],
      description: '保密条款描述',
    },
    ipClause: {
      type: ['string', 'null'],
      description: '知识产权条款描述',
    },
    terminationClause: {
      type: ['string', 'null'],
      description: '合同终止/解除条款',
    },
    disputeResolution: {
      type: ['string', 'null'],
      description: '争议解决方式(仲裁/诉讼/协商等)',
    },
  },
  additionalProperties: false,
};

/**
 * DELIVERABLES 主题 JSON Schema
 *
 * 提取交付物信息
 */
const DELIVERABLES_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    deliverables: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: '交付物列表',
    },
    acceptanceCriteria: {
      type: ['string', 'null'],
      description: '总体验收标准',
    },
    deliveryMethod: {
      type: ['string', 'null'],
      description: '交付方式',
    },
    deliveryLocation: {
      type: ['string', 'null'],
      description: '交付地点',
    },
  },
  required: ['deliverables'],
  additionalProperties: false,
};

/**
 * 主题 -> JSON Schema 映射表
 *
 * 将 ExtractTopic 枚举映射到对应的 JSON Schema 定义。
 * 这些 Schema 用于 Ollama 原生 format 参数。
 */
export const TOPIC_JSON_SCHEMAS: Record<ExtractTopic, JsonSchema> = {
  [ExtractTopic.BASIC_INFO]: BASIC_INFO_SCHEMA,
  [ExtractTopic.FINANCIAL]: FINANCIAL_SCHEMA,
  [ExtractTopic.TIME_INFO]: TIME_INFO_SCHEMA,
  [ExtractTopic.MILESTONES]: MILESTONES_SCHEMA,
  [ExtractTopic.RATE_ITEMS]: RATE_ITEMS_SCHEMA,
  [ExtractTopic.LINE_ITEMS]: LINE_ITEMS_SCHEMA,
  [ExtractTopic.RISK_CLAUSES]: RISK_CLAUSES_SCHEMA,
  [ExtractTopic.DELIVERABLES]: DELIVERABLES_SCHEMA,
};

/**
 * 根据主题名称获取 JSON Schema
 *
 * @param topicName 主题名称 (ExtractTopic 枚举值)
 * @returns JSON Schema 对象，如果主题不存在则返回 undefined
 *
 * @example
 * ```typescript
 * const schema = getTopicSchema('BASIC_INFO');
 * // schema = { type: 'object', properties: { ... } }
 * ```
 */
export function getTopicSchema(topicName: string): JsonSchema | undefined {
  return TOPIC_JSON_SCHEMAS[topicName as ExtractTopic];
}

/**
 * 检查主题是否有定义的 JSON Schema
 *
 * @param topicName 主题名称
 * @returns true 如果主题有定义的 Schema
 */
export function hasTopicSchema(topicName: string): boolean {
  return topicName in TOPIC_JSON_SCHEMAS;
}

/**
 * 获取所有已定义 Schema 的主题列表
 *
 * @returns 主题名称数组
 */
export function getAllTopicsWithSchemas(): ExtractTopic[] {
  return Object.keys(TOPIC_JSON_SCHEMAS) as ExtractTopic[];
}
