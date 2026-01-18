import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { ContractType } from '../../graphql/types/enums';

@ObjectType()
export class CaseStudy {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => ContractType)
  type!: ContractType;

  @Field(() => Float)
  amount!: number;

  @Field(() => Date, { nullable: true })
  signedAt?: Date | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => [String])
  highlights!: string[];

  @Field(() => [String])
  tags!: string[];
}

@ObjectType()
export class IndustryCases {
  @Field(() => String)
  industry!: string;

  @Field(() => Int)
  count!: number;

  @Field(() => Float)
  totalValue!: number;
}

@ObjectType()
export class CaseOverview {
  @Field(() => Int)
  totalCases!: number;

  @Field(() => [IndustryCases])
  byIndustry!: IndustryCases[];

  @Field(() => [CaseStudy])
  featured!: CaseStudy[];
}
