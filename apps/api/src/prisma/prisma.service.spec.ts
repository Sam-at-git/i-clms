import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
            onModuleInit: jest.fn(),
            onModuleDestroy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have $connect method', () => {
    expect(service.$connect).toBeDefined();
  });

  it('should have $disconnect method', () => {
    expect(service.$disconnect).toBeDefined();
  });
});
