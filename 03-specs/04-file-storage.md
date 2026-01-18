# 04-file-storage.md - 文件存储服务

**优先级**: P0
**预估代码量**: ~400行
**依赖**: 03-graphql-foundation.md

---

## 1. 功能描述

实现基于MinIO的文件存储服务，支持合同文档（PDF、Word）的上传、下载和管理。提供GraphQL接口供前端调用。

---

## 2. 具体任务

### 2.1 安装MinIO SDK

```bash
pnpm add minio -w
pnpm add -D @types/minio -w
```

### 2.2 创建MinIO配置模块

创建 `apps/api/src/config/minio.config.ts`：

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('minio', () => ({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
  bucketName: process.env.MINIO_BUCKET || 'contracts',
}));
```

创建 `apps/api/src/config/index.ts`：

```typescript
export { default as minioConfig } from './minio.config';
```

### 2.3 安装NestJS Config模块

```bash
pnpm add @nestjs/config -w
```

### 2.4 创建Storage模块

创建 `apps/api/src/storage/storage.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageResolver } from './storage.resolver';
import minioConfig from '../config/minio.config';

@Module({
  imports: [ConfigModule.forFeature(minioConfig)],
  providers: [StorageService, StorageResolver],
  exports: [StorageService],
})
export class StorageModule {}
```

### 2.5 创建Storage服务

创建 `apps/api/src/storage/storage.service.ts`：

```typescript
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
    this.bucketName = this.configService.get<string>('minio.bucketName') || 'contracts';

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

  async uploadFile(file: UploadedFile, folder?: string): Promise<FileUploadResult> {
    const ext = this.getFileExtension(file.originalname);
    const objectName = folder
      ? `${folder}/${uuidv4()}${ext}`
      : `${uuidv4()}${ext}`;

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

  async getFileUrl(objectName: string, expirySeconds = 3600): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.bucketName,
      objectName,
      expirySeconds
    );
  }

  async downloadFile(objectName: string): Promise<Buffer> {
    const stream = await this.minioClient.getObject(this.bucketName, objectName);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
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
}
```

### 2.6 创建GraphQL类型定义

创建 `apps/api/src/storage/dto/file-upload.dto.ts`：

```typescript
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class FileUploadResult {
  @Field()
  objectName!: string;

  @Field()
  originalName!: string;

  @Field()
  mimeType!: string;

  @Field(() => Int)
  size!: number;

  @Field()
  url!: string;
}

@ObjectType()
export class PresignedUrl {
  @Field()
  url!: string;

  @Field()
  objectName!: string;

  @Field(() => Int)
  expiresIn!: number;
}
```

创建 `apps/api/src/storage/dto/index.ts`：

```typescript
export * from './file-upload.dto';
```

### 2.7 创建Storage Resolver

创建 `apps/api/src/storage/storage.resolver.ts`：

```typescript
import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { StorageService } from './storage.service';
import { FileUploadResult, PresignedUrl } from './dto/file-upload.dto';
import { GraphQLUpload, FileUpload } from 'graphql-upload-ts';

@Resolver()
export class StorageResolver {
  constructor(private readonly storageService: StorageService) {}

  @Query(() => PresignedUrl, { description: '获取文件预签名URL' })
  async getFileUrl(
    @Args('objectName') objectName: string,
    @Args('expirySeconds', { nullable: true, defaultValue: 3600 }) expirySeconds: number
  ): Promise<PresignedUrl> {
    const url = await this.storageService.getFileUrl(objectName, expirySeconds);
    return {
      url,
      objectName,
      expiresIn: expirySeconds,
    };
  }

  @Query(() => Boolean, { description: '检查文件是否存在' })
  async fileExists(@Args('objectName') objectName: string): Promise<boolean> {
    return this.storageService.fileExists(objectName);
  }

  @Mutation(() => Boolean, { description: '删除文件' })
  async deleteFile(@Args('objectName') objectName: string): Promise<boolean> {
    await this.storageService.deleteFile(objectName);
    return true;
  }
}
```

### 2.8 创建REST文件上传端点

由于GraphQL文件上传配置复杂，采用REST端点处理文件上传。

创建 `apps/api/src/storage/storage.controller.ts`：

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService, UploadedFile as IUploadedFile } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF and Word documents are allowed.'
      );
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 50MB limit');
    }

    const uploadedFile: IUploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    };

    return this.storageService.uploadFile(uploadedFile, folder);
  }
}
```

