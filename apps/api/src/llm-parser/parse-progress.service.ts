import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * InfoType枚举 - 信息类型
 */
export enum InfoType {
  BASIC_INFO = 'basic_info',           // 基本信息
  FINANCIAL = 'financial',             // 财务信息
  MILESTONES = 'milestones',           // 里程碑
  RATE_ITEMS = 'rate_items',           // 人力费率
  LINE_ITEMS = 'line_items',           // 产品清单
  RISK_CLAUSES = 'risk_clauses',       // 风险条款
  DELIVERABLES = 'deliverables',       // 交付物
  TIME_INFO = 'time_info',             // 时间信息
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
      startTime: Date.now(),
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
    this.logger.log(`[ParseProgress] Session ${sessionId} result data stored`);
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
   */
  getProgressPercentage(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

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
}
