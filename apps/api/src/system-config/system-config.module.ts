import { Module } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { SystemConfigResolver } from './system-config.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SystemConfigService, SystemConfigResolver],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
