import { ObjectType, Field, Float, ID, InputType } from '@nestjs/graphql';

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

// Tag CRUD DTOs

@ObjectType('Tag')
export class TagDto {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  category!: string;

  @Field()
  color!: string;

  @Field()
  isActive!: boolean;

  @Field()
  isSystem!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@InputType('CreateTagInput')
export class CreateTagInput {
  @Field()
  name!: string;

  @Field()
  category!: string;

  @Field({ nullable: true, defaultValue: '#3b82f6' })
  color?: string;
}

@InputType('UpdateTagInput')
export class UpdateTagInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  color?: string;
}

@ObjectType('TagDeleteResult')
export class TagDeleteResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;
}
