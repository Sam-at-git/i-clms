import { registerEnumType } from '@nestjs/graphql';

export enum ContractType {
  STAFF_AUGMENTATION = 'STAFF_AUGMENTATION',
  PROJECT_OUTSOURCING = 'PROJECT_OUTSOURCING',
  PRODUCT_SALES = 'PRODUCT_SALES',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
}

export enum ParseStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export enum DepartmentCode {
  FINANCE = 'FINANCE',
  DELIVERY = 'DELIVERY',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  LEGAL = 'LEGAL',
  EXECUTIVE = 'EXECUTIVE',
}

export enum UserRole {
  USER = 'USER',
  DEPT_ADMIN = 'DEPT_ADMIN',
  ADMIN = 'ADMIN',
}

export enum PricingModel {
  FIXED_PRICE = 'FIXED_PRICE',
  TIME_MATERIAL = 'TIME_MATERIAL',
  MIXED = 'MIXED',
}

registerEnumType(ContractType, {
  name: 'ContractType',
  description: 'Type of contract',
  valuesMap: {
    STAFF_AUGMENTATION: { description: '人力框架合同' },
    PROJECT_OUTSOURCING: { description: '项目外包合同' },
    PRODUCT_SALES: { description: '产品购销合同' },
  },
});

registerEnumType(ContractStatus, {
  name: 'ContractStatus',
  description: 'Status of contract',
  valuesMap: {
    DRAFT: { description: '草拟' },
    PENDING_APPROVAL: { description: '审批中' },
    ACTIVE: { description: '已生效' },
    EXECUTING: { description: '执行中' },
    COMPLETED: { description: '已完结' },
    TERMINATED: { description: '已终止' },
    EXPIRED: { description: '已过期' },
  },
});

registerEnumType(ParseStatus, {
  name: 'ParseStatus',
  description: 'Document parsing status',
  valuesMap: {
    PENDING: { description: '待解析' },
    PROCESSING: { description: '解析中' },
    COMPLETED: { description: '解析完成' },
    FAILED: { description: '解析失败' },
    MANUAL_REVIEW: { description: '人工审核中' },
  },
});

registerEnumType(DepartmentCode, {
  name: 'DepartmentCode',
  description: 'Department code',
});

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role',
});

registerEnumType(PricingModel, {
  name: 'PricingModel',
  description: '合同定价模式',
  valuesMap: {
    FIXED_PRICE: { description: '固定价格' },
    TIME_MATERIAL: { description: '工时材料' },
    MIXED: { description: '混合模式' },
  },
});
