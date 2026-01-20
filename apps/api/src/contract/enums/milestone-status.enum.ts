import { registerEnumType } from '@nestjs/graphql';

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

registerEnumType(MilestoneStatus, {
  name: 'MilestoneStatus',
  description: 'Status of a project milestone',
});
