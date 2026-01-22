import { Resolver, Query, Mutation, Args, ArgsType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../graphql/types/enums';
import { SystemConfigService } from './system-config.service';
import { LlmConfigService } from '../llm-parser/config/llm-config.service';
import { LlmParserService } from '../llm-parser/llm-parser.service';
import {
  SystemConfig,
  SystemHealth,
  NotificationResult,
  UpdateSystemConfigInput,
  SendNotificationInput,
  LLMConfig,
  EmbeddingConfig,
  ModelTestResult,
} from './dto';

@Resolver()
export class SystemConfigResolver {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly llmConfigService: LlmConfigService,
    private readonly llmParserService: LlmParserService,
  ) {}

  /**
   * 获取系统配置
   */
  @Query(() => SystemConfig, { description: '获取系统配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async systemConfig(): Promise<SystemConfig> {
    return this.systemConfigService.getSystemConfig();
  }

  /**
   * 获取系统健康状态
   */
  @Query(() => SystemHealth, { description: '获取系统健康状态' })
  async systemHealth(): Promise<SystemHealth> {
    return this.systemConfigService.getSystemHealth();
  }

  /**
   * 更新系统配置
   */
  @Mutation(() => SystemConfig, { description: '更新系统配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateSystemConfig(
    @Args('config', { type: () => UpdateSystemConfigInput })
    config: UpdateSystemConfigInput,
    @CurrentUser() user: any,
  ): Promise<SystemConfig> {
    // 先更新数据库
    const result = await this.systemConfigService.updateSystemConfig(config, user?.id);

    // 如果更新了LLM配置，需要刷新LLM配置缓存和客户端
    const llmConfigChanged =
      config.llmProvider !== undefined ||
      config.llmModel !== undefined ||
      config.llmBaseUrl !== undefined ||
      config.llmApiKey !== undefined ||
      config.llmTemperature !== undefined ||
      config.llmMaxTokens !== undefined ||
      config.llmTimeout !== undefined;

    if (llmConfigChanged) {
      await this.llmConfigService.refreshCache();
      this.llmParserService.refreshClient();
    }

    return result;
  }

  /**
   * 发送通知
   */
  @Mutation(() => NotificationResult, { description: '发送通知' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async sendNotification(
    @Args('input', { type: () => SendNotificationInput })
    input: SendNotificationInput,
  ): Promise<NotificationResult> {
    return this.systemConfigService.sendNotification(input);
  }

  /**
   * 测试SMTP连接
   */
  @Mutation(() => Boolean, { description: '测试SMTP连接' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async testSmtpConnection(): Promise<boolean> {
    return this.systemConfigService.testSmtpConnection();
  }

  /**
   * Get LLM configuration
   */
  @Query(() => LLMConfig, { description: '获取LLM配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async llmConfig(): Promise<LLMConfig> {
    return this.systemConfigService.getLLMConfig();
  }

  /**
   * Get Embedding configuration
   */
  @Query(() => EmbeddingConfig, { description: '获取嵌入模型配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async embeddingConfig(): Promise<EmbeddingConfig> {
    return this.systemConfigService.getEmbeddingConfig();
  }

  /**
   * Save LLM configuration
   */
  @Mutation(() => LLMConfig, { description: '保存LLM配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async saveLLMConfig(
    @Args('config', { type: () => UpdateSystemConfigInput })
    config: UpdateSystemConfigInput,
    @CurrentUser() user: any,
  ): Promise<LLMConfig> {
    const llmConfig: Partial<LLMConfig> = {
      provider: config.llmProvider,
      model: config.llmModel,
      baseUrl: config.llmBaseUrl,
      apiKey: config.llmApiKey,
      temperature: config.llmTemperature,
      maxTokens: config.llmMaxTokens,
      timeout: config.llmTimeout,
    };

    const result = await this.systemConfigService.saveLLMConfig(llmConfig, user?.id);

    // Refresh LLM client
    await this.llmConfigService.refreshCache();
    this.llmParserService.refreshClient();

    return result;
  }

  /**
   * Save Embedding configuration
   */
  @Mutation(() => EmbeddingConfig, { description: '保存嵌入模型配置' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async saveEmbeddingConfig(
    @Args('provider', { type: () => String, nullable: true }) provider?: string,
    @Args('model', { type: () => String, nullable: true }) model?: string,
    @Args('baseUrl', { type: () => String, nullable: true }) baseUrl?: string,
    @Args('apiKey', { type: () => String, nullable: true }) apiKey?: string,
    @Args('dimensions', { type: () => Number, nullable: true }) dimensions?: number,
    @CurrentUser() user?: any,
  ): Promise<EmbeddingConfig> {
    const config: Partial<EmbeddingConfig> = {
      provider,
      model,
      baseUrl,
      apiKey,
      dimensions,
    };

    return this.systemConfigService.saveEmbeddingConfig(config, user?.id);
  }

  /**
   * Test LLM connection
   */
  @Mutation(() => ModelTestResult, { description: '测试LLM连接' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async testLLMConnection(): Promise<ModelTestResult> {
    return this.systemConfigService.testLLMConnection();
  }

  /**
   * Test Embedding connection
   */
  @Mutation(() => ModelTestResult, { description: '测试嵌入模型连接' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async testEmbeddingConnection(): Promise<ModelTestResult> {
    return this.systemConfigService.testEmbeddingConnection();
  }

  /**
   * Reset LLM configuration
   */
  @Mutation(() => LLMConfig, { description: '重置LLM配置为默认值' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async resetLLMConfig(@CurrentUser() user?: any): Promise<LLMConfig> {
    const result = await this.systemConfigService.resetLLMConfig(user?.id);

    // Refresh LLM client
    await this.llmConfigService.refreshCache();
    this.llmParserService.refreshClient();

    return result;
  }

  /**
   * Reset Embedding configuration
   */
  @Mutation(() => EmbeddingConfig, { description: '重置嵌入模型配置为默认值' })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async resetEmbeddingConfig(@CurrentUser() user?: any): Promise<EmbeddingConfig> {
    return this.systemConfigService.resetEmbeddingConfig(user?.id);
  }
}
