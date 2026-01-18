import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Contract } from './contract.model';

@ObjectType()
export class ContractConnection {
  @Field(() => [Contract])
  nodes!: Contract[];

  @Field(() => Int)
  totalCount!: number;

  @Field()
  hasNextPage!: boolean;

  @Field()
  hasPreviousPage!: boolean;
}
