import { Module } from '@nestjs/common';
import { VectorSearchService } from './vector-search.service';
import { VectorSearchResolver } from './vector-search.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VectorSearchService, VectorSearchResolver],
  exports: [VectorSearchService],
})
export class VectorSearchModule {}
