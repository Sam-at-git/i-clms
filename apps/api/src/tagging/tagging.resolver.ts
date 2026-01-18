import { Resolver, Mutation, Query, Args, Context, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TaggingService } from './tagging.service';
import {
  ClassificationResult,
  ExtractedTag,
  ContractProfile,
  TagDto,
  CreateTagInput,
  UpdateTagInput,
  TagDeleteResult,
} from './dto/tagging.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../graphql/types/enums';

interface GqlContext {
  req: {
    ip?: string;
    headers?: {
      'x-forwarded-for'?: string;
    };
  };
}

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class TaggingResolver {
  constructor(private readonly taggingService: TaggingService) {}

  // ==================== Existing Classification Methods ====================

  @Mutation(() => ClassificationResult, { description: '自动分类合同' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async autoClassifyContract(
    @Args('contractId') contractId: string
  ): Promise<ClassificationResult> {
    return this.taggingService.autoClassifyContract(contractId);
  }

  @Mutation(() => [ExtractedTag], { description: '提取标签' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async extractTags(
    @Args('contractId') contractId: string
  ): Promise<ExtractedTag[]> {
    return this.taggingService.extractTags(contractId);
  }

  @Mutation(() => ContractProfile, { description: '生成合同画像' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async generateProfile(
    @Args('contractId') contractId: string
  ): Promise<ContractProfile> {
    return this.taggingService.generateProfile(contractId);
  }

  // ==================== Tag CRUD Methods ====================

  @Query(() => [TagDto], { description: 'Get all tags' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async tags(
    @Args('category', { type: () => String, nullable: true }) category?: string,
    @Args('includeInactive', { type: () => Boolean, defaultValue: false }) includeInactive?: boolean,
    @Args('search', { type: () => String, nullable: true }) search?: string
  ): Promise<TagDto[]> {
    return this.taggingService.getTags(category, includeInactive, search);
  }

  @Query(() => TagDto, { nullable: true, description: 'Get a single tag by ID' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async tag(@Args('id') id: string): Promise<TagDto | null> {
    return this.taggingService.getTag(id);
  }

  @Query(() => [String], { description: 'Get all tag categories' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async tagCategories(): Promise<string[]> {
    return this.taggingService.getTagCategories();
  }

  @Mutation(() => TagDto, { description: 'Create a new tag' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async createTag(
    @Args('input') input: CreateTagInput,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<TagDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.taggingService.createTag(input, operator.id, ipAddress);
  }

  @Mutation(() => TagDto, { description: 'Update a tag' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async updateTag(
    @Args('id') id: string,
    @Args('input') input: UpdateTagInput,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<TagDto> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.taggingService.updateTag(id, input, operator.id, ipAddress);
  }

  @Mutation(() => TagDeleteResult, { description: 'Delete a tag (soft delete)' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async deleteTag(
    @Args('id') id: string,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<TagDeleteResult> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    return this.taggingService.deleteTag(id, operator.id, ipAddress);
  }

  // ==================== Tag Assignment Methods ====================

  @Mutation(() => Boolean, { description: 'Assign a tag to a contract' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async assignTagToContract(
    @Args('contractId', { type: () => ID }) contractId: string,
    @Args('tagId', { type: () => ID }) tagId: string,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<boolean> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    await this.taggingService.assignTagToContract(contractId, tagId, operator.id, ipAddress);
    return true;
  }

  @Mutation(() => Boolean, { description: 'Remove a tag from a contract' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async removeTagFromContract(
    @Args('contractId', { type: () => ID }) contractId: string,
    @Args('tagId', { type: () => ID }) tagId: string,
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<boolean> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    await this.taggingService.removeTagFromContract(contractId, tagId, operator.id, ipAddress);
    return true;
  }

  @Mutation(() => Boolean, { description: 'Batch assign tags to a contract' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN)
  async assignTagsToContract(
    @Args('contractId', { type: () => ID }) contractId: string,
    @Args('tagIds', { type: () => [ID] }) tagIds: string[],
    @CurrentUser() operator: { id: string },
    @Context() context: GqlContext
  ): Promise<boolean> {
    const ipAddress = context.req?.headers?.['x-forwarded-for'] || context.req?.ip;
    await this.taggingService.assignTagsToContract(contractId, tagIds, operator.id, ipAddress);
    return true;
  }
}
