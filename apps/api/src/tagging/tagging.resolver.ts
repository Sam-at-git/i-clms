import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TaggingService } from './tagging.service';
import { ClassificationResult, ExtractedTag, ContractProfile } from './dto/tagging.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class TaggingResolver {
  constructor(private readonly taggingService: TaggingService) {}

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
}
