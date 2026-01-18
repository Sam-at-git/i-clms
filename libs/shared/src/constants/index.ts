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

// Department labels
export const DEPARTMENT_LABELS = {
  FINANCE: '财务部',
  DELIVERY: '交付部',
  SALES: '业务部',
  MARKETING: '市场部',
  LEGAL: '法务部',
  EXECUTIVE: '管理层',
} as const;

// Renewal reminder days
export const RENEWAL_REMINDER_DAYS = [90, 60, 30] as const;

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;
