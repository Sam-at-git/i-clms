import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { VectorSearchService } from './vector-search.service';
import { SemanticSearchResult, SimilarContract } from './dto/vector-search.dto';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../graphql/types/enums';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
export class VectorSearchResolver {
  constructor(private readonly vectorSearchService: VectorSearchService) {}

  @Query(() => [SemanticSearchResult], { description: '语义搜索合同' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async semanticSearch(
    @Args('query') query: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number
  ): Promise<SemanticSearchResult[]> {
    return this.vectorSearchService.semanticSearch(query, limit);
  }

  @Query(() => [SimilarContract], { description: '查找相似合同' })
  @Roles(UserRole.ADMIN, UserRole.DEPT_ADMIN, UserRole.USER)
  async findSimilarContracts(
    @Args('contractId') contractId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 5 }) limit: number
  ): Promise<SimilarContract[]> {
    return this.vectorSearchService.findSimilarContracts(contractId, limit);
  }
}
