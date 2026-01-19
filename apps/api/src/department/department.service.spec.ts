import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { DepartmentService } from './department.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PrismaClient } from '@prisma/client';

describe('DepartmentService', () => {
  let service: DepartmentService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let auditService: DeepMockProxy<AuditService>;

  const mockDepartment = {
    id: 'dept-1',
    name: 'Engineering',
    code: 'ENG',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDepartment2 = {
    id: 'dept-2',
    name: 'Sales',
    code: 'SAL',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInactiveDepartment = {
    id: 'dept-3',
    name: 'Archived',
    code: 'ARC',
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    auditService = mockDeep<AuditService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<DepartmentService>(DepartmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDepartments', () => {
    it('should return all active departments when includeInactive is false', async () => {
      const activeDepts = [mockDepartment, mockDepartment2];
      prismaService.department.findMany.mockResolvedValue(activeDepts as any);

      const result = await service.getDepartments(false);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Engineering');
      expect(result[1].name).toBe('Sales');
      expect(prismaService.department.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });

    it('should return all departments including inactive when includeInactive is true', async () => {
      const allDepts = [mockDepartment, mockDepartment2, mockInactiveDepartment];
      prismaService.department.findMany.mockResolvedValue(allDepts as any);

      const result = await service.getDepartments(true);

      expect(result).toHaveLength(3);
      expect(prismaService.department.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no departments exist', async () => {
      prismaService.department.findMany.mockResolvedValue([]);

      const result = await service.getDepartments();

      expect(result).toHaveLength(0);
    });

    it('should return departments sorted by name', async () => {
      const depts = [mockDepartment, mockDepartment2];
      prismaService.department.findMany.mockResolvedValue(depts as any);

      await service.getDepartments();

      expect(prismaService.department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });
  });

  describe('getDepartment', () => {
    it('should return department when found', async () => {
      prismaService.department.findUnique.mockResolvedValue(mockDepartment as any);

      const result = await service.getDepartment('dept-1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Engineering');
      expect(result?.code).toBe('ENG');
      expect(prismaService.department.findUnique).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
      });
    });

    it('should return null when department not found', async () => {
      prismaService.department.findUnique.mockResolvedValue(null);

      const result = await service.getDepartment('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createDepartment', () => {
    const createInput = {
      name: 'Marketing',
      code: 'MKT',
    };

    it('should create department successfully', async () => {
      prismaService.department.findUnique.mockResolvedValue(null); // No existing dept
      prismaService.department.create.mockResolvedValue({
        ...mockDepartment,
        name: createInput.name,
        code: createInput.code,
      } as any);

      const result = await service.createDepartment(
        createInput,
        'operator-1',
        '127.0.0.1'
      );

      expect(result.name).toBe('Marketing');
      expect(result.code).toBe('MKT');
      expect(result.isActive).toBe(true);
      expect(prismaService.department.create).toHaveBeenCalledWith({
        data: {
          name: createInput.name,
          code: createInput.code,
          isActive: true,
        },
      });
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw ConflictException when name already exists', async () => {
      prismaService.department.findUnique.mockResolvedValue(mockDepartment as any);

      await expect(
        service.createDepartment(createInput, 'operator-1')
      ).rejects.toThrow(ConflictException);

      await expect(
        service.createDepartment(createInput, 'operator-1')
      ).rejects.toThrow('Department name already exists');
    });

    it('should throw ConflictException when code already exists', async () => {
      prismaService.department.findUnique
        .mockResolvedValueOnce(null) // No name conflict
        .mockResolvedValueOnce(mockDepartment as any) // Code conflict
        .mockResolvedValueOnce(null) // No name conflict (2nd call)
        .mockResolvedValueOnce(mockDepartment as any); // Code conflict (2nd call)

      await expect(
        service.createDepartment(createInput, 'operator-1')
      ).rejects.toThrow(ConflictException);

      await expect(
        service.createDepartment(createInput, 'operator-1')
      ).rejects.toThrow('Department code already exists');
    });

    it('should log audit when department is created', async () => {
      prismaService.department.findUnique.mockResolvedValue(null);
      prismaService.department.create.mockResolvedValue(mockDepartment as any);

      await service.createDepartment(createInput, 'operator-1', '127.0.0.1');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_DEPARTMENT',
          entityType: 'DEPARTMENT',
          entityId: mockDepartment.id,
          operatorId: 'operator-1',
          ipAddress: '127.0.0.1',
        })
      );
    });
  });

  describe('updateDepartment', () => {
    const updateInput = {
      name: 'Engineering Updated',
      code: 'ENG2',
    };

    it('should update department successfully', async () => {
      prismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment as any) // Existing dept
        .mockResolvedValueOnce(null) // No name conflict
        .mockResolvedValueOnce(null); // No code conflict

      prismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        name: updateInput.name,
        code: updateInput.code,
      } as any);

      const result = await service.updateDepartment(
        'dept-1',
        updateInput,
        'operator-1',
        '127.0.0.1'
      );

      expect(result.name).toBe('Engineering Updated');
      expect(result.code).toBe('ENG2');
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when department does not exist', async () => {
      prismaService.department.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDepartment('dept-1', updateInput, 'operator-1')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateDepartment('dept-1', updateInput, 'operator-1')
      ).rejects.toThrow('Department not found');
    });

    it('should throw ConflictException when new name already exists', async () => {
      prismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment as any) // Existing dept (1st call)
        .mockResolvedValueOnce(mockDepartment2 as any) // Name conflict (1st call)
        .mockResolvedValueOnce(mockDepartment as any) // Existing dept (2nd call)
        .mockResolvedValueOnce(mockDepartment2 as any); // Name conflict (2nd call)

      await expect(
        service.updateDepartment('dept-1', updateInput, 'operator-1')
      ).rejects.toThrow(ConflictException);

      await expect(
        service.updateDepartment('dept-1', updateInput, 'operator-1')
      ).rejects.toThrow('Department name already exists');
    });

    it('should throw ConflictException when new code already exists', async () => {
      prismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment as any) // Existing dept (1st call)
        .mockResolvedValueOnce(null) // No name conflict (1st call)
        .mockResolvedValueOnce(mockDepartment2 as any) // Code conflict (1st call)
        .mockResolvedValueOnce(mockDepartment as any) // Existing dept (2nd call)
        .mockResolvedValueOnce(null) // No name conflict (2nd call)
        .mockResolvedValueOnce(mockDepartment2 as any); // Code conflict (2nd call)

      await expect(
        service.updateDepartment('dept-1', updateInput, 'operator-1')
      ).rejects.toThrow(ConflictException);

      await expect(
        service.updateDepartment('dept-1', updateInput, 'operator-1')
      ).rejects.toThrow('Department code already exists');
    });

    it('should allow update with same name and code (no conflict)', async () => {
      const sameInput = {
        name: mockDepartment.name,
        code: mockDepartment.code,
      };

      prismaService.department.findUnique.mockResolvedValue(mockDepartment as any);
      prismaService.department.update.mockResolvedValue(mockDepartment as any);

      const result = await service.updateDepartment(
        'dept-1',
        sameInput,
        'operator-1'
      );

      expect(result.name).toBe('Engineering');
      expect(result.code).toBe('ENG');
    });

    it('should only update name when code is not provided', async () => {
      const nameOnlyInput = {
        name: 'Engineering Updated',
        code: mockDepartment.code,
      };

      prismaService.department.findUnique
        .mockResolvedValueOnce(mockDepartment as any) // Existing dept
        .mockResolvedValueOnce(null); // No name conflict

      prismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        name: nameOnlyInput.name,
      } as any);

      const result = await service.updateDepartment(
        'dept-1',
        nameOnlyInput,
        'operator-1'
      );

      expect(result.name).toBe('Engineering Updated');
      expect(result.code).toBe('ENG');
    });
  });

  describe('deleteDepartment', () => {
    it('should soft delete department successfully', async () => {
      const deptWithCount = {
        ...mockDepartment,
        _count: { users: 0 },
      };

      prismaService.department.findUnique.mockResolvedValue(deptWithCount as any);
      prismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        isActive: false,
      } as any);

      const result = await service.deleteDepartment(
        'dept-1',
        'operator-1',
        '127.0.0.1'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Department deleted successfully');
      expect(prismaService.department.update).toHaveBeenCalledWith({
        where: { id: 'dept-1' },
        data: { isActive: false },
      });
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when department does not exist', async () => {
      prismaService.department.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteDepartment('dept-1', 'operator-1')
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteDepartment('dept-1', 'operator-1')
      ).rejects.toThrow('Department not found');
    });

    it('should throw BadRequestException when department has users', async () => {
      const deptWithUsers = {
        ...mockDepartment,
        _count: { users: 5 },
      };

      prismaService.department.findUnique.mockResolvedValue(deptWithUsers as any);

      await expect(
        service.deleteDepartment('dept-1', 'operator-1')
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteDepartment('dept-1', 'operator-1')
      ).rejects.toThrow('Cannot delete department with 5 associated users');
    });

    it('should log audit when department is deleted', async () => {
      const deptWithCount = {
        ...mockDepartment,
        _count: { users: 0 },
      };

      prismaService.department.findUnique.mockResolvedValue(deptWithCount as any);
      prismaService.department.update.mockResolvedValue({
        ...mockDepartment,
        isActive: false,
      } as any);

      await service.deleteDepartment('dept-1', 'operator-1', '127.0.0.1');

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE_DEPARTMENT',
          entityType: 'DEPARTMENT',
          entityId: mockDepartment.id,
          operatorId: 'operator-1',
          ipAddress: '127.0.0.1',
        })
      );
    });
  });
});
