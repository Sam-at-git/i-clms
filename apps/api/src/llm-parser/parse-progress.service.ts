import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * InfoType枚举 - 信息类型
 *
 * 值与 ExtractTopic 保持一致，用于合同类型主题批次映射
 */
export enum InfoType {
  BASIC_INFO = 'BASIC_INFO',           // 基本信息
  FINANCIAL = 'FINANCIAL',             // 财务信息
  MILESTONES = 'MILESTONES',           // 里程碑
  RATE_ITEMS = 'RATE_ITEMS',           // 人力费率
  LINE_ITEMS = 'LINE_ITEMS',           // 产品清单
  RISK_CLAUSES = 'RISK_CLAUSES',       // 风险条款
  DELIVERABLES = 'DELIVERABLES',       // 交付物
  TIME_INFO = 'TIME_INFO',             // 时间信息
}

/**
 * InfoType显示名称映射
 */
export const InfoTypeNames: Record<InfoType, string> = {
  [InfoType.BASIC_INFO]: '基本信息',
  [InfoType.FINANCIAL]: '财务信息',
  [InfoType.MILESTONES]: '里程碑信息',
  [InfoType.RATE_ITEMS]: '人力费率',
  [InfoType.LINE_ITEMS]: '产品清单',
  [InfoType.RISK_CLAUSES]: '风险条款',
  [InfoType.DELIVERABLES]: '交付物信息',
  [InfoType.TIME_INFO]: '时间信息',
};

/**
 * 单个任务的解析状态
 */
export interface TaskProgress {
  taskId: string;
  infoType: InfoType;
  infoTypeName: string; // 中文名称
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
  data?: any; // 该任务提取的数据（可选）
  // 任务内分块进度
  totalTaskChunks?: number; // 该任务需处理的分块总数
  completedTaskChunks?: number; // 该任务已完成的分块数
  currentTaskChunk?: number; // 当前处理的分块索引（1-based）
}

/**
 * 单个分块的解析状态
 */
export interface ChunkProgress {
  chunkId: string;
  chunkIndex: number;
  totalChunks: number;
  purpose: string; // 如 "合同头部-基本信息", "财务条款" 等
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
}

/**
 * 解析会话的整体进度
 */
export interface ParseSessionProgress {
  sessionId: string;
  objectName: string;
  status: 'initializing' | 'uploading' | 'parsing' | 'chunking' | 'llm_processing' | 'merging' | 'completed' | 'failed';
  currentStage: string; // 人类可读的当前阶段描述
  totalChunks: number;
  completedChunks: number;
  currentChunkIndex: number;
  chunks: ChunkProgress[];
  // 新增：任务级别进度
  totalTasks: number;
  completedTasks: number;
  currentTaskInfo?: string; // 当前正在处理的任务名称
  tasks: TaskProgress[];
  startTime: number;
  estimatedEndTime?: number;
  processingTimeMs?: number;
  error?: string;
  extractedFieldsCount?: number; // 已提取的字段数量
  resultData?: any; // 存储解析完成后的完整结果
  markdownContent?: string; // 文档的Markdown格式内容

  // Spec 40: Token and Time Tracking
  totalTokensUsed: number;           // 累计使用的token数
  currentTaskTokens: number;         // 当前任务使用的token数
  currentTaskStartTime: number;      // 当前任务开始时间（timestamp）
  sessionStartTime: number;          // 会话开始时间（timestamp）
  totalEstimatedChunks: number;      // 所有任务的总chunk数
  initialEstimatedSeconds: number;   // 初始预估秒数
  averageChunkTimeMs: number;        // 平均单chunk耗时（毫秒）
}

/**
 * 解析进度事件
 */
export interface ParseProgressEvent {
  sessionId: string;
  type: 'stage_changed' | 'chunk_started' | 'chunk_completed' | 'chunk_failed' | 'task_started' | 'task_completed' | 'task_failed' | 'completed' | 'failed';
  timestamp: number;
  data?: any;
}

/**
 * 解析进度服务
 * 跟踪LLM解析的进度，支持前端轮询查询
 */
