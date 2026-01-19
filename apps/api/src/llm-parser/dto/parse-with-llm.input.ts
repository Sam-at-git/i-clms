import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { ParseStrategy } from '../entities/completeness-score.entity';

@InputType()
export class ParseWithLlmInput {
  @Field(() => String, { nullable: true })
  contractId?: string;

  @Field(() => String)
  textContent!: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  programmaticResult?: Record<string, unknown>;

  @Field(() => ParseStrategy, { nullable: true })
  forceStrategy?: ParseStrategy;
}
