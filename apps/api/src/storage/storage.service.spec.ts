import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService, UploadedFile } from './storage.service';
import { Readable } from 'stream';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// Mock MinIO Client
const mockMinioClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  presignedGetObject: jest.fn(),
  getObject: jest.fn(),
  removeObject: jest.fn(),
  statObject: jest.fn(),
};

jest.mock('minio', () => {
  return {
    Client: jest.fn().mockImplementation(() => mockMinioClient),
  };
});

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;

  const mockConfig: Record<string, string | number | boolean> = {
    'minio.endPoint': 'localhost',
    'minio.port': 9000,
    'minio.useSSL': false,
    'minio.accessKey': 'minioadmin',
    'minio.secretKey': 'minioadmin123',
    'minio.bucketName': 'test-bucket',
  };

  const mockFile: UploadedFile = {
    fieldname: 'file',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: Buffer.from('test file content'),
    size: 1024,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create bucket if it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('test-bucket');
    });

    it('should not create bucket if it already exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('test-bucket');
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('should throw error if bucket creation fails', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockRejectedValue(new Error('Bucket creation failed'));

      await expect(service.onModuleInit()).rejects.toThrow('Bucket creation failed');
    });

    it('should throw error if bucket check fails', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(new Error('Connection failed'));

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('uploadFile', () => {
    beforeEach(() => {
      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockMinioClient.presignedGetObject.mockResolvedValue('https://minio.example.com/test-file.pdf');
    });

    it('should upload file successfully', async () => {
      const result = await service.uploadFile(mockFile);

      expect(result).toHaveProperty('objectName');
      expect(result.originalName).toBe('test-document.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.size).toBe(1024);
      expect(result.url).toBe('https://minio.example.com/test-file.pdf');
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });

    it('should upload file with folder prefix', async () => {
      const result = await service.uploadFile(mockFile, 'contracts/2024');

      expect(result.objectName).toMatch(/^contracts\/2024\//);
      expect(result.objectName).toMatch(/\.pdf$/);
    });

    it('should upload file without folder prefix', async () => {
      const result = await service.uploadFile(mockFile);

      expect(result.objectName).not.toContain('/');
      expect(result.objectName).toMatch(/\.pdf$/);
    });

    it('should preserve file extension', async () => {
      const result = await service.uploadFile(mockFile);

      expect(result.objectName).toMatch(/\.pdf$/);
    });

    it('should handle file without extension', async () => {
      const fileWithoutExt: UploadedFile = {
        ...mockFile,
        originalname: 'testfile',
      };

      const result = await service.uploadFile(fileWithoutExt);

      expect(result.objectName).not.toContain('.');
    });

    it('should upload file with correct metadata', async () => {
      await service.uploadFile(mockFile);

      const putObjectCall = mockMinioClient.putObject.mock.calls[0];
      const metadata = putObjectCall[4];

      expect(metadata).toEqual({
        'Content-Type': 'application/pdf',
      });
    });

    it('should throw error if upload fails', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('Upload failed'));

      await expect(service.uploadFile(mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('getFileUrl', () => {
    it('should return presigned URL with default expiry', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('https://minio.example.com/file.pdf?expires=3600');

      const url = await service.getFileUrl('test-file.pdf');

      expect(url).toBe('https://minio.example.com/file.pdf?expires=3600');
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-file.pdf',
        3600
      );
    });

    it('should return presigned URL with custom expiry', async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue('https://minio.example.com/file.pdf?expires=7200');

      const url = await service.getFileUrl('test-file.pdf', 7200);

      expect(url).toBe('https://minio.example.com/file.pdf?expires=7200');
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-file.pdf',
        7200
      );
    });

    it('should throw error if presigning fails', async () => {
      mockMinioClient.presignedGetObject.mockRejectedValue(new Error('Presign failed'));

      await expect(service.getFileUrl('test-file.pdf')).rejects.toThrow('Presign failed');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockStream = new Readable();
      mockStream.push('file content');
      mockStream.push(null);

      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const buffer = await service.downloadFile('test-file.pdf');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('file content');
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-file.pdf'
      );
    });

    it('should handle large files', async () => {
      const mockStream = new Readable();
      const largeContent = 'a'.repeat(10000);
      mockStream.push(largeContent);
      mockStream.push(null);

      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const buffer = await service.downloadFile('large-file.pdf');

      expect(buffer.length).toBe(10000);
    });

    it('should handle stream errors', async () => {
      const mockStream = new Readable({
        read() {
          // Implement _read to prevent error
        },
      });
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const downloadPromise = service.downloadFile('test-file.pdf');

      // Simulate stream error
      setImmediate(() => {
        mockStream.emit('error', new Error('Stream error'));
      });

      await expect(downloadPromise).rejects.toThrow('Stream error');
    });

    it('should throw error if file does not exist', async () => {
      mockMinioClient.getObject.mockRejectedValue(new Error('File not found'));

      await expect(service.downloadFile('nonexistent.pdf')).rejects.toThrow('File not found');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile('test-file.pdf');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-file.pdf'
      );
    });

    it('should throw error if deletion fails', async () => {
      mockMinioClient.removeObject.mockRejectedValue(new Error('Deletion failed'));

      await expect(service.deleteFile('test-file.pdf')).rejects.toThrow('Deletion failed');
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      mockMinioClient.statObject.mockResolvedValue({ size: 1024 });

      const exists = await service.fileExists('test-file.pdf');

      expect(exists).toBe(true);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(
        'test-bucket',
        'test-file.pdf'
      );
    });

    it('should return false if file does not exist', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Not found'));

      const exists = await service.fileExists('nonexistent.pdf');

      expect(exists).toBe(false);
    });

    it('should return false for any stat error', async () => {
      mockMinioClient.statObject.mockRejectedValue(new Error('Permission denied'));

      const exists = await service.fileExists('test-file.pdf');

      expect(exists).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use default bucket name if not configured', async () => {
      const moduleWithoutBucket = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'minio.bucketName') return undefined;
                return mockConfig[key];
              }),
            },
          },
        ],
      }).compile();

      const serviceWithDefaults = moduleWithoutBucket.get<StorageService>(StorageService);
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await serviceWithDefaults.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('contracts');
    });

    it('should initialize with configuration values', () => {
      // Service was created in beforeEach, which calls configService.get
      // This test validates that the service can be instantiated successfully
      expect(service).toBeDefined();
      expect(configService.get).toBeDefined();
    });
  });
});
