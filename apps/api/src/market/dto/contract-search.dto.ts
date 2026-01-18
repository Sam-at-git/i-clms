import { ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';
import { ContractType } from '../../graphql/types/enums';

@ObjectType()
export class ContractSearchResult {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => ContractType)
  type!: ContractType;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => Float)
  amount!: number;

  @Field(() => Date, { nullable: true })
  signedAt?: Date | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => String, { nullable: true })
  highlight?: string | null;
}

@ObjectType()
export class SearchResponse {
  @Field(() => Int)
  total!: number;

  @Field(() => [ContractSearchResult])
  results!: ContractSearchResult[];
}

@InputType()
export class ContractSearchInput {
  @Field(() => String, { nullable: true })
  keyword?: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [ContractType], { nullable: true })
  types?: ContractType[];

  @Field(() => [String], { nullable: true })
  industries?: string[];

  @Field(() => Float, { nullable: true })
  minAmount?: number;

  @Field(() => Float, { nullable: true })
  maxAmount?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset?: number;
}
