import { Module } from '@nestjs/common';
import { ExecutiveService } from './executive.service';
import { ExecutiveResolver } from './executive.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ExecutiveService, ExecutiveResolver],
  exports: [ExecutiveService],
})
export class ExecutiveModule {}
