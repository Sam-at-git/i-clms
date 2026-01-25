/**
 * Contract Field Configuration
 * 合同字段配置 - 用于前端UI显示和RAG修正功能
 *
 * 国际化友好：displayName当前为中文，未来可替换为i18n key
 */

export type FieldType = 'string' | 'number' | 'date' | 'decimal' | 'enum';
export type FieldGroup = 'basic' | 'financial' | 'time' | 'other' | 'system';

export interface ContractFieldConfig {
  /** Prisma字段名 */
  fieldName: string;
  /** 显示名称（当前中文，未来可替换为i18n key） */
  displayName: string;
  /** 字段类型 */
  fieldType: FieldType;
  /** 字段分组 */
  group: FieldGroup;
  /** 是否可编辑 */
  editable: boolean;
  /** 是否支持RAG修正 */
  ragSupported: boolean;
  /** RAG查询模板（仅ragSupported=true时有效） */
  ragQuery?: string;
  /** RAG修正保守阈值（0-1，越高越保守） */
  conservativeThreshold?: number;
}

export const CONTRACT_FIELD_CONFIGS: ContractFieldConfig[] = [
  // === 基本信息 (group: 'basic') ===
  {
    fieldName: 'contractNo',
    displayName: '合同编号',
    fieldType: 'string',
    group: 'basic',
    editable: false,
    ragSupported: false,
  },
  {
    fieldName: 'name',
    displayName: '合同名称',
    fieldType: 'string',
    group: 'basic',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出本合同的正式名称、合同标题或文件名称',
    conservativeThreshold: 0.8,
  },
  {
    fieldName: 'type',
    displayName: '合同类型',
    fieldType: 'enum',
    group: 'basic',
    editable: true,
    ragSupported: false,
  },
  {
    fieldName: 'status',
    displayName: '合同状态',
    fieldType: 'enum',
    group: 'basic',
    editable: true,
    ragSupported: false,
  },
  {
    fieldName: 'ourEntity',
    displayName: '乙方/供应商',
    fieldType: 'string',
    group: 'basic',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出乙方、受托方、承包方或供应商的公司名称',
    conservativeThreshold: 0.85,
  },
  {
    fieldName: 'customerId',
    displayName: '甲方/客户',
    fieldType: 'string',
    group: 'basic',
    editable: true,
    ragSupported: false,
  },

  // === 财务信息 (group: 'financial') ===
  {
    fieldName: 'amountWithTax',
    displayName: '含税金额',
    fieldType: 'decimal',
    group: 'financial',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同的含税总金额、合同金额、交易金额或总价款',
    conservativeThreshold: 0.9,
  },
  {
    fieldName: 'amountWithoutTax',
    displayName: '不含税金额',
    fieldType: 'decimal',
    group: 'financial',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同的不含税金额、税前金额或净价',
    conservativeThreshold: 0.9,
  },
  {
    fieldName: 'currency',
    displayName: '币种',
    fieldType: 'string',
    group: 'financial',
    editable: true,
    ragSupported: false,
  },
  {
    fieldName: 'taxRate',
    displayName: '税率',
    fieldType: 'decimal',
    group: 'financial',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同中的税率、增值税率或税点百分比',
    conservativeThreshold: 0.85,
  },
  {
    fieldName: 'paymentMethod',
    displayName: '付款方式',
    fieldType: 'string',
    group: 'financial',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出付款方式，如银行转账、现金、支票、承兑汇票等',
    conservativeThreshold: 0.75,
  },
  {
    fieldName: 'paymentTerms',
    displayName: '付款条件',
    fieldType: 'string',
    group: 'financial',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出付款条件、付款条款、付款计划或账期约定',
    conservativeThreshold: 0.75,
  },

  // === 时间信息 (group: 'time') ===
  {
    fieldName: 'signedAt',
    displayName: '签订日期',
    fieldType: 'date',
    group: 'time',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同的签订日期、签署日期或签约时间',
    conservativeThreshold: 0.85,
  },
  {
    fieldName: 'effectiveAt',
    displayName: '生效日期',
    fieldType: 'date',
    group: 'time',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同的生效日期、开始日期、有效起始时间或起效日',
    conservativeThreshold: 0.85,
  },
  {
    fieldName: 'expiresAt',
    displayName: '终止日期',
    fieldType: 'date',
    group: 'time',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同的终止日期、到期日期、有效截止时间或届满日',
    conservativeThreshold: 0.85,
  },
  {
    fieldName: 'duration',
    displayName: '合同期限',
    fieldType: 'string',
    group: 'time',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同期限、有效期、服务周期或履行期限的时间描述',
    conservativeThreshold: 0.75,
  },

  // === 其他信息 (group: 'other') ===
  {
    fieldName: 'industry',
    displayName: '所属行业',
    fieldType: 'string',
    group: 'other',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同涉及的行业、业务领域、服务类型或项目性质',
    conservativeThreshold: 0.7,
  },
  {
    fieldName: 'salesPerson',
    displayName: '销售负责人',
    fieldType: 'string',
    group: 'other',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出销售负责人、业务联系人、项目经理或商务代表的姓名',
    conservativeThreshold: 0.8,
  },
  {
    fieldName: 'signLocation',
    displayName: '签订地点',
    fieldType: 'string',
    group: 'other',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同的签订地点、签署地或落款地点',
    conservativeThreshold: 0.75,
  },
  {
    fieldName: 'copies',
    displayName: '合同份数',
    fieldType: 'number',
    group: 'other',
    editable: true,
    ragSupported: true,
    ragQuery: '请找出合同的份数、签署份数或本合同一式几份',
    conservativeThreshold: 0.8,
  },
  {
    fieldName: 'departmentId',
    displayName: '所属部门',
    fieldType: 'string',
    group: 'other',
    editable: true,
    ragSupported: false,
  },

  // === 系统字段 (group: 'system') - 不可编辑 ===
  {
    fieldName: 'id',
    displayName: 'ID',
    fieldType: 'string',
    group: 'system',
    editable: false,
    ragSupported: false,
  },
  {
    fieldName: 'createdAt',
    displayName: '创建时间',
    fieldType: 'date',
    group: 'system',
    editable: false,
    ragSupported: false,
  },
  {
    fieldName: 'updatedAt',
    displayName: '更新时间',
    fieldType: 'date',
    group: 'system',
    editable: false,
    ragSupported: false,
  },
  {
    fieldName: 'parseStatus',
    displayName: '解析状态',
    fieldType: 'enum',
    group: 'system',
    editable: false,
    ragSupported: false,
  },
  {
    fieldName: 'isVectorized',
    displayName: '已向量化',
    fieldType: 'string',
    group: 'system',
    editable: false,
    ragSupported: false,
  },
  {
    fieldName: 'fileUrl',
    displayName: '文件路径',
    fieldType: 'string',
    group: 'system',
    editable: false,
    ragSupported: false,
  },
  {
    fieldName: 'fileType',
    displayName: '文件类型',
    fieldType: 'string',
    group: 'system',
    editable: false,
    ragSupported: false,
  },
];

