import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let auditService: DeepMockProxy<AuditService>;

  const mockDepartment = {
    id: 'dept-1',
    name: 'Test Department',
    code: 'TEST',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed_password',
    role: 'USER' as const,
    departmentId: 'dept-1',
    isActive: true,
    mustChangePassword: false,
    lastPasswordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: null,
    department: mockDepartment,
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    auditService = mockDeep<AuditService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
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

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const users = [mockUser];
      prismaService.user.findMany.mockResolvedValue(users as any);
      prismaService.user.count.mockResolvedValue(1);

      const result = await service.getUsers(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by department', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser] as any);
      prismaService.user.count.mockResolvedValue(1);

      await service.getUsers(1, 20, { departmentId: 'dept-1' });

      expect(prismaService.user.findMany).toHaveBeenCalled();
    });

    it('should filter by role', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser] as any);
      prismaService.user.count.mockResolvedValue(1);

      await service.getUsers(1, 20, { role: 'ADMIN' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        })
      );
    });

    it('should filter by isActive status', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser] as any);
      prismaService.user.count.mockResolvedValue(1);

      await service.getUsers(1, 20, { isActive: true });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should search by name or email', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser] as any);
      prismaService.user.count.mockResolvedValue(1);

      await service.getUsers(1, 20, { search: 'test' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should use pagination parameters correctly', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser] as any);
      prismaService.user.count.mockResolvedValue(100);

      await service.getUsers(3, 20);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3 - 1) * 20
          take: 20,
        })
      );
    });
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getUser('user-1');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    const createInput = {
      email: 'new@example.com',
      name: 'New User',
      role: 'USER' as const,
      departmentId: 'dept-1',
    };

    it('should create user successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.department.findUnique.mockResolvedValue(mockDepartment as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: createInput.email,
        name: createInput.name,
      } as any);

      const result = await service.createUser(createInput, 'operator-1', '127.0.0.1');

      expect(result.email).toBe(createInput.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(
        service.createUser(createInput, 'operator-1')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when department does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.department.findUnique.mockResolvedValue(null);

      await expect(
        service.createUser(createInput, 'operator-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      const result = await service.toggleUserStatus('user-1', 'operator-1', '127.0.0.1');

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleUserStatus('user-1', 'operator-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to disable self', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(
        service.toggleUserStatus('user-1', 'user-1')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUser', () => {
    const updateInput = {
      email: 'updated@example.com',
      name: 'Updated User',
      role: 'ADMIN' as const,
      departmentId: 'dept-2',
    };

    it('should update user successfully', async () => {
      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser as any) // Existing user
        .mockResolvedValueOnce(null) // No email conflict
        .mockResolvedValueOnce(null); // Department exists check

      prismaService.department.findUnique.mockResolvedValue(mockDepartment as any);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateInput,
      } as any);

      const result = await service.updateUser('user-1', updateInput, 'operator-1', '127.0.0.1');

      expect(result.email).toBe(updateInput.email);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('user-1', updateInput, 'operator-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new email already exists', async () => {
      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser as any) // Existing user
        .mockResolvedValueOnce(mockUser as any); // Email conflict

      await expect(
        service.updateUser('user-1', updateInput, 'operator-1')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when new department does not exist', async () => {
      prismaService.user.findUnique
        .mockResolvedValueOnce(mockUser as any) // Existing user
        .mockResolvedValueOnce(null); // No email conflict

      prismaService.department.findUnique.mockResolvedValue(null); // Department not found

      await expect(
        service.updateUser('user-1', updateInput, 'operator-1')
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow update with same email (no conflict)', async () => {
      const sameEmailInput = {
        ...updateInput,
        email: mockUser.email, // Same email as existing
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.department.findUnique.mockResolvedValue(mockDepartment as any);
      prismaService.user.update.mockResolvedValue(mockUser as any);

      const result = await service.updateUser('user-1', sameEmailInput, 'operator-1');

      expect(result).toBeDefined();
      expect(result.email).toBe(mockUser.email);
    });
  });

  describe('resetUserPassword', () => {
    it('should reset password successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      prismaService.user.update.mockResolvedValue(mockUser as any);

      const result = await service.resetUserPassword('user-1', 'operator-1', '127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword).toHaveLength(8);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.resetUserPassword('user-1', 'operator-1')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
