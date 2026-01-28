import { ExtractTopicDefinition, TopicBatch } from './topic.interface';

/**
 * 合同类型枚举
 */
export enum ContractTypeEnum {
  STAFF_AUGMENTATION = 'STAFF_AUGMENTATION',  // 人力外包
  PROJECT_OUTSOURCING = 'PROJECT_OUTSOURCING', // 项目外包
  PRODUCT_SALES = 'PRODUCT_SALES',            // 产品销售
  MIXED = 'MIXED',                            // 混合类型（包含多种合同特征）
}

/**
 * 合同类型显示名称
 */
export const ContractTypeNames: Record<ContractTypeEnum, string> = {
  [ContractTypeEnum.STAFF_AUGMENTATION]: '人力外包',
  [ContractTypeEnum.PROJECT_OUTSOURCING]: '项目外包',
  [ContractTypeEnum.PRODUCT_SALES]: '产品销售',
  [ContractTypeEnum.MIXED]: '混合类型',
};

/**
 * Extract Topic Enumeration
 *
 * Maps to the legacy InfoType enum for backward compatibility.
 */
export enum ExtractTopic {
  BASIC_INFO = 'BASIC_INFO',
  FINANCIAL = 'FINANCIAL',
  MILESTONES = 'MILESTONES',
  RATE_ITEMS = 'RATE_ITEMS',
  LINE_ITEMS = 'LINE_ITEMS',
  RISK_CLAUSES = 'RISK_CLAUSES',
  DELIVERABLES = 'DELIVERABLES',
  TIME_INFO = 'TIME_INFO',
}

/**
 * Display names for each topic (Chinese)
 */
export const ExtractTopicNames: Record<ExtractTopic, string> = {
  [ExtractTopic.BASIC_INFO]: '基本信息',
  [ExtractTopic.FINANCIAL]: '财务信息',
  [ExtractTopic.MILESTONES]: '里程碑信息',
  [ExtractTopic.RATE_ITEMS]: '人力费率',
  [ExtractTopic.LINE_ITEMS]: '产品清单',
  [ExtractTopic.RISK_CLAUSES]: '风险条款',
  [ExtractTopic.DELIVERABLES]: '交付物信息',
  [ExtractTopic.TIME_INFO]: '时间信息',
};

/**
 * Topic Definitions
 *
 * Complete definitions for all 8 extraction topics.
 * Total weight: 16 points (scaled to 100% for completeness)
 *
 * Topic weight distribution:
 * - BASIC_INFO: 4.0 (25%) - Most important core fields
 * - FINANCIAL: 3.0 (18.75%) - Critical financial data
 * - TIME_INFO: 2.0 (12.5%) - Contract duration info
 * - MILESTONES: 2.0 (12.5%) - Project delivery schedule
 * - RATE_ITEMS: 1.5 (9.375%) - Staff rate information
 * - LINE_ITEMS: 1.5 (9.375%) - Product line items
 * - RISK_CLAUSES: 1.0 (6.25%) - Legal risk clauses
 * - DELIVERABLES: 1.0 (6.25%) - Delivery requirements
 */
