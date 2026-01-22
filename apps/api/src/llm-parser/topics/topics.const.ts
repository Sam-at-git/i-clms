import { ExtractTopicDefinition } from './topic.interface';

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
    description: '合同编号、名称、签约方、日期等基础信息',
    weight: 4,
    order: 1,
    fields: [
      { name: 'contractNumber', type: 'string', required: false, description: '合同编号' },
      { name: 'title', type: 'string', required: false, description: '合同名称' },
      { name: 'contractType', type: 'string', required: false, description: '合同类型' },
      { name: 'firstPartyName', type: 'string', required: false, description: '甲方名称' },
      { name: 'secondPartyName', type: 'string', required: false, description: '乙方名称' },
      { name: 'industry', type: 'string', required: false, description: '所属行业' },
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
