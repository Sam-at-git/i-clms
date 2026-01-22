import { Field, ObjectType, InputType, Float, Int } from '@nestjs/graphql';

/**
 * Similarity Evaluation Result
 */
@ObjectType()
export class SimilarityEvaluationResult {
  @Field()
  isSame!: boolean;

  @Field(() => Float)
  similarityScore!: number; // 0-1

  @Field()
  betterResult!: 'A' | 'B' | 'same';

  @Field()
  reason!: string;
}

/**
 * Quality Evaluation Result
 */
@ObjectType()
export class QualityEvaluationResult {
  @Field()
  fieldName!: string;

  @Field(() => String) // Use JSON scalar for complex types
  value!: string;

  @Field()
  quality!: 'excellent' | 'good' | 'fair' | 'poor';

  @Field(() => Float)
  confidence!: number; // 0-1

  @Field(() => [String])
  issues!: string[];

  @Field(() => [String])
  suggestions!: string[];
}

/**
 * Conflict Resolution Result (extended version)
 */
@ObjectType()
export class ConflictResolutionResult {
  @Field()
  fieldName!: string;

  @Field(() => String, { nullable: true })
  resolvedValue!: string | null;

  @Field(() => Float)
  confidence!: number;

  @Field()
  resolutionMethod!: 'A' | 'B' | 'merged' | 'custom';

  @Field()
  explanation!: string;
}

/**
 * Batch Evaluation Options
 */
@InputType()
export class BatchEvaluationOptions {
  @Field(() => Boolean, { nullable: true })
  evaluateQuality?: boolean;

  @Field(() => Boolean, { nullable: true })
  evaluateSimilarity?: boolean;

  @Field(() => String, { nullable: true })
  referenceText?: string;
}

/**
 * Batch Evaluation Result
 */
@ObjectType()
export class BatchEvaluationResult {
  @Field(() => QualityEvaluationResult)
  qualities!: Record<string, QualityEvaluationResult>;

  @Field(() => Float)
  overallQuality!: number;

  @Field(() => Int)
  evaluatedFields!: number;
}
