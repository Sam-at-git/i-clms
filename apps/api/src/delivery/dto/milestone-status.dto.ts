import { ObjectType, Field, ID, InputType, registerEnumType } from '@nestjs/graphql';
import { MilestoneStatus } from '../../graphql/types/enums';

// 里程碑状态历史
@ObjectType()
export class MilestoneStatusHistory {
  @Field(() => ID)
  id!: string;

  @Field(() => MilestoneStatus)
  fromStatus!: MilestoneStatus;

  @Field(() => MilestoneStatus)
  toStatus!: MilestoneStatus;

  @Field(() => ID)
  changedBy!: string;

  @Field()
  changedByName!: string; // 变更人姓名

  @Field()
  changedAt!: Date;

  @Field(() => String, { nullable: true })
  notes?: string | null;
}

// 里程碑详情（包含状态历史）
@ObjectType()
export class MilestoneDetail {
  @Field(() => ID)
  id!: string;

  @Field()
  sequence!: number;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  deliverables?: string | null;

  @Field(() => String, { nullable: true })
  amount?: string | null;

  @Field(() => String, { nullable: true })
  paymentPercentage?: string | null;

  @Field(() => Date, { nullable: true })
  plannedDate?: Date | null;

  @Field(() => Date, { nullable: true })
  actualDate?: Date | null;

  @Field(() => String, { nullable: true })
  acceptanceCriteria?: string | null;

  @Field(() => MilestoneStatus)
  status!: MilestoneStatus;

  // 交付物文件信息
  @Field(() => String, { nullable: true })
  deliverableFileUrl?: string | null;

  @Field(() => String, { nullable: true })
  deliverableFileName?: string | null;

  @Field(() => Date, { nullable: true })
  deliverableUploadedAt?: Date | null;

  // 验收相关信息
  @Field(() => Date, { nullable: true })
  acceptedAt?: Date | null;

  @Field(() => ID, { nullable: true })
  acceptedBy?: string | null;

  @Field(() => String, { nullable: true })
  acceptedByName?: string | null;

  @Field(() => Date, { nullable: true })
  rejectedAt?: Date | null;

  @Field(() => ID, { nullable: true })
  rejectedBy?: string | null;

  @Field(() => String, { nullable: true })
  rejectedByName?: string | null;

  @Field(() => String, { nullable: true })
  rejectionReason?: string | null;

  // 状态历史
  @Field(() => [MilestoneStatusHistory])
  statusHistory!: MilestoneStatusHistory[];

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

// 输入类型
@InputType()
export class UpdateMilestoneStatusInput {
  @Field(() => ID)
  id!: string;

  @Field(() => MilestoneStatus)
  status!: MilestoneStatus;

  @Field(() => String, { nullable: true })
  notes?: string;
}

@InputType()
export class UploadDeliverableInput {
  @Field(() => ID)
  milestoneId!: string;

  @Field()
  fileUrl!: string;

  @Field()
  fileName!: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@InputType()
export class AcceptMilestoneInput {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  notes?: string;
}

@InputType()
export class RejectMilestoneInput {
  @Field(() => ID)
  id!: string;

  @Field()
  reason!: string;
}
