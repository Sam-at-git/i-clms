import { z } from 'zod';

/**
 * Enhanced Contract Schemas
 *
 * Comprehensive schemas for extracting detailed contract information.
 * Structure:
 * 1. Common/Shared schemas (all contract types)
 * 2. Type-specific schemas (PROJECT_OUTSOURCING, STAFF_AUGMENTATION, PRODUCT_SALES)
 */

// =============================================================================
// COMMON / SHARED SCHEMAS (All Contract Types)
// =============================================================================

/**
 * Contract Metadata Schema
 */
export const ContractMetadataSchema = z.object({
  documentTitle: z.string().nullable().describe('文档/合同标题'),
  contractId: z.string().nullable().describe('合同编号/合同ID'),
  version: z.string().nullable().describe('合同版本号'),
  effectiveDate: z.string().nullable().describe('生效日期(YYYY-MM-DD)'),
  expiryDate: z.string().nullable().describe('到期日期(YYYY-MM-DD)'),
  governingLanguage: z.string().nullable().describe('合同语言'),
  signLocation: z.string().nullable().describe('签订地点'),
  copies: z.number().int().nullable().describe('合同份数'),
});

export type ContractMetadata = z.infer<typeof ContractMetadataSchema>;

/**
 * Party Contact Details Schema
 */
export const PartyContactSchema = z.object({
  legalName: z.string().nullable().describe('公司全称/法定名称'),
  shortName: z.string().nullable().describe('公司简称'),
  address: z.string().nullable().describe('公司地址'),
  legalRepresentative: z.string().nullable().describe('法定代表人'),
  contactPerson: z.string().nullable().describe('联系人'),
  phone: z.string().nullable().describe('联系电话'),
  email: z.string().nullable().describe('电子邮箱'),
  creditCode: z.string().nullable().describe('统一社会信用代码'),
  bankName: z.string().nullable().describe('开户银行'),
  bankAccount: z.string().nullable().describe('银行账号'),
});

export type PartyContact = z.infer<typeof PartyContactSchema>;

/**
 * Contract Parties Schema (甲方/乙方)
 */
export const ContractPartiesSchema = z.object({
  client: PartyContactSchema.describe('甲方/委托方/发包方/买方信息'),
  vendor: PartyContactSchema.describe('乙方/受托方/承包方/卖方信息'),
});

export type ContractParties = z.infer<typeof ContractPartiesSchema>;

/**
 * Contract Recitals Schema (合同背景陈述)
 */
export const ContractRecitalsSchema = z.object({
  recitals: z.array(z.string()).describe('合同背景陈述/鉴于条款列表'),
});

export type ContractRecitals = z.infer<typeof ContractRecitalsSchema>;

/**
 * Contract Definitions Schema (重要术语定义)
 */
export const ContractDefinitionsSchema = z.object({
  definitions: z.record(z.string(), z.string()).describe('术语定义映射，key为术语名，value为定义'),
});

export type ContractDefinitions = z.infer<typeof ContractDefinitionsSchema>;

/**
 * Confidentiality Clause Schema (保密条款)
 */
export const ConfidentialityClauseSchema = z.object({
  definition: z.string().nullable().describe('保密信息定义'),
  obligation: z.string().nullable().describe('保密义务描述'),
  termYears: z.number().nullable().describe('保密期限(年)'),
  exclusions: z.array(z.string()).nullable().describe('保密信息的排除情形'),
});

export type ConfidentialityClause = z.infer<typeof ConfidentialityClauseSchema>;

/**
 * Force Majeure Schema (不可抗力)
 */
export const ForceMajeureSchema = z.object({
  definition: z.string().nullable().describe('不可抗力定义'),
  obligation: z.string().nullable().describe('发生不可抗力时的义务'),
  longTermEffect: z.string().nullable().describe('长期不可抗力的处理'),
});

export type ForceMajeure = z.infer<typeof ForceMajeureSchema>;

/**
 * Dispute Resolution Schema (争议解决)
 */
