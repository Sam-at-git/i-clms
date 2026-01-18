import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesResolver } from './sales.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SalesService, SalesResolver],
  exports: [SalesService],
})
export class SalesModule {}
