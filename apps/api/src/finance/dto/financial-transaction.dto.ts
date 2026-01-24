import { Field, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

// GraphQL Enums
export enum TransactionType {
  PAYMENT = 'PAYMENT',
  RECEIPT = 'RECEIPT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

registerEnumType(TransactionType, {
  name: 'TransactionType',
  description: '财务交易类型',
});

registerEnumType(TransactionStatus, {
  name: 'TransactionStatus',
  description: '财务交易状态',
});

// GraphQL Object Types
@ObjectType()
export class FinancialTransaction {
  @Field()
  id!: string;

  @Field()
  contractId!: string;

  @Field(() => TransactionType)
  type!: TransactionType;

  @Field()
  amount!: number;

  @Field()
  currency!: string;

  @Field()
  category!: string;

  @Field(() => TransactionStatus)
  status!: TransactionStatus;

  @Field()
  occurredAt!: Date;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field()
  createdBy!: string;
}

@ObjectType()
export class PaginatedFinancialTransactions {
  @Field(() => [FinancialTransaction])
  items!: FinancialTransaction[];

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
export class FinancialTransactionFilterInput {
  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => TransactionType, { nullable: true })
  type?: TransactionType;

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  startDate?: string;

  @Field(() => String, { nullable: true })
  endDate?: string;
}

@InputType()
export class CreateFinancialTransactionInput {
  @Field(() => String)
  contractId!: string;

  @Field(() => TransactionType)
  type!: TransactionType;

  @Field(() => Int)
  amount!: number;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => String)
  category!: string;

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field(() => String, { nullable: true })
  occurredAt?: string;

  @Field(() => String, { nullable: true })
  dueDate?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  metadata?: string;
}

@InputType()
export class UpdateFinancialTransactionInput {
  @Field(() => TransactionType, { nullable: true })
  type?: TransactionType;

  @Field(() => Int, { nullable: true })
  amount?: number;

  @Field(() => String, { nullable: true })
  currency?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field(() => String, { nullable: true })
  occurredAt?: string;

  @Field(() => String, { nullable: true })
  dueDate?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  metadata?: string;
}

@InputType()
export class RecordPaymentInput {
  @Field(() => String)
  contractId!: string;

  @Field(() => Int)
  amount!: number;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  paymentDate?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String, { nullable: true })
  dueDate?: string;
}

@InputType()
export class FinancialTransactionPaginationInput {
  @Field(() => FinancialTransactionFilterInput, { nullable: true })
  filter?: FinancialTransactionFilterInput;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field(() => Int, { nullable: true })
  pageSize?: number;

  @Field(() => String, { nullable: true })
  sortBy?: string;

  @Field(() => String, { nullable: true })
  sortOrder?: 'asc' | 'desc';
}
