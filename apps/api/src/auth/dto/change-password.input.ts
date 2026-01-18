import { InputType, Field, ObjectType } from '@nestjs/graphql';

@InputType()
export class ChangePasswordInput {
  @Field()
  currentPassword!: string;

  @Field()
  newPassword!: string;
}

@ObjectType()
export class ChangePasswordResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;
}
