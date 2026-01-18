import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class SemanticSearchResult {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Float)
  similarity!: number;

  @Field(() => [String])
  highlights!: string[];
}

@ObjectType()
export class SimilarContract {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Float)
  similarity!: number;

  @Field(() => [String])
  matchReasons!: string[];
}
