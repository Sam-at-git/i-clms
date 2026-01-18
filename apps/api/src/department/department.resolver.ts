import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DepartmentService } from './department.service';
import {
  DepartmentDto,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  DeleteResultDto,
} from './dto/department.dto';
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

@Resolver(() => DepartmentDto)
@UseGuards(GqlAuthGuard, RolesGuard)
export class DepartmentResolver {
  constructor(private readonly departmentService: DepartmentService) {}

  @Query(() => [DepartmentDto], { description: 'Get all departments (Admin only)' })
  @Roles('ADMIN')
  async departments(
    @Args('includeInactive', { type: () => Boolean, defaultValue: false })
    includeInactive: boolean
  ): Promise<DepartmentDto[]> {
    return this.departmentService.getDepartments(includeInactive);
  }

  @Query(() => DepartmentDto, { nullable: true, description: 'Get a single department by ID (Admin only)' })
  @Roles('ADMIN')
  async department(@Args('id') id: string): Promise<DepartmentDto | null> {
    return this.departmentService.getDepartment(id);
  }

  @Mutation(() => DepartmentDto, { description: 'Create a new department (Admin only)' })
  @Roles('ADMIN')
  async createDepartment(
    @Args('input') input: CreateDepartmentInput,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<DepartmentDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.departmentService.createDepartment(input, operator.id, ipAddress);
  }

  @Mutation(() => DepartmentDto, { description: 'Update a department (Admin only)' })
  @Roles('ADMIN')
  async updateDepartment(
    @Args('id') id: string,
    @Args('input') input: UpdateDepartmentInput,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<DepartmentDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.departmentService.updateDepartment(id, input, operator.id, ipAddress);
  }

  @Mutation(() => DeleteResultDto, { description: 'Delete a department (Admin only)' })
  @Roles('ADMIN')
  async deleteDepartment(
    @Args('id') id: string,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<DeleteResultDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.departmentService.deleteDepartment(id, operator.id, ipAddress);
  }
}
