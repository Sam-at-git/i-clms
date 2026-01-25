// Contract field configurations
export * from './contract-fields.const';

// Contract type labels
export const CONTRACT_TYPE_LABELS = {
  STAFF_AUGMENTATION: '人力框架合同',
  PROJECT_OUTSOURCING: '项目外包合同',
  PRODUCT_SALES: '产品购销合同',
} as const;

// Contract status labels
export const CONTRACT_STATUS_LABELS = {
  DRAFT: '草拟',
  PENDING_APPROVAL: '审批中',
  ACTIVE: '已生效',
  EXECUTING: '执行中',
  COMPLETED: '已完结',
  TERMINATED: '已终止',
  EXPIRED: '已过期',
} as const;

// Parse status labels
export const PARSE_STATUS_LABELS = {
  PENDING: '待解析',
  PROCESSING: '解析中',
  COMPLETED: '解析完成',
  FAILED: '解析失败',
  MANUAL_REVIEW: '人工审核中',
} as const;

// User role labels
export const USER_ROLE_LABELS = {
  USER: '普通用户',
  DEPT_ADMIN: '部门管理员',
  ADMIN: '系统管理员',
} as const;

// Department labels
export const DEPARTMENT_LABELS = {
  FINANCE: '财务部门',
  DELIVERY: 'PMO/交付部门',
  SALES: '业务/销售部门',
  MARKETING: '市场部门',
  LEGAL: '法务/风控部门',
  EXECUTIVE: '管理层',
} as const;

// Rate type labels
export const RATE_TYPE_LABELS = {
  HOURLY: '时薪',
  DAILY: '日薪',
  MONTHLY: '月薪',
} as const;

// Milestone status labels
export const MILESTONE_STATUS_LABELS = {
  PENDING: '待开始',
  IN_PROGRESS: '进行中',
  DELIVERED: '已交付',
  ACCEPTED: '已验收',
  REJECTED: '被拒绝',
} as const;

// Renewal reminder days
export const RENEWAL_REMINDER_DAYS = [90, 60, 30] as const;

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;

// Default currency
export const DEFAULT_CURRENCY = 'CNY';

// Supported currencies
export const SUPPORTED_CURRENCIES = ['CNY', 'USD', 'EUR', 'JPY', 'HKD'] as const;
