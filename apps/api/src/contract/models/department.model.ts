import { ObjectType, Field, ID } from '@nestjs/graphql';
import { DepartmentCode } from './enums';

@ObjectType()
export class Department {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => DepartmentCode)
  code!: DepartmentCode;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
