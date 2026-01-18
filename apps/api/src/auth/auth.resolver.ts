import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GqlAuthGuard } from './guards';
import { CurrentUser } from './decorators';
import { LoginInput, RegisterInput, AuthResponse } from './dto';
import { User } from '../contract/models';

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

  @Mutation(() => User, { description: 'Register a new user' })
  async register(@Args('input') input: RegisterInput): Promise<User> {
    return this.authService.register(input);
  }

  @Query(() => User, { description: 'Get current authenticated user' })
  @UseGuards(GqlAuthGuard)
  async me(@CurrentUser() user: { id: string }): Promise<User> {
    const fullUser = await this.authService.getUserById(user.id);
    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }
    return fullUser;
  }
}
