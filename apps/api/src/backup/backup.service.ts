import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');

  constructor(private readonly prisma: PrismaService) {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create database backup
   */
  async createBackup(userId?: string): Promise<{
    success: boolean;
    filename: string;
    path: string;
    size: number;
    createdAt: Date;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `iclms-backup-${timestamp}.sql`;
    const filePath = path.join(this.backupDir, filename);

    try {
      // Get database URL from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      // Parse database URL to get connection details
      // Format: postgresql://username:password@host:port/database
      const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!urlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }

      const [, user, password, host, port, database] = urlMatch;

      // Use pg_dump to create backup
      const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p -f "${filePath}"`;

      this.logger.log(`Creating backup: ${filename}`);
      await execAsync(command);

      // Get file size
      const stats = fs.statSync(filePath);

      this.logger.log(`Backup created successfully: ${filename} (${this.formatBytes(stats.size)})`);

      // Log backup creation to audit log if user provided
      if (userId) {
        await this.prisma.auditLog.create({
          data: {
            action: 'BACKUP_CREATED',
            entityType: 'SYSTEM',
            entityId: filename,
            operatorId: userId,
            newValue: {
              filename,
              size: stats.size,
              path: filePath,
            },
          },
        });
      }

      return {
        success: true,
        filename,
        path: filePath,
        size: stats.size,
        createdAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Backup creation failed: ${error}`);
      throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<Array<{
    filename: string;
    size: number;
    createdAt: Date;
  }>> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter((file) => file.endsWith('.sql'))
        .map((file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            size: stats.size,
            createdAt: stats.mtime,
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return backups;
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error}`);
      return [];
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(filename: string, userId?: string): Promise<{ success: boolean }> {
    const filePath = path.join(this.backupDir, filename);

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filename}`);
      }

      fs.unlinkSync(filePath);
      this.logger.log(`Backup deleted: ${filename}`);

      if (userId) {
        await this.prisma.auditLog.create({
          data: {
            action: 'BACKUP_DELETED',
            entityType: 'SYSTEM',
            entityId: filename,
            operatorId: userId,
            newValue: { filename },
          },
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Backup deletion failed: ${error}`);
      throw new Error(`Backup deletion failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(filename: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const filePath = path.join(this.backupDir, filename);

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filename}`);
      }

      // Get database URL from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      // Parse database URL
      const urlMatch = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (!urlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }

      const [, user, password, host, port, database] = urlMatch;

      this.logger.warn(`Starting database restore from: ${filename}`);

      // Drop existing connections
      await execAsync(`PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database}' AND pid <> pg_backend_pid();"`);

      // Restore from backup
      const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${filePath}"`;

      await execAsync(command);

      this.logger.log(`Database restored successfully from: ${filename}`);

      if (userId) {
        await this.prisma.auditLog.create({
          data: {
            action: 'BACKUP_RESTORED',
            entityType: 'SYSTEM',
            entityId: filename,
            operatorId: userId,
            newValue: { filename },
          },
        });
      }

      return {
        success: true,
        message: `Database restored successfully from ${filename}`,
      };
    } catch (error) {
      this.logger.error(`Backup restoration failed: ${error}`);
      throw new Error(`Backup restoration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export system configuration
   */
  async exportConfig(): Promise<{
    success: boolean;
    config: any;
  }> {
    try {
      const config = await this.prisma.systemConfig.findMany();
      return {
        success: true,
        config: config.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, string>),
      };
    } catch (error) {
      this.logger.error(`Config export failed: ${error}`);
      throw new Error(`Config export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
