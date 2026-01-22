import { ObjectType, Field, Float, registerEnumType } from '@nestjs/graphql';

export enum ParseStrategy {
  DIRECT_USE = 'DIRECT_USE',
  LLM_VALIDATION = 'LLM_VALIDATION',
  LLM_FULL_EXTRACTION = 'LLM_FULL_EXTRACTION',
  RAG = 'RAG',
  DOCLING = 'DOCLING',
}

registerEnumType(ParseStrategy, {
  name: 'ParseStrategy',
  description: 'Strategy for parsing contracts based on completeness score',
});

@ObjectType()
export class CategoryScores {
  @Field(() => Float)
  basic!: number;

  @Field(() => Float)
  financial!: number;

  @Field(() => Float)
  temporal!: number;

  @Field(() => Float)
  other!: number;
}

@ObjectType()
export class FieldScoreDetail {
  @Field(() => String)
  field!: string;

  @Field(() => String)
  category!: string;

  @Field(() => Float)
  maxScore!: number;

  @Field(() => Float)
  actualScore!: number;

  @Field(() => Boolean)
  hasValue!: boolean;
}

@ObjectType()
export class CompletenessScore {
  @Field(() => Float)
  totalScore!: number;

  @Field(() => Float)
  maxScore!: number;

  @Field(() => Float)
  percentage!: number;

  @Field(() => ParseStrategy)
  strategy!: ParseStrategy;

  @Field(() => CategoryScores)
  categoryScores!: CategoryScores;

  @Field(() => [FieldScoreDetail])
  details!: FieldScoreDetail[];
}
