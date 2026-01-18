import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma';
import { HealthModule } from '../health';
import { StorageModule } from '../storage';
import { ParserModule } from '../parser';
import { ContractModule } from '../contract';
import { AuthModule } from '../auth';
import { FinanceModule } from '../finance';
import { DeliveryModule } from '../delivery';
import { SalesModule } from '../sales';
import { MarketModule } from '../market';
import { DateTimeScalar, DecimalScalar } from '../common/scalars';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/api/src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    HealthModule,
    StorageModule,
    ParserModule,
    ContractModule,
    AuthModule,
    FinanceModule,
    DeliveryModule,
    SalesModule,
    MarketModule,
  ],
  controllers: [AppController],
  providers: [AppService, DateTimeScalar, DecimalScalar],
})
export class AppModule {}