### 2.9 安装Multer

```bash
pnpm add @nestjs/platform-express multer -w
pnpm add -D @types/multer -w
```

### 2.10 更新Storage模块

更新 `apps/api/src/storage/storage.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageResolver } from './storage.resolver';
import { StorageController } from './storage.controller';
import minioConfig from '../config/minio.config';

@Module({
  imports: [ConfigModule.forFeature(minioConfig)],
  controllers: [StorageController],
  providers: [StorageService, StorageResolver],
  exports: [StorageService],
})
export class StorageModule {}
```

创建 `apps/api/src/storage/index.ts`：

```typescript
export * from './storage.module';
export * from './storage.service';
export * from './storage.resolver';
export * from './storage.controller';
```

### 2.11 更新AppModule

更新 `apps/api/src/app/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma';
import { HealthModule } from '../health';
import { StorageModule } from '../storage';
import { DateTimeScalar, DecimalScalar } from '../common/scalars';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/api/src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    HealthModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService, DateTimeScalar, DecimalScalar],
})
export class AppModule {}
```

### 2.12 添加环境变量配置

创建 `apps/api/.env.example`：

```env
# Database
DATABASE_URL="postgresql://iclms:iclms_password@localhost:5432/iclms?schema=public"

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=contracts
```

### 2.13 安装UUID依赖

```bash
pnpm add uuid -w
pnpm add -D @types/uuid -w
```

---

## 3. 输入/输出

### 输入
- MinIO服务运行中 (docker-compose)
- 环境变量配置

### 输出
```
apps/api/src/
├── config/
│   ├── minio.config.ts    # MinIO配置
│   └── index.ts
├── storage/
│   ├── dto/
│   │   ├── file-upload.dto.ts  # GraphQL类型
│   │   └── index.ts
│   ├── storage.module.ts   # 模块
│   ├── storage.service.ts  # 服务
│   ├── storage.resolver.ts # GraphQL Resolver
│   ├── storage.controller.ts # REST控制器
│   └── index.ts
└── app/
    └── app.module.ts      # 更新导入

apps/api/.env.example      # 环境变量示例
```

---

## 4. 验收标准

### AC-01: MinIO SDK安装成功
- [ ] `pnpm list minio` 显示已安装

### AC-02: Storage服务可注入
- [ ] StorageService可以在其他模块中注入使用
- [ ] 应用启动时自动创建bucket

### AC-03: 文件上传功能正常
- [ ] POST /storage/upload 可上传PDF文件
- [ ] POST /storage/upload 可上传Word文档
- [ ] 返回正确的文件信息（objectName, url等）

### AC-04: 文件访问功能正常
- [ ] GraphQL getFileUrl 返回预签名URL
- [ ] 预签名URL可以访问文件

### AC-05: 文件删除功能正常
- [ ] GraphQL deleteFile 可删除文件
- [ ] 删除后文件不可访问

### AC-06: 文件类型限制有效
- [ ] 非PDF/Word文件上传被拒绝
- [ ] 超过50MB的文件被拒绝

### AC-07: GraphQL Schema更新
- [ ] schema.gql包含新的类型和操作

### AC-08: 背压检查通过
- [ ] 运行 `pnpm nx affected -t lint` 通过
- [ ] 运行 `pnpm nx affected -t build` 通过

---

## 5. 技术约束

- MinIO SDK版本：最新稳定版
- 文件大小限制：50MB
- 支持文件类型：PDF, DOC, DOCX
- 预签名URL默认有效期：1小时
- 文件命名：使用UUID避免冲突

---

## 6. 注意事项

1. **不要**在GraphQL中直接处理文件上传（使用REST端点）
2. **不要**存储文件到本地文件系统
3. 确保MinIO服务在Docker中正常运行
4. 文件删除需要谨慎处理，考虑软删除场景
5. 预签名URL不要设置过长的有效期

---

## 7. 完成信号

当所有验收标准（AC-01到AC-08）全部满足时，输出：
```
<promise>COMPLETE</promise>
```

如果遇到阻塞问题，记录到 `05-ralph/BLOCKED.log` 并输出：
```
<promise>BLOCKED: [问题描述]</promise>
```