export const DisputeResolutionSchema = z.object({
  method: z.string().nullable().describe('争议解决方式(仲裁/诉讼/协商)'),
  location: z.string().nullable().describe('争议解决地点/管辖法院'),
  steps: z.array(z.string()).nullable().describe('争议解决步骤'),
});

export type DisputeResolution = z.infer<typeof DisputeResolutionSchema>;

/**
 * Notices Schema (通知条款)
 */
export const NoticesClauseSchema = z.object({
  requirement: z.string().nullable().describe('通知要求'),
  deemedReceipt: z.string().nullable().describe('视为收到的条件'),
});

export type NoticesClause = z.infer<typeof NoticesClauseSchema>;

/**
 * General Provisions Schema (通用条款)
 */
export const GeneralProvisionsSchema = z.object({
  entireAgreement: z.string().nullable().describe('完整协议条款'),
  amendment: z.string().nullable().describe('修改条款'),
  assignment: z.string().nullable().describe('转让条款'),
  severability: z.string().nullable().describe('可分割性条款'),
  forceMajeure: ForceMajeureSchema.nullable().describe('不可抗力条款'),
  governingLaw: z.string().nullable().describe('适用法律'),
  disputeResolution: DisputeResolutionSchema.nullable().describe('争议解决'),
  notices: NoticesClauseSchema.nullable().describe('通知条款'),
});

export type GeneralProvisions = z.infer<typeof GeneralProvisionsSchema>;

// =============================================================================
// PROJECT_OUTSOURCING SPECIFIC SCHEMAS
// =============================================================================

/**
 * Technical Specifications Schema
 */
export const TechnicalSpecificationsSchema = z.object({
  developmentStack: z.object({
    frontend: z.array(z.string()).nullable().describe('前端技术栈'),
    backend: z.array(z.string()).nullable().describe('后端技术栈'),
    database: z.array(z.string()).nullable().describe('数据库'),
    thirdPartyServices: z.array(z.string()).nullable().describe('第三方服务'),
  }).nullable(),
  performanceRequirements: z.object({
    concurrentUsers: z.string().nullable().describe('并发用户数'),
    responseTime: z.string().nullable().describe('响应时间要求'),
    availability: z.string().nullable().describe('可用性要求'),
  }).nullable(),
  compatibilityRequirements: z.array(z.string()).nullable().describe('兼容性要求'),
});

export type TechnicalSpecifications = z.infer<typeof TechnicalSpecificationsSchema>;

/**
 * Project Scope Schema (项目范围)
 */
export const ProjectScopeSchema = z.object({
  projectName: z.string().nullable().describe('项目名称'),
  overview: z.string().nullable().describe('项目概述'),
  detailedRequirements: z.object({
    description: z.string().nullable().describe('需求描述'),
    inScopeFeatures: z.array(z.string()).nullable().describe('范围内功能'),
    outOfScopeItems: z.array(z.string()).nullable().describe('范围外内容'),
  }).nullable(),
  technicalSpecifications: TechnicalSpecificationsSchema.nullable(),
  deliverablesList: z.array(z.string()).nullable().describe('交付物清单'),
});

export type ProjectScope = z.infer<typeof ProjectScopeSchema>;

/**
 * Enhanced Milestone Schema
 */
export const EnhancedMilestoneSchema = z.object({
  id: z.string().nullable().describe('里程碑编号'),
  sequence: z.number().int().describe('里程碑序号'),
  name: z.string().describe('里程碑名称'),
  targetDate: z.string().nullable().describe('目标完成日期(YYYY-MM-DD)'),
  deliverable: z.string().nullable().describe('交付物描述'),
  acceptanceCriteria: z.string().nullable().describe('验收标准'),
  paymentPercentage: z.number().nullable().describe('付款比例(百分比)'),
  paymentAmount: z.number().nullable().describe('付款金额'),
});

export type EnhancedMilestone = z.infer<typeof EnhancedMilestoneSchema>;

/**
 * Project Timeline Schema
 */
export const ProjectTimelineSchema = z.object({
  startDate: z.string().nullable().describe('项目开始日期(YYYY-MM-DD)'),
  endDate: z.string().nullable().describe('项目结束日期(YYYY-MM-DD)'),
  milestones: z.array(EnhancedMilestoneSchema).describe('里程碑列表'),
});

