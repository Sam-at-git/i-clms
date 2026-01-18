import { Module } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineResolver } from './risk-engine.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RiskEngineService, RiskEngineResolver],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}
