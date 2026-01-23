import { Module, forwardRef } from '@nestjs/common';
import { DoclingService } from './docling.service';
import { DoclingResolver } from './docling.resolver';
import { ConfigModule } from '@nestjs/config';
import { SystemConfigModule } from '../system-config/system-config.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ConfigModule, forwardRef(() => SystemConfigModule), forwardRef(() => StorageModule)],
  providers: [DoclingService, DoclingResolver],
  exports: [DoclingService],
})
export class DoclingModule {}
