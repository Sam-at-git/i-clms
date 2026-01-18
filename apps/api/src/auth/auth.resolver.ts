import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './guards';
import { CurrentUser } from './decorators';
import { LoginInput, RegisterInput, AuthResponse, ChangePasswordInput, ChangePasswordResult } from './dto';
import { UserDto } from '../user/dto/user.dto';

interface GqlContext {
  req: {
    ip?: string;
    headers?: {
      'x-forwarded-for'?: string;
    };
  };
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse, { description: 'Login with email and password' })
  async login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    const user = await this.authService.validateUser(input.email, input.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
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
}
