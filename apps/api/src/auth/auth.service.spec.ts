import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma';
import { AuditService } from '../audit/audit.service';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: DeepMockProxy<PrismaClient>;
  let jwtService: DeepMockProxy<JwtService>;
  let auditService: DeepMockProxy<AuditService>;

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
    department: {
      id: 'dept-1',
      name: 'Test Department',
      code: 'TEST',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();
    jwtService = mockDeep<JwtService>();
    auditService = mockDeep<AuditService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      prismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(service.validateUser('test@example.com', 'password')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should return null when password is invalid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong_password');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const loginUser = { id: 'user-1', email: 'test@example.com', role: 'USER' };
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      jwtService.sign.mockReturnValue('mock_token');

      const result = await service.login(loginUser);

      expect(result).toHaveProperty('accessToken', 'mock_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const loginUser = { id: 'user-1', email: 'test@example.com', role: 'USER' };
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginUser)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    const registerInput = {
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
      departmentId: 'dept-1',
    };

    it('should create and return new user', async () => {
      prismaService.user.findUnique.mockResolvedValue(null); // No existing user
      prismaService.department.findUnique.mockResolvedValue(mockUser.department as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        email: registerInput.email,
        name: registerInput.name,
      } as any);

      const result = await service.register(registerInput);

      expect(result.email).toBe(registerInput.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when department does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.register(registerInput)).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    const changePasswordInput = {
      currentPassword: 'old_password',
      newPassword: 'new_password123',
    };

    it('should change password successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      prismaService.user.update.mockResolvedValue({ ...mockUser } as any);

      const result = await service.changePassword('user-1', changePasswordInput, '127.0.0.1');

      expect(result.success).toBe(true);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', changePasswordInput)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when current password is incorrect', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', changePasswordInput)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is too short', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'old_password',
          newPassword: '12345',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new password is same as current', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'same_password',
          newPassword: 'same_password',
        })
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'same_password',
          newPassword: 'same_password',
        })
      ).rejects.toThrow('New password must be different from current password');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getUserById('user-1');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserById('nonexistent');

      expect(result).toBeNull();
    });

    it('should include department information when getting user by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getUserById('user-1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { department: true },
        })
      );
      expect(result?.department).toBeDefined();
    });
  });
});
