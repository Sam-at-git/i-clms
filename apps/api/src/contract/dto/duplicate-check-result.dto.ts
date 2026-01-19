import { ObjectType, Field } from '@nestjs/graphql';
import { Contract } from '../models/contract.model';

@ObjectType()
export class DuplicateCheckResult {
  @Field(() => Boolean)
  isDuplicate!: boolean;

  @Field(() => Contract, { nullable: true })
  existingContract?: Contract;

  @Field(() => String, { nullable: true })
  message?: string;
}
