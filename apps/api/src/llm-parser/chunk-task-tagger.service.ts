import { Injectable, Logger } from '@nestjs/common';
import { SemanticChunk } from './semantic-chunker.service';
import { InfoType, InfoTypeNames } from './parse-progress.service';
import { LlmConfigService } from './config/llm-config.service';
import OpenAI from 'openai';

/**
 * 任务标记结果
 */
export interface ChunkTaskTag {
  chunkId: string;
  relevantTasks: InfoType[];
  keywordMatches: Record<InfoType, string[]>; // 匹配到的关键词
  llmSuggested?: InfoType[]; // LLM 补充的任务
  confidence: number; // 标记置信度 0-1
}

/**
 * 带任务标记的语义分块
 */
export interface TaggedChunk extends SemanticChunk {
  taskTags: ChunkTaskTag;
}

/**
 * 任务关键词配置
 */
interface TaskKeywordConfig {
  infoType: InfoType;
  keywords: string[];
  priority: number; // 优先级，用于冲突时排序
}

/**
 * 分块任务标记服务
 *
 * 功能：
 * 1. 基于关键词快速标记分块与任务的关联
 * 2. 支持 LLM 补充/修正标记
 * 3. 为后续任务筛选相关分块
 */
@Injectable()
export class ChunkTaskTaggerService {
  private readonly logger = new Logger(ChunkTaskTaggerService.name);
  private openai: OpenAI | null = null;

  // LLM补充的置信度阈值：低于此值的分块需要LLM确认
  private readonly LLM_SUPPLEMENT_THRESHOLD = 0.5;

  constructor(private configService: LlmConfigService) {
    this.refreshClient();
  }

