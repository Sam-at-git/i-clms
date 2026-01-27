/**
 * Enhanced JSON Schemas for Ollama Native Format
 *
 * These schemas correspond to the Zod schemas in enhanced-contract-schemas.ts
 * and are used with Ollama's native `format` parameter.
 */

import { JsonSchema } from './topic-json-schemas';

// =============================================================================
// COMMON / SHARED JSON SCHEMAS
// =============================================================================

/**
 * Party Contact JSON Schema
 */
export const PARTY_CONTACT_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    legalName: { type: ['string', 'null'], description: '公司全称/法定名称' },
    shortName: { type: ['string', 'null'], description: '公司简称' },
    address: { type: ['string', 'null'], description: '公司地址' },
    legalRepresentative: { type: ['string', 'null'], description: '法定代表人' },
    contactPerson: { type: ['string', 'null'], description: '联系人' },
    phone: { type: ['string', 'null'], description: '联系电话' },
    email: { type: ['string', 'null'], description: '电子邮箱' },
    creditCode: { type: ['string', 'null'], description: '统一社会信用代码' },
    bankName: { type: ['string', 'null'], description: '开户银行' },
    bankAccount: { type: ['string', 'null'], description: '银行账号' },
  },
  additionalProperties: false,
};

/**
 * Enhanced BASIC_INFO JSON Schema
 */
export const ENHANCED_BASIC_INFO_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    // Metadata
    contractNumber: { type: ['string', 'null'], description: '合同编号/合同号' },
    title: { type: ['string', 'null'], description: '合同名称/标题' },
    contractType: {
      type: ['string', 'null'],
      enum: ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES', null],
      description: '合同类型',
    },
    version: { type: ['string', 'null'], description: '合同版本号' },
    effectiveDate: { type: ['string', 'null'], format: 'date', description: '生效日期(YYYY-MM-DD)' },
    governingLanguage: { type: ['string', 'null'], description: '合同语言' },
    signLocation: { type: ['string', 'null'], description: '签订地点' },
    copies: { type: ['integer', 'null'], description: '合同份数' },

    // First Party (甲方)
    firstPartyName: { type: ['string', 'null'], description: '甲方名称(委托方/发包方/买方)' },
    firstPartyAddress: { type: ['string', 'null'], description: '甲方地址' },
    firstPartyLegalRep: { type: ['string', 'null'], description: '甲方法定代表人' },
    firstPartyContact: { type: ['string', 'null'], description: '甲方联系人' },
    firstPartyPhone: { type: ['string', 'null'], description: '甲方电话' },
    firstPartyEmail: { type: ['string', 'null'], description: '甲方邮箱' },
    firstPartyCreditCode: { type: ['string', 'null'], description: '甲方统一社会信用代码' },

    // Second Party (乙方)
    secondPartyName: { type: ['string', 'null'], description: '乙方名称(受托方/承包方/卖方)' },
    secondPartyAddress: { type: ['string', 'null'], description: '乙方地址' },
    secondPartyLegalRep: { type: ['string', 'null'], description: '乙方法定代表人' },
    secondPartyContact: { type: ['string', 'null'], description: '乙方联系人' },
    secondPartyPhone: { type: ['string', 'null'], description: '乙方电话' },
    secondPartyEmail: { type: ['string', 'null'], description: '乙方邮箱' },
    secondPartyCreditCode: { type: ['string', 'null'], description: '乙方统一社会信用代码' },

    // Industry
    industry: { type: ['string', 'null'], description: '所属行业' },
    projectName: { type: ['string', 'null'], description: '项目名称' },
  },
  required: ['contractNumber', 'title', 'contractType', 'firstPartyName', 'secondPartyName'],
  additionalProperties: false,
};

/**
 * Payment Schedule Item JSON Schema
 */
export const PAYMENT_SCHEDULE_ITEM_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    phase: { type: 'string', description: '付款阶段名称' },
    milestoneId: { type: ['string', 'null'], description: '关联里程碑ID' },
    trigger: { type: ['string', 'null'], description: '付款触发条件' },
    percentage: { type: ['number', 'null'], description: '付款比例(百分比)' },
    amount: { type: ['number', 'null'], description: '付款金额' },
    dueDays: { type: ['integer', 'null'], description: '付款期限(天)' },
  },
  required: ['phase'],
  additionalProperties: false,
};

/**
 * Enhanced FINANCIAL JSON Schema
 */
