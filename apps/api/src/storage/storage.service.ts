import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface FileUploadResult {
  objectName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: MinioClient;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const endPoint = this.configService.get<string>('minio.endPoint');
    const port = this.configService.get<number>('minio.port');
    const useSSL = this.configService.get<boolean>('minio.useSSL');
    const accessKey = this.configService.get<string>('minio.accessKey');
    const secretKey = this.configService.get<string>('minio.secretKey');
    this.bucketName =
      this.configService.get<string>('minio.bucketName') || 'contracts';

    this.minioClient = new MinioClient({
      endPoint: endPoint || 'localhost',
      port: port || 9000,
      useSSL: useSSL || false,
      accessKey: accessKey || 'minioadmin',
      secretKey: secretKey || 'minioadmin123',
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`Bucket "${this.bucketName}" created successfully`);
      } else {
        this.logger.log(`Bucket "${this.bucketName}" already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure bucket exists: ${error}`);
      throw error;
    }
  }

  async uploadFile(
    file: UploadedFile,
    folder?: string
  ): Promise<FileUploadResult> {
    const ext = this.getFileExtension(file.originalname);
    const objectName = folder ? `${folder}/${uuidv4()}${ext}` : `${uuidv4()}${ext}`;

    const stream = Readable.from(file.buffer);

    await this.minioClient.putObject(
      this.bucketName,
      objectName,
      stream,
      file.size,
      { 'Content-Type': file.mimetype }
    );

    return {
      objectName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: await this.getFileUrl(objectName),
    };
  }

  /**
   * Upload a buffer directly to storage
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    objectName?: string
  ): Promise<FileUploadResult> {
    const finalObjectName = objectName || fileName;

    await this.minioClient.putObject(
      this.bucketName,
      finalObjectName,
      buffer,
      buffer.length,
      { 'Content-Type': this.getMimeType(fileName) }
    );

    return {
      objectName: finalObjectName,
      originalName: fileName,
      mimeType: this.getMimeType(fileName),
      size: buffer.length,
      url: await this.getFileUrl(finalObjectName),
    };
  }

  async getFileUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      expirySeconds
    );
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(
      this.bucketName,
      objectName
    );
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFile(objectName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, objectName);
  }

  async fileExists(objectName: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectName);
      return true;
    } catch {
      return false;
    }
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'pdf': 'application/pdf',
      'csv': 'text/csv',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'txt': 'text/plain',
      'json': 'application/json',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
