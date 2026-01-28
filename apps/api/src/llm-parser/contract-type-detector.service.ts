import { Injectable, Logger } from '@nestjs/common';
import { LlmConfigService } from './config/llm-config.service';
import OpenAI from 'openai';

/**
 * 合同类型
 */
export type ContractType = 'STAFF_AUGMENTATION' | 'PROJECT_OUTSOURCING' | 'PRODUCT_SALES' | 'MIXED';

/**
 * 合同类型检测结果
 */
export interface ContractTypeDetectionResult {
  detectedType: ContractType | null;
  confidence: number;
  reasoning: string;
  rawResponse?: string;
}

/**
 * 合同类型检测服务
 *
 * 使用LLM从合同文档中检测合同类型
 */
@Injectable()
export class ContractTypeDetectorService {
  private readonly logger = new Logger(ContractTypeDetectorService.name);
  private openai!: OpenAI; // Initialized in constructor via refreshClient()

  constructor(private readonly llmConfigService: LlmConfigService) {
    this.refreshClient();
  }

  /**
   * 刷新 OpenAI 客户端（配置变更时调用）
   */
  refreshClient(): void {
    const config = this.llmConfigService.getActiveConfig();
    const timeout = config.timeout || 120000; // 默认120秒

    this.openai = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: timeout,
      maxRetries: 0,
    });

    this.logger.log(
      `[ContractTypeDetector] OpenAI client refreshed: baseUrl="${config.baseUrl}", ` +
      `model="${config.model}", timeout=${timeout}ms`
    );
  }

  /**
   * 从文件名中检测合同类型（优先方法）
   *
   * @param fileName - 上传文件的原始名称
   * @param confidenceThreshold - 置信度阈值，默认0.75
   * @returns 检测结果，如果置信度低于阈值则detectedType为null
   */
  async detectContractTypeFromFileName(
    fileName: string,
    confidenceThreshold: number = 0.75,
  ): Promise<ContractTypeDetectionResult> {
    const startTime = Date.now();

    try {
      const config = this.llmConfigService.getActiveConfig();

      // 提取文件名（去除路径和扩展名）
      const cleanFileName = fileName
        .split('/').pop() || fileName
        .split('\\').pop() || fileName
        .replace(/\.[^.]+$/, ''); // 去除扩展名

      const systemPrompt = `你是一个专业的合同类型识别专家。你的任务是根据文件名判断合同类型。

合同类型说明：
1. PROJECT_OUTSOURCING（项目外包）：软件开发、系统集成、技术开发、IT服务、工程实施、技术服务
2. STAFF_AUGMENTATION（人力框架）：人力外包、人员外派、劳务派遣、人力资源、服务协议、技术人员派驻
3. PRODUCT_SALES（产品购销）：产品销售、设备采购、购销合同、货物买卖、硬件采购

文件命名模式示例：
- "XX公司人力外包合同.pdf" → STAFF_AUGMENTATION
- "XX项目外包协议.docx" → PROJECT_OUTSOURCING
- "XX设备采购合同.pdf" → PRODUCT_SALES
- "Staff Augmentation Agreement.pdf" → STAFF_AUGMENTATION
- "Software Development Contract.pdf" → PROJECT_OUTSOURCING

请分析文件名中的关键词并判断合同类型。如果文件名过于模糊（如"合同001.pdf"），请设置较低的置信度。`;

      const userPrompt = `请分析以下文件名并判断合同类型：

文件名：${cleanFileName}

请返回以下JSON格式（不要包含其他文字）：
\`\`\`json
{
  "detectedType": "PROJECT_OUTSOURCING" | "STAFF_AUGMENTATION" | "PRODUCT_SALES",
  "confidence": 0.0-1.0,
  "reasoning": "判断依据的简短说明，说明哪些关键词指向该类型"
}
\`\`\``;

      this.logger.log(`[Contract Type Detection from Filename] Analyzing filename: "${cleanFileName}"`);

      this.logger.log(`[Contract Type Detection from Filename] Calling LLM: model=${config.model}, baseUrl=${config.baseUrl}`);

      const response = await this.openai.chat.completions.create(
        {
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 2000,  // 增加以适应 GLM 的推理模式
        },
        {
          timeout: config.timeout || 60000,
        },
      );

      // 详细日志：检查响应结构
      this.logger.log(`[Contract Type Detection from Filename] Response received: choices=${response.choices?.length}, finish_reason=${response.choices?.[0]?.finish_reason}, usage=${JSON.stringify(response.usage)}`);

      const rawResponse = response.choices[0]?.message?.content || '';
      this.logger.log(`[Contract Type Detection from Filename] Raw response (${rawResponse.length} chars): ${rawResponse.substring(0, 500)}`);

      // 提取JSON（处理可能的markdown代码块包裹）
      const jsonMatch = rawResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                       rawResponse.match(/\{[\s\S]*?\}/);

      if (!jsonMatch) {
        this.logger.warn('[Contract Type Detection from Filename] No JSON found in response');
        return {
          detectedType: null,
          confidence: 0,
          reasoning: '无法解析LLM响应',
        };
      }

      const result = JSON.parse(jsonMatch[1]) as {
        detectedType: ContractType;
        confidence: number;
        reasoning: string;
      };

      // 验证detectedType是有效值
      const validTypes: ContractType[] = ['PROJECT_OUTSOURCING', 'STAFF_AUGMENTATION', 'PRODUCT_SALES', 'MIXED'];
      if (!validTypes.includes(result.detectedType)) {
        this.logger.warn(`[Contract Type Detection from Filename] Invalid type detected: ${result.detectedType}`);
        return {
          detectedType: null,
          confidence: 0,
          reasoning: '检测到无效的合同类型',
        };
      }

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(
        `[Contract Type Detection from Filename] Detected: ${result.detectedType}, ` +
        `confidence: ${result.confidence}, reasoning: ${result.reasoning}, time: ${processingTimeMs}ms`
      );

      // 如果置信度低于阈值，返回null让调用方降级到文本分析
      const finalConfidence = result.confidence || 0.5;
      if (finalConfidence < confidenceThreshold) {
        this.logger.log(
          `[Contract Type Detection from Filename] Confidence ${finalConfidence} below threshold ${confidenceThreshold}, will fallback to text analysis`
        );
        return {
          detectedType: null,
          confidence: finalConfidence,
          reasoning: result.reasoning || '置信度低于阈值',
        };
      }

      return {
        detectedType: result.detectedType,
        confidence: finalConfidence,
        reasoning: result.reasoning || '基于文件名特征判断',
        rawResponse,
      };
    } catch (error) {
      this.logger.error('[Contract Type Detection from Filename] Error:', error);
      return {
        detectedType: null,
        confidence: 0,
        reasoning: '文件名分析失败: ' + (error as Error).message,
      };
    }
  }

  /**
   * 从合同文本中检测合同类型（备用方法）
   * 当文件名检测置信度 < 0.75 时调用此方法
   */
  async detectContractTypeFromText(
    text: string,
  ): Promise<ContractTypeDetectionResult> {
    const startTime = Date.now();

    try {
      const config = this.llmConfigService.getActiveConfig();

      // 截取前1000字符用于类型检测（足够判断类型，减少LLM处理时间）
      const sampleText = text.slice(0, 1000);

      const systemPrompt = `你是一个专业的合同类型识别专家。你的任务是根据合同内容判断合同类型。

合同类型说明：
1. PROJECT_OUTSOURCING（项目外包）：特征包括里程碑、交付物、验收标准、阶段性付款、项目范围说明书(SOW)
2. STAFF_AUGMENTATION（人力框架）：特征包括工时费率、角色、工时上限、月度工时上限、结算周期、工时审批流程
3. PRODUCT_SALES（产品购销）：特征包括产品清单、单价、数量、交货日期、交付地点、产品规格、保修期

请分析合同内容并返回JSON格式的结果：`;

      const userPrompt = `请分析以下合同内容并判断合同类型：

\`\`\`
${sampleText}
\`\`\`

请返回以下JSON格式（不要包含其他文字）：
\`\`\`json
{
  "detectedType": "PROJECT_OUTSOURCING" | "STAFF_AUGMENTATION" | "PRODUCT_SALES",
  "confidence": 0.0-1.0,
  "reasoning": "判断依据的简短说明"
}
\`\`\``;

      this.logger.log(`[Contract Type Detection] Sending request to LLM: model=${config.model}, baseUrl=${config.baseUrl}`);

      const response = await this.openai.chat.completions.create(
        {
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 2000,  // 增加以适应 GLM 的推理模式
        },
        {
          timeout: config.timeout || 60000,
        },
      );

      // 详细日志：检查响应结构
      this.logger.log(`[Contract Type Detection] Response: choices=${response.choices?.length}, finish_reason=${response.choices?.[0]?.finish_reason}, usage=${JSON.stringify(response.usage)}`);

      const rawResponse = response.choices[0]?.message?.content || '';
      this.logger.log(`[Contract Type Detection] Raw response (${rawResponse.length} chars): ${rawResponse.substring(0, 500)}`);

      // 提取JSON（处理可能的markdown代码块包裹）
      const jsonMatch = rawResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                       rawResponse.match(/\{[\s\S]*?\}/);

      if (!jsonMatch) {
        this.logger.warn('[Contract Type Detection] No JSON found in response, using fallback detection');
        return this.fallbackDetection(text);
      }

      const result = JSON.parse(jsonMatch[1]) as {
        detectedType: ContractType;
        confidence: number;
        reasoning: string;
      };

      // 验证detectedType是有效值
      const validTypes: ContractType[] = ['PROJECT_OUTSOURCING', 'STAFF_AUGMENTATION', 'PRODUCT_SALES', 'MIXED'];
      if (!validTypes.includes(result.detectedType)) {
        this.logger.warn(`[Contract Type Detection] Invalid type detected: ${result.detectedType}, using fallback`);
        return this.fallbackDetection(text);
      }

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(
        `[Contract Type Detection] Detected: ${result.detectedType}, ` +
        `confidence: ${result.confidence}, time: ${processingTimeMs}ms`
      );

      return {
        detectedType: result.detectedType,
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || '基于合同内容特征判断',
        rawResponse,
      };
    } catch (error) {
      this.logger.error('[Contract Type Detection] Error:', error);
      return this.fallbackDetection(text);
    }
  }

  /**
   * 合同类型检测统一入口
   *
   * 检测策略：
   * 1. 如果提供了 fileName，先使用文件名进行LLM判断
   * 2. 如果文件名判断的置信度 >= 0.75，直接返回结果
   * 3. 否则，使用文本内容进行判断（备用方法）
   *
   * @param fileName - 可选的文件名，用于优先判断
   * @param text - 合同文本内容，用于备用判断
   * @param confidenceThreshold - 文件名判断的置信度阈值，默认0.75
   * @returns 检测结果
   */
  async detectContractType(
    text: string,
    fileName?: string,
    confidenceThreshold: number = 0.75,
  ): Promise<ContractTypeDetectionResult> {
    this.logger.log(`========== 合同类型检测 ==========`);
    this.logger.log(`文件名: ${fileName || '(无)'}`);
    this.logger.log(`文本长度: ${text.length} 字符`);
    this.logger.log(`置信度阈值: ${confidenceThreshold}`);

    // 如果提供了文件名，先尝试基于文件名判断
    if (fileName) {
      this.logger.log(`[步骤1] 尝试文件名检测...`);
      const fileNameResult = await this.detectContractTypeFromFileName(fileName, confidenceThreshold);

      // 如果文件名判断置信度足够高，直接返回
      if (fileNameResult.detectedType && fileNameResult.confidence >= confidenceThreshold) {
        this.logger.log(`[结果] 文件名检测成功: ${fileNameResult.detectedType} (置信度: ${fileNameResult.confidence})`);
        this.logger.log(`[原因] ${fileNameResult.reasoning}`);
        this.logger.log(`====================================`);
        return fileNameResult;
      }

      // 置信度不够，继续使用文本分析
      this.logger.log(`[步骤1] 文件名检测置信度不足 (${fileNameResult.confidence} < ${confidenceThreshold})`);
    } else {
      this.logger.log(`[步骤1] 跳过文件名检测 (未提供文件名)`);
    }

    // 降级到文本内容分析
    this.logger.log(`[步骤2] 使用文本内容检测...`);
    const textResult = await this.detectContractTypeFromText(text);
    this.logger.log(`[结果] 文本检测: ${textResult.detectedType} (置信度: ${textResult.confidence})`);
    this.logger.log(`[原因] ${textResult.reasoning}`);
    this.logger.log(`====================================`);
    return textResult;
  }

  /**
   * 基于关键词的备用检测方法（当LLM失败时）
   */
  private fallbackDetection(text: string): ContractTypeDetectionResult {
    const lowerText = text.toLowerCase();

    // 人力框架关键词
    const staffKeywords = [
      '工时', '费率', '人天', '人月', '角色', '结算周期',
      'timesheet', '工时审批', '月度工时', '工时上限',
      'hourly rate', 'daily rate', 'timesheet approval',
    ];
    const staffScore = staffKeywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;

    // 项目外包关键词
    const projectKeywords = [
      '里程碑', '交付物', '验收', '阶段性', '付款节点',
      'sow', '项目范围', '交付标准', '里程碑付款',
      'milestone', 'deliverable', 'acceptance criteria',
    ];
    const projectScore = projectKeywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;

    // 产品购销关键词
    const productKeywords = [
      '产品', '规格', '数量', '单价', '交货', '保修',
      '产品清单', '交货日期', '交付地点', '产品规格',
      'product', 'specification', 'delivery date', 'warranty period',
    ];
    const productScore = productKeywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;

    // 找出得分最高的
    const maxScore = Math.max(staffScore, projectScore, productScore);

    if (maxScore === 0) {
      // 没有明显特征，默认为项目外包
      return {
        detectedType: 'PROJECT_OUTSOURCING',
        confidence: 0.3,
        reasoning: '无明显特征，默认为项目外包类型',
      };
    }

    let detectedType: ContractType;
    let reasoning: string;

    if (staffScore === maxScore) {
      detectedType = 'STAFF_AUGMENTATION';
      reasoning = `检测到人力框架相关特征（${staffScore}个关键词）`;
    } else if (projectScore === maxScore) {
      detectedType = 'PROJECT_OUTSOURCING';
      reasoning = `检测到项目外包相关特征（${projectScore}个关键词）`;
    } else {
      detectedType = 'PRODUCT_SALES';
      reasoning = `检测到产品购销相关特征（${productScore}个关键词）`;
    }

    this.logger.log(`[Contract Type Detection] Fallback detection: ${detectedType} (${reasoning})`);

    return {
      detectedType,
      confidence: 0.6,
      reasoning,
    };
  }

  /**
   * 获取合同类型的中文显示名称
   */
  getTypeDisplayName(type: ContractType): string {
    const displayNames: Record<ContractType, string> = {
      PROJECT_OUTSOURCING: '项目外包',
      STAFF_AUGMENTATION: '人力框架',
      PRODUCT_SALES: '产品购销',
      MIXED: '混合类型',
    };
    return displayNames[type];
  }

  /**
   * 获取合同类型的描述
   */
  getTypeDescription(type: ContractType): string {
    const descriptions: Record<ContractType, string> = {
      PROJECT_OUTSOURCING: '项目外包合同 - 以里程碑和交付物为核心的合同类型',
      STAFF_AUGMENTATION: '人力框架合同 - 以工时和费率为核心的合同类型',
      PRODUCT_SALES: '产品购销合同 - 以产品买卖为核心的合同类型',
      MIXED: '混合类型合同 - 包含多种合同特征的综合类型',
    };
    return descriptions[type];
  }
}
