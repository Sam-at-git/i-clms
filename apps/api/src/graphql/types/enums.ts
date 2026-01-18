import { registerEnumType } from '@nestjs/graphql';

// 用户角色
export enum UserRole {
  USER = 'USER',
  DEPT_ADMIN = 'DEPT_ADMIN',
  ADMIN = 'ADMIN',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: '用户角色',
});

// 部门代码
export enum DepartmentCode {
  FINANCE = 'FINANCE',
  DELIVERY = 'DELIVERY',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  LEGAL = 'LEGAL',
  EXECUTIVE = 'EXECUTIVE',
}

registerEnumType(DepartmentCode, {
  name: 'DepartmentCode',
  description: '部门代码',
});

// 合同类型
export enum ContractType {
  STAFF_AUGMENTATION = 'STAFF_AUGMENTATION',
  PROJECT_OUTSOURCING = 'PROJECT_OUTSOURCING',
  PRODUCT_SALES = 'PRODUCT_SALES',
}

registerEnumType(ContractType, {
  name: 'ContractType',
  description: '合同类型',
});

// 合同状态
export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
}

registerEnumType(ContractStatus, {
  name: 'ContractStatus',
  description: '合同状态',
});

// 解析状态
export enum ParseStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

registerEnumType(ParseStatus, {
  name: 'ParseStatus',
  description: '解析状态',
});

// 费率类型
export enum RateType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

registerEnumType(RateType, {
  name: 'RateType',
  description: '费率类型',
});

// 里程碑状态
export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

registerEnumType(MilestoneStatus, {
  name: 'MilestoneStatus',
  description: '里程碑状态',
});