export const EXTRACT_TOPICS: ExtractTopicDefinition[] = [
  {
    name: ExtractTopic.BASIC_INFO,
    displayName: ExtractTopicNames[ExtractTopic.BASIC_INFO],
    description: '合同编号、名称、签约方、甲乙双方详细信息、项目信息、时间信息、验收信息、保密条款、通用条款等基础信息',
    weight: 4,
    order: 1,
    fields: [
      // ===== 现有字段 =====
      { name: 'contractNo', type: 'string', required: false, description: '合同编号' },
      { name: 'contractName', type: 'string', required: false, description: '合同名称（如"外包合作项目协议"）' },
      { name: 'contractType', type: 'string', required: false, description: '合同类型' },
      { name: 'customerName', type: 'string', required: false, description: '甲方名称=客户=委托方=发包方（不要填乙方！）' },
      { name: 'ourEntity', type: 'string', required: false, description: '乙方名称=供应商=受托方=承包方（不要填甲方！）' },

      // ===== 合同元数据 =====
      { name: 'version', type: 'string', required: false, description: '版本号' },
      { name: 'governingLanguage', type: 'string', required: false, description: '管辖语言' },

      // ===== 甲方详细信息 =====
      { name: 'clientLegalRep', type: 'string', required: false, description: '甲方法定代表人姓名（是人名如"张三"，不是公司名！）' },
      { name: 'clientRegistrationNumber', type: 'string', required: false, description: '甲方注册号/统一社会信用代码' },
      { name: 'clientBusinessLicense', type: 'string', required: false, description: '甲方营业执照号' },
      { name: 'clientAddress', type: 'string', required: false, description: '甲方地址' },
      { name: 'clientContactPerson', type: 'string', required: false, description: '甲方联系人' },
      { name: 'clientPhone', type: 'string', required: false, description: '甲方电话' },
      { name: 'clientEmail', type: 'string', required: false, description: '甲方邮箱' },
      { name: 'clientFax', type: 'string', required: false, description: '甲方传真' },
      { name: 'clientBankName', type: 'string', required: false, description: '甲方开户行' },
      { name: 'clientBankAccount', type: 'string', required: false, description: '甲方银行账号' },
      { name: 'clientAccountName', type: 'string', required: false, description: '甲方账户名称' },

      // ===== 乙方详细信息 =====
      { name: 'vendorLegalRep', type: 'string', required: false, description: '乙方法定代表人' },
      { name: 'vendorRegistrationNumber', type: 'string', required: false, description: '乙方注册号/统一社会信用代码' },
      { name: 'vendorBusinessLicense', type: 'string', required: false, description: '乙方营业执照号' },
      { name: 'vendorAddress', type: 'string', required: false, description: '乙方地址' },
      { name: 'vendorContactPerson', type: 'string', required: false, description: '乙方联系人' },
      { name: 'vendorPhone', type: 'string', required: false, description: '乙方电话' },
      { name: 'vendorEmail', type: 'string', required: false, description: '乙方邮箱' },
      { name: 'vendorFax', type: 'string', required: false, description: '乙方传真' },
      { name: 'vendorBankName', type: 'string', required: false, description: '乙方开户行' },
      { name: 'vendorBankAccount', type: 'string', required: false, description: '乙方银行账号' },
      { name: 'vendorAccountName', type: 'string', required: false, description: '乙方账户名称' },

      // ===== 项目基本信息 =====
      { name: 'projectName', type: 'string', required: false, description: '项目名称' },
      { name: 'projectOverview', type: 'string', required: false, description: '项目概述' },

      // ===== 时间信息 =====
      { name: 'projectStartDate', type: 'date', required: false, description: '项目开始日期' },
      { name: 'projectEndDate', type: 'date', required: false, description: '项目结束日期' },
      { name: 'warrantyStartDate', type: 'date', required: false, description: '质保期开始日期' },
      { name: 'warrantyPeriodMonths', type: 'number', required: false, description: '质保期(月)' },

      // ===== 财务信息 =====
      { name: 'isTaxInclusive', type: 'boolean', required: false, description: '是否含税' },
      { name: 'pricingModel', type: 'string', required: false, description: '定价模式' },

      // ===== 验收信息 =====
      { name: 'acceptanceMethod', type: 'string', required: false, description: '验收方法' },
      { name: 'acceptancePeriodDays', type: 'number', required: false, description: '验收期(天)' },
      { name: 'deemedAcceptanceRule', type: 'string', required: false, description: '视为验收规则' },

      // ===== 保密条款 =====
      { name: 'confidentialityTermYears', type: 'number', required: false, description: '保密期限(年)' },
      { name: 'confidentialityDefinition', type: 'string', required: false, description: '保密信息定义' },
      { name: 'confidentialityObligation', type: 'string', required: false, description: '保密义务描述' },

      // ===== 通用条款 =====
      { name: 'governingLaw', type: 'string', required: false, description: '管辖法律' },
      { name: 'disputeResolutionMethod', type: 'string', required: false, description: '争议解决方式' },
      { name: 'noticeRequirements', type: 'string', required: false, description: '通知要求' },
    ],
  },
  {
    name: ExtractTopic.FINANCIAL,
    displayName: ExtractTopicNames[ExtractTopic.FINANCIAL],
    description: '合同金额、付款方式、发票信息、税率等财务信息',
    weight: 3,
    order: 2,
    fields: [
      { name: 'totalAmount', type: 'decimal', required: false, description: '合同总金额' },
      { name: 'currency', type: 'string', required: false, description: '币种' },
      { name: 'taxRate', type: 'decimal', required: false, description: '税率' },
      { name: 'paymentTerms', type: 'string', required: false, description: '付款条款' },
      { name: 'paymentMethod', type: 'string', required: false, description: '付款方式' },
    ],
  },
  {
    name: ExtractTopic.MILESTONES,
    displayName: ExtractTopicNames[ExtractTopic.MILESTONES],
    description: '项目里程碑、付款节点、交付计划',
    weight: 2,
    order: 3,
    fields: [
      {
        name: 'milestones',
        type: 'array',
        required: false,
        description: '里程碑列表',
        defaultValue: [],
      },
    ],
  },
  {
    name: ExtractTopic.TIME_INFO,
    displayName: ExtractTopicNames[ExtractTopic.TIME_INFO],
    description: '合同期限、履行时间、续约条款',
    weight: 2,
    order: 4,
    fields: [
      { name: 'signDate', type: 'date', required: false, description: '签约日期' },
      { name: 'startDate', type: 'date', required: false, description: '开始日期' },
      { name: 'endDate', type: 'date', required: false, description: '结束日期' },
      { name: 'duration', type: 'string', required: false, description: '合同期限' },
      { name: 'autoRenewal', type: 'boolean', required: false, description: '是否自动续约' },
    ],
  },
  {
    name: ExtractTopic.RATE_ITEMS,
    displayName: ExtractTopicNames[ExtractTopic.RATE_ITEMS],
    description: '人力费率、单价等费率信息',
    weight: 1.5,
    order: 5,
    fields: [
      {
        name: 'rateItems',
        type: 'array',
        required: false,
        description: '费率项列表',
        defaultValue: [],
      },
    ],
  },
  {
    name: ExtractTopic.LINE_ITEMS,
    displayName: ExtractTopicNames[ExtractTopic.LINE_ITEMS],
    description: '产品行项目、商品明细',
    weight: 1.5,
    order: 6,
    fields: [
      {
        name: 'lineItems',
        type: 'array',
        required: false,
        description: '行项目列表',
        defaultValue: [],
      },
    ],
  },
  {
    name: ExtractTopic.RISK_CLAUSES,
    displayName: ExtractTopicNames[ExtractTopic.RISK_CLAUSES],
    description: '违约责任、保密条款、知识产权等风险条款',
    weight: 1,
    order: 7,
    fields: [
      { name: 'penaltyClause', type: 'string', required: false, description: '违约条款' },
      { name: 'confidentialityClause', type: 'string', required: false, description: '保密条款' },
      { name: 'ipClause', type: 'string', required: false, description: '知识产权条款' },
    ],
  },
  {
    name: ExtractTopic.DELIVERABLES,
    displayName: ExtractTopicNames[ExtractTopic.DELIVERABLES],
    description: '交付物清单、规格要求',
    weight: 1,
    order: 8,
    fields: [
      {
        name: 'deliverables',
        type: 'array',
        required: false,
        description: '交付物列表',
        defaultValue: [],
      },
    ],
  },
];

