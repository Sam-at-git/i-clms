import { InputType, Field, PartialType } from '@nestjs/graphql';
import { CreateContractInput } from './create-contract.input';
import { ContractStatus, ParseStatus } from '../models';

@InputType()
export class UpdateContractInput extends PartialType(CreateContractInput) {
  @Field(() => ContractStatus, { nullable: true })
  status?: ContractStatus;

  @Field(() => ParseStatus, { nullable: true })
  parseStatus?: ParseStatus;

  @Field(() => Date, { nullable: true })
  parsedAt?: Date;

  @Field(() => Number, { nullable: true })
  parseConfidence?: number;

  @Field(() => Boolean, { nullable: true })
  needsManualReview?: boolean;
}
