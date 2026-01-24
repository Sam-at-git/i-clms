import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ContractTemplateService } from './contract-template.service';
import {
  CreateContractTemplateInput,
  UpdateContractTemplateInput,
  CloneFromTemplateInput,
} from './dto';

@Resolver('ContractTemplate')
@UseGuards(GqlAuthGuard)
export class ContractTemplateResolver {
  constructor(private service: ContractTemplateService) {}

  @Query()
  async contractTemplates(
    @Args('type') type?: string,
    @Args('category') category?: string,
    @Args('isActive') isActive?: boolean,
    @Args('departmentId') departmentId?: string,
    @Args('isSystem') isSystem?: boolean,
  ) {
    const filters: any = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive;
    if (departmentId) filters.departmentId = departmentId;
    if (isSystem !== undefined) filters.isSystem = isSystem;

    return this.service.findAll(filters);
  }

  @Query()
  async contractTemplate(@Args('id', { type: () => ID }) id: string) {
    return this.service.findOne(id);
  }

  @Query()
  async templateCategories() {
    return this.service.getCategories();
  }

  @Mutation()
  async createContractTemplate(
    @Args('input') input: CreateContractTemplateInput,
    @CurrentUser() user: any,
  ) {
    return this.service.create(input, user.id);
  }

  @Mutation()
  async updateContractTemplate(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateContractTemplateInput,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, input, user.id);
  }

  @Mutation()
  async deleteContractTemplate(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.remove(id, user.id);
  }

  @Mutation()
  async cloneFromTemplate(
    @Args('input') input: CloneFromTemplateInput,
    @CurrentUser() user: any,
  ) {
    return this.service.cloneFromTemplate(input, user.id);
  }

  @Mutation()
  async useTemplate(@Args('id', { type: () => ID }) id: string) {
    return this.service.incrementUsage(id);
  }
}
