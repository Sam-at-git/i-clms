import { Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

// GraphQL Enums
export enum ReviewStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum LegalRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

registerEnumType(ReviewStatus, {
  name: 'ReviewStatus',
  description: '法务审查状态',
});

registerEnumType(LegalRiskLevel, {
  name: 'LegalRiskLevel',
  description: '法务风险等级',
});

// GraphQL Object Types
@ObjectType()
export class LegalReview {
  @Field()
  id!: string;

  @Field()
  contractId!: string;

  @Field()
  reviewerId!: string;

  @Field(() => ReviewStatus)
  status!: ReviewStatus;

  @Field(() => GraphQLJSONObject)
  findings!: Record<string, unknown>;

  @Field(() => String)
  riskLevel!: string;

  @Field({ nullable: true })
  recommendations?: string;

  @Field({ nullable: true })
  reviewedAt?: Date;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class PaginatedLegalReviews {
  @Field(() => [LegalReview])
  items!: LegalReview[];

  @Field()
  total!: number;

  @Field()
  page!: number;

  @Field()
  pageSize!: number;

  @Field()
  totalPages!: number;
}

// Input Types
@InputType()
export class LegalReviewFilterInput {
  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => ReviewStatus, { nullable: true })
  status?: ReviewStatus;

  @Field(() => LegalRiskLevel, { nullable: true })
  riskLevel?: LegalRiskLevel;

  @Field(() => String, { nullable: true })
  reviewerId?: string;

  @Field(() => String, { nullable: true })
  startDate?: string;

  @Field(() => String, { nullable: true })
  endDate?: string;
}

@InputType()
export class CreateLegalReviewInput {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  reviewerId!: string;

  @Field(() => LegalRiskLevel)
  riskLevel!: LegalRiskLevel;

  @Field(() => String, { nullable: true })
  findings?: string;

  @Field(() => String, { nullable: true })
  recommendations?: string;

  @Field(() => ReviewStatus, { nullable: true })
  status?: ReviewStatus;
}

@InputType()
export class UpdateLegalReviewInput {
  @Field(() => ReviewStatus, { nullable: true })
  status?: ReviewStatus;

  @Field(() => LegalRiskLevel, { nullable: true })
  riskLevel?: LegalRiskLevel;

  @Field(() => String, { nullable: true })
  findings?: string;

  @Field(() => String, { nullable: true })
  recommendations?: string;

  @Field(() => String, { nullable: true })
  reviewedAt?: string;
}

@InputType()
export class LegalReviewPaginationInput {
  @Field(() => LegalReviewFilterInput, { nullable: true })
  filter?: LegalReviewFilterInput;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  pageSize?: number;

  @Field(() => String, { nullable: true })
  sortBy?: string;

  @Field(() => String, { nullable: true })
  sortOrder?: 'asc' | 'desc';
}
