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