export type ProjectTimeline = z.infer<typeof ProjectTimelineSchema>;

/**
 * Acceptance Procedure Schema (验收流程)
 */
export const AcceptanceProcedureSchema = z.object({
  method: z.string().nullable().describe('验收方式(UAT/测试等)'),
  standardsBasis: z.string().nullable().describe('验收标准依据'),
  periodDays: z.number().nullable().describe('验收期限(天)'),
  process: z.record(z.string(), z.string()).nullable().describe('验收流程步骤'),
  deemedAcceptance: z.string().nullable().describe('视为验收通过的条件'),
});

export type AcceptanceProcedure = z.infer<typeof AcceptanceProcedureSchema>;

/**
 * Payment Schedule Item Schema
 */
export const PaymentScheduleItemSchema = z.object({
  phase: z.string().describe('付款阶段名称'),
  milestoneId: z.string().nullable().describe('关联里程碑ID'),
  trigger: z.string().nullable().describe('付款触发条件'),
  percentage: z.number().nullable().describe('付款比例(百分比)'),
  amount: z.number().nullable().describe('付款金额'),
  dueDays: z.number().nullable().describe('付款期限(天)'),
});

export type PaymentScheduleItem = z.infer<typeof PaymentScheduleItemSchema>;

/**
 * Enhanced Payment Terms Schema
 */
export const EnhancedPaymentTermsSchema = z.object({
  totalContractValue: z.number().nullable().describe('合同总金额'),
  currency: z.string().nullable().describe('币种'),
  isTaxInclusive: z.boolean().nullable().describe('是否含税'),
  pricingModel: z.string().nullable().describe('定价模式(固定价格/工时计费等)'),
  paymentSchedule: z.array(PaymentScheduleItemSchema).nullable().describe('付款计划'),
  changeOrderCost: z.string().nullable().describe('变更费用处理'),
});

export type EnhancedPaymentTerms = z.infer<typeof EnhancedPaymentTermsSchema>;

/**
 * Intellectual Property Schema (知识产权)
 */
export const IntellectualPropertySchema = z.object({
  ownershipOfDeliverables: z.string().nullable().describe('交付物知识产权归属'),
  backgroundIp: z.string().nullable().describe('背景知识产权处理'),
  thirdPartyComponents: z.object({
    requirement: z.string().nullable().describe('第三方组件使用要求'),
    warranty: z.string().nullable().describe('第三方组件使用保证'),
  }).nullable(),
  assistance: z.string().nullable().describe('知识产权登记协助义务'),
});

export type IntellectualProperty = z.infer<typeof IntellectualPropertySchema>;

/**
 * Response Time Tier Schema
 */
export const ResponseTimeTierSchema = z.object({
  severity: z.string().describe('问题严重程度'),
  initialResponse: z.string().nullable().describe('初始响应时间'),
  resolutionTarget: z.string().nullable().describe('解决目标时间'),
});

export type ResponseTimeTier = z.infer<typeof ResponseTimeTierSchema>;

/**
 * Warranties and Support Schema
 */
export const WarrantiesAndSupportSchema = z.object({
  warrantyPeriodMonths: z.number().nullable().describe('质保期(月)'),
  startOfWarranty: z.string().nullable().describe('质保期起算时间'),
  coverage: z.string().nullable().describe('质保覆盖范围'),
  responseTimeTiers: z.array(ResponseTimeTierSchema).nullable().describe('响应时间分级'),
  postWarrantySupport: z.string().nullable().describe('质保期后支持安排'),
});

export type WarrantiesAndSupport = z.infer<typeof WarrantiesAndSupportSchema>;

/**
 * Liquidated Damages Schema
 */
export const LiquidatedDamagesSchema = z.object({
  delayDelivery: z.object({
    description: z.string().nullable().describe('延迟交付违约金描述'),
    rate: z.string().nullable().describe('违约金费率'),
    cap: z.string().nullable().describe('违约金上限'),
  }).nullable(),
});