/**
 * Get topic definition by name
 */
export function getTopicDefinition(name: string): ExtractTopicDefinition | undefined {
  return EXTRACT_TOPICS.find((t) => t.name === name);
}

/**
 * Get topic display name
 */
export function getTopicDisplayName(name: string): string {
  const topic = getTopicDefinition(name);
  return topic?.displayName || name;
}

/**
 * Get all topic names
 */
export function getAllTopicNames(): string[] {
  return EXTRACT_TOPICS.map((t) => t.name);
}

/**
 * Check if a topic name is valid
 */
export function isValidTopic(name: string): boolean {
  return EXTRACT_TOPICS.some((t) => t.name === name);
}

/**
 * Convert legacy InfoType to ExtractTopic
 */
export function infoTypeToExtractTopic(infoType: string): ExtractTopic | undefined {
  // InfoType enum values match ExtractTopic values exactly
  if (isValidTopic(infoType)) {
    return infoType as ExtractTopic;
  }
  return undefined;
}

/**
 * 合同类型与主题批次映射配置
 *
 * 不同类型的合同需要提取不同的主题批次：
 *
 * 人力外包 (STAFF_AUGMENTATION):
 *   - 需要: 基本信息、财务信息、时间信息、人力费率、交付物、风险条款
 *   - 不需要: 里程碑(MILESTONES)、产品清单(LINE_ITEMS)
 *
 * 项目外包 (PROJECT_OUTSOURCING):
 *   - 需要: 基本信息、财务信息、时间信息、里程碑、交付物、风险条款
 *   - 不需要: 人力费率(RATE_ITEMS)、产品清单(LINE_ITEMS)
 *
 * 产品销售 (PRODUCT_SALES):
 *   - 需要: 基本信息、财务信息、时间信息、产品清单、风险条款
 *   - 不需要: 里程碑(MILESTONES)、人力费率(RATE_ITEMS)、交付物(DELIVERABLES)
 */
