import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class ClassificationResult {
  @Field(() => String)
  contractType!: string;

  @Field(() => Float)
  confidence!: number;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => String)
  scale!: string;
}

@ObjectType()
export class ExtractedTag {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  category!: string;

  @Field(() => Float)
  confidence!: number;

  @Field(() => String)
  source!: string;
}

@ObjectType()
export class FeatureScore {
  @Field(() => String)
  feature!: string;

  @Field(() => Float)
  score!: number;
}

@ObjectType()
export class ContractProfile {
  @Field(() => String)
  contractId!: string;

  @Field(() => [String])
  tags!: string[];

  @Field(() => [String])
  keywords!: string[];

  @Field(() => [FeatureScore])
  features!: FeatureScore[];
}
