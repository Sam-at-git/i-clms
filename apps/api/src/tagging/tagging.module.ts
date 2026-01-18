import { Module } from '@nestjs/common';
import { TaggingService } from './tagging.service';
import { TaggingResolver } from './tagging.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [TaggingService, TaggingResolver],
  exports: [TaggingService],
})
export class TaggingModule {}
