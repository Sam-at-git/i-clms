import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CaseStudyStatus } from '@prisma/client';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CaseStudyService } from './case-study.service';
import {
  CaseStudyEntity,
  CaseStudiesResponse,
  CaseStudyGenerateResult,
} from './dto/case-study.dto';
import { CreateCaseStudyInput } from './dto/create-case-study.input';
import { UpdateCaseStudyInput, UpdateCaseStudyStatusInput } from './dto/update-case-study.input';
import { GenerateCaseStudyInput, RegenerateCaseStudyInput } from './dto/generate-case-study.input';

@Resolver('CaseStudy')
export class CaseStudyResolver {
  constructor(private caseStudyService: CaseStudyService) {}

  /**
   * Generate a case study from a contract using AI
   */
  @Mutation(() => CaseStudyGenerateResult, { description: 'Generate a case study from a contract using AI' })
  @UseGuards(GqlAuthGuard)
  async generateCaseStudy(
    @Args('input') input: GenerateCaseStudyInput,
    @CurrentUser() user: any,
  ): Promise<CaseStudyGenerateResult> {
    return this.caseStudyService.generate({
      contractId: input.contractId,
      createdById: user.id,
      desensitize: input.desensitize,
      desensitizeConfig: input.desensitizeConfig,
      customDisplayCustomerName: input.customDisplayCustomerName,
      customDisplayAmount: input.customDisplayAmount,
      customDisplayIndustry: input.customDisplayIndustry,
      includeChallenges: input.includeChallenges,
      includeSolution: input.includeSolution,
      includeResults: input.includeResults,
      includeTestimonial: input.includeTestimonial,
      writingStyle: input.writingStyle,
      tags: input.tags,
    }) as any;
  }

  /**
   * Regenerate an existing case study
   */
  @Mutation(() => CaseStudyGenerateResult, { description: 'Regenerate an existing case study' })
  @UseGuards(GqlAuthGuard)
  async regenerateCaseStudy(
    @Args('id') id: string,
    @Args('input', { nullable: true }) input: RegenerateCaseStudyInput,
    @CurrentUser() user: any,
  ): Promise<CaseStudyGenerateResult> {
    return this.caseStudyService.regenerate(id, user.id, input || {}) as any;
  }

  /**
   * Create a case study manually
   */
  @Mutation(() => CaseStudyEntity, { description: 'Create a case study manually' })
  @UseGuards(GqlAuthGuard)
  async createCaseStudy(
    @Args('input') input: CreateCaseStudyInput,
    @CurrentUser() user: any,
  ): Promise<CaseStudyEntity> {
    return this.caseStudyService.create({
      contractId: input.contractId,
      createdById: user.id,
      title: input.title,
      subtitle: input.subtitle,
      summary: input.summary,
      challenges: input.challenges,
      solution: input.solution,
      results: input.results,
      testimonial: input.testimonial,
      techStack: input.techStack,
      timeline: input.timeline,
      teamSize: input.teamSize,
      fullMarkdown: input.fullMarkdown,
      isDesensitized: input.isDesensitized,
      desensitizeConfig: input.desensitizeConfig,
      displayCustomerName: input.displayCustomerName,
      displayAmount: input.displayAmount,
      displayIndustry: input.displayIndustry,
      tags: input.tags,
    }) as any;
  }

  /**
   * Get all case studies with optional filters
   */
  @Query(() => CaseStudiesResponse, { description: 'Get all case studies with optional filters' })
  @UseGuards(GqlAuthGuard)
  async caseStudies(
    @Args('contractId', { nullable: true }) contractId?: string,
    @Args('status', { nullable: true, type: () => CaseStudyStatus }) status?: CaseStudyStatus,
    @Args('limit', { nullable: true, type: () => Int }) limit?: number,
    @Args('offset', { nullable: true, type: () => Int }) offset?: number,
  ): Promise<CaseStudiesResponse> {
    return this.caseStudyService.findAll({
      contractId,
      status,
      limit,
      offset,
    }) as any;
  }

  /**
   * Get a single case study by ID
   */
  @Query(() => CaseStudyEntity, { nullable: true, description: 'Get a single case study by ID' })
  @UseGuards(GqlAuthGuard)
  async caseStudy(@Args('id') id: string): Promise<CaseStudyEntity | null> {
    return this.caseStudyService.findOne(id) as any;
  }

  /**
   * Get case studies for a specific contract
   */
  @Query(() => [CaseStudyEntity], { description: 'Get case studies for a specific contract' })
  @UseGuards(GqlAuthGuard)
  async caseStudiesByContract(
    @Args('contractId') contractId: string,
  ): Promise<CaseStudyEntity[]> {
    return this.caseStudyService.findByContractId(contractId) as any;
  }

  /**
   * Update a case study
   */
  @Mutation(() => CaseStudyEntity, { description: 'Update a case study' })
  @UseGuards(GqlAuthGuard)
  async updateCaseStudy(
    @Args('id') id: string,
    @Args('input') input: UpdateCaseStudyInput,
    @CurrentUser() user: any,
  ): Promise<CaseStudyEntity> {
    return this.caseStudyService.update(id, user.id, input) as any;
  }

  /**
   * Update case study status
   */
  @Mutation(() => CaseStudyEntity, { description: 'Update case study status' })
  @UseGuards(GqlAuthGuard)
  async updateCaseStudyStatus(
    @Args('id') id: string,
    @Args('input') input: UpdateCaseStudyStatusInput,
  ): Promise<CaseStudyEntity> {
    return this.caseStudyService.updateStatus(id, input.status) as any;
  }

  /**
   * Delete a case study
   */
  @Mutation(() => Boolean, { description: 'Delete a case study' })
  @UseGuards(GqlAuthGuard)
  async deleteCaseStudy(@Args('id') id: string): Promise<boolean> {
    await this.caseStudyService.remove(id);
    return true;
  }
}
