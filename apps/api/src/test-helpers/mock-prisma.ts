import { PrismaService } from '../prisma/prisma.service';

export type MockedPrismaService = {
  [K in keyof PrismaService]: K extends '$connect' | '$disconnect' | 'onModuleInit' | 'onModuleDestroy'
    ? jest.Mock
    : {
        [M in keyof PrismaService[K]]: jest.Mock;
      };
};

export function createMockPrismaService(): MockedPrismaService {
  return {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    contract: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    tag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    contractTag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as MockedPrismaService;
}
