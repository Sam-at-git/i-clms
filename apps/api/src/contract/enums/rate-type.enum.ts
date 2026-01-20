import { registerEnumType } from '@nestjs/graphql';

export enum RateType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

registerEnumType(RateType, {
  name: 'RateType',
  description: 'Rate type for staff augmentation',
});