export const CONTRACT_TYPE_TOPIC_BATCHES: Record<ContractTypeEnum, TopicBatch> = {
  // 人力外包合同主题批次
  [ContractTypeEnum.STAFF_AUGMENTATION]: {
    contractType: ContractTypeEnum.STAFF_AUGMENTATION,
    contractTypeName: ContractTypeNames[ContractTypeEnum.STAFF_AUGMENTATION],
    topics: [
      ExtractTopic.BASIC_INFO,   // 基本信息
      ExtractTopic.FINANCIAL,    // 财务信息
      ExtractTopic.TIME_INFO,    // 时间信息
      ExtractTopic.RATE_ITEMS,   // 人力费率 (核心)
      ExtractTopic.DELIVERABLES, // 交付物
      ExtractTopic.RISK_CLAUSES, // 风险条款
    ],
    description: '人力外包合同专用主题批次',
  },

  // 项目外包合同主题批次
  [ContractTypeEnum.PROJECT_OUTSOURCING]: {
    contractType: ContractTypeEnum.PROJECT_OUTSOURCING,
    contractTypeName: ContractTypeNames[ContractTypeEnum.PROJECT_OUTSOURCING],
    topics: [
      ExtractTopic.BASIC_INFO,   // 基本信息
      ExtractTopic.FINANCIAL,    // 财务信息
      ExtractTopic.TIME_INFO,    // 时间信息
      ExtractTopic.MILESTONES,   // 里程碑 (核心)
      ExtractTopic.DELIVERABLES, // 交付物
      ExtractTopic.RISK_CLAUSES, // 风险条款
    ],
    description: '项目外包合同专用主题批次',
  },

  // 产品销售合同主题批次
  [ContractTypeEnum.PRODUCT_SALES]: {
    contractType: ContractTypeEnum.PRODUCT_SALES,
    contractTypeName: ContractTypeNames[ContractTypeEnum.PRODUCT_SALES],
    topics: [
      ExtractTopic.BASIC_INFO,   // 基本信息
      ExtractTopic.FINANCIAL,    // 财务信息
      ExtractTopic.TIME_INFO,    // 时间信息
      ExtractTopic.LINE_ITEMS,   // 产品清单 (核心)
      ExtractTopic.RISK_CLAUSES, // 风险条款
    ],
    description: '产品销售合同专用主题批次',
  },

  // 混合类型合同主题批次（包含所有主题）
  [ContractTypeEnum.MIXED]: {
    contractType: ContractTypeEnum.MIXED,
    contractTypeName: ContractTypeNames[ContractTypeEnum.MIXED],
    topics: [
      ExtractTopic.BASIC_INFO,   // 基本信息
      ExtractTopic.FINANCIAL,    // 财务信息
      ExtractTopic.TIME_INFO,    // 时间信息
      ExtractTopic.MILESTONES,   // 里程碑
      ExtractTopic.RATE_ITEMS,   // 人力费率
      ExtractTopic.LINE_ITEMS,   // 产品清单
      ExtractTopic.DELIVERABLES, // 交付物
      ExtractTopic.RISK_CLAUSES, // 风险条款
    ],
    description: '混合类型合同，执行所有主题提取',
  },
};

/**
 * 获取合同类型的主题批次
 */
export function getTopicBatchForContractType(contractType: string): TopicBatch | undefined {
  return CONTRACT_TYPE_TOPIC_BATCHES[contractType as ContractTypeEnum];
}

/**
 * 获取合同类型需要执行的主题列表
 */
export function getTopicsForContractType(contractType: string): ExtractTopic[] {
  const batch = getTopicBatchForContractType(contractType);
  return (batch?.topics || []) as ExtractTopic[];
}