export type LiquidatedDamages = z.infer<typeof LiquidatedDamagesSchema>;

/**
 * Liability and Termination Schema
 */
export const LiabilityAndTerminationSchema = z.object({
  liquidatedDamages: LiquidatedDamagesSchema.nullable().describe('违约金条款'),
  liabilityCap: z.string().nullable().describe('责任限额'),
  terminationForConvenience: z.string().nullable().describe('便利终止条款'),
  terminationForCause: z.object({
    materialBreach: z.string().nullable().describe('重大违约终止'),
    insolvency: z.string().nullable().describe('破产终止'),
  }).nullable(),
  effectOfTermination: z.string().nullable().describe('终止后果'),
});

export type LiabilityAndTermination = z.infer<typeof LiabilityAndTerminationSchema>;

// =============================================================================
// STAFF_AUGMENTATION SPECIFIC SCHEMAS
// =============================================================================

/**
 * Staff Qualification Schema
 */
export const StaffQualificationSchema = z.object({
  role: z.string().describe('角色/职位名称'),
  level: z.string().nullable().describe('级别'),
  yearsOfExperience: z.number().nullable().describe('经验年限要求'),
  skills: z.array(z.string()).nullable().describe('技能要求'),
  certifications: z.array(z.string()).nullable().describe('证书要求'),
  quantity: z.number().int().nullable().describe('需求人数'),
});

export type StaffQualification = z.infer<typeof StaffQualificationSchema>;

/**
 * Staff Requirements Schema
 */
export const StaffRequirementsSchema = z.object({
  staffList: z.array(StaffQualificationSchema).describe('人员需求列表'),
  workLocation: z.string().nullable().describe('工作地点'),
  workMode: z.string().nullable().describe('工作模式(驻场/远程/混合)'),
  reportingStructure: z.string().nullable().describe('汇报结构'),
});

export type StaffRequirements = z.infer<typeof StaffRequirementsSchema>;

/**
 * Enhanced Rate Item Schema
 */
export const EnhancedRateItemSchema = z.object({
  role: z.string().describe('角色/职位名称'),
  level: z.string().nullable().describe('级别'),
  rateType: z.enum(['HOURLY', 'DAILY', 'MONTHLY']).describe('费率类型'),
  rate: z.number().describe('费率金额'),
  currency: z.string().nullable().describe('币种'),
  overtimeRate: z.number().nullable().describe('加班费率'),
  effectiveFrom: z.string().nullable().describe('费率生效日期(YYYY-MM-DD)'),
  effectiveTo: z.string().nullable().describe('费率失效日期(YYYY-MM-DD)'),
  quantity: z.number().int().nullable().describe('人数'),
});

export type EnhancedRateItem = z.infer<typeof EnhancedRateItemSchema>;

/**
 * Rate Structure Schema
 */
export const RateStructureSchema = z.object({
  rateItems: z.array(EnhancedRateItemSchema).describe('费率项列表'),
  rateAdjustmentMechanism: z.string().nullable().describe('费率调整机制'),
  minimumEngagement: z.string().nullable().describe('最低服务期限'),
});

export type RateStructure = z.infer<typeof RateStructureSchema>;

/**
 * Work Hours Schema
 */
export const WorkHoursSchema = z.object({
  standardHoursPerDay: z.number().nullable().describe('每日标准工时'),
  standardHoursPerWeek: z.number().nullable().describe('每周标准工时'),
  monthlyHoursCap: z.number().nullable().describe('每月工时上限'),
  yearlyHoursCap: z.number().nullable().describe('每年工时上限'),
  overtimePolicy: z.string().nullable().describe('加班政策'),
  holidayPolicy: z.string().nullable().describe('节假日政策'),
});

export type WorkHours = z.infer<typeof WorkHoursSchema>;

/**
 * Settlement Schema
 */
export const SettlementSchema = z.object({
  settlementCycle: z.string().nullable().describe('结算周期(月/季度)'),
  timesheetApprovalFlow: z.string().nullable().describe('工时单审批流程'),
  invoiceRequirements: z.string().nullable().describe('发票要求'),
  paymentTerms: z.string().nullable().describe('付款条款'),
});

