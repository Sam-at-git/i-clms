import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaseStudyStatus } from '@prisma/client';
import OpenAI from 'openai';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import {
  CASE_STUDY_SYSTEM_PROMPT,
  buildUserPrompt,
  generateFullMarkdown,
  desensitizeAmount,
  desensitizeCustomerName,
  desensitizeIndustry,
} from './prompts/case-study-generation.prompt';

interface GenerateCaseStudyOptions {
  contractId: string;
  createdById: string;
  desensitize?: boolean;
  desensitizeConfig?: any;
  customDisplayCustomerName?: string;
  customDisplayAmount?: string;
  customDisplayIndustry?: string;
  includeChallenges?: boolean;
  includeSolution?: boolean;
  includeResults?: boolean;
  includeTestimonial?: boolean;
  writingStyle?: string;
  tags?: string[];
}

interface RegenerateCaseStudyOptions {
  regenerateChallenges?: boolean;
  regenerateSolution?: boolean;
  regenerateResults?: boolean;
  regenerateTestimonial?: boolean;
  regenerateAll?: boolean;
  desensitize?: boolean;
  desensitizeConfig?: any;
  customDisplayCustomerName?: string;
  customDisplayAmount?: string;
  customDisplayIndustry?: string;
  writingStyle?: string;
}

