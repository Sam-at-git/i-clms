import { Module } from '@nestjs/common';
import { ContractTemplateService } from './contract-template.service';
import { ContractTemplateResolver } from './contract-template.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ContractTemplateService, ContractTemplateResolver],
  exports: [ContractTemplateService],
})
export class ContractTemplateModule {}
