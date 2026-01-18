import { ObjectType, Field, ID } from '@nestjs/graphql';
import { UserRole } from './enums';
import { Department } from './department.model';

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field(() => UserRole)
  role!: UserRole;

  @Field(() => Department)
  department!: Department;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
