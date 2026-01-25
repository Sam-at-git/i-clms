import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BatchCorrectionSession,
  BatchCorrectionStatus,
  BatchCorrectionResultItem,
  BatchCorrectionProgressDto,
} from './dto/batch-correction-progress.dto';

/**
 * 批量修正进度服务
 * 管理批量字段修正的进度跟踪
 */
@Injectable()
export class CorrectionProgressService {
  private readonly logger = new Logger(CorrectionProgressService.name);
  private readonly sessions = new Map<string, BatchCorrectionSession>();
  private readonly SESSION_TTL = 30 * 60 * 1000; // 30分钟过期

  /**
   * 创建新的批量修正会话
   */
  createSession(contractId: string, totalFields: number): string {
    const sessionId = randomUUID();
    const now = new Date();

    const session: BatchCorrectionSession = {
      sessionId,
      contractId,
      status: 'initializing',
      totalFields,
      completedFields: 0,
      results: [],
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.set(sessionId, session);
    this.cleanupExpiredSessions();

    this.logger.log(
      `[CorrectionProgress] Created session ${sessionId} for contract ${contractId}, ` +
        `${totalFields} fields to process`
    );

    return sessionId;
  }

  /**
   * 更新会话状态
   */
  updateStatus(sessionId: string, status: BatchCorrectionStatus): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`[CorrectionProgress] Session ${sessionId} not found`);
      return;
    }

    session.status = status;
    session.updatedAt = new Date();

    this.logger.debug(`[CorrectionProgress] Session ${sessionId} status: ${status}`);
  }

  /**
   * 设置当前正在处理的字段
   */
  setCurrentField(sessionId: string, fieldName: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.currentField = fieldName;
    session.updatedAt = new Date();
  }

  /**
   * 添加字段修正结果
   */
  addResult(sessionId: string, result: BatchCorrectionResultItem): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.results.push(result);
    session.completedFields = session.results.length;
    session.updatedAt = new Date();

    this.logger.debug(
      `[CorrectionProgress] Session ${sessionId}: completed ${session.completedFields}/${session.totalFields}`
    );
  }

  /**
   * 完成会话
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.currentField = undefined;
    session.updatedAt = new Date();

    this.logger.log(
      `[CorrectionProgress] Session ${sessionId} completed: ` +
        `${session.results.length} results, ` +
        `${session.results.filter((r) => r.shouldChange).length} changes suggested`
    );
  }

  /**
   * 标记会话失败
   */
  failSession(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'failed';
    session.error = error;
    session.updatedAt = new Date();

    this.logger.error(`[CorrectionProgress] Session ${sessionId} failed: ${error}`);
  }

  /**
   * 获取会话进度
   */
  getProgress(sessionId: string): BatchCorrectionProgressDto | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      status: session.status,
      totalFields: session.totalFields,
      completedFields: session.completedFields,
      currentField: session.currentField,
      results: session.results,
      error: session.error,
    };
  }

  /**
   * 获取会话（内部使用）
   */
  getSession(sessionId: string): BatchCorrectionSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, id) => {
      if (now - session.createdAt.getTime() > this.SESSION_TTL) {
        expiredSessions.push(id);
      }
    });

    for (const id of expiredSessions) {
      this.sessions.delete(id);
    }

    if (expiredSessions.length > 0) {
      this.logger.debug(
        `[CorrectionProgress] Cleaned up ${expiredSessions.length} expired sessions`
      );
    }
  }
}
