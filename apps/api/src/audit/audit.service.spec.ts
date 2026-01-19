import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuditService, AuditLogInput } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: DeepMockProxy<PrismaClient>;

  const mockOperator = {
    id: 'operator-1',
    name: 'Test Operator',
    email: 'operator@example.com',
  };

  const mockAuditLog = {
    id: 'log-1',
    action: 'CREATE_USER',
    entityType: 'USER',
    entityId: 'user-1',
    entityName: 'Test User',
    oldValue: null,
    newValue: { name: 'Test User', email: 'test@example.com' },
    operatorId: 'operator-1',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date(),
    operator: mockOperator,
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    const logInput: AuditLogInput = {
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: 'user-1',
      entityName: 'Test User',
      oldValue: undefined,
      newValue: { name: 'Test User', email: 'test@example.com' },
      operatorId: 'operator-1',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create audit log successfully', async () => {
      prismaService.auditLog.create.mockResolvedValue(mockAuditLog as any);

      await service.log(logInput);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: logInput.action,
          entityType: logInput.entityType,
          entityId: logInput.entityId,
          operatorId: logInput.operatorId,
        }),
      });
    });

    it('should not throw when audit log creation fails', async () => {
      prismaService.auditLog.create.mockRejectedValue(new Error('Database error'));

      await expect(service.log(logInput)).resolves.not.toThrow();
    });

    it('should log minimal audit entry without optional fields', async () => {
      const minimalInput: AuditLogInput = {
        action: 'DELETE_USER',
        entityType: 'USER',
        entityId: 'user-2',
        operatorId: 'operator-1',
      };

      prismaService.auditLog.create.mockResolvedValue(mockAuditLog as any);

      await service.log(minimalInput);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: minimalInput.action,
          entityType: minimalInput.entityType,
          entityId: minimalInput.entityId,
          operatorId: minimalInput.operatorId,
        }),
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const logs = [mockAuditLog];
      prismaService.auditLog.findMany.mockResolvedValue(logs as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs(1, 50);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.items[0].action).toBe('CREATE_USER');
    });

    it('should filter by action', async () => {
      prismaService.auditLog.findMany.mockResolvedValue([mockAuditLog] as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      await service.getAuditLogs(1, 50, { action: 'CREATE_USER' });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'CREATE_USER' }),
        })
      );
    });

    it('should filter by entityType', async () => {
      prismaService.auditLog.findMany.mockResolvedValue([mockAuditLog] as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      await service.getAuditLogs(1, 50, { entityType: 'USER' });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'USER' }),
        })
      );
    });

    it('should filter by operatorId', async () => {
      prismaService.auditLog.findMany.mockResolvedValue([mockAuditLog] as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      await service.getAuditLogs(1, 50, { operatorId: 'operator-1' });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ operatorId: 'operator-1' }),
        })
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      prismaService.auditLog.findMany.mockResolvedValue([mockAuditLog] as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      await service.getAuditLogs(1, 50, { startDate, endDate });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: startDate,
              lte: endDate,
            }),
          }),
        })
      );
    });

    it('should filter by start date only', async () => {
      const startDate = new Date('2024-01-01');

      prismaService.auditLog.findMany.mockResolvedValue([mockAuditLog] as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      await service.getAuditLogs(1, 50, { startDate });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: startDate,
            }),
          }),
        })
      );
    });

    it('should filter by end date only', async () => {
      const endDate = new Date('2024-12-31');

      prismaService.auditLog.findMany.mockResolvedValue([mockAuditLog] as any);
      prismaService.auditLog.count.mockResolvedValue(1);

      await service.getAuditLogs(1, 50, { endDate });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lte: endDate,
            }),
          }),
        })
      );
    });

    it('should return empty array when no logs exist', async () => {
      prismaService.auditLog.findMany.mockResolvedValue([]);
      prismaService.auditLog.count.mockResolvedValue(0);

      const result = await service.getAuditLogs(1, 50);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getDistinctActions', () => {
    it('should return list of distinct actions', async () => {
      const actions = [
        { action: 'CREATE_USER' },
        { action: 'UPDATE_USER' },
        { action: 'DELETE_USER' },
      ];
      prismaService.auditLog.findMany.mockResolvedValue(actions as any);

      const result = await service.getDistinctActions();

      expect(result).toHaveLength(3);
      expect(result).toEqual(['CREATE_USER', 'UPDATE_USER', 'DELETE_USER']);
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['action'],
        })
      );
    });

    it('should return empty array when no actions exist', async () => {
      prismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getDistinctActions();

      expect(result).toHaveLength(0);
    });
  });

  describe('getDistinctEntityTypes', () => {
    it('should return list of distinct entity types', async () => {
      const entityTypes = [
        { entityType: 'USER' },
        { entityType: 'DEPARTMENT' },
        { entityType: 'CONTRACT' },
      ];
      prismaService.auditLog.findMany.mockResolvedValue(entityTypes as any);

      const result = await service.getDistinctEntityTypes();

      expect(result).toHaveLength(3);
      expect(result).toEqual(['USER', 'DEPARTMENT', 'CONTRACT']);
      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['entityType'],
        })
      );
    });

    it('should return empty array when no entity types exist', async () => {
      prismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getDistinctEntityTypes();

      expect(result).toHaveLength(0);
    });
  });
});