  /**
   * 刷新 OpenAI 客户端
   */
  refreshClient(): void {
    const config = this.configService.getActiveConfig();
    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout || 60000,
      maxRetries: 0,
    });
    this.logger.log(`[ChunkTaskTagger] OpenAI client refreshed`);
  }

  /**
   * 任务关键词配置
   */
  private readonly TASK_KEYWORDS: TaskKeywordConfig[] = [
    {
      infoType: InfoType.BASIC_INFO,
      keywords: ['合同编号', '合同名称', '甲方', '乙方', '委托方', '受托方', '发包方', '承包方', '卖方', '买方'],
      priority: 100,
    },
    {
      infoType: InfoType.FINANCIAL,
      keywords: ['金额', '价款', '总价', '税率', '付款', '支付', '费用', '结算', '含税', '不含税', '币种', '货币', '开票'],
      priority: 90,
    },
    {
      infoType: InfoType.MILESTONES,
      keywords: ['里程碑', '阶段', '交付', '验收', '节点', '分期', '进度', '完成', '付款节点'],
      priority: 80,
    },
    {
      infoType: InfoType.RATE_ITEMS,
      keywords: ['费率', '单价', '人天', '人月', '工时', '角色', '级别', '人力', '外包', '服务费率'],
      priority: 70,
    },
    {
      infoType: InfoType.LINE_ITEMS,
      keywords: ['产品', '数量', '规格', '型号', '清单', '货物', '商品', '设备', '单位', '采购'],
      priority: 70,
    },
    {
      infoType: InfoType.TIME_INFO,
      keywords: ['期限', '日期', '生效', '签订', '到期', '有效期', '起始', '终止', '履行期'],
      priority: 85,
    },
    {
      infoType: InfoType.DELIVERABLES,
      keywords: ['交付物', '成果', '文档', '报告', '系统', '软件', '代码', '设计', '方案'],
      priority: 60,
    },
    {
      infoType: InfoType.RISK_CLAUSES,
      keywords: ['违约', '赔偿', '责任', '保密', '知识产权', '争议', '仲裁', '解除', '终止', '不可抗力'],
      priority: 50,
    },
  ];

  /**
   * 为所有分块添加任务标记（仅基于关键词）
   *
   * @param chunks 语义分块数组
   * @returns 带任务标记的分块数组
   */
  tagChunksWithKeywords(chunks: SemanticChunk[]): TaggedChunk[] {
    this.logger.log(`========== 分块任务标记开始 ==========`);
    this.logger.log(`待标记分块数: ${chunks.length}`);

    const taggedChunks: TaggedChunk[] = [];

    for (const chunk of chunks) {
      const taskTag = this.tagSingleChunk(chunk);
      taggedChunks.push({
        ...chunk,
        taskTags: taskTag,
      });
    }

    // 统计标记结果
    const taskStats: Record<string, number> = {};
    for (const tc of taggedChunks) {
      for (const task of tc.taskTags.relevantTasks) {
        taskStats[task] = (taskStats[task] || 0) + 1;
      }
    }

    this.logger.log(`标记结果统计:`);
    for (const [task, count] of Object.entries(taskStats)) {
      this.logger.log(`  ${task}: ${count} 个分块`);
    }
    this.logger.log(`========== 分块任务标记完成 ==========`);

    return taggedChunks;
  }

  /**
   * 标记单个分块
   */
  private tagSingleChunk(chunk: SemanticChunk): ChunkTaskTag {
    const text = chunk.text.toLowerCase();
    const relevantTasks: InfoType[] = [];
    const keywordMatches: Record<InfoType, string[]> = {} as Record<InfoType, string[]>;

    for (const config of this.TASK_KEYWORDS) {
      const matches: string[] = [];

      for (const keyword of config.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches.push(keyword);
        }
      }

      if (matches.length > 0) {
        relevantTasks.push(config.infoType);
        keywordMatches[config.infoType] = matches;
      }
    }

    // 计算置信度：匹配的关键词越多，置信度越高
    const totalMatches = Object.values(keywordMatches).reduce((sum, arr) => sum + arr.length, 0);
    const confidence = Math.min(1, totalMatches * 0.15); // 每个关键词增加 15% 置信度，最高 100%

    return {
      chunkId: chunk.id,
      relevantTasks,
      keywordMatches,
      confidence,
    };
  }

  /**
   * 更新分块的任务标记（LLM 补充）
   *
   * @param chunk 带标记的分块
   * @param llmSuggestedTasks LLM 建议的任务类型
   * @returns 更新后的分块
   */
  updateChunkTagsFromLLM(chunk: TaggedChunk, llmSuggestedTasks: InfoType[]): TaggedChunk {
    const newTasks = llmSuggestedTasks.filter(t => !chunk.taskTags.relevantTasks.includes(t));

    if (newTasks.length > 0) {
      this.logger.log(`[LLM补充] 分块 ${chunk.id} 新增任务标记: ${newTasks.join(', ')}`);

      return {
        ...chunk,
        taskTags: {
          ...chunk.taskTags,
          relevantTasks: [...chunk.taskTags.relevantTasks, ...newTasks],
          llmSuggested: newTasks,
          confidence: Math.min(1, chunk.taskTags.confidence + 0.2), // LLM 补充增加置信度
        },
      };
    }

    return chunk;
  }

  /**
   * 获取特定任务的相关分块
   *
   * @param taggedChunks 所有带标记的分块
   * @param infoType 任务类型
   * @returns 与该任务相关的分块
   */
  getChunksForTask(taggedChunks: TaggedChunk[], infoType: InfoType): TaggedChunk[] {
    return taggedChunks.filter(chunk =>
      chunk.taskTags.relevantTasks.includes(infoType)
    );
  }

  /**
   * 获取任务关键词配置（用于外部访问）
   */
  getTaskKeywords(infoType: InfoType): string[] {
    const config = this.TASK_KEYWORDS.find(c => c.infoType === infoType);
    return config?.keywords || [];
  }

  /**
   * 解析 LLM 返回的任务标记
   *
   * @param llmResponse LLM 返回的任务标记字符串（如 "FINANCIAL,MILESTONES"）
   * @returns 任务类型数组
   */
  parseLLMTaskTags(llmResponse: string): InfoType[] {
    if (!llmResponse) return [];

    const validTypes = Object.values(InfoType);
    const tags: InfoType[] = [];

    // 尝试解析逗号分隔的任务类型
    const parts = llmResponse.split(/[,，\s]+/).map(s => s.trim().toUpperCase());

    for (const part of parts) {
      if (validTypes.includes(part as InfoType)) {
        tags.push(part as InfoType);
      }
    }

    return tags;
  }

  /**
   * 使用 LLM 补充分块的任务标记
   * 只对低置信度分块调用 LLM
   *
   * @param taggedChunks 已用关键词标记的分块
   * @param onProgress 进度回调（可选）
   * @returns 补充后的分块数组
   */
  async supplementTagsWithLLM(
    taggedChunks: TaggedChunk[],
    onProgress?: (current: number, total: number) => void
  ): Promise<TaggedChunk[]> {
    // 筛选低置信度分块
    const lowConfidenceChunks = taggedChunks.filter(
      chunk => chunk.taskTags.confidence < this.LLM_SUPPLEMENT_THRESHOLD
    );

    if (lowConfidenceChunks.length === 0) {
      this.logger.log(`[LLM补充] 所有分块置信度 >= ${this.LLM_SUPPLEMENT_THRESHOLD}，跳过LLM补充`);
      return taggedChunks;
    }

    this.logger.log(`========== LLM 补充标记开始 ==========`);
    this.logger.log(`低置信度分块数: ${lowConfidenceChunks.length}/${taggedChunks.length}`);

    const result = [...taggedChunks];

    for (let i = 0; i < lowConfidenceChunks.length; i++) {
      const chunk = lowConfidenceChunks[i];
      const chunkIndex = taggedChunks.findIndex(c => c.id === chunk.id);

      // 进度回调
      if (onProgress) {
        onProgress(i + 1, lowConfidenceChunks.length);
      }

      this.logger.log(`[LLM补充] 处理分块 ${i + 1}/${lowConfidenceChunks.length}: ${chunk.id} (置信度: ${chunk.taskTags.confidence.toFixed(2)})`);

      try {
        const llmTags = await this.callLLMForTagging(chunk);

        if (llmTags.length > 0) {
          result[chunkIndex] = this.updateChunkTagsFromLLM(chunk, llmTags);
          this.logger.log(`[LLM补充] 分块 ${chunk.id} 补充任务: ${llmTags.join(', ')}`);
        } else {
          this.logger.log(`[LLM补充] 分块 ${chunk.id} 无新增任务`);
        }

        // 分块间延迟，避免请求过快
        if (i < lowConfidenceChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[LLM补充] 分块 ${chunk.id} 失败: ${errorMessage}`);
        // 单个分块失败不影响整体
      }
    }

    this.logger.log(`========== LLM 补充标记完成 ==========`);
    return result;
  }

  /**
   * 调用 LLM 判断分块相关的任务类型
   */
  private async callLLMForTagging(chunk: TaggedChunk): Promise<InfoType[]> {
    if (!this.openai) {
      this.refreshClient();
    }

    // 构建 prompt
    const prompt = this.buildTaggingPrompt(chunk);

    try {
      const config = this.configService.getActiveConfig();
      const completion = await this.openai!.chat.completions.create({
        model: config.model,
        temperature: 0.1,
        max_tokens: 3000, // 增加以适应 GLM 的推理模式（推理可能消耗大量token）
        messages: [
          { role: 'system', content: this.getTaggingSystemPrompt() },
          { role: 'user', content: prompt },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      // 解析 LLM 响应
      return this.parseLLMTaskTags(content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[LLM标记] 调用失败: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 构建标记任务的 Prompt
   */
  private buildTaggingPrompt(chunk: TaggedChunk): string {
    // 截取文本（避免过长）
    const text = chunk.text.length > 1500 ? chunk.text.substring(0, 1500) + '...' : chunk.text;

    // 显示已匹配的关键词（如果有）
    const existingMatches = chunk.taskTags.relevantTasks.length > 0
      ? `\n已匹配的任务类型: ${chunk.taskTags.relevantTasks.join(', ')}`
      : '';

    return `请判断以下合同文本片段与哪些信息类型相关。
${existingMatches}

【合同文本片段】
${text}

【请返回相关的信息类型，用英文逗号分隔】
例如: FINANCIAL,MILESTONES
如果没有相关信息，返回: NONE`;
  }

  /**
   * 获取标记任务的系统 Prompt
   */
  private getTaggingSystemPrompt(): string {
    // 构建任务类型说明
    const typeDescriptions = Object.values(InfoType).map(type => {
      const keywords = this.getTaskKeywords(type);
      const keywordHint = keywords.length > 0 ? `（关键词: ${keywords.slice(0, 5).join('、')}...）` : '';
      return `- ${type}: ${InfoTypeNames[type]}${keywordHint}`;
    }).join('\n');

    return `你是一个合同信息分类专家。你的任务是判断给定的合同文本片段与哪些信息类型相关。

【信息类型列表】
${typeDescriptions}

【判断规则】
1. 一个文本片段可能与多个信息类型相关
2. 不要只看关键词，要理解语义
3. 如果文本明确涉及某类信息，即使没有典型关键词也要标记
4. 只返回信息类型的英文代码，用逗号分隔
5. 如果没有相关信息，返回 NONE

【示例】
输入: "本项目分三期交付，首期款项30%在签约后支付..."
输出: MILESTONES,FINANCIAL

输入: "高级顾问按月结算服务费，标准为每月35000元"
输出: RATE_ITEMS,FINANCIAL

输入: "双方约定保密期限为合同终止后三年"
输出: RISK_CLAUSES`;
  }

  /**
   * 检查是否需要LLM补充（用于外部判断）
   */
  needsLLMSupplement(taggedChunks: TaggedChunk[]): boolean {
    return taggedChunks.some(chunk => chunk.taskTags.confidence < this.LLM_SUPPLEMENT_THRESHOLD);
  }

  /**
   * 获取需要LLM补充的分块数量
   */
  getLowConfidenceChunkCount(taggedChunks: TaggedChunk[]): number {
    return taggedChunks.filter(chunk => chunk.taskTags.confidence < this.LLM_SUPPLEMENT_THRESHOLD).length;
  }
}