export const ENHANCED_FINANCIAL_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    totalAmount: { type: ['number', 'null'], description: '合同总金额' },
    currency: { type: ['string', 'null'], description: '币种(CNY/USD/EUR等)' },
    isTaxInclusive: { type: ['boolean', 'null'], description: '是否含税' },
    taxRate: { type: ['number', 'null'], description: '税率(百分比数值)' },
    amountWithTax: { type: ['number', 'null'], description: '含税金额' },
    amountWithoutTax: { type: ['number', 'null'], description: '不含税金额' },
    taxAmount: { type: ['number', 'null'], description: '税额' },
    paymentTerms: { type: ['string', 'null'], description: '付款条款描述' },
    paymentMethod: { type: ['string', 'null'], description: '付款方式' },
    pricingModel: { type: ['string', 'null'], description: '定价模式(固定价格/工时计费等)' },
    invoiceType: { type: ['string', 'null'], description: '发票类型' },
    paymentSchedule: {
      type: ['array', 'null'],
      items: PAYMENT_SCHEDULE_ITEM_JSON_SCHEMA,
      description: '付款计划',
    },
  },
  required: ['totalAmount'],
  additionalProperties: false,
};

/**
 * Enhanced RISK_CLAUSES JSON Schema
 */
export const ENHANCED_RISK_CLAUSES_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    // Penalty/Breach
    penaltyClause: { type: ['string', 'null'], description: '违约条款/违约责任描述' },
    delayPenaltyRate: { type: ['string', 'null'], description: '延迟违约金费率' },
    penaltyCap: { type: ['string', 'null'], description: '违约金上限' },

    // Confidentiality
    confidentialityClause: { type: ['string', 'null'], description: '保密条款描述' },
    confidentialityPeriod: { type: ['number', 'null'], description: '保密期限(年)' },

    // IP
    ipClause: { type: ['string', 'null'], description: '知识产权条款描述' },
    ipOwnership: { type: ['string', 'null'], description: '知识产权归属' },

    // Termination
    terminationClause: { type: ['string', 'null'], description: '合同终止/解除条款' },
    terminationNotice: { type: ['string', 'null'], description: '终止通知期' },

    // Dispute
    disputeResolution: { type: ['string', 'null'], description: '争议解决方式' },
    governingLaw: { type: ['string', 'null'], description: '适用法律' },
    disputeLocation: { type: ['string', 'null'], description: '管辖法院/仲裁机构' },

    // Liability
    liabilityCap: { type: ['string', 'null'], description: '责任限额' },

    // Force Majeure
    forceMajeureClause: { type: ['string', 'null'], description: '不可抗力条款' },
  },
  additionalProperties: false,
};

/**
 * Enhanced Milestone JSON Schema (for PROJECT_OUTSOURCING)
 */
export const ENHANCED_MILESTONE_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    id: { type: ['string', 'null'], description: '里程碑编号' },
    sequence: { type: 'integer', description: '里程碑序号' },
    name: { type: 'string', description: '里程碑名称' },
    targetDate: { type: ['string', 'null'], format: 'date', description: '目标完成日期(YYYY-MM-DD)' },
    deliverable: { type: ['string', 'null'], description: '交付物描述' },
    acceptanceCriteria: { type: ['string', 'null'], description: '验收标准' },
    paymentPercentage: { type: ['number', 'null'], description: '付款比例(百分比)' },
    paymentAmount: { type: ['number', 'null'], description: '付款金额' },
  },
  required: ['sequence', 'name'],
  additionalProperties: false,
};

/**
 * Enhanced MILESTONES Topic JSON Schema
 */
export const ENHANCED_MILESTONES_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    startDate: { type: ['string', 'null'], format: 'date', description: '项目开始日期(YYYY-MM-DD)' },
    endDate: { type: ['string', 'null'], format: 'date', description: '项目结束日期(YYYY-MM-DD)' },
    milestones: {
      type: 'array',
      items: ENHANCED_MILESTONE_JSON_SCHEMA,
      description: '里程碑列表',
    },
    acceptanceMethod: { type: ['string', 'null'], description: '验收方式' },
    acceptancePeriodDays: { type: ['integer', 'null'], description: '验收期限(天)' },
  },
  required: ['milestones'],
  additionalProperties: false,
};

/**
 * Enhanced Rate Item JSON Schema (for STAFF_AUGMENTATION)
 */
export const ENHANCED_RATE_ITEM_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    role: { type: 'string', description: '角色/职位名称' },
    level: { type: ['string', 'null'], description: '级别' },
    rateType: {
      type: 'string',
      enum: ['HOURLY', 'DAILY', 'MONTHLY'],
      description: '费率类型',
    },
    rate: { type: 'number', description: '费率金额' },
    currency: { type: ['string', 'null'], description: '币种' },
    overtimeRate: { type: ['number', 'null'], description: '加班费率' },
    effectiveFrom: { type: ['string', 'null'], format: 'date', description: '费率生效日期' },
    effectiveTo: { type: ['string', 'null'], format: 'date', description: '费率失效日期' },
    quantity: { type: ['integer', 'null'], description: '人数' },
  },
  required: ['role', 'rateType', 'rate'],
  additionalProperties: false,
};

/**
 * Enhanced RATE_ITEMS Topic JSON Schema
 */