@Injectable()
export class ParseProgressService {
  private readonly logger = new Logger(ParseProgressService.name);
  private readonly sessions = new Map<string, ParseSessionProgress>();
  private readonly eventLog: ParseProgressEvent[] = [];
  private readonly MAX_EVENT_LOG_SIZE = 1000;

  /**
   * 创建新的解析会话
   */
  createSession(objectName: string): string {
    const sessionId = uuidv4();
    const now = Date.now();
    const session: ParseSessionProgress = {
      sessionId,
      objectName,
      status: 'initializing',
      currentStage: '初始化解析任务',
      totalChunks: 0,
      completedChunks: 0,
      currentChunkIndex: 0,
      chunks: [],
      // 新增：任务级别字段
      totalTasks: 0,
      completedTasks: 0,
      tasks: [],
      startTime: now,
      // Spec 40: Token and Time Tracking initialization
      totalTokensUsed: 0,
      currentTaskTokens: 0,
      currentTaskStartTime: 0,
      sessionStartTime: now,
      totalEstimatedChunks: 0,
      initialEstimatedSeconds: 0,
      averageChunkTimeMs: 0,
    };

    this.sessions.set(sessionId, session);
    this.logEvent(sessionId, 'stage_changed', { stage: 'initializing' });

    this.logger.log(`[ParseProgress] Created session ${sessionId} for ${objectName}`);
    return sessionId;
  }

  /**
   * 获取会话进度
   */
  getSession(sessionId: string): ParseSessionProgress | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取所有活跃会话
   */
  getAllSessions(): ParseSessionProgress[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 更新会话状态
   */
  updateStage(
    sessionId: string,
    status: ParseSessionProgress['status'],
    currentStage: string,
    data?: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`[ParseProgress] Session ${sessionId} not found`);
      return;
    }

    session.status = status;
    session.currentStage = currentStage;

    if (status === 'completed') {
      session.processingTimeMs = Date.now() - session.startTime;
      session.estimatedEndTime = Date.now();
    }

