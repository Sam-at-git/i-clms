import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MarketService } from './market.service';
import {
  SearchResponse,
  ContractSearchInput,
} from './dto/contract-search.dto';
import { TagOverview } from './dto/tag-stats.dto';
import { CaseOverview } from './dto/case-study.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class MarketResolver {
  constructor(private readonly marketService: MarketService) {}

  @Query(() => SearchResponse, { description: '搜索合同知识库' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async searchContracts(
    @Args('input') input: ContractSearchInput
  ): Promise<SearchResponse> {
    return this.marketService.searchContracts(input);
  }

  @Query(() => TagOverview, { description: '获取智能标签概览' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async tagOverview(): Promise<TagOverview> {
    return this.marketService.getTagOverview();
  }

  @Query(() => CaseOverview, { description: '获取案例库概览' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async caseOverview(): Promise<CaseOverview> {
    return this.marketService.getCaseOverview();
  }
}
