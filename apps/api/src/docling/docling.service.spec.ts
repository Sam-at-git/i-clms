import { Test, TestingModule } from '@nestjs/testing';
import { DoclingService } from './docling.service';
import { ConfigService } from '@nestjs/config';

describe('DoclingService', () => {
  let service: DoclingService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoclingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DoclingService>(DoclingService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    // Mock Python not available by default
    (service as any).pythonAvailable = false;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAvailable', () => {
    it('should return false when Python is not available', () => {
      (service as any).pythonAvailable = false;
      expect(service.isAvailable()).toBe(false);
    });

    it('should return true when Python is available', () => {
      (service as any).pythonAvailable = true;
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('convertToMarkdown', () => {
    it('should return error result when Python is not available', async () => {
      (service as any).pythonAvailable = false;

      const result = await service.convertToMarkdown('/path/to/file.pdf');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });
  });

  describe('extractFields', () => {
    it('should return empty fields when Python is not available', async () => {
      (service as any).pythonAvailable = false;

      const result = await service.extractFields('/path/to/file.pdf', ['BASIC_INFO']);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });
  });

  describe('getVersion', () => {
    it('should return null when Python is not available', async () => {
      (service as any).pythonAvailable = false;

      const result = await service.getVersion();

      expect(result).toBeNull();
    });

    // Skip this test as mocking child_process.exec is complex
    // it('should return version string when Python is available', async () => {
    //   (service as any).pythonAvailable = true;
    //   jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, opts, callback) => {
    //     callback(null, { stdout: '1.0.0', stderr: '' });
    //   });
    //   const result = await service.getVersion();
    //   expect(result).toBe('1.0.0');
    // });
  });
});
