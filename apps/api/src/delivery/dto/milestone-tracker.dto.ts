import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { MilestoneStatus } from '../../graphql/types/enums';

@ObjectType()
export class MilestoneItem {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Date, { nullable: true })
  plannedDate?: Date | null;

  @Field(() => Date, { nullable: true })
  actualDate?: Date | null;

  @Field(() => MilestoneStatus)
  status!: MilestoneStatus;

  @Field(() => Float, { nullable: true })
  amount?: number | null;

  @Field(() => Int, { nullable: true })
  daysOverdue?: number | null;
}

@ObjectType()
export class MilestoneOverview {
  @Field(() => Int)
  totalMilestones!: number;

  @Field(() => Int)
  completedCount!: number;

  @Field(() => Int)
  pendingCount!: number;

  @Field(() => Int)
  overdueCount!: number;

  @Field(() => [MilestoneItem])
  upcomingMilestones!: MilestoneItem[];

  @Field(() => [MilestoneItem])
  overdueMilestones!: MilestoneItem[];
}
