// Mock uuid to avoid ESM import issues
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `session-${++uuidCounter}`),
}));

import { ParseProgressService, InfoType, InfoTypeNames } from './parse-progress.service';

describe('ParseProgressService', () => {
  let service: ParseProgressService;

  beforeEach(() => {
    service = new ParseProgressService();
  });

  afterEach(() => {
    // Clean up any sessions created during tests
    service.cleanupExpiredSessions();
  });

  describe('createSession', () => {
    it('should create a new session with unique ID', () => {
      const sessionId1 = service.createSession('contract1.pdf');
      const sessionId2 = service.createSession('contract2.pdf');

      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should initialize session with correct default values', () => {
      const sessionId = service.createSession('test.pdf');
      const session = service.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.objectName).toBe('test.pdf');
      expect(session?.status).toBe('initializing');
      expect(session?.totalChunks).toBe(0);
      expect(session?.completedChunks).toBe(0);
      expect(session?.totalTasks).toBe(0);
      expect(session?.completedTasks).toBe(0);
      expect(session?.chunks).toEqual([]);
      expect(session?.tasks).toEqual([]);
    });
  });

  describe('getSession', () => {
    it('should return session for valid ID', () => {
      const sessionId = service.createSession('test.pdf');
      const session = service.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });

    it('should return undefined for non-existent session', () => {
      const session = service.getSession('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('getAllSessions', () => {
    it('should return all active sessions', () => {
      const id1 = service.createSession('file1.pdf');
      const id2 = service.createSession('file2.pdf');

      const sessions = service.getAllSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.sessionId)).toContain(id1);
      expect(sessions.map(s => s.sessionId)).toContain(id2);
    });
  });

  describe('updateStage', () => {
    it('should update session status and stage', () => {
      const sessionId = service.createSession('test.pdf');

      service.updateStage(sessionId, 'parsing', '正在解析文档');

      const session = service.getSession(sessionId);
      expect(session?.status).toBe('parsing');
      expect(session?.currentStage).toBe('正在解析文档');
    });

    it('should set processing time when status is completed', async () => {
      const sessionId = service.createSession('test.pdf');

      // Add a small delay to ensure measurable time difference
      await new Promise(resolve => setTimeout(resolve, 1));
      service.updateStage(sessionId, 'completed', '解析完成');

      const session = service.getSession(sessionId);
      expect(session?.status).toBe('completed');
      expect(session?.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(session?.estimatedEndTime).toBeDefined();
    });

    it('should handle non-existent session gracefully', () => {
      // Should not throw
      expect(() => {
        service.updateStage('non-existent', 'parsing', 'Test');
      }).not.toThrow();
    });
  });

  describe('setChunks', () => {
    it('should set chunk information for session', () => {
      const sessionId = service.createSession('test.pdf');
      const chunks = [
        { id: 'chunk-1', purpose: '合同头部' },
        { id: 'chunk-2', purpose: '财务条款' },
      ];

      service.setChunks(sessionId, chunks);

      const session = service.getSession(sessionId);
      expect(session?.totalChunks).toBe(2);
      expect(session?.chunks).toHaveLength(2);
      expect(session?.chunks[0].chunkId).toBe('chunk-1');
      expect(session?.chunks[0].purpose).toBe('合同头部');
      expect(session?.chunks[0].status).toBe('pending');
    });

    it('should handle non-existent session gracefully', () => {
      expect(() => {
        service.setChunks('non-existent', []);
      }).not.toThrow();
    });
  });

  describe('setTasks', () => {
    it('should set task information for session', () => {
      const sessionId = service.createSession('test.pdf');
      const infoTypes = [InfoType.BASIC_INFO, InfoType.FINANCIAL, InfoType.MILESTONES];

      service.setTasks(sessionId, infoTypes);

      const session = service.getSession(sessionId);
      expect(session?.totalTasks).toBe(3);
      expect(session?.tasks).toHaveLength(3);
      expect(session?.tasks[0].infoType).toBe(InfoType.BASIC_INFO);
      expect(session?.tasks[0].infoTypeName).toBe(InfoTypeNames[InfoType.BASIC_INFO]);
      expect(session?.tasks[0].status).toBe('pending');
    });
  });

  describe('startTask', () => {
    it('should mark task as processing', () => {
      const sessionId = service.createSession('test.pdf');
      service.setTasks(sessionId, [InfoType.BASIC_INFO]);

      service.startTask(sessionId, InfoType.BASIC_INFO);

      const session = service.getSession(sessionId);
      const task = session?.tasks.find(t => t.infoType === InfoType.BASIC_INFO);
      expect(task?.status).toBe('processing');
      expect(task?.startTime).toBeDefined();
      expect(session?.currentTaskInfo).toBe(InfoTypeNames[InfoType.BASIC_INFO]);
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed and increment counter', () => {
      const sessionId = service.createSession('test.pdf');
      service.setTasks(sessionId, [InfoType.BASIC_INFO]);
      service.startTask(sessionId, InfoType.BASIC_INFO);

      const taskData = { contractNo: 'CTR-001' };
      service.completeTask(sessionId, InfoType.BASIC_INFO, taskData);

      const session = service.getSession(sessionId);
      const task = session?.tasks.find(t => t.infoType === InfoType.BASIC_INFO);
      expect(task?.status).toBe('completed');
      expect(task?.endTime).toBeDefined();
      expect(task?.data).toEqual(taskData);
      expect(session?.completedTasks).toBe(1);
    });
  });

  describe('failTask', () => {
    it('should mark task as failed and increment counter', () => {
      const sessionId = service.createSession('test.pdf');
      service.setTasks(sessionId, [InfoType.BASIC_INFO]);
      service.startTask(sessionId, InfoType.BASIC_INFO);

      const error = 'LLM connection failed';
      service.failTask(sessionId, InfoType.BASIC_INFO, error);

      const session = service.getSession(sessionId);
      const task = session?.tasks.find(t => t.infoType === InfoType.BASIC_INFO);
      expect(task?.status).toBe('failed');
      expect(task?.endTime).toBeDefined();
      expect(task?.error).toBe(error);
      expect(session?.completedTasks).toBe(1); // Failed tasks also count as completed
    });
  });

  describe('getTaskProgressPercentage', () => {
    it('should return 0 for session with no tasks', () => {
      const sessionId = service.createSession('test.pdf');

      const percentage = service.getTaskProgressPercentage(sessionId);

      expect(percentage).toBe(0);
    });

    it('should calculate correct percentage', () => {
      const sessionId = service.createSession('test.pdf');
      service.setTasks(sessionId, [
        InfoType.BASIC_INFO,
        InfoType.FINANCIAL,
        InfoType.MILESTONES,
        InfoType.RATE_ITEMS,
      ]);

      service.startTask(sessionId, InfoType.BASIC_INFO);
      service.completeTask(sessionId, InfoType.BASIC_INFO, {});

      service.startTask(sessionId, InfoType.FINANCIAL);
      service.completeTask(sessionId, InfoType.FINANCIAL, {});

      const percentage = service.getTaskProgressPercentage(sessionId);

      expect(percentage).toBe(50); // 2 out of 4 tasks completed
    });
  });

  describe('chunk progress methods', () => {
    it('should mark chunk as started', () => {
      const sessionId = service.createSession('test.pdf');
      service.setChunks(sessionId, [{ id: 'chunk-1', purpose: 'Header' }]);

      service.startChunk(sessionId, 0);

      const session = service.getSession(sessionId);
      const chunk = session?.chunks[0];
      expect(chunk?.status).toBe('processing');
      expect(chunk?.startTime).toBeDefined();
      expect(session?.currentChunkIndex).toBe(0);
    });

    it('should mark chunk as completed and increment counter', () => {
      const sessionId = service.createSession('test.pdf');
      service.setChunks(sessionId, [{ id: 'chunk-1', purpose: 'Header' }]);
      service.startChunk(sessionId, 0);

      service.completeChunk(sessionId, 0, 5);

      const session = service.getSession(sessionId);
      const chunk = session?.chunks[0];
      expect(chunk?.status).toBe('completed');
      expect(chunk?.endTime).toBeDefined();
      expect(session?.completedChunks).toBe(1);
      expect(session?.extractedFieldsCount).toBe(5);
    });

    it('should mark chunk as failed', () => {
      const sessionId = service.createSession('test.pdf');
      service.setChunks(sessionId, [{ id: 'chunk-1', purpose: 'Header' }]);

      service.failChunk(sessionId, 0, 'Parse error');

      const session = service.getSession(sessionId);
      const chunk = session?.chunks[0];
      expect(chunk?.status).toBe('failed');
      expect(chunk?.error).toBe('Parse error');
    });
  });

  describe('completeSession', () => {
    it('should mark session as completed and store result', async () => {
      const sessionId = service.createSession('test.pdf');
      const resultData = { success: true, data: { contractNo: 'CTR-001' } };

      // Add a small delay to ensure measurable time difference
      await new Promise(resolve => setTimeout(resolve, 1));
      service.completeSession(sessionId, resultData);

      const session = service.getSession(sessionId);
      expect(session?.status).toBe('completed');
      expect(session?.currentStage).toBe('解析完成');
      expect(session?.resultData).toEqual(resultData);
      expect(session?.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(session?.estimatedEndTime).toBeDefined();
    });
  });

  describe('getSessionResult', () => {
    it('should return result for completed session', () => {
      const sessionId = service.createSession('test.pdf');
      const resultData = { success: true, data: { contractNo: 'CTR-001' } };
      service.completeSession(sessionId, resultData);

      const result = service.getSessionResult(sessionId);

      expect(result).toEqual(resultData);
    });

    it('should return null for non-completed session', () => {
      const sessionId = service.createSession('test.pdf');

      const result = service.getSessionResult(sessionId);

      expect(result).toBeNull();
    });

    it('should return null for non-existent session', () => {
      const result = service.getSessionResult('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('setSessionResult', () => {
    it('should store result data for session', () => {
      const sessionId = service.createSession('test.pdf');
      const resultData = { success: true, data: { contractNo: 'CTR-001' } };

      service.setSessionResult(sessionId, resultData);

      const session = service.getSession(sessionId);
      expect(session?.resultData).toEqual(resultData);
    });
  });

  describe('failSession', () => {
    it('should mark session as failed with error', async () => {
      const sessionId = service.createSession('test.pdf');
      const error = 'Parsing failed: LLM timeout';

      // Add a small delay to ensure measurable time difference
      await new Promise(resolve => setTimeout(resolve, 1));
      service.failSession(sessionId, error);

      const session = service.getSession(sessionId);
      expect(session?.status).toBe('failed');
      expect(session?.currentStage).toBe('解析失败');
      expect(session?.error).toBe(error);
      expect(session?.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getProgressPercentage', () => {
    it('should return 0 for session with no chunks', () => {
      const sessionId = service.createSession('test.pdf');

      const percentage = service.getProgressPercentage(sessionId);

      expect(percentage).toBe(0);
    });

    it('should calculate percentage based on completed chunks', () => {
      const sessionId = service.createSession('test.pdf');
      service.setChunks(sessionId, [
        { id: 'chunk-1', purpose: 'A' },
        { id: 'chunk-2', purpose: 'B' },
        { id: 'chunk-3', purpose: 'C' },
        { id: 'chunk-4', purpose: 'D' },
      ]);

      service.startChunk(sessionId, 0);
      service.completeChunk(sessionId, 0);

      service.startChunk(sessionId, 1);
      service.completeChunk(sessionId, 1);

      const percentage = service.getProgressPercentage(sessionId);

      expect(percentage).toBe(50); // 2 out of 4 chunks
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove sessions older than 5 minutes', () => {
      // Manually create an old session
      const oldSession = (service as any).sessions.get('old-session-id') || {};
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 - 1000; // 5 minutes and 1 second ago
      (service as any).sessions.set('old-session-id', {
        sessionId: 'old-session-id',
        objectName: 'old.pdf',
        status: 'completed',
        currentStage: 'Done',
        totalChunks: 0,
        completedChunks: 0,
        currentChunkIndex: 0,
        chunks: [],
        totalTasks: 0,
        completedTasks: 0,
        tasks: [],
        startTime: fiveMinutesAgo,
      });

      const sessionId = service.createSession('new.pdf');

      service.cleanupExpiredSessions();

      expect(service.getSession('old-session-id')).toBeUndefined();
      expect(service.getSession(sessionId)).toBeDefined();
    });
  });

  describe('deleteSession', () => {
    it('should delete session and return true', () => {
      const sessionId = service.createSession('test.pdf');

      const deleted = service.deleteSession(sessionId);

      expect(deleted).toBe(true);
      expect(service.getSession(sessionId)).toBeUndefined();
    });

    it('should return false for non-existent session', () => {
      const deleted = service.deleteSession('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events for session', () => {
      const sessionId = service.createSession('test.pdf');

      service.updateStage(sessionId, 'parsing', 'Parsing');
      service.setTasks(sessionId, [InfoType.BASIC_INFO]);

      const events = (service as any).getRecentEvents(sessionId);

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('InfoTypeNames mapping', () => {
    it('should have correct Chinese names for all InfoTypes', () => {
      expect(InfoTypeNames[InfoType.BASIC_INFO]).toBe('基本信息');
      expect(InfoTypeNames[InfoType.FINANCIAL]).toBe('财务信息');
      expect(InfoTypeNames[InfoType.MILESTONES]).toBe('里程碑信息');
      expect(InfoTypeNames[InfoType.RATE_ITEMS]).toBe('人力费率');
      expect(InfoTypeNames[InfoType.LINE_ITEMS]).toBe('产品清单');
      expect(InfoTypeNames[InfoType.RISK_CLAUSES]).toBe('风险条款');
      expect(InfoTypeNames[InfoType.DELIVERABLES]).toBe('交付物信息');
      expect(InfoTypeNames[InfoType.TIME_INFO]).toBe('时间信息');
    });
  });
});
