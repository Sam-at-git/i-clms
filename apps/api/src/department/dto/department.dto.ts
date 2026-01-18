import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';

@ObjectType('Department')
export class DepartmentDto {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  code!: string;

  @Field()
  isActive!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@InputType('CreateDepartmentInput')
export class CreateDepartmentInput {
  @Field()
  name!: string;

  @Field()
  code!: string;
}

@InputType('UpdateDepartmentInput')
export class UpdateDepartmentInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  code?: string;
}

@ObjectType('DeleteResult')
export class DeleteResultDto {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;
}
