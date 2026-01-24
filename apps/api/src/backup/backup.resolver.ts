import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver('Backup')
export class BackupResolver {
  constructor(private readonly backupService: BackupService) {}

  @Query(() => String, { description: 'Create database backup' })
  @UseGuards(GqlAuthGuard)
  async createBackup(@CurrentUser() user: any) {
    const result = await this.backupService.createBackup(user.id);
    return JSON.stringify(result);
  }

  @Query(() => String, { description: 'List all backups' })
  @UseGuards(GqlAuthGuard)
  async listBackups() {
    const backups = await this.backupService.listBackups();
    return JSON.stringify(backups);
  }

  @Mutation(() => Boolean, { description: 'Delete a backup' })
  @UseGuards(GqlAuthGuard)
  async deleteBackup(
    @Args('filename') filename: string,
    @CurrentUser() user: any,
  ) {
    await this.backupService.deleteBackup(filename, user.id);
    return true;
  }

  @Mutation(() => String, { description: 'Restore from backup' })
  @UseGuards(GqlAuthGuard)
  async restoreBackup(
    @Args('filename') filename: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.backupService.restoreBackup(filename, user.id);
    return JSON.stringify(result);
  }

  @Query(() => String, { description: 'Export system configuration' })
  @UseGuards(GqlAuthGuard)
  async exportConfig() {
    const result = await this.backupService.exportConfig();
    return JSON.stringify(result);
  }
}
