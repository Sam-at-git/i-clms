import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class TagStats {
  @Field(() => String)
  tagId!: string;

  @Field(() => String)
  tagName!: string;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field(() => String, { nullable: true })
  color?: string | null;

  @Field(() => Int)
  count!: number;

  @Field(() => Float)
  totalValue!: number;
}

@ObjectType()
export class CategoryTags {
  @Field(() => String)
  category!: string;

  @Field(() => [TagStats])
  tags!: TagStats[];
}

@ObjectType()
export class TagOverview {
  @Field(() => Int)
  totalTags!: number;

  @Field(() => [TagStats])
  topTags!: TagStats[];

  @Field(() => [CategoryTags])
  byCategory!: CategoryTags[];
}
