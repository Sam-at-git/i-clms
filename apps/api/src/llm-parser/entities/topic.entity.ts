import { Field, ObjectType, registerEnumType, Int, Float } from '@nestjs/graphql';
import { ExtractTopic, ExtractTopicNames } from '../topics/topics.const';

// Register ExtractTopic as GraphQL enum
registerEnumType(ExtractTopic, {
  name: 'ExtractTopic',
  description: 'Contract information extraction topic types',
});

/**
 * Topic Field Definition (GraphQL)
 */
@ObjectType({ description: 'Field definition within an extraction topic' })
export class TopicField {
  @Field(() => String, { description: 'Field name' })
  name!: string;

  @Field(() => String, { description: 'Field data type' })
  type!: string;

  @Field(() => Boolean, { description: 'Whether this field is required' })
  required!: boolean;

  @Field(() => String, { description: 'Field description', nullable: true })
  description?: string;

  @Field(() => String, { description: 'Default value', nullable: true })
  defaultValue?: string;
}

/**
 * Topic Definition (GraphQL)
 */
@ObjectType({ description: 'Definition of an extraction topic' })
export class TopicDefinition {
  @Field(() => ExtractTopic, { description: 'Topic unique identifier' })
  name!: ExtractTopic;

  @Field(() => String, { description: 'Display name' })
  displayName!: string;

  @Field(() => String, { description: 'Topic description' })
  description!: string;

  @Field(() => [TopicField], { description: 'Fields in this topic' })
  fields!: TopicField[];

  @Field(() => String, { description: 'LLM prompt template', nullable: true })
  prompt?: string;

  @Field(() => String, { description: 'RAG query template', nullable: true })
  query?: string;

  @Field(() => Float, { description: 'Weight for completeness calculation', nullable: true })
  weight?: number;

  @Field(() => Int, { description: 'Execution order', nullable: true })
  order?: number;
}

/**
 * Topic Extract Result (GraphQL)
 */
@ObjectType({ description: 'Result of extracting a single topic' })
export class TopicExtractResult {
  @Field(() => String, { description: 'Topic name' })
  topicName!: string;

  @Field(() => Boolean, { description: 'Whether extraction was successful' })
  success!: boolean;

  @Field(() => String, { description: 'Extracted data as JSON string' })
  data!: string;

  @Field(() => Float, { description: 'Confidence score (0-1)', nullable: true })
  confidence?: number;

  @Field(() => [String], { description: 'Warning messages', nullable: true })
  warnings?: string[];

  @Field(() => String, { description: 'When extraction was performed' })
  extractedAt!: string;
}

/**
 * Topic Score Breakdown (GraphQL)
 */
@ObjectType({ description: 'Score breakdown for a single topic' })
export class TopicScoreBreakdown {
  @Field(() => String, { description: 'Topic name' })
  topicName!: string;

  @Field(() => String, { description: 'Topic display name' })
  displayName!: string;

  @Field(() => Float, { description: 'Weight used for this topic' })
  weight!: number;

  @Field(() => Int, { description: 'Number of completed fields' })
  completedFields!: number;

  @Field(() => Int, { description: 'Total number of fields' })
  totalFields!: number;

  @Field(() => Int, { description: 'Percentage complete (0-100)' })
  percentage!: number;

  @Field(() => Float, { description: 'Score achieved (weighted)' })
  score!: number;
}

/**
 * Completeness Score (GraphQL)
 */
@ObjectType({ description: 'Completeness score for extraction results' })
export class TopicCompletenessScore {
  @Field(() => Int, { description: 'Overall score (0-100)' })
  score!: number;

  @Field(() => Float, { description: 'Total weighted score achieved' })
  total!: number;

  @Field(() => Float, { description: 'Maximum possible score' })
  maxScore!: number;

  @Field(() => [TopicScoreBreakdown], { description: 'Per-topic score breakdown', nullable: true })
  topicScores?: TopicScoreBreakdown[];
}

/**
 * Topic Field Value (GraphQL)
 */
@ObjectType({ description: 'Field value with metadata' })
export class TopicFieldValue {
  @Field(() => String, { description: 'Field name' })
  name!: string;

  @Field(() => String, { description: 'Field type' })
  type!: string;

  @Field(() => String, { description: 'Field value as JSON string', nullable: true })
  value?: string;

  @Field(() => Boolean, { description: 'Whether field has a valid value' })
  hasValue!: boolean;

  @Field(() => String, { description: 'Field description', nullable: true })
  description?: string;
}
