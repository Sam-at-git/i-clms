import { Module } from '@nestjs/common';
import { DoclingService } from './docling.service';
import { DoclingResolver } from './docling.resolver';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [DoclingService, DoclingResolver],
  exports: [DoclingService],
})
export class DoclingModule {}
