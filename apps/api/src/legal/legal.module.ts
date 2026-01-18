import { Module } from '@nestjs/common';
import { LegalService } from './legal.service';
import { LegalResolver } from './legal.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [LegalService, LegalResolver],
  exports: [LegalService],
})
export class LegalModule {}
