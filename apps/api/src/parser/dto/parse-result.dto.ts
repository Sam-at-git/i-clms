import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class FieldMatch {
  @Field()
  field!: string;

  @Field()
  value!: string;

  @Field(() => Float)
  confidence!: number;
}

@ObjectType()
export class ExtractedFields {
  @Field(() => String, { nullable: true })
  contractNumber?: string;

  @Field(() => String, { nullable: true })
  contractName?: string;

  @Field(() => String, { nullable: true })
  partyA?: string;

  @Field(() => String, { nullable: true })
  partyB?: string;

  @Field(() => String, { nullable: true })
  signDate?: string;

  @Field(() => String, { nullable: true })
  amount?: string;

  @Field(() => String, { nullable: true })
  validPeriod?: string;

  @Field(() => [FieldMatch])
  rawMatches!: FieldMatch[];
}

@ObjectType()
export class ParseResult {
  @Field()
  success!: boolean;

  @Field(() => String, { nullable: true })
  text?: string;

  @Field(() => Int, { nullable: true })
  pageCount?: number;

  @Field(() => ExtractedFields, { nullable: true })
  extractedFields?: ExtractedFields;

  @Field(() => String, { nullable: true })
  error?: string;
}
