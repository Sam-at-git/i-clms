import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../contract/models';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken!: string;

  @Field(() => User)
  user!: User;
}
