import { ObjectType, Field, ID, Int, InputType } from '@nestjs/graphql';
import { JSONScalar } from '../../common/scalars';

@ObjectType('AuditOperator')
export class AuditOperatorDto {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;
}

@ObjectType('AuditLog')
export class AuditLogDto {
  @Field(() => ID)
  id!: string;

  @Field()
  action!: string;

  @Field()
  entityType!: string;

  @Field()
  entityId!: string;

  @Field({ nullable: true })
  entityName?: string;

  @Field(() => JSONScalar, { nullable: true })
  oldValue?: Record<string, unknown>;

  @Field(() => JSONScalar, { nullable: true })
  newValue?: Record<string, unknown>;

  @Field(() => AuditOperatorDto)
  operator!: AuditOperatorDto;

  @Field({ nullable: true })
  ipAddress?: string;

  @Field()
  createdAt!: Date;
}

@ObjectType('AuditLogConnection')
export class AuditLogConnectionDto {
  @Field(() => [AuditLogDto])
  items!: AuditLogDto[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}

@InputType('AuditLogFilterInput')
export class AuditLogFilterInput {
  @Field({ nullable: true })
  action?: string;

  @Field({ nullable: true })
  entityType?: string;

  @Field({ nullable: true })
  operatorId?: string;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;
}

// Audit action types
export enum AuditAction {
  // User actions
  CREATE_USER = 'CREATE_USER',
  UPDATE_USER = 'UPDATE_USER',
  TOGGLE_USER_STATUS = 'TOGGLE_USER_STATUS',
  RESET_USER_PASSWORD = 'RESET_USER_PASSWORD',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',

  // Department actions
  CREATE_DEPARTMENT = 'CREATE_DEPARTMENT',
  UPDATE_DEPARTMENT = 'UPDATE_DEPARTMENT',
  DELETE_DEPARTMENT = 'DELETE_DEPARTMENT',

  // Tag actions
  CREATE_TAG = 'CREATE_TAG',
  UPDATE_TAG = 'UPDATE_TAG',
  DELETE_TAG = 'DELETE_TAG',
  ASSIGN_TAG = 'ASSIGN_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
}

export enum EntityType {
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
  TAG = 'TAG',
  CONTRACT = 'CONTRACT',
}
