import { ObjectType, Field, ID, Float } from '@nestjs/graphql';
import { MilestoneStatus } from '../enums/milestone-status.enum';

@ObjectType()
export class ProjectMilestone {
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
}

@ObjectType()
export class ProjectOutsourcingDetail {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  sowSummary?: string | null;

  @Field(() => String, { nullable: true })
  deliverables?: string | null;

  @Field(() => String, { nullable: true })
  acceptanceCriteria?: string | null;

  @Field(() => String, { nullable: true })
  acceptanceFlow?: string | null;

  @Field(() => String, { nullable: true })
  changeManagementFlow?: string | null;

  @Field(() => [ProjectMilestone])
  milestones!: ProjectMilestone[];
}
