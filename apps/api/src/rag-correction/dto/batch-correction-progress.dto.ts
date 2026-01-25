import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

/**
 * 批量修正进度状态
 */
export type BatchCorrectionStatus =
  | 'initializing'
  | 'evaluating'
  | 'correcting'
  | 'completed'
  | 'failed';

/**
 * 批量修正结果项
 */
@ObjectType()
export class BatchCorrectionResultItem {
  @Field()
  fieldName!: string;

  @Field()
  fieldDisplayName!: string;

  @Field({ nullable: true })
  originalValue?: string;

  @Field({ nullable: true })
  suggestedValue?: string;

  @Field()
  shouldChange!: boolean;

  @Field(() => Float)
  confidence!: number;

  @Field()
  evidence!: string;

  @Field({ nullable: true })
  reasoning?: string;
}

/**
 * 批量修正进度DTO
 */
@ObjectType()
export class BatchCorrectionProgressDto {
  @Field()
  sessionId!: string;

  @Field()
  status!: string;

  @Field(() => Int)
  totalFields!: number;

  @Field(() => Int)
  completedFields!: number;

  @Field({ nullable: true })
  currentField?: string;

  @Field(() => [BatchCorrectionResultItem])
  results!: BatchCorrectionResultItem[];

  @Field({ nullable: true })
  error?: string;
}

/**
 * 批量修正会话（内部使用）
 */
export interface BatchCorrectionSession {
  sessionId: string;
  contractId: string;
  status: BatchCorrectionStatus;
  totalFields: number;
  completedFields: number;
  currentField?: string;
  results: BatchCorrectionResultItem[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
