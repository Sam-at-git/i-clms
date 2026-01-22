import { Field, ObjectType, InputType, Float, Int } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

/**
 * Default voting configuration
 */
export const DEFAULT_VOTE_CONFIG: VoteConfig = {
  threshold: 0.6,
  strategies: {
    RULE: { weight: 1.0, enabled: true },
    LLM: { weight: 1.2, enabled: true },
    DOCLING: { weight: 1.1, enabled: true },
    RAG: { weight: 1.3, enabled: true },
  },
};

/**
 * Vote configuration
 */
export interface VoteConfig {
  threshold: number; // Pass threshold 0-1
  strategies: {
    [key: string]: {
      weight: number; // Strategy weight
      enabled: boolean;
    };
  };
}

/**
 * Strategy vote
 */
@ObjectType()
export class StrategyVote {
  @Field()
  strategy!: string;

  @Field(() => GraphQLJSONObject)
  value!: any;

  @Field(() => Float)
  weight!: number;
}

/**
 * Vote result
 */
@ObjectType()
export class VoteResult {
  @Field()
  fieldName!: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  agreedValue!: any;

  @Field(() => Float)
  confidence!: number; // 0-1

  @Field(() => [StrategyVote])
  votes!: StrategyVote[];

  @Field()
  needsResolution!: boolean;

  @Field(() => String, { nullable: true })
  resolutionMethod?: 'vote' | 'llm' | 'user';
}

/**
 * Multi-strategy parse result
 */
@ObjectType()
export class MultiStrategyParseResult {
  @Field(() => [VotingStrategyResult])
  results!: VotingStrategyResult[];

  @Field(() => GraphQLJSONObject)
  finalFields!: Record<string, any>;

  @Field(() => [VoteResult])
  voteResults!: VoteResult[];

  @Field(() => Float)
  overallConfidence!: number;

  @Field(() => [String])
  conflicts!: string[];

  @Field(() => [String])
  warnings!: string[];

  @Field(() => Int)
  duration!: number;

  @Field(() => String, { nullable: true })
  timestamp?: string;
}

/**
 * Individual strategy result for voting
 */
@ObjectType()
export class VotingStrategyResult {
  @Field()
  strategy!: string;

  @Field()
  success!: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  fields!: Record<string, any>;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field(() => Int, { nullable: true })
  processingTimeMs?: number;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Input for multi-strategy parsing
 */
@InputType()
export class MultiStrategyParseInput {
  @Field(() => String)
  content!: string;

  @Field(() => [String])
  strategies!: string[];

  @Field(() => GraphQLJSONObject, { nullable: true })
  options?: Record<string, any>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  voteConfig?: Partial<VoteConfig>;
}

/**
 * Input for resolving conflicts
 */
@InputType()
export class ResolveConflictsInput {
  @Field(() => String)
  parseResultId!: string;

  @Field(() => [String])
  fields!: string[];

  @Field(() => String)
  method!: 'llm' | 'vote' | 'user';

  @Field(() => GraphQLJSONObject, { nullable: true })
  userChoices?: Record<string, any>;
}

/**
 * Conflict resolution result
 */
@ObjectType()
export class ConflictResolution {
  @Field(() => GraphQLJSONObject, { nullable: true })
  value!: any;

  @Field(() => Float)
  confidence!: number;

  @Field(() => String)
  reason!: string;
}

/**
 * Similarity evaluation result
 */
@ObjectType()
export class SimilarityResult {
  @Field()
  isSame!: boolean;

  @Field(() => Float)
  similarity!: number;

  @Field()
  better!: 'A' | 'B' | 'same';

  @Field()
  reason!: string;
}
