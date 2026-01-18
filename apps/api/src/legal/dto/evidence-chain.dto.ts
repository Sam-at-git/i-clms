import { ObjectType, Field, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class Evidence {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  eventType!: string;

  @Field(() => Date)
  eventDate!: Date;

  @Field(() => String)
  description!: string;

  @Field(() => String, { nullable: true })
  fileUrl?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class EvidenceChain {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  contractName!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => [Evidence])
  evidences!: Evidence[];

  @Field(() => Float)
  completenessScore!: number;

  @Field(() => Int)
  milestonesCovered!: number;

  @Field(() => Int)
  totalMilestones!: number;
}