export type Settlement = z.infer<typeof SettlementSchema>;

/**
 * Personnel Management Schema
 */
export const PersonnelManagementSchema = z.object({
  staffReplacementFlow: z.string().nullable().describe('人员更换流程'),
  performanceManagement: z.string().nullable().describe('绩效管理'),
  trainingRequirements: z.string().nullable().describe('培训要求'),
  confidentialityRequirements: z.string().nullable().describe('保密要求'),
});

export type PersonnelManagement = z.infer<typeof PersonnelManagementSchema>;

// =============================================================================
// PRODUCT_SALES SPECIFIC SCHEMAS
// =============================================================================

/**
 * Enhanced Product Line Item Schema
 */
export const EnhancedProductLineItemSchema = z.object({
  productName: z.string().describe('产品名称'),
  productCode: z.string().nullable().describe('产品编号'),
  specification: z.string().nullable().describe('规格/型号'),
  quantity: z.number().int().describe('数量'),
  unit: z.string().nullable().describe('单位'),
  unitPriceWithTax: z.number().nullable().describe('含税单价'),
  unitPriceWithoutTax: z.number().nullable().describe('不含税单价'),
  taxRate: z.number().nullable().describe('税率(百分比)'),
  subtotal: z.number().nullable().describe('小计金额'),
  deliveryDate: z.string().nullable().describe('交付日期(YYYY-MM-DD)'),
});

export type EnhancedProductLineItem = z.infer<typeof EnhancedProductLineItemSchema>;

/**
 * Product Details Schema
 */
export const ProductDetailsSchema = z.object({
  lineItems: z.array(EnhancedProductLineItemSchema).describe('产品明细列表'),
  totalQuantity: z.number().nullable().describe('总数量'),
  totalAmountWithTax: z.number().nullable().describe('含税总金额'),
  totalAmountWithoutTax: z.number().nullable().describe('不含税总金额'),
});

export type ProductDetails = z.infer<typeof ProductDetailsSchema>;

/**
 * Delivery Terms Schema
 */
export const DeliveryTermsSchema = z.object({
  deliveryMethod: z.string().nullable().describe('交付方式'),
  deliveryLocation: z.string().nullable().describe('交付地点'),
  deliveryDate: z.string().nullable().describe('交付日期(YYYY-MM-DD)'),
  shippingResponsibility: z.string().nullable().describe('运输责任'),
  insuranceResponsibility: z.string().nullable().describe('保险责任'),
  packagingRequirements: z.string().nullable().describe('包装要求'),
  inspectionProcedure: z.string().nullable().describe('验收程序'),
});

export type DeliveryTerms = z.infer<typeof DeliveryTermsSchema>;

/**
 * Product Warranty Schema
 */
export const ProductWarrantySchema = z.object({
  warrantyPeriod: z.string().nullable().describe('保修期'),
  warrantyScope: z.string().nullable().describe('保修范围'),
  warrantyExclusions: z.array(z.string()).nullable().describe('保修排除项'),
  warrantyProcess: z.string().nullable().describe('保修流程'),
});

export type ProductWarranty = z.infer<typeof ProductWarrantySchema>;

/**
 * After Sales Service Schema
 */
export const AfterSalesServiceSchema = z.object({
  serviceScope: z.string().nullable().describe('服务范围'),
  responseTime: z.string().nullable().describe('响应时间'),
  servicePeriod: z.string().nullable().describe('服务期限'),
  serviceCharges: z.string().nullable().describe('服务费用'),
  spareParts: z.string().nullable().describe('备件供应'),
  technicalSupport: z.string().nullable().describe('技术支持'),
});

export type AfterSalesService = z.infer<typeof AfterSalesServiceSchema>;

// =============================================================================
// COMPOSITE SCHEMAS BY CONTRACT TYPE
// =============================================================================

/**
 * Common Contract Info Schema (Shared by all types)
 */
