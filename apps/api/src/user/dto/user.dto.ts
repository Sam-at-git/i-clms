import { ObjectType, Field, ID, Int, InputType, registerEnumType } from '@nestjs/graphql';
import { UserRole } from '@prisma/client';

// Register the UserRole enum for GraphQL
registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User roles in the system',
});

@ObjectType('UserDepartment')
export class UserDepartmentDto {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  code!: string;
}

@ObjectType('User')
export class UserDto {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field(() => UserRole)
  role!: UserRole;

  @Field(() => UserDepartmentDto)
  department!: UserDepartmentDto;

  @Field()
  isActive!: boolean;

  @Field()
  mustChangePassword!: boolean;

  @Field({ nullable: true })
  lastPasswordChangedAt?: Date;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType('UserConnection')
export class UserConnectionDto {
  @Field(() => [UserDto])
  items!: UserDto[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  pageSize!: number;
}

@InputType('CreateUserInput')
export class CreateUserInput {
  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field()
  departmentId!: string;

  @Field(() => UserRole)
  role!: UserRole;
}

@InputType('UpdateUserInput')
export class UpdateUserInput {
  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  departmentId?: string;

  @Field(() => UserRole, { nullable: true })
  role?: UserRole;
}

@InputType('UserFilterInput')
export class UserFilterInput {
  @Field({ nullable: true })
  departmentId?: string;

  @Field(() => UserRole, { nullable: true })
  role?: UserRole;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  search?: string;
}

@ObjectType('ResetPasswordResult')
export class ResetPasswordResultDto {
  @Field()
  success!: boolean;

  @Field()
  temporaryPassword!: string;
}
