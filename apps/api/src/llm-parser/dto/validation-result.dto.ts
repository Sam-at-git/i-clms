import { Field, ObjectType, Float } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

/**
 * 单个字段的验证结果
 */
@ObjectType()
export class FieldValidationResult {
  @Field(() => String)
  field!: string;

  @Field(() => String, { nullable: true })
  programValue?: string | null;

  @Field(() => Boolean)
  isCorrect!: boolean;

  @Field(() => String, { nullable: true })
  issue?: string;

  @Field(() => String, { nullable: true })
  correctedValue?: string | null;

  @Field(() => Float)
  confidence!: number;
}

/**
 * LLM验证结果
 */
@ObjectType()
export class LlmValidationResult {
  @Field(() => [FieldValidationResult])
  validationResults!: FieldValidationResult[];

  @Field(() => GraphQLJSONObject, { nullable: true })
  additionalFields?: Record<string, any>;

  @Field(() => String, { nullable: true })
  overallAssessment?: string;
}