export const CommonContractInfoSchema = z.object({
  metadata: ContractMetadataSchema.nullable(),
  parties: ContractPartiesSchema.nullable(),
  recitals: ContractRecitalsSchema.nullable(),
  definitions: ContractDefinitionsSchema.nullable(),
  confidentiality: ConfidentialityClauseSchema.nullable(),
  generalProvisions: GeneralProvisionsSchema.nullable(),
});

export type CommonContractInfo = z.infer<typeof CommonContractInfoSchema>;

/**
 * Project Outsourcing Contract Schema
 */
export const ProjectOutsourcingContractSchema = z.object({
  common: CommonContractInfoSchema,
  projectScope: ProjectScopeSchema.nullable(),
  projectTimeline: ProjectTimelineSchema.nullable(),
  acceptanceProcedure: AcceptanceProcedureSchema.nullable(),
  paymentTerms: EnhancedPaymentTermsSchema.nullable(),
  intellectualProperty: IntellectualPropertySchema.nullable(),
  warrantiesAndSupport: WarrantiesAndSupportSchema.nullable(),
  liabilityAndTermination: LiabilityAndTerminationSchema.nullable(),
});

export type ProjectOutsourcingContract = z.infer<typeof ProjectOutsourcingContractSchema>;

/**
 * Staff Augmentation Contract Schema
 */
export const StaffAugmentationContractSchema = z.object({
  common: CommonContractInfoSchema,
  staffRequirements: StaffRequirementsSchema.nullable(),
  rateStructure: RateStructureSchema.nullable(),
  workHours: WorkHoursSchema.nullable(),
  settlement: SettlementSchema.nullable(),
  personnelManagement: PersonnelManagementSchema.nullable(),
  liabilityAndTermination: LiabilityAndTerminationSchema.nullable(),
});

export type StaffAugmentationContract = z.infer<typeof StaffAugmentationContractSchema>;

/**
 * Product Sales Contract Schema
 */
export const ProductSalesContractSchema = z.object({
  common: CommonContractInfoSchema,
  productDetails: ProductDetailsSchema.nullable(),
  deliveryTerms: DeliveryTermsSchema.nullable(),
  paymentTerms: EnhancedPaymentTermsSchema.nullable(),
  productWarranty: ProductWarrantySchema.nullable(),
  afterSalesService: AfterSalesServiceSchema.nullable(),
  intellectualProperty: IntellectualPropertySchema.nullable(),
  liabilityAndTermination: LiabilityAndTerminationSchema.nullable(),
});

export type ProductSalesContract = z.infer<typeof ProductSalesContractSchema>;

// =============================================================================
// TOPIC-BASED SCHEMAS (Flat extraction for individual topics)
// =============================================================================

/**
 * Enhanced BASIC_INFO Topic Schema (Replaces simple BasicInfoZodSchema)
 */
export const EnhancedBasicInfoSchema = z.object({
  // Metadata
  contractNumber: z.string().nullable().describe('合同编号/合同号'),
  title: z.string().nullable().describe('合同名称/标题'),
  contractType: z.enum(['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES']).nullable(),
  version: z.string().nullable().describe('合同版本号'),
  effectiveDate: z.string().nullable().describe('生效日期(YYYY-MM-DD)'),
  governingLanguage: z.string().nullable().describe('合同语言'),
  signLocation: z.string().nullable().describe('签订地点'),
  copies: z.number().int().nullable().describe('合同份数'),

  // Parties
  firstPartyName: z.string().nullable().describe('甲方名称(委托方/发包方/买方)'),
  firstPartyAddress: z.string().nullable().describe('甲方地址'),
  firstPartyLegalRep: z.string().nullable().describe('甲方法定代表人'),
  firstPartyContact: z.string().nullable().describe('甲方联系人'),
  firstPartyPhone: z.string().nullable().describe('甲方电话'),
  firstPartyEmail: z.string().nullable().describe('甲方邮箱'),
  firstPartyCreditCode: z.string().nullable().describe('甲方统一社会信用代码'),

  secondPartyName: z.string().nullable().describe('乙方名称(受托方/承包方/卖方)'),
  secondPartyAddress: z.string().nullable().describe('乙方地址'),
  secondPartyLegalRep: z.string().nullable().describe('乙方法定代表人'),
  secondPartyContact: z.string().nullable().describe('乙方联系人'),
  secondPartyPhone: z.string().nullable().describe('乙方电话'),
  secondPartyEmail: z.string().nullable().describe('乙方邮箱'),
  secondPartyCreditCode: z.string().nullable().describe('乙方统一社会信用代码'),

  // Industry
  industry: z.string().nullable().describe('所属行业'),
  projectName: z.string().nullable().describe('项目名称'),
});

