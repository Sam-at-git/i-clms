import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupResolver } from './backup.resolver';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  providers: [BackupService, BackupResolver],
  exports: [BackupService],
})
export class BackupModule {}
