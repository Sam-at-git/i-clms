import { Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';
import { VectorStoreResolver } from './vector-store.resolver';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  providers: [VectorStoreService, VectorStoreResolver],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
