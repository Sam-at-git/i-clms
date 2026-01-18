// ================================
// Enums
// ================================

// 合同类型
export type ContractType = 'STAFF_AUGMENTATION' | 'PROJECT_OUTSOURCING' | 'PRODUCT_SALES';

// 合同状态
export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'TERMINATED'
  | 'EXPIRED';

// 解析状态
export type ParseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'MANUAL_REVIEW';

// 用户角色
export type UserRole = 'USER' | 'DEPT_ADMIN' | 'ADMIN';

// 部门代码
export type DepartmentCode =
  | 'FINANCE'
  | 'DELIVERY'
  | 'SALES'
  | 'MARKETING'
  | 'LEGAL'
  | 'EXECUTIVE';

// 费率类型
export type RateType = 'HOURLY' | 'DAILY' | 'MONTHLY';

// 里程碑状态
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'ACCEPTED' | 'REJECTED';

// ================================
// Base Entity
// ================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// ================================
// User & Department
// ================================

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  departmentId: string;
}

export interface Department extends BaseEntity {
  name: string;
  code: DepartmentCode;
}

// ================================
// Customer
// ================================

export interface Customer extends BaseEntity {
  name: string;
  shortName?: string;
  creditCode?: string;
  industry?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
}

// ================================
// Contract
// ================================

// 合同（简化版，用于列表展示）
export interface ContractSummary {
  id: string;
  contractNo: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  customerName: string;
  amountWithTax: number;
  currency: string;
  signedAt?: Date;
  expiresAt?: Date;
}

// 合同（完整版）
export interface Contract extends BaseEntity {
  contractNo: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  ourEntity: string;
  customerId: string;
  amountWithTax: number;
  amountWithoutTax?: number;
  currency: string;
  taxRate?: number;
  taxAmount?: number;
  paymentMethod?: string;
  paymentTerms?: string;
  signedAt?: Date;
  effectiveAt?: Date;
  expiresAt?: Date;
  duration?: string;
  fileUrl?: string;
  fileType?: string;
  copies?: number;
  signLocation?: string;
  industry?: string;
  departmentId: string;
  salesPerson?: string;
  parseStatus: ParseStatus;
  parsedAt?: Date;
  parseConfidence?: number;
  needsManualReview: boolean;
  parentContractId?: string;
  uploadedById: string;
}

// ================================
// Staff Augmentation (人力框架)
// ================================

export interface StaffAugmentationDetail {
  id: string;
  contractId: string;
  estimatedTotalHours?: number;
  monthlyHoursCap?: number;
  yearlyHoursCap?: number;
  settlementCycle?: string;
  timesheetApprovalFlow?: string;
  adjustmentMechanism?: string;
  staffReplacementFlow?: string;
  rateItems?: StaffRateItem[];
}

export interface StaffRateItem {
  id: string;
  detailId: string;
  role: string;
  rateType: RateType;
  rate: number;
  rateEffectiveFrom?: Date;
  rateEffectiveTo?: Date;
}

// ================================
// Project Outsourcing (项目外包)
// ================================

export interface ProjectOutsourcingDetail {
  id: string;
  contractId: string;
  sowSummary?: string;
  deliverables?: string;
  acceptanceCriteria?: string;
  acceptanceFlow?: string;
  changeManagementFlow?: string;
  milestones?: ProjectMilestone[];
}

export interface ProjectMilestone {
  id: string;
  detailId: string;
  sequence: number;
  name: string;
  deliverables?: string;
  amount?: number;
  paymentPercentage?: number;
  plannedDate?: Date;
  actualDate?: Date;
  acceptanceCriteria?: string;
  status: MilestoneStatus;
}

// ================================
// Product Sales (产品购销)
// ================================

export interface ProductSalesDetail {
  id: string;
  contractId: string;
  deliveryContent?: string;
  deliveryDate?: Date;
  deliveryLocation?: string;
  shippingResponsibility?: string;
  ipOwnership?: string;
  warrantyPeriod?: string;
  afterSalesTerms?: string;
  lineItems?: ProductLineItem[];
}

export interface ProductLineItem {
  id: string;
  detailId: string;
  productName: string;
  specification?: string;
  quantity: number;
  unit: string;
  unitPriceWithTax: number;
  unitPriceWithoutTax?: number;
  subtotal: number;
}

// ================================
// Tag
// ================================

export interface Tag {
  id: string;
  name: string;
  category?: string;
  color?: string;
}

export interface ContractTag {
  id: string;
  contractId: string;
  tagId: string;
}