export type EnhancedBasicInfo = z.infer<typeof EnhancedBasicInfoSchema>;

/**
 * Enhanced FINANCIAL Topic Schema
 */
export const EnhancedFinancialSchema = z.object({
  totalAmount: z.number().nullable().describe('合同总金额'),
  currency: z.string().nullable().describe('币种(CNY/USD/EUR等)'),
  isTaxInclusive: z.boolean().nullable().describe('是否含税'),
  taxRate: z.number().nullable().describe('税率(百分比数值)'),
  amountWithTax: z.number().nullable().describe('含税金额'),
  amountWithoutTax: z.number().nullable().describe('不含税金额'),
  taxAmount: z.number().nullable().describe('税额'),
  paymentTerms: z.string().nullable().describe('付款条款描述'),
  paymentMethod: z.string().nullable().describe('付款方式'),
  pricingModel: z.string().nullable().describe('定价模式(固定价格/工时计费等)'),
  invoiceType: z.string().nullable().describe('发票类型'),
  paymentSchedule: z.array(PaymentScheduleItemSchema).nullable().describe('付款计划'),
});

export type EnhancedFinancial = z.infer<typeof EnhancedFinancialSchema>;

/**
 * Enhanced RISK_CLAUSES Topic Schema
 */
export const EnhancedRiskClausesSchema = z.object({
  // Penalty/Breach
  penaltyClause: z.string().nullable().describe('违约条款/违约责任描述'),
  delayPenaltyRate: z.string().nullable().describe('延迟违约金费率'),
  penaltyCap: z.string().nullable().describe('违约金上限'),

  // Confidentiality
  confidentialityClause: z.string().nullable().describe('保密条款描述'),
  confidentialityPeriod: z.number().nullable().describe('保密期限(年)'),

  // IP
  ipClause: z.string().nullable().describe('知识产权条款描述'),
  ipOwnership: z.string().nullable().describe('知识产权归属'),

  // Termination
  terminationClause: z.string().nullable().describe('合同终止/解除条款'),
  terminationNotice: z.string().nullable().describe('终止通知期'),

  // Dispute
  disputeResolution: z.string().nullable().describe('争议解决方式'),
  governingLaw: z.string().nullable().describe('适用法律'),
  disputeLocation: z.string().nullable().describe('管辖法院/仲裁机构'),

  // Liability
  liabilityCap: z.string().nullable().describe('责任限额'),

  // Force Majeure
  forceMajeureClause: z.string().nullable().describe('不可抗力条款'),
});

export type EnhancedRiskClauses = z.infer<typeof EnhancedRiskClausesSchema>;

/**
 * Schema Registry - Maps topic names to schemas
 */
export const ENHANCED_TOPIC_SCHEMAS = {
  BASIC_INFO: EnhancedBasicInfoSchema,
  FINANCIAL: EnhancedFinancialSchema,
  RISK_CLAUSES: EnhancedRiskClausesSchema,
  // Keep existing schemas for array-based topics
  // MILESTONES, RATE_ITEMS, LINE_ITEMS, TIME_INFO, DELIVERABLES
} as const;

/**
 * Contract Type Schema Registry
 */
export const CONTRACT_TYPE_SCHEMAS = {
  PROJECT_OUTSOURCING: ProjectOutsourcingContractSchema,
  STAFF_AUGMENTATION: StaffAugmentationContractSchema,
  PRODUCT_SALES: ProductSalesContractSchema,
} as const;