@Injectable()
export class CaseStudyService implements OnModuleInit {
  private readonly logger = new Logger(CaseStudyService.name);
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private llmConfigService: LlmConfigService,
  ) {}

  async onModuleInit() {
    await this.llmConfigService.refreshCache();
    this.refreshClient();

    const config = this.llmConfigService.getActiveConfig();
    this.logger.log(`========== CaseStudyService 初始化 ==========`);
    this.logger.log(`LLM Provider: ${this.llmConfigService.getProviderName()}`);
    this.logger.log(`LLM Model: ${config.model}`);
    this.logger.log(`LLM Base URL: ${config.baseUrl}`);
    this.logger.log(`OpenAI Client: ${this.openai ? '✓' : '✗'}`);
    this.logger.log(`==============================================`);
  }

  /**
   * Refresh the OpenAI client with current configuration
   * Case study generation requires longer timeout due to complex prompts
   */
  refreshClient() {
    const config = this.llmConfigService.getActiveConfig();
    // Case study generation needs longer timeout (at least 3 minutes)
    const caseStudyTimeout = Math.max(config.timeout, 180000);
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: caseStudyTimeout,
    });
    this.logger.log(`CaseStudy OpenAI client initialized with model: ${config.model}, timeout: ${caseStudyTimeout}ms`);
  }

  private getClient(): OpenAI {
    if (!this.openai) {
      this.refreshClient();
    }
    return this.openai!;
  }

  /**
   * Generate a case study from a contract using LLM
   */
  async generate(options: GenerateCaseStudyOptions) {
    const { contractId, createdById } = options;

    this.logger.log(`========== 案例生成开始 ==========`);
    this.logger.log(`合同ID: ${contractId}`);
    this.logger.log(`创建者ID: ${createdById}`);
    this.logger.log(`脱敏: ${options.desensitize ?? true}`);

    // Fetch the contract with all related data
    this.logger.log(`正在获取合同数据...`);
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        customer: true,
        staffAugmentation: {
          include: { rateItems: true },
        },
        projectOutsourcing: {
          include: { milestones: true },
        },
        productSales: {
          include: { lineItems: true },
        },
      },
    });

    if (!contract) {
      this.logger.error(`合同不存在: ${contractId}`);
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    this.logger.log(`合同名称: ${contract.name}`);
    this.logger.log(`合同类型: ${contract.type}`);
    this.logger.log(`客户: ${contract.customer?.name || '(无)'}`);
    this.logger.log(`金额: ${contract.amountWithTax || '(无)'}`);

    // Build the prompt
    const userPrompt = buildUserPrompt(contract, {
      desensitize: options.desensitize ?? true,
      displayCustomerName: options.customDisplayCustomerName,
      displayAmount: options.customDisplayAmount,
      displayIndustry: options.customDisplayIndustry,
      writingStyle: options.writingStyle ?? 'professional',
      includeChallenges: options.includeChallenges ?? true,
      includeSolution: options.includeSolution ?? true,
      includeResults: options.includeResults ?? true,
      includeTestimonial: options.includeTestimonial ?? false,
    });

    this.logger.log(`Prompt长度: ${userPrompt.length} 字符`);
    this.logger.debug('Generating case study with prompt', { contractId, userPrompt });

    // Call LLM
    const config = this.llmConfigService.getActiveConfig();
    const client = this.getClient();
    const caseStudyTimeout = Math.max(config.timeout, 180000);

    try {
      this.logger.log(`========== 调用 LLM 生成案例 ==========`);
      this.logger.log(`Model: ${config.model}`);
      this.logger.log(`BaseUrl: ${config.baseUrl}`);
      this.logger.log(`Timeout: ${caseStudyTimeout}ms`);
      this.logger.log(`MaxTokens: ${config.maxTokens}`);
      this.logger.log(`Temperature: ${config.temperature}`);

      let response;
      const llmStartTime = Date.now();
      try {
        response = await client.chat.completions.create({
          model: config.model,
          messages: [
            { role: 'system', content: CASE_STUDY_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        });
        const llmDuration = Date.now() - llmStartTime;
        this.logger.log(`LLM响应时间: ${llmDuration}ms`);
      } catch (apiError) {
        const llmDuration = Date.now() - llmStartTime;
        // Handle specific API errors
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
        const errorStack = apiError instanceof Error ? apiError.stack : '';
        this.logger.error(`========== LLM 调用失败 ==========`);
        this.logger.error(`耗时: ${llmDuration}ms`);
        this.logger.error(`错误: ${errorMessage}`);
        this.logger.error(`堆栈: ${errorStack}`);

        if (errorMessage.includes('Unexpected end of JSON') || errorMessage.includes('connection')) {
          throw new Error('LLM服务连接超时或中断，请检查Ollama服务是否正常运行，或稍后重试');
        }
        if (errorMessage.includes('ECONNREFUSED')) {
          throw new Error('无法连接到LLM服务，请确认Ollama服务已启动');
        }
        throw new Error(`LLM调用失败: ${errorMessage}`);
      }

      const content = response.choices[0]?.message?.content;
      this.logger.log(`LLM响应内容长度: ${content?.length || 0} 字符`);
      this.logger.log(`结束原因: ${response.choices[0]?.finish_reason}`);
      if (response.usage) {
        this.logger.log(`Token使用: prompt=${response.usage.prompt_tokens}, completion=${response.usage.completion_tokens}, total=${response.usage.total_tokens}`);
      }

      if (!content) {
        this.logger.error('LLM返回空响应');
        throw new Error('LLM返回了空响应，请稍后重试');
      }

      // Parse the JSON response
      const jsonData = this.extractJsonFromResponse(content);
      if (!jsonData) {
        throw new Error('Failed to parse LLM response as JSON');
      }

      // Calculate desensitized display values
      const amount = contract.amountWithTax ? Number(contract.amountWithTax) : 0;
      const customerName = contract.customer?.name || '未知客户';
      const industry = contract.industry || contract.customer?.industry || '';

      const displayCustomerName = options.desensitize
        ? (options.customDisplayCustomerName || desensitizeCustomerName(customerName, industry))
        : customerName;

      const displayAmount = options.desensitize
        ? (options.customDisplayAmount || desensitizeAmount(amount))
        : `${amount.toLocaleString('zh-CN')} ${contract.currency || 'CNY'}`;

      const displayIndustry = options.desensitize
        ? (options.customDisplayIndustry || desensitizeIndustry(industry))
        : industry;

      // Generate full markdown
      const fullMarkdown = generateFullMarkdown({
        title: jsonData.title,
        subtitle: jsonData.subtitle,
        summary: jsonData.summary,
        challenges: jsonData.challenges,
        solution: jsonData.solution,
        results: jsonData.results,
        testimonial: jsonData.testimonial,
        techStack: jsonData.techStack,
        timeline: jsonData.timeline,
        teamSize: jsonData.teamSize,
        displayIndustry,
        tags: options.tags || jsonData.suggestedTags || [],
      });

      // Create the case study record
      const caseStudy = await this.prisma.caseStudy.create({
        data: {
          contractId,
          createdById,
          title: jsonData.title,
          subtitle: jsonData.subtitle || null,
          status: CaseStudyStatus.GENERATED,
          summary: jsonData.summary,
          challenges: jsonData.challenges || null,
          solution: jsonData.solution || null,
          results: jsonData.results || null,
          testimonial: jsonData.testimonial || null,
          techStack: jsonData.techStack || null,
          timeline: jsonData.timeline || null,
          teamSize: jsonData.teamSize || null,
          fullMarkdown,
          isDesensitized: options.desensitize ?? true,
          desensitizeConfig: options.desensitizeConfig || null,
          displayCustomerName,
          displayAmount,
          displayIndustry,
          llmModel: config.model,
          llmProvider: this.llmConfigService.getProviderName(),
          generatedAt: new Date(),
          confidence: null, // Could be calculated from LLM response if available
          tags: options.tags || jsonData.suggestedTags || [],
        },
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              name: true,
              industry: true,
              ourEntity: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`========== 案例生成成功 ==========`);
      this.logger.log(`案例ID: ${caseStudy.id}`);
      this.logger.log(`案例标题: ${caseStudy.title}`);
      this.logger.log(`状态: ${caseStudy.status}`);

      return {
        success: true,
        caseStudy,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`========== 案例生成失败 ==========`);
      this.logger.error(`错误: ${errorMsg}`);
      this.logger.error(`堆栈: ${errorStack}`);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Extract JSON from LLM response (handles markdown code blocks)
   */
  private extractJsonFromResponse(content: string): any {
    if (!content || content.trim().length === 0) {
      this.logger.warn('Empty LLM response content');
      return null;
    }

    this.logger.debug('Extracting JSON from response', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200)
    });

    // Try to extract JSON from markdown code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

    if (!jsonStr || jsonStr.length === 0) {
      this.logger.warn('No JSON content found in response');
      return null;
    }

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      this.logger.warn('Failed to parse JSON directly', {
        error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        jsonStrLength: jsonStr.length,
        jsonStrPreview: jsonStr.substring(0, 300)
      });

      // Try to find JSON object pattern
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch (secondParseError) {
          this.logger.error('Failed to parse extracted JSON object', {
            error: secondParseError instanceof Error ? secondParseError.message : 'Unknown',
            extractedLength: objectMatch[0].length,
            extractedPreview: objectMatch[0].substring(0, 300)
          });
          return null;
        }
      }

      this.logger.warn('No JSON object pattern found in response');
      return null;
    }
  }

  /**
   * Regenerate a case study
   */
  async regenerate(id: string, userId: string, options: RegenerateCaseStudyOptions) {
    const existing = await this.findOne(id);

    // Fetch the contract
    const contract = await this.prisma.contract.findUnique({
      where: { id: existing.contractId },
      include: {
        customer: true,
        staffAugmentation: { include: { rateItems: true } },
        projectOutsourcing: { include: { milestones: true } },
        productSales: { include: { lineItems: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract not found`);
    }

    const regenerateAll = options.regenerateAll ?? true;

    // If regenerating all, use the generate method
    if (regenerateAll) {
      // Delete the existing case study
      await this.prisma.caseStudy.delete({ where: { id } });

      // Generate new one
      return this.generate({
        contractId: existing.contractId,
        createdById: userId,
        desensitize: options.desensitize ?? existing.isDesensitized,
        desensitizeConfig: options.desensitizeConfig ?? existing.desensitizeConfig,
        customDisplayCustomerName: options.customDisplayCustomerName ?? existing.displayCustomerName ?? undefined,
        customDisplayAmount: options.customDisplayAmount ?? existing.displayAmount ?? undefined,
        customDisplayIndustry: options.customDisplayIndustry ?? existing.displayIndustry ?? undefined,
        writingStyle: options.writingStyle,
        tags: existing.tags,
      });
    }

    // Partial regeneration - regenerate only specified sections
    // (This is a simplified implementation - in production, you'd call LLM for each section)
    // For now, we'll regenerate the entire content but keep non-regenerated sections
    const result = await this.generate({
      contractId: existing.contractId,
      createdById: userId,
      desensitize: options.desensitize ?? existing.isDesensitized,
      desensitizeConfig: options.desensitizeConfig ?? existing.desensitizeConfig,
      customDisplayCustomerName: options.customDisplayCustomerName ?? existing.displayCustomerName ?? undefined,
      customDisplayAmount: options.customDisplayAmount ?? existing.displayAmount ?? undefined,
      customDisplayIndustry: options.customDisplayIndustry ?? existing.displayIndustry ?? undefined,
      writingStyle: options.writingStyle,
      includeChallenges: options.regenerateChallenges ?? false,
      includeSolution: options.regenerateSolution ?? false,
      includeResults: options.regenerateResults ?? false,
      includeTestimonial: options.regenerateTestimonial ?? false,
      tags: existing.tags,
    });

    if (result.success && result.caseStudy) {
      // Merge with existing content for non-regenerated sections
      const updateData: any = {
        version: existing.version + 1,
      };

      if (options.regenerateChallenges && result.caseStudy.challenges) {
        updateData.challenges = result.caseStudy.challenges;
      }
      if (options.regenerateSolution && result.caseStudy.solution) {
        updateData.solution = result.caseStudy.solution;
      }
      if (options.regenerateResults && result.caseStudy.results) {
        updateData.results = result.caseStudy.results;
      }
      if (options.regenerateTestimonial && result.caseStudy.testimonial) {
        updateData.testimonial = result.caseStudy.testimonial;
      }

      // Delete the newly generated one and update the original
      await this.prisma.caseStudy.delete({ where: { id: result.caseStudy.id } });

      const updated = await this.prisma.caseStudy.update({
        where: { id },
        data: updateData,
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              name: true,
              industry: true,
              ourEntity: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return { success: true, caseStudy: updated };
    }

    return result;
  }

  /**
   * Create a case study manually
   */
  async create(data: {
    contractId: string;
    createdById: string;
    title: string;
    subtitle?: string;
    summary: string;
    challenges?: string;
    solution?: string;
    results?: string;
    testimonial?: string;
    techStack?: string;
    timeline?: string;
    teamSize?: string;
    fullMarkdown: string;
    isDesensitized?: boolean;
    desensitizeConfig?: any;
    displayCustomerName?: string;
    displayAmount?: string;
    displayIndustry?: string;
    tags?: string[];
  }) {
    // Verify contract exists
    const contract = await this.prisma.contract.findUnique({
      where: { id: data.contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${data.contractId} not found`);
    }

    return this.prisma.caseStudy.create({
      data: {
        contractId: data.contractId,
        createdById: data.createdById,
        title: data.title,
        subtitle: data.subtitle || null,
        status: CaseStudyStatus.DRAFT,
        summary: data.summary,
        challenges: data.challenges || null,
        solution: data.solution || null,
        results: data.results || null,
        testimonial: data.testimonial || null,
        techStack: data.techStack || null,
        timeline: data.timeline || null,
        teamSize: data.teamSize || null,
        fullMarkdown: data.fullMarkdown,
        isDesensitized: data.isDesensitized ?? true,
        desensitizeConfig: data.desensitizeConfig || null,
        displayCustomerName: data.displayCustomerName || null,
        displayAmount: data.displayAmount || null,
        displayIndustry: data.displayIndustry || null,
        isManuallyEdited: true,
        tags: data.tags || [],
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
            industry: true,
            ourEntity: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Find all case studies with optional filters
   */
  async findAll(options: {
    contractId?: string;
    status?: CaseStudyStatus;
    createdById?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const where: any = {};

    if (options.contractId) {
      where.contractId = options.contractId;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.createdById) {
      where.createdById = options.createdById;
    }

    const [items, total] = await Promise.all([
      this.prisma.caseStudy.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
        include: {
          contract: {
            select: {
              id: true,
              contractNo: true,
              name: true,
              industry: true,
              ourEntity: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.caseStudy.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Find one case study by ID
   */
  async findOne(id: string) {
    const caseStudy = await this.prisma.caseStudy.findUnique({
      where: { id },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
            industry: true,
            ourEntity: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!caseStudy) {
      throw new NotFoundException(`Case study with ID ${id} not found`);
    }

    return caseStudy;
  }

  /**
   * Find case studies by contract ID
   */
  async findByContractId(contractId: string) {
    return this.prisma.caseStudy.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
            industry: true,
            ourEntity: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update a case study
   */
  async update(id: string, userId: string, data: {
    title?: string;
    subtitle?: string;
    summary?: string;
    challenges?: string;
    solution?: string;
    results?: string;
    testimonial?: string;
    techStack?: string;
    timeline?: string;
    teamSize?: string;
    fullMarkdown?: string;
    isDesensitized?: boolean;
    desensitizeConfig?: any;
    displayCustomerName?: string;
    displayAmount?: string;
    displayIndustry?: string;
    tags?: string[];
  }) {
    // Verify it exists
    await this.findOne(id);

    return this.prisma.caseStudy.update({
      where: { id },
      data: {
        ...data,
        isManuallyEdited: true,
        lastEditedAt: new Date(),
        lastEditedBy: userId,
      },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
            industry: true,
            ourEntity: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update case study status
   */
  async updateStatus(id: string, status: CaseStudyStatus) {
    // Verify it exists
    await this.findOne(id);

    return this.prisma.caseStudy.update({
      where: { id },
      data: { status },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            name: true,
            industry: true,
            ourEntity: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Delete a case study
   */
  async remove(id: string) {
    // Verify it exists
    await this.findOne(id);

    await this.prisma.caseStudy.delete({
      where: { id },
    });
  }
}
