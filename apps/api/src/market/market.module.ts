import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketResolver } from './market.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MarketService, MarketResolver],
  exports: [MarketService],
})
export class MarketModule {}
