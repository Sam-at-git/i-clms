import { z } from 'zod';

/**
 * 合同类型枚举 Zod Schema
 */
export const ContractTypeZodEnum = z.enum([
  'STAFF_AUGMENTATION',
  'PROJECT_OUTSOURCING',
  'PRODUCT_SALES',
]);

export type ContractTypeZod = z.infer<typeof ContractTypeZodEnum>;

/**
 * BASIC_INFO 主题 Zod Schema
 *
 * 提取合同基本信息：编号、名称、类型、签约方等
 */
export const BasicInfoZodSchema = z.object({
  contractNumber: z.string().nullable().describe('合同编号/合同号'),
  title: z.string().nullable().describe('合同名称/标题'),
  contractType: ContractTypeZodEnum.nullable().describe(
    '合同类型: STAFF_AUGMENTATION(人力外包), PROJECT_OUTSOURCING(项目外包), PRODUCT_SALES(产品销售)'
  ),
  firstPartyName: z.string().nullable().describe('甲方名称(委托方/发包方/买方/客户)'),
  secondPartyName: z.string().nullable().describe('乙方名称(受托方/承包方/卖方/供应商)'),
  industry: z.string().nullable().describe('所属行业'),
});

export type BasicInfoZod = z.infer<typeof BasicInfoZodSchema>;

/**
 * FINANCIAL 主题 Zod Schema
 *
 * 提取财务信息：金额、币种、税率、付款条款等
 */
export const FinancialZodSchema = z.object({
  totalAmount: z.number().nullable().describe('合同总金额(纯数字)'),
  currency: z.string().default('CNY').describe('币种(CNY/USD/EUR等)'),
  taxRate: z.number().nullable().describe('税率(百分比数值，如6、13)'),
  amountWithTax: z.number().nullable().describe('含税金额'),
  amountWithoutTax: z.number().nullable().describe('不含税金额'),
  paymentTerms: z.string().nullable().describe('付款条款描述'),
  paymentMethod: z.string().nullable().describe('付款方式(银行转账/支票等)'),
});

export type FinancialZod = z.infer<typeof FinancialZodSchema>;

/**
 * TIME_INFO 主题 Zod Schema
 *
 * 提取时间信息：签约日期、起止日期、期限、续约等
 */
export const TimeInfoZodSchema = z.object({
  signDate: z.string().nullable().describe('签约日期(YYYY-MM-DD格式)'),
  startDate: z.string().nullable().describe('合同开始日期(YYYY-MM-DD格式)'),
  endDate: z.string().nullable().describe('合同结束日期(YYYY-MM-DD格式)'),
  duration: z.string().nullable().describe('合同期限(如"1年"、"6个月")'),
  autoRenewal: z.boolean().nullable().describe('是否自动续约'),
});

export type TimeInfoZod = z.infer<typeof TimeInfoZodSchema>;

/**
 * 里程碑项 Zod Schema (PROJECT_OUTSOURCING)
 */
export const MilestoneItemZodSchema = z.object({
  sequence: z.number().int().describe('里程碑序号'),
  name: z.string().describe('里程碑名称/阶段名称'),
  deliverables: z.string().nullable().describe('交付物描述'),
  amount: z.number().nullable().describe('里程碑金额'),
  paymentPercentage: z.number().nullable().describe('付款比例(百分比)'),
  plannedDate: z.string().nullable().describe('计划完成日期(YYYY-MM-DD格式)'),
  acceptanceCriteria: z.string().nullable().describe('验收标准'),
});

export type MilestoneItemZod = z.infer<typeof MilestoneItemZodSchema>;

/**
 * MILESTONES 主题 Zod Schema
 */
export const MilestonesZodSchema = z.object({
  milestones: z.array(MilestoneItemZodSchema).describe('里程碑列表'),
});

export type MilestonesZod = z.infer<typeof MilestonesZodSchema>;

/**
 * 费率类型枚举
 */
export const RateTypeZodEnum = z.enum(['HOURLY', 'DAILY', 'MONTHLY']);

export type RateTypeZod = z.infer<typeof RateTypeZodEnum>;

/**
 * 人员费率项 Zod Schema (STAFF_AUGMENTATION)
 */
export const RateItemZodSchema = z.object({
  role: z.string().describe('角色/职位名称'),
  rateType: RateTypeZodEnum.describe('费率类型: HOURLY(时薪), DAILY(日薪), MONTHLY(月薪)'),
  rate: z.number().describe('费率金额(纯数字)'),
  currency: z.string().nullable().default('CNY').describe('币种'),
  rateEffectiveFrom: z.string().nullable().describe('费率生效开始日期(YYYY-MM-DD格式)'),
  rateEffectiveTo: z.string().nullable().describe('费率生效结束日期(YYYY-MM-DD格式)'),
  quantity: z.number().int().nullable().describe('人数'),
});

export type RateItemZod = z.infer<typeof RateItemZodSchema>;

/**
 * RATE_ITEMS 主题 Zod Schema
 */
