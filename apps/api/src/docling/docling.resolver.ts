import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DoclingService } from './docling.service';
import { OcrCleanupService } from './ocr-cleanup.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as os from 'os';
import { createHash } from 'crypto';
import {
  DoclingConvertResult,
  DoclingConvertOptions,
  DoclingExtractResult,
} from './entities/docling.entity';
import {
  OcrCleanupResult,
  CleanupMarkdownResult,
} from './dto/docling-result.dto';

@Resolver()
export class DoclingResolver {
  constructor(
    private readonly docling: DoclingService,
    private readonly ocrCleanup: OcrCleanupService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
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
    @Args('skipCache', { type: () => Boolean, nullable: true, defaultValue: false }) skipCache?: boolean,
  ): Promise<DoclingConvertResult> {
    // 1. 从 MinIO 下载文件到临时目录
    const tempDir = os.tmpdir();
    const fileHash = createHash('md5').update(objectName).digest('hex').slice(0, 8);
    const tempFilePath = `${tempDir}/docling_${Date.now()}_${fileHash}.bin`;

    try {
      // 从 MinIO 下载文件
      const buffer = await this.storage.downloadFile(objectName);
      await fs.writeFile(tempFilePath, buffer);

      // 2. 使用 Docling 转换（支持跳过缓存）
      const result = await this.docling.convertToMarkdown(tempFilePath, options || {}, skipCache);

      // 3. 清理临时文件
      await fs.unlink(tempFilePath).catch(() => {});

      return {
        markdown: result.markdown || '',
        tables: (result.tables || []).map(t => ({
          markdown: t.markdown,
          rows: t.rows,
          cols: t.cols,
        })),
        pages: result.pages || 0,
        images: (result.images || []).map(i => ({
          page: i.page,
          width: i.width,
          height: i.height,
        })),
        success: result.success ?? false,
        error: result.error,
        fromCache: result.fromCache,
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

  @Mutation(() => CleanupMarkdownResult, {
    description: '清洗合同的 Markdown 文本（OCR 后处理）',
  })
  @UseGuards(GqlAuthGuard)
  async cleanupMarkdown(
    @Args('contractId', { type: () => String }) contractId: string,
    @Args('useLlm', { type: () => Boolean, nullable: true, defaultValue: false })
    useLlm: boolean,
  ): Promise<CleanupMarkdownResult> {
    const id = contractId; // Use string value
    try {
      // 1. 获取合同的 markdownText
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        select: { markdownText: true },
      });

      if (!contract) {
        return {
          markdown: '',
          cleanupInfo: {
            cleanedText: '',
            originalLength: 0,
            cleanedLength: 0,
            linesRemoved: 0,
            corrections: [],
            method: 'rule',
          },
          success: false,
          error: '合同不存在',
        };
      }

      if (!contract.markdownText) {
        return {
          markdown: '',
          cleanupInfo: {
            cleanedText: '',
            originalLength: 0,
            cleanedLength: 0,
            linesRemoved: 0,
            corrections: [],
            method: 'rule',
          },
          success: false,
          error: '合同没有 Markdown 文本',
        };
      }

      // 2. 执行清洗
      const cleanupResult = useLlm
        ? await this.ocrCleanup.hybridCleanup(contract.markdownText, true)
        : await this.ocrCleanup.hybridCleanup(contract.markdownText, false);

      // 3. 更新合同的 markdownText
      await this.prisma.contract.update({
        where: { id: contractId },
        data: {
          markdownText: cleanupResult.cleanedText,
          // 如果使用了 LLM 清洗，重置向量化状态
          ...(useLlm && {
            isVectorized: false,
            vectorizedAt: null,
          }),
        },
      });

      // 4. 返回结果
      return {
        markdown: cleanupResult.cleanedText,
        cleanupInfo: {
          cleanedText: cleanupResult.cleanedText,
          originalLength: cleanupResult.originalLength,
          cleanedLength: cleanupResult.cleanedLength,
          linesRemoved: cleanupResult.linesRemoved,
          corrections: cleanupResult.corrections,
          method: cleanupResult.method,
          llmTokensUsed: cleanupResult.llmTokensUsed,
        },
        success: true,
      };
    } catch (error) {
      return {
        markdown: '',
        cleanupInfo: {
          cleanedText: '',
          originalLength: 0,
          cleanedLength: 0,
          linesRemoved: 0,
          corrections: [],
          method: 'rule',
        },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Mutation(() => CleanupMarkdownResult, {
    description: '清洗 Markdown 文本（不需要合同ID，用于上传预览阶段）',
  })
  @UseGuards(GqlAuthGuard)
  async cleanupMarkdownText(
    @Args('markdownText', { type: () => String }) markdownText: string,
    @Args('useLlm', { type: () => Boolean, nullable: true, defaultValue: false })
    useLlm: boolean,
  ): Promise<CleanupMarkdownResult> {
    try {
      if (!markdownText || markdownText.trim().length === 0) {
        return {
          markdown: '',
          cleanupInfo: {
            cleanedText: '',
            originalLength: 0,
            cleanedLength: 0,
            linesRemoved: 0,
            corrections: [],
            method: 'rule',
          },
          success: false,
          error: 'Markdown 文本为空',
        };
      }

      // 执行清洗
      const cleanupResult = useLlm
        ? await this.ocrCleanup.hybridCleanup(markdownText, true)
        : await this.ocrCleanup.hybridCleanup(markdownText, false);

      // 返回结果（不保存到数据库）
      return {
        markdown: cleanupResult.cleanedText,
        cleanupInfo: {
          cleanedText: cleanupResult.cleanedText,
          originalLength: cleanupResult.originalLength,
          cleanedLength: cleanupResult.cleanedLength,
          linesRemoved: cleanupResult.linesRemoved,
          corrections: cleanupResult.corrections,
          method: cleanupResult.method,
          llmTokensUsed: cleanupResult.llmTokensUsed,
        },
        success: true,
      };
    } catch (error) {
      return {
        markdown: '',
        cleanupInfo: {
          cleanedText: '',
          originalLength: 0,
          cleanedLength: 0,
          linesRemoved: 0,
          corrections: [],
          method: 'rule',
        },
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