export const ENHANCED_RATE_ITEMS_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    rateItems: {
      type: 'array',
      items: ENHANCED_RATE_ITEM_JSON_SCHEMA,
      description: '费率项列表',
    },
    settlementCycle: { type: ['string', 'null'], description: '结算周期' },
    monthlyHoursCap: { type: ['integer', 'null'], description: '每月工时上限' },
    overtimePolicy: { type: ['string', 'null'], description: '加班政策' },
    rateAdjustmentMechanism: { type: ['string', 'null'], description: '费率调整机制' },
  },
  required: ['rateItems'],
  additionalProperties: false,
};

/**
 * Enhanced Product Line Item JSON Schema (for PRODUCT_SALES)
 */
export const ENHANCED_LINE_ITEM_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    productName: { type: 'string', description: '产品名称' },
    productCode: { type: ['string', 'null'], description: '产品编号' },
    specification: { type: ['string', 'null'], description: '规格/型号' },
    quantity: { type: 'integer', description: '数量' },
    unit: { type: ['string', 'null'], description: '单位' },
    unitPriceWithTax: { type: ['number', 'null'], description: '含税单价' },
    unitPriceWithoutTax: { type: ['number', 'null'], description: '不含税单价' },
    taxRate: { type: ['number', 'null'], description: '税率(百分比)' },
    subtotal: { type: ['number', 'null'], description: '小计金额' },
    deliveryDate: { type: ['string', 'null'], format: 'date', description: '交付日期' },
  },
  required: ['productName', 'quantity'],
  additionalProperties: false,
};

/**
 * Enhanced LINE_ITEMS Topic JSON Schema
 */
export const ENHANCED_LINE_ITEMS_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    lineItems: {
      type: 'array',
      items: ENHANCED_LINE_ITEM_JSON_SCHEMA,
      description: '产品明细列表',
    },
    deliveryMethod: { type: ['string', 'null'], description: '交付方式' },
    deliveryLocation: { type: ['string', 'null'], description: '交付地点' },
    warrantyPeriod: { type: ['string', 'null'], description: '保修期' },
    afterSalesTerms: { type: ['string', 'null'], description: '售后服务条款' },
  },
  required: ['lineItems'],
  additionalProperties: false,
};

/**
 * Enhanced TIME_INFO Topic JSON Schema
 */
export const ENHANCED_TIME_INFO_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    signDate: { type: ['string', 'null'], format: 'date', description: '签约日期(YYYY-MM-DD)' },
    effectiveDate: { type: ['string', 'null'], format: 'date', description: '生效日期(YYYY-MM-DD)' },
    startDate: { type: ['string', 'null'], format: 'date', description: '合同开始日期(YYYY-MM-DD)' },
    endDate: { type: ['string', 'null'], format: 'date', description: '合同结束日期(YYYY-MM-DD)' },
    duration: { type: ['string', 'null'], description: '合同期限(如"1年"、"6个月")' },
    autoRenewal: { type: ['boolean', 'null'], description: '是否自动续约' },
    renewalTerms: { type: ['string', 'null'], description: '续约条款' },
    noticePeriod: { type: ['string', 'null'], description: '通知期' },
  },
  required: ['signDate', 'startDate', 'endDate'],
  additionalProperties: false,
};

/**
 * Enhanced DELIVERABLES Topic JSON Schema
 */
export const ENHANCED_DELIVERABLES_JSON_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    deliverables: {
      type: 'array',
      items: { type: 'string' },
      description: '交付物列表',
    },
    acceptanceCriteria: { type: ['string', 'null'], description: '总体验收标准' },
    deliveryMethod: { type: ['string', 'null'], description: '交付方式' },
    deliveryLocation: { type: ['string', 'null'], description: '交付地点' },
    acceptancePeriodDays: { type: ['integer', 'null'], description: '验收期限(天)' },
    changeManagementProcess: { type: ['string', 'null'], description: '变更管理流程' },
  },
  required: ['deliverables'],
  additionalProperties: false,
};

/**
 * Enhanced Topic JSON Schema Registry
 */
export const ENHANCED_TOPIC_JSON_SCHEMAS: Record<string, JsonSchema> = {
  BASIC_INFO: ENHANCED_BASIC_INFO_JSON_SCHEMA,
  FINANCIAL: ENHANCED_FINANCIAL_JSON_SCHEMA,
  RISK_CLAUSES: ENHANCED_RISK_CLAUSES_JSON_SCHEMA,
  MILESTONES: ENHANCED_MILESTONES_JSON_SCHEMA,
  RATE_ITEMS: ENHANCED_RATE_ITEMS_JSON_SCHEMA,
  LINE_ITEMS: ENHANCED_LINE_ITEMS_JSON_SCHEMA,
  TIME_INFO: ENHANCED_TIME_INFO_JSON_SCHEMA,
  DELIVERABLES: ENHANCED_DELIVERABLES_JSON_SCHEMA,
};

/**
 * Get enhanced JSON schema for a topic
 */
export function getEnhancedTopicJsonSchema(topicName: string): JsonSchema | undefined {
  return ENHANCED_TOPIC_JSON_SCHEMAS[topicName];
}
