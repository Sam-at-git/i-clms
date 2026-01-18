import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { ContractService } from './contract.service';
import { ContractResolver } from './contract.resolver';

@Module({
  imports: [PrismaModule],
  providers: [ContractService, ContractResolver],
  exports: [ContractService],
})
export class ContractModule {}
