import { registerEnumType } from '@nestjs/graphql';

// 重新导出 contract/models/enums.ts 中的枚举（避免重复注册）
export {
  UserRole,
  DepartmentCode,
  ContractType,
  ContractStatus,
  ParseStatus,
} from '../../contract/models/enums';

// 费率类型（仅在此处定义）
export enum RateType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

registerEnumType(RateType, {
  name: 'RateType',
  description: '费率类型',
});

// 里程碑状态（仅在此处定义）
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
