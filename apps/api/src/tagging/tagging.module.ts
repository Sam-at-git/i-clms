import { Module } from '@nestjs/common';
import { TaggingService } from './tagging.service';
import { TaggingResolver } from './tagging.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TaggingService, TaggingResolver],
  exports: [TaggingService],
})
export class TaggingModule {}