export const RateItemsZodSchema = z.object({
  rateItems: z.array(RateItemZodSchema).describe('人力费率列表'),
});

export type RateItemsZod = z.infer<typeof RateItemsZodSchema>;

/**
 * 产品明细项 Zod Schema (PRODUCT_SALES)
 */
export const LineItemZodSchema = z.object({
  productName: z.string().describe('产品/商品名称'),
  specification: z.string().nullable().describe('规格/型号'),
  quantity: z.number().int().describe('数量'),
  unit: z.string().nullable().describe('单位(个/台/套等)'),
  unitPriceWithTax: z.number().nullable().describe('含税单价'),
  unitPriceWithoutTax: z.number().nullable().describe('不含税单价'),
  subtotal: z.number().nullable().describe('小计金额'),
});

export type LineItemZod = z.infer<typeof LineItemZodSchema>;

/**
 * LINE_ITEMS 主题 Zod Schema
 */
export const LineItemsZodSchema = z.object({
  lineItems: z.array(LineItemZodSchema).describe('产品/商品行项目列表'),
});

export type LineItemsZod = z.infer<typeof LineItemsZodSchema>;

/**
 * RISK_CLAUSES 主题 Zod Schema
 *
 * 提取风险相关条款
 */
export const RiskClausesZodSchema = z.object({
  penaltyClause: z.string().nullable().describe('违约条款/违约责任描述'),
  confidentialityClause: z.string().nullable().describe('保密条款描述'),
  ipClause: z.string().nullable().describe('知识产权条款描述'),
  terminationClause: z.string().nullable().describe('合同终止/解除条款'),
  disputeResolution: z.string().nullable().describe('争议解决方式(仲裁/诉讼/协商等)'),
});

export type RiskClausesZod = z.infer<typeof RiskClausesZodSchema>;

/**
 * DELIVERABLES 主题 Zod Schema
 *
 * 提取交付物信息
 */
export const DeliverablesZodSchema = z.object({
  deliverables: z.array(z.string()).describe('交付物列表'),
  acceptanceCriteria: z.string().nullable().describe('总体验收标准'),
  deliveryMethod: z.string().nullable().describe('交付方式'),
  deliveryLocation: z.string().nullable().describe('交付地点'),
});

export type DeliverablesZod = z.infer<typeof DeliverablesZodSchema>;

/**
 * 主题名称 -> Zod Schema 映射表
 *
 * 将 ExtractTopic 枚举映射到对应的 Zod Schema 定义。
 * 这些 Schema 用于 Instructor 客户端的类型安全提取。
 */
export const TOPIC_ZOD_SCHEMAS = {
  BASIC_INFO: BasicInfoZodSchema,
  FINANCIAL: FinancialZodSchema,
  TIME_INFO: TimeInfoZodSchema,
  MILESTONES: MilestonesZodSchema,
  RATE_ITEMS: RateItemsZodSchema,
  LINE_ITEMS: LineItemsZodSchema,
  RISK_CLAUSES: RiskClausesZodSchema,
  DELIVERABLES: DeliverablesZodSchema,
} as const;

/**
 * 主题 Zod Schema 类型
 */
export type TopicZodSchemaType = typeof TOPIC_ZOD_SCHEMAS;

/**
 * 根据主题名称获取 Zod Schema
 *
 * @param topicName 主题名称 (ExtractTopic 枚举值)
 * @returns Zod Schema 对象，如果主题不存在则返回 undefined
 */
export function getTopicZodSchema(
  topicName: string
): (typeof TOPIC_ZOD_SCHEMAS)[keyof typeof TOPIC_ZOD_SCHEMAS] | undefined {
  return TOPIC_ZOD_SCHEMAS[topicName as keyof typeof TOPIC_ZOD_SCHEMAS];
}

/**
 * 检查主题是否有定义的 Zod Schema
 *
 * @param topicName 主题名称
 * @returns true 如果主题有定义的 Schema
 */
export function hasTopicZodSchema(topicName: string): boolean {
  return topicName in TOPIC_ZOD_SCHEMAS;
}

/**
 * 完整合同提取结果 Zod Schema
 */
export const FullContractZodSchema = z.object({
  basicInfo: BasicInfoZodSchema.nullable(),
  financial: FinancialZodSchema.nullable(),
  timeInfo: TimeInfoZodSchema.nullable(),
  milestones: z.array(MilestoneItemZodSchema).nullable(),
  rateItems: z.array(RateItemZodSchema).nullable(),
  lineItems: z.array(LineItemZodSchema).nullable(),
  riskClauses: RiskClausesZodSchema.nullable(),
  deliverables: z.array(z.string()).nullable(),
});

export type FullContractZod = z.infer<typeof FullContractZodSchema>;

/**
 * Instructor 兼容性测试用简单 Schema
 */
export const InstructorTestSchema = z.object({
  name: z.string().describe('提取的名称'),
  value: z.number().describe('提取的数值'),
});

export type InstructorTestResult = z.infer<typeof InstructorTestSchema>;
