import { Field, ObjectType, registerEnumType, Int } from '@nestjs/graphql';

/**
 * 向量化方式枚举
 */
export enum VectorizationMethod {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

registerEnumType(VectorizationMethod, {
  name: 'VectorizationMethod',
  description: 'Method used for contract vectorization',
});

/**
 * 向量化结果DTO
 */
@ObjectType()
export class VectorizationResult {
  @Field(() => Boolean, { description: 'Whether vectorization succeeded' })
  success!: boolean;

  @Field(() => String, { description: 'Result message' })
  message!: string;

  @Field(() => Int, { nullable: true, description: 'Number of chunks created' })
  chunkCount?: number;

  @Field(() => Date, { nullable: true, description: 'Vectorization timestamp' })
  vectorizedAt?: Date;

  @Field(() => String, { nullable: true, description: 'Error code if failed' })
  error?: string;
}

/**
 * 批量向量化结果DTO
 */
@ObjectType()
export class BatchVectorizationResult {
  @Field(() => Boolean, { description: 'Whether all vectorizations succeeded' })
  success!: boolean;

  @Field(() => Int, { description: 'Number of contracts processed' })
  processed!: number;

  @Field(() => Int, { description: 'Number of contracts failed' })
  failed!: number;

  @Field(() => [BatchVectorizationError], { nullable: true, description: 'List of errors' })
  errors?: BatchVectorizationError[];
}

/**
 * 批量向量化错误详情
 */
@ObjectType()
export class BatchVectorizationError {
  @Field(() => String, { description: 'Contract ID' })
  contractId!: string;

  @Field(() => String, { description: 'Error message' })
  error!: string;
}

/**
 * 向量化检查结果DTO
 */
@ObjectType()
export class CanVectorizeResult {
  @Field(() => Boolean, { description: 'Whether contract can be vectorized' })
  canVectorize!: boolean;

  @Field(() => String, { nullable: true, description: 'Reason if cannot vectorize' })
  reason?: string;
}
