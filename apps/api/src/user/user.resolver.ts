import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import {
  UserDto,
  UserConnectionDto,
  CreateUserInput,
  UpdateUserInput,
  UserFilterInput,
  ResetPasswordResultDto,
} from './dto/user.dto';
import { GqlAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';

interface GqlContext {
  req: {
    ip?: string;
    headers?: {
      'x-forwarded-for'?: string;
    };
  };
}

@Resolver(() => UserDto)
@UseGuards(GqlAuthGuard, RolesGuard)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => UserConnectionDto, { description: 'Get paginated users (Admin only)' })
  @Roles('ADMIN')
  async users(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
    @Args('filter', { type: () => UserFilterInput, nullable: true }) filter?: UserFilterInput
  ): Promise<UserConnectionDto> {
    return this.userService.getUsers(page, pageSize, filter);
  }

  @Query(() => UserDto, { nullable: true, description: 'Get a single user by ID (Admin only)' })
  @Roles('ADMIN')
  async user(@Args('id') id: string): Promise<UserDto | null> {
    return this.userService.getUser(id);
  }

  @Mutation(() => UserDto, { description: 'Create a new user (Admin only)' })
  @Roles('ADMIN')
  async createUser(
    @Args('input') input: CreateUserInput,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<UserDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.userService.createUser(input, operator.id, ipAddress);
  }

  @Mutation(() => UserDto, { description: 'Update a user (Admin only)' })
  @Roles('ADMIN')
  async updateUser(
    @Args('id') id: string,
    @Args('input') input: UpdateUserInput,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<UserDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.userService.updateUser(id, input, operator.id, ipAddress);
  }

  @Mutation(() => UserDto, { description: 'Toggle user active status (Admin only)' })
  @Roles('ADMIN')
  async toggleUserStatus(
    @Args('id') id: string,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<UserDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.userService.toggleUserStatus(id, operator.id, ipAddress);
  }

  @Mutation(() => ResetPasswordResultDto, { description: 'Reset user password (Admin only)' })
  @Roles('ADMIN')
  async resetUserPassword(
    @Args('id') id: string,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<ResetPasswordResultDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.userService.resetUserPassword(id, operator.id, ipAddress);
  }
}
