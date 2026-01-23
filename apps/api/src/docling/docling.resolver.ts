import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DoclingService } from './docling.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs/promises';
import * as os from 'os';
import { createHash } from 'crypto';
import {
  DoclingConvertResult,
  DoclingConvertOptions,
  DoclingExtractResult,
} from './entities/docling.entity';

@Resolver()
export class DoclingResolver {
  constructor(
    private readonly docling: DoclingService,
    private readonly storage: StorageService,
  ) {}

  @Query(() => Boolean, {
    description: '检查Docling服务是否可用',
  })
  @UseGuards(GqlAuthGuard)
  doclingAvailable(): Promise<boolean> {
    return Promise.resolve(this.docling.isAvailable());
  }

  @Query(() => String, {
    description: '获取Docling版本',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  async doclingVersion(): Promise<string | null> {
    return this.docling.getVersion();
  }

  @Mutation(() => DoclingConvertResult, {
    description: '将文档转换为Markdown',
  })
  @UseGuards(GqlAuthGuard)
  async convertDocumentToMarkdown(
    @Args('filePath', { type: () => String }) filePath: string,
    @Args('options', { type: () => DoclingConvertOptions, nullable: true }) options?: DoclingConvertOptions,
  ): Promise<DoclingConvertResult> {
    const result = await this.docling.convertToMarkdown(filePath, options || {});
    // Convert fields object to JSON string for ExtractResult
    return {
      ...result,
      tables: result.tables.map(t => ({
        markdown: t.markdown,
        rows: t.rows,
        cols: t.cols,
      })),
      images: result.images.map(i => ({
        page: i.page,
        width: i.width,
        height: i.height,
      })),
    };
  }

  @Mutation(() => DoclingConvertResult, {
    description: '将已上传的文件转换为Markdown (从MinIO获取文件)',
  })
  @UseGuards(GqlAuthGuard)
  async convertUploadedFileToMarkdown(
    @Args('objectName', { type: () => String }) objectName: string,
    @Args('options', { type: () => DoclingConvertOptions, nullable: true }) options?: DoclingConvertOptions,
  ): Promise<DoclingConvertResult> {
    // 1. 从 MinIO 下载文件到临时目录
    const tempDir = os.tmpdir();
    const fileHash = createHash('md5').update(objectName).digest('hex').slice(0, 8);
    const tempFilePath = `${tempDir}/docling_${Date.now()}_${fileHash}.bin`;

    try {
      // 从 MinIO 下载文件
      const buffer = await this.storage.downloadFile(objectName);
      await fs.writeFile(tempFilePath, buffer);

      // 2. 使用 Docling 转换
      const result = await this.docling.convertToMarkdown(tempFilePath, options || {});

      // 3. 清理临时文件
      await fs.unlink(tempFilePath).catch(() => {});

      return {
        ...result,
        tables: result.tables.map(t => ({
          markdown: t.markdown,
          rows: t.rows,
          cols: t.cols,
        })),
        images: result.images.map(i => ({
          page: i.page,
          width: i.width,
          height: i.height,
        })),
      };
    } catch (error) {
      // 清理临时文件（如果存在）
      await fs.unlink(tempFilePath).catch(() => {});
      throw error;
    }
  }

  @Mutation(() => DoclingExtractResult, {
    description: '从文档中提取指定字段',
  })
  @UseGuards(GqlAuthGuard)
  async extractDocumentFields(
    @Args('filePath', { type: () => String }) filePath: string,
    @Args('topics', { type: () => [String] }) topics: string[],
  ): Promise<DoclingExtractResult> {
    const result = await this.docling.extractFields(filePath, topics);
    // Convert fields to JSON string
    return {
      fields: JSON.stringify(result.fields),
      success: result.success,
      error: result.error,
    };
  }
}
