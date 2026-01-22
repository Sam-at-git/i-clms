import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { createHash } from 'crypto';
import { MemoryCacheStrategy } from './strategies/memory-cache.strategy';
import { ParsedDocumentResult } from './dto/cache-config.dto';

/**
 * Document Fingerprint Cache Service
 *
 * L1 cache: In-memory cache for parsed document results
 * L2 cache: Database cache (document_fingerprint table)
 */
@Injectable()
export class DocumentFingerprintService {
  private readonly logger = new Logger(DocumentFingerprintService.name);
  private readonly L1_CACHE_PREFIX = 'doc_fp:';
  private readonly L1_TTL = 24 * 60 * 60;  // 1 day

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryCache: MemoryCacheStrategy,
  ) {}

  /**
   * Get cached document parse result
   */
  async getCachedResult(
    fileContent: Buffer,
    fileName: string,
  ): Promise<ParsedDocumentResult | null> {
    const fileHash = this.hashFile(fileContent);

    // L1: Memory cache
    const l1Key = `${this.L1_CACHE_PREFIX}${fileHash}`;
    const l1Result = await this.memoryCache.get<ParsedDocumentResult>(l1Key);
    if (l1Result) {
      this.logger.debug(`L1 cache hit for document ${fileHash.slice(0, 8)}...`);
      return l1Result;
    }

    // L2: Database cache
    const dbResult = await this.prisma.$queryRaw<
      Array<{
        file_name: string;
        file_size: number;
        mime_type: string;
        parse_result: unknown;
        strategy: string;
        expires_at: Date | null;
        created_at: Date;
      }>
    >`
      SELECT file_name, file_size, mime_type, parse_result, strategy, expires_at, created_at
      FROM document_fingerprint
      WHERE file_hash = ${fileHash}
    `;

    if (dbResult && dbResult.length > 0) {
      const row = dbResult[0];

      // Check expiration
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        await this.prisma.$executeRaw`DELETE FROM document_fingerprint WHERE file_hash = ${fileHash}`;
        return null;
      }

      this.logger.debug(`L2 cache hit for document ${fileHash.slice(0, 8)}...`);

      const result: ParsedDocumentResult = {
        ...(row.parse_result as ParsedDocumentResult),
        strategy: row.strategy,
        parsedAt: row.created_at,
      };

      // Backfill L1 cache
      await this.memoryCache.set(l1Key, result, this.L1_TTL);

      return result;
    }

    return null;
  }

  /**
   * Cache document parse result
   */
  async cacheResult(
    fileContent: Buffer,
    fileName: string,
    result: ParsedDocumentResult,
    ttlDays = 7,
  ): Promise<void> {
    const fileHash = this.hashFile(fileContent);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    // L1: Memory cache
    const l1Key = `${this.L1_CACHE_PREFIX}${fileHash}`;
    await this.memoryCache.set(l1Key, result, this.L1_TTL);

    // L2: Database cache
    try {
      await this.prisma.$executeRaw`
        INSERT INTO document_fingerprint (file_hash, file_name, file_size, mime_type, parse_result, strategy, created_at, expires_at)
        VALUES (
          ${fileHash},
          ${fileName},
          ${fileContent.length},
          ${this.getMimeType(fileName)},
          ${JSON.stringify(result)}::jsonb,
          ${result.strategy},
          NOW(),
          ${expiresAt}
        )
        ON CONFLICT (file_hash) DO UPDATE
        SET parse_result = EXCLUDED.parse_result,
            strategy = EXCLUDED.strategy,
            expires_at = EXCLUDED.expires_at
      `;
      this.logger.debug(`Cached document result for ${fileHash.slice(0, 8)}...`);
    } catch (error) {
      this.logger.error(`Failed to cache document result: ${this.errorMessage(error)}`);
    }
  }

  /**
   * Invalidate document cache
   */
  async invalidate(fileHash: string): Promise<void> {
    const l1Key = `${this.L1_CACHE_PREFIX}${fileHash}`;
    await this.memoryCache.delete(l1Key);
    await this.prisma.$executeRaw`DELETE FROM document_fingerprint WHERE file_hash = ${fileHash}`;
    this.logger.debug(`Invalidated cache for ${fileHash.slice(0, 8)}...`);
  }

  /**
   * Clear all document cache
   */
  async clear(): Promise<void> {
    await this.memoryCache.clearPrefix(this.L1_CACHE_PREFIX);
    await this.prisma.$executeRaw`DELETE FROM document_fingerprint`;
    this.logger.log('Cleared all document fingerprint cache');
  }

  private hashFile(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
