import { InputType, Field, registerEnumType } from '@nestjs/graphql';
import { ContractType, ContractStatus, ParseStatus } from '../models';

export enum ContractOrderField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  SIGNED_AT = 'signedAt',
  EXPIRES_AT = 'expiresAt',
  AMOUNT = 'amountWithTax',
  NAME = 'name',
  CONTRACT_NO = 'contractNo',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

registerEnumType(ContractOrderField, {
  name: 'ContractOrderField',
  description: 'Field to order contracts by',
});

registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Sort direction',
});

@InputType()
export class ContractFilterInput {
  @Field(() => String, { nullable: true })
  search?: string;

  @Field(() => [ContractType], { nullable: true })
  types?: ContractType[];

  @Field(() => [ContractStatus], { nullable: true })
  statuses?: ContractStatus[];

  @Field(() => [ParseStatus], { nullable: true })
  parseStatuses?: ParseStatus[];

  @Field(() => String, { nullable: true })
  customerId?: string;

  @Field(() => String, { nullable: true })
  departmentId?: string;

  @Field(() => Date, { nullable: true })
  signedAfter?: Date;

  @Field(() => Date, { nullable: true })
  signedBefore?: Date;

  @Field(() => Date, { nullable: true })
  expiresAfter?: Date;

  @Field(() => Date, { nullable: true })
  expiresBefore?: Date;

  @Field(() => Boolean, { nullable: true })
  needsManualReview?: boolean;

  @Field(() => Number, { nullable: true })
  minAmount?: number;

  @Field(() => Number, { nullable: true })
  maxAmount?: number;
}

@InputType()
export class ContractOrderInput {
  @Field(() => ContractOrderField, { defaultValue: ContractOrderField.CREATED_AT })
  field!: ContractOrderField;

  @Field(() => SortOrder, { defaultValue: SortOrder.DESC })
  direction!: SortOrder;
}
