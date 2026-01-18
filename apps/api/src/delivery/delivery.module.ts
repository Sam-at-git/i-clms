import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryResolver } from './delivery.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DeliveryService, DeliveryResolver],
  exports: [DeliveryService],
})
export class DeliveryModule {}