// === 辅助函数 ===

/**
 * 根据字段名获取字段配置
 */
export const getFieldConfig = (
  fieldName: string
): ContractFieldConfig | undefined =>
  CONTRACT_FIELD_CONFIGS.find((f) => f.fieldName === fieldName);

/**
 * 根据字段名获取显示名称
 */
export const getDisplayName = (fieldName: string): string =>
  getFieldConfig(fieldName)?.displayName || fieldName;

/**
 * 获取所有可编辑字段
 */
export const getEditableFields = (): ContractFieldConfig[] =>
  CONTRACT_FIELD_CONFIGS.filter((f) => f.editable);

/**
 * 获取所有支持RAG修正的字段
 */
export const getRagSupportedFields = (): ContractFieldConfig[] =>
  CONTRACT_FIELD_CONFIGS.filter((f) => f.ragSupported);

/**
 * 根据分组获取字段
 */
export const getFieldsByGroup = (group: FieldGroup): ContractFieldConfig[] =>
  CONTRACT_FIELD_CONFIGS.filter((f) => f.group === group);

/**
 * 获取字段的RAG查询模板
 */
export const getFieldRagQuery = (fieldName: string): string | undefined =>
  getFieldConfig(fieldName)?.ragQuery;

/**
 * 获取字段的保守阈值
 */
export const getFieldConservativeThreshold = (fieldName: string): number =>
  getFieldConfig(fieldName)?.conservativeThreshold ?? 0.8;

/**
 * 检查字段是否支持RAG修正
 */
export const isRagSupported = (fieldName: string): boolean =>
  getFieldConfig(fieldName)?.ragSupported ?? false;