    this.logEvent(sessionId, 'stage_changed', { status, currentStage, data });
    this.logger.debug(`[ParseProgress] Session ${sessionId}: ${currentStage}`);
  }

  /**
   * 设置分块信息
   */
  setChunks(sessionId: string, chunks: Array<{ id: string; purpose: string }>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.totalChunks = chunks.length;
    session.chunks = chunks.map((chunk, index) => ({
      chunkId: chunk.id,
      chunkIndex: index,
      totalChunks: chunks.length,
      purpose: chunk.purpose,
      status: 'pending',
    }));

    this.logger.log(`[ParseProgress] Session ${sessionId}: set ${chunks.length} chunks`);
  }

  /**
   * 设置任务信息
   */
  setTasks(sessionId: string, infoTypes: InfoType[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.totalTasks = infoTypes.length;
    session.tasks = infoTypes.map((infoType, index) => ({
      taskId: `${infoType}-${index}`,
      infoType,
      infoTypeName: InfoTypeNames[infoType],
      status: 'pending',
    }));

    this.logger.log(`[ParseProgress] Session ${sessionId}: set ${infoTypes.length} tasks: ${infoTypes.map(t => InfoTypeNames[t]).join(', ')}`);
  }

  /**
   * 开始处理任务
   */
  startTask(sessionId: string, infoType: InfoType): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const task = session.tasks.find(t => t.infoType === infoType);
    if (task) {
      task.status = 'processing';
      task.startTime = Date.now();
      session.currentTaskInfo = task.infoTypeName;
      session.currentStage = `正在提取: ${task.infoTypeName}`;

      this.logEvent(sessionId, 'task_started', { infoType, infoTypeName: task.infoTypeName });
      this.logger.debug(`[ParseProgress] Session ${sessionId}: started task ${task.infoTypeName}`);
    }
  }

  /**
   * 完成任务处理
   */
  completeTask(sessionId: string, infoType: InfoType, data?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const task = session.tasks.find(t => t.infoType === infoType);
    if (task) {
      task.status = 'completed';
      task.endTime = Date.now();
      task.data = data;
      session.completedTasks++;

      this.logEvent(sessionId, 'task_completed', {
        infoType,
        infoTypeName: task.infoTypeName,
        duration: task.endTime && task.startTime ? task.endTime - task.startTime : undefined,
      });
      this.logger.debug(
        `[ParseProgress] Session ${sessionId}: completed task ${task.infoTypeName} ` +
        `(${session.completedTasks}/${session.totalTasks} done)`
      );
    }
  }

  /**
   * 任务处理失败
   */
  failTask(sessionId: string, infoType: InfoType, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const task = session.tasks.find(t => t.infoType === infoType);
    if (task) {
      task.status = 'failed';
      task.endTime = Date.now();
      task.error = error;
      session.completedTasks++; // 失败也算完成

      this.logEvent(sessionId, 'task_failed', { infoType, infoTypeName: task.infoTypeName, error });
      this.logger.warn(`[ParseProgress] Session ${sessionId}: task ${task.infoTypeName} failed - ${error}`);
    }
  }

  /**
   * 设置任务内分块信息
   * 用于跟踪单个任务处理多个分块的进度
   */
  setTaskChunks(sessionId: string, infoType: InfoType, totalChunks: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const task = session.tasks.find(t => t.infoType === infoType);
    if (task) {
      task.totalTaskChunks = totalChunks;
      task.completedTaskChunks = 0;
      task.currentTaskChunk = 0;

      this.logger.debug(`[ParseProgress] Session ${sessionId}: task ${task.infoTypeName} has ${totalChunks} chunks to process`);
    }
  }

  /**
   * 更新任务内分块进度
   * @param currentChunk 当前处理的分块索引（1-based）
   */
  updateTaskChunkProgress(sessionId: string, infoType: InfoType, currentChunk: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const task = session.tasks.find(t => t.infoType === infoType);
    if (task && task.totalTaskChunks) {
      task.currentTaskChunk = currentChunk;
      session.currentStage = `${task.infoTypeName}: 处理分块 ${currentChunk}/${task.totalTaskChunks}`;
      session.currentTaskInfo = `${task.infoTypeName} (${currentChunk}/${task.totalTaskChunks})`;

      this.logger.debug(`[ParseProgress] Session ${sessionId}: ${task.infoTypeName} chunk ${currentChunk}/${task.totalTaskChunks}`);
    }
  }

  /**
   * 完成任务内单个分块
   */
  completeTaskChunk(sessionId: string, infoType: InfoType): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const task = session.tasks.find(t => t.infoType === infoType);
    if (task && task.totalTaskChunks) {
      task.completedTaskChunks = (task.completedTaskChunks || 0) + 1;

      this.logger.debug(
        `[ParseProgress] Session ${sessionId}: ${task.infoTypeName} completed chunk ` +
        `${task.completedTaskChunks}/${task.totalTaskChunks}`
      );
    }
  }

  /**
   * 获取任务进度百分比
   */
  getTaskProgressPercentage(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session || session.totalTasks === 0) return 0;
    return Math.round((session.completedTasks / session.totalTasks) * 100);
  }

  /**
   * 开始处理分块
   */
  startChunk(sessionId: string, chunkIndex: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const chunk = session.chunks[chunkIndex];
    if (chunk) {
      chunk.status = 'processing';
      chunk.startTime = Date.now();
      session.currentChunkIndex = chunkIndex;
      session.currentStage = `正在处理: ${chunk.purpose} (${chunkIndex + 1}/${session.totalChunks})`;

      this.logEvent(sessionId, 'chunk_started', { chunkIndex, chunkId: chunk.chunkId });
      this.logger.debug(`[ParseProgress] Session ${sessionId}: started chunk ${chunkIndex + 1}/${session.totalChunks}`);
    }
  }

  /**
   * 完成分块处理
   */
  completeChunk(sessionId: string, chunkIndex: number, extractedFieldsCount?: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const chunk = session.chunks[chunkIndex];
    if (chunk) {
      chunk.status = 'completed';
      chunk.endTime = Date.now();
      session.completedChunks++;
      session.extractedFieldsCount = (session.extractedFieldsCount || 0) + (extractedFieldsCount || 0);

      // 更新预估完成时间
      this.updateEstimatedEndTime(session);

      this.logEvent(sessionId, 'chunk_completed', {
        chunkIndex,
        chunkId: chunk.chunkId,
        duration: chunk.endTime && chunk.startTime ? chunk.endTime - chunk.startTime : undefined,
      });
      this.logger.debug(
        `[ParseProgress] Session ${sessionId}: completed chunk ${chunkIndex + 1}/${session.totalChunks} ` +
        `(${session.completedChunks}/${session.totalChunks} done)`
      );
    }
  }

  /**
   * 分块处理失败
   */
  failChunk(sessionId: string, chunkIndex: number, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const chunk = session.chunks[chunkIndex];
    if (chunk) {
      chunk.status = 'failed';
      chunk.endTime = Date.now();
      chunk.error = error;

      this.logEvent(sessionId, 'chunk_failed', { chunkIndex, chunkId: chunk.chunkId, error });
      this.logger.warn(`[ParseProgress] Session ${sessionId}: chunk ${chunkIndex + 1} failed - ${error}`);
    }
  }

  /**
   * 标记会话完成
   */
  completeSession(sessionId: string, data?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.currentStage = '解析完成';
    session.processingTimeMs = Date.now() - session.startTime;
    session.estimatedEndTime = Date.now();
    session.resultData = data; // 存储解析结果

    // 如果data中包含markdown或rawText，也存储起来
    if (data && typeof data === 'object') {
      const result = data as any;
      session.markdownContent = result.markdownContent || result.rawText || '';
    }

    this.logEvent(sessionId, 'completed', { data, processingTimeMs: session.processingTimeMs });
    this.logger.log(`[ParseProgress] Session ${sessionId} completed in ${session.processingTimeMs}ms`);
  }

  /**
   * 获取会话的解析结果
   */
  getSessionResult(sessionId: string): any | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.status !== 'completed') {
      return null;
    }

    return session.resultData || null;
  }

  /**
   * 设置会话的解析结果
   */
  setSessionResult(sessionId: string, resultData: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.resultData = resultData;

    // 同时存储markdown内容
    if (resultData && typeof resultData === 'object') {
      session.markdownContent = resultData.markdownContent || resultData.rawText || '';
    }

    this.logger.log(`[ParseProgress] Session ${sessionId} result data stored`);
  }

  /**
   * 设置Markdown内容（用于前端预转换的场景）
   */
  setMarkdownContent(sessionId: string, markdown: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`[ParseProgress] Session ${sessionId} not found for setting markdown`);
      return;
    }
    session.markdownContent = markdown;
    this.logger.log(`[ParseProgress] Set markdown content (${markdown.length} chars) for session ${sessionId}`);
  }

  /**
   * 标记会话失败
   */
  failSession(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'failed';
    session.currentStage = '解析失败';
    session.error = error;
    session.processingTimeMs = Date.now() - session.startTime;

    this.logEvent(sessionId, 'failed', { error, processingTimeMs: session.processingTimeMs });
    this.logger.error(`[ParseProgress] Session ${sessionId} failed: ${error}`);
  }

  /**
   * 清理过期会话（5分钟前的）
   */
  cleanupExpiredSessions(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.startTime < fiveMinutesAgo) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`[ParseProgress] Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * 获取进度百分比
   * 优先使用任务进度（如果有的话），否则使用分块进度
   * 支持任务内分块进度的细粒度计算
   */
  getProgressPercentage(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    // 如果有任务进度，优先使用任务进度
    if (session.totalTasks > 0) {
      // 基础进度：已完成任务数
      let progress = session.completedTasks / session.totalTasks;

      // 加上当前进行中任务的分块进度（细粒度）
      const currentTask = session.tasks.find(t => t.status === 'processing');
      if (currentTask && currentTask.totalTaskChunks && currentTask.totalTaskChunks > 0) {
        const taskChunkProgress = (currentTask.completedTaskChunks || 0) / currentTask.totalTaskChunks;
        // 每个任务贡献 1/totalTasks 的进度，当前任务的分块进度贡献其中一部分
        progress += taskChunkProgress / session.totalTasks;
      }

      return Math.round(progress * 100);
    }

    // 否则使用分块进度
    if (session.totalChunks === 0) return 0;
    return Math.round((session.completedChunks / session.totalChunks) * 100);
  }

  /**
   * 获取事件日志
   */
  getRecentEvents(sessionId: string, limit = 50): ParseProgressEvent[] {
    return this.eventLog
      .filter(e => e.sessionId === sessionId)
      .slice(-limit);
  }

  /**
   * 记录事件
   */
  private logEvent(sessionId: string, type: ParseProgressEvent['type'], data?: any): void {
    const event: ParseProgressEvent = {
      sessionId,
      type,
      timestamp: Date.now(),
      data,
    };

    this.eventLog.push(event);

    // 保持日志大小在限制内
    if (this.eventLog.length > this.MAX_EVENT_LOG_SIZE) {
      this.eventLog.splice(0, this.eventLog.length - this.MAX_EVENT_LOG_SIZE);
    }
  }

  /**
   * 更新预估完成时间
   */
  private updateEstimatedEndTime(session: ParseSessionProgress): void {
    if (session.completedChunks === 0) return;

    const completedChunk = session.chunks.find(c => c.status === 'completed' && c.startTime && c.endTime);
    if (!completedChunk || !completedChunk.startTime || !completedChunk.endTime) return;

    const avgChunkTime = session.chunks
      .filter(c => c.status === 'completed' && c.startTime && c.endTime)
      .reduce((sum, c) => sum + ((c.endTime || 0) - (c.startTime || 0)), 0) / session.completedChunks;

    const remainingChunks = session.totalChunks - session.completedChunks;
    session.estimatedEndTime = Date.now() + (avgChunkTime * remainingChunks);
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  // =============================================================================
  // Spec 40: Time Estimation and Token Speed Tracking
  // =============================================================================

  /**
   * 设置初始预估时间（基于文本长度和chunk数量）
   */
  setInitialEstimate(sessionId: string, textLength: number, chunkCount: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 假设: 每2000字符约25秒，每chunk约30秒，取较大值
    const timeByText = Math.ceil((textLength / 2000) * 25);
    const timeByChunks = chunkCount * 30;
    session.initialEstimatedSeconds = Math.max(timeByText, timeByChunks, 60); // 最少1分钟
    session.totalEstimatedChunks = chunkCount;

    this.logger.debug(
      `[ParseProgress] Session ${sessionId}: initial estimate ${session.initialEstimatedSeconds}s ` +
      `(text: ${textLength} chars, chunks: ${chunkCount})`
    );
  }

  /**
   * 计算预估剩余时间
   *
   * 策略：
   * - 阶段1 (0任务完成): 基于初始预估
   * - 阶段2 (1任务完成): 基于实际chunk处理时间重新计算
   * - 阶段3 (2+任务完成): 基于历史平均任务时间
   */
  calculateEstimatedRemainingTime(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    const completedTasks = session.completedTasks || 0;
    const totalTasks = session.totalTasks || 6;

    // 阶段1: 初始阶段（0任务完成）- 返回初始预估
    if (completedTasks === 0) {
      return session.initialEstimatedSeconds || this.calculateInitialEstimate(session);
    }

    // 阶段2: 基本信息完成后 - 基于实际chunk数重新计算
    if (completedTasks === 1 && session.totalEstimatedChunks > 0) {
      return this.calculateDetailedEstimate(session);
    }

    // 阶段3: 进行中 - 基于历史平均
    return this.calculateRunningEstimate(session);
  }

  /**
   * 初始预估：基于文本长度和chunk数量
   */
  private calculateInitialEstimate(session: ParseSessionProgress): number {
    const textLength = session.markdownContent?.length || 0;
    const chunkCount = session.chunks?.length || session.totalEstimatedChunks || 1;

    // 每2000字符约25秒，每chunk约30秒
    const timeByText = Math.ceil((textLength / 2000) * 25);
    const timeByChunks = chunkCount * 30;

    return Math.max(timeByText, timeByChunks, 60); // 最少1分钟
  }

  /**
   * 详细预估：基本信息完成后，基于各任务实际chunk处理时间
   */
  private calculateDetailedEstimate(session: ParseSessionProgress): number {
    const tasks = session.tasks || [];
    const completedTask = tasks.find(t => t.status === 'completed');

    if (!completedTask || !completedTask.startTime || !completedTask.endTime) {
      return this.calculateRunningEstimate(session);
    }

    // 计算已完成任务的总耗时
    const completedTimeMs = completedTask.endTime - completedTask.startTime;
    const completedChunks = completedTask.totalTaskChunks || 1;
    const avgTimePerChunkMs = completedTimeMs / completedChunks;

    // 更新平均chunk时间
    session.averageChunkTimeMs = avgTimePerChunkMs;

    // 计算剩余任务的总chunk数
    let remainingChunks = 0;
    for (const task of tasks) {
      if (task.status !== 'completed') {
        remainingChunks += task.totalTaskChunks || 1;
      }
    }

    return Math.round((remainingChunks * avgTimePerChunkMs) / 1000);
  }

  /**
   * 运行中预估：基于已完成任务的平均耗时
   */
  private calculateRunningEstimate(session: ParseSessionProgress): number {
    const tasks = session.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'completed');

    if (completedTasks.length === 0) return 0;

    // 计算已完成任务的平均耗时
    const totalTimeMs = completedTasks.reduce((sum, t) => {
      const taskTime = (t.endTime || 0) - (t.startTime || 0);
      return sum + (taskTime > 0 ? taskTime : 0);
    }, 0);

    const avgTimePerTaskMs = totalTimeMs / completedTasks.length;
    const remainingTasks = (session.totalTasks || 6) - completedTasks.length;

    return Math.round((remainingTasks * avgTimePerTaskMs) / 1000);
  }

  /**
   * 计算Token速度
   *
   * @returns { current: 当前任务速度, average: 累计平均速度 }
   */
  calculateTokenSpeed(sessionId: string): { current: number; average: number } {
    const session = this.sessions.get(sessionId);
    if (!session) return { current: 0, average: 0 };

    const now = Date.now();

    // 当前任务速度
    let currentSpeed = 0;
    if (session.currentTaskStartTime > 0 && session.currentTaskTokens > 0) {
      const elapsedMs = now - session.currentTaskStartTime;
      if (elapsedMs > 0) {
        currentSpeed = Math.round((session.currentTaskTokens / elapsedMs) * 1000);
      }
    }

    // 累计平均速度
    let averageSpeed = 0;
    const sessionElapsedMs = now - session.sessionStartTime;
    if (sessionElapsedMs > 0 && session.totalTokensUsed > 0) {
      averageSpeed = Math.round((session.totalTokensUsed / sessionElapsedMs) * 1000);
    }

    return { current: currentSpeed, average: averageSpeed };
  }

  /**
   * 记录Token使用
   */
  recordTokenUsage(sessionId: string, taskInfoType: string, tokens: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 更新累计token
    session.totalTokensUsed = (session.totalTokensUsed || 0) + tokens;

    // 更新当前任务token
    session.currentTaskTokens = (session.currentTaskTokens || 0) + tokens;

    this.logger.debug(
      `[ParseProgress] Session ${sessionId}: recorded ${tokens} tokens for ${taskInfoType} ` +
      `(total: ${session.totalTokensUsed})`
    );
  }

  /**
   * 开始任务时重置当前任务token计数
   */
  resetCurrentTaskTokens(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.currentTaskTokens = 0;
    session.currentTaskStartTime = Date.now();
  }

  /**
   * 获取进度信息（包含时间和速度）
   */
  getProgressInfo(sessionId: string): {
    estimatedRemainingSeconds: number;
    currentTokenSpeed: number;
    averageTokenSpeed: number;
    progressPercentage: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const estimatedRemainingSeconds = this.calculateEstimatedRemainingTime(sessionId);
    const { current: currentTokenSpeed, average: averageTokenSpeed } = this.calculateTokenSpeed(sessionId);
    const progressPercentage = this.getProgressPercentage(sessionId);

    return {
      estimatedRemainingSeconds,
      currentTokenSpeed,
      averageTokenSpeed,
      progressPercentage,
    };
  }
}
