import { Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

// GraphQL Enums
export enum RiskAlertType {
  CONTRACT_EXPIRY = 'CONTRACT_EXPIRY',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  COMPLIANCE = 'COMPLIANCE',
  FINANCIAL = 'FINANCIAL',
  LEGAL = 'LEGAL',
  OPERATIONAL = 'OPERATIONAL',
}

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
  ESCALATED = 'ESCALATED',
}

registerEnumType(RiskAlertType, {
  name: 'RiskAlertType',
  description: '风险告警类型',
});

registerEnumType(RiskSeverity, {
  name: 'RiskSeverity',
  description: '风险严重程度',
});

registerEnumType(AlertStatus, {
  name: 'AlertStatus',
  description: '告警状态',
});

// GraphQL Object Types
@ObjectType()
export class RiskAlertModel {
  @Field()
  id!: string;

  @Field()
  contractId!: string;

  @Field(() => RiskAlertType)
  type!: RiskAlertType;

  @Field(() => RiskSeverity)
  severity!: RiskSeverity;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => AlertStatus)
  status!: AlertStatus;

  @Field({ nullable: true })
  dismissedAt?: Date;

  @Field({ nullable: true })
  dismissedBy?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class PaginatedRiskAlerts {
  @Field(() => [RiskAlertModel])
  items!: RiskAlertModel[];

  @Field()
  total!: number;

  @Field()
  page!: number;

  @Field()
  pageSize!: number;

  @Field()
  totalPages!: number;
}

// Risk Assessment Object Types
@ObjectType()
export class RiskAssessmentHistory {
  @Field()
  id!: string;

  @Field()
  contractId!: string;

  @Field()
  totalScore!: number;

  @Field()
  riskLevel!: string;

  @Field(() => GraphQLJSONObject)
  factors!: Record<string, unknown>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  recommendations?: Record<string, unknown>;

  @Field()
  assessedAt!: Date;

  @Field({ nullable: true })
  assessedBy?: string;
}

@ObjectType()
export class PaginatedRiskAssessments {
  @Field(() => [RiskAssessmentHistory])
  items!: RiskAssessmentHistory[];

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
export class RiskAlertFilterInput {
  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => RiskAlertType, { nullable: true })
  type?: RiskAlertType;

  @Field(() => RiskSeverity, { nullable: true })
  severity?: RiskSeverity;

  @Field(() => AlertStatus, { nullable: true })
  status?: AlertStatus;

  @Field(() => String, { nullable: true })
  startDate?: string;

  @Field(() => String, { nullable: true })
  endDate?: string;
}

@InputType()
export class CreateRiskAlertInput {
  @Field(() => String)
  contractId!: string;

  @Field(() => RiskAlertType)
  type!: RiskAlertType;

  @Field(() => RiskSeverity)
  severity!: RiskSeverity;

  @Field(() => String)
  title!: string;

  @Field(() => String)
  description!: string;
}

@InputType()
export class UpdateRiskAlertInput {
  @Field(() => RiskSeverity, { nullable: true })
  severity?: RiskSeverity;

  @Field(() => AlertStatus, { nullable: true })
  status?: AlertStatus;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  description?: string;
}

@InputType()
export class RiskAlertPaginationInput {
  @Field(() => RiskAlertFilterInput, { nullable: true })
  filter?: RiskAlertFilterInput;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  pageSize?: number;

  @Field(() => String, { nullable: true })
  sortBy?: string;

  @Field(() => String, { nullable: true })
  sortOrder?: 'asc' | 'desc';
}

// Risk Assessment Input Types
@InputType()
export class SaveRiskAssessmentInput {
  @Field(() => String)
  contractId!: string;

  @Field(() => Int)
  totalScore!: number;

  @Field(() => String)
  riskLevel!: string;

  @Field(() => String)
  factors!: string;

  @Field(() => String, { nullable: true })
  recommendations?: string;

  @Field(() => String, { nullable: true })
  assessedBy?: string;
}
