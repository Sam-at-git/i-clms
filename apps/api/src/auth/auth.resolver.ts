import { Resolver, Mutation, Query, Args, Context, Int, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './guards';
import { CurrentUser } from './decorators';
import { LoginInput, RegisterInput, AuthResponse, ChangePasswordInput, ChangePasswordResult } from './dto';
import { UserDto } from '../user/dto/user.dto';

@ObjectType()
class LoginRecord {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  ipAddress!: string | null;

  @Field(() => String, { nullable: true })
  userAgent!: string | null;

  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  failureReason!: string | null;

  @Field(() => Date)
  createdAt!: Date;
}

interface GqlContext {
  req: {
    ip?: string;
    headers?: {
      'x-forwarded-for'?: string;
      'user-agent'?: string;
    };
  };
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse, { description: 'Login with email and password' })
  async login(@Args('input') input: LoginInput, @Context() context: GqlContext): Promise<AuthResponse> {
    const user = await this.authService.validateUser(input.email, input.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    const userAgent = context.req?.headers?.['user-agent'];
    return this.authService.login(user, ipAddress, userAgent);
  }

  @Mutation(() => UserDto, { description: 'Register a new user' })
  async register(@Args('input') input: RegisterInput): Promise<UserDto> {
    return this.authService.register(input);
  }

  @Query(() => UserDto, { description: 'Get current authenticated user' })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: { id: string }): Promise<UserDto> {
    const fullUser = await this.authService.getUserById(user.id);
    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }
    return fullUser;
  }

  @Mutation(() => ChangePasswordResult, { description: 'Change your own password' })
  @UseGuards(GqlAuthGuard)
  async changePassword(
    @Args('input') input: ChangePasswordInput,
    @CurrentUser() user: { id: string },
    @Context() context: GqlContext
  ): Promise<ChangePasswordResult> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.authService.changePassword(user.id, input, ipAddress);
  }

  @Mutation(() => Boolean, { description: 'Request password reset email' })
  async requestPasswordReset(@Args('email') email: string): Promise<boolean> {
    return this.authService.requestPasswordReset(email);
  }

  @Mutation(() => Boolean, { description: 'Reset password with token' })
  async resetPassword(
    @Args('token') token: string,
    @Args('newPassword') newPassword: string,
  ): Promise<boolean> {
    return this.authService.resetPassword(token, newPassword);
  }

  @Query(() => [LoginRecord], { description: 'Get login history for current user' })
  @UseGuards(GqlAuthGuard)
  async loginHistory(
    @CurrentUser() user: { id: string },
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit?: number,
  ): Promise<LoginRecord[]> {
    return this.authService.getLoginHistory(user.id, limit);
  }
}
