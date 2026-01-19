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
import { LlmParserModule } from '../llm-parser/llm-parser.module';
import { ContractModule } from '../contract';
import { AuthModule } from '../auth';
import { FinanceModule } from '../finance';
import { DeliveryModule } from '../delivery';
import { SalesModule } from '../sales';
import { MarketModule } from '../market';
import { LegalModule } from '../legal';
import { ExecutiveModule } from '../executive';
import { TaggingModule } from '../tagging';
import { RiskEngineModule } from '../risk-engine';
import { VectorSearchModule } from '../vector-search';
import { AnalyticsModule } from '../analytics';
import { DateTimeScalar, DecimalScalar, JSONScalar } from '../common/scalars';
import { AuditModule } from '../audit';
import { UserModule } from '../user';
import { DepartmentModule } from '../department';
import { CustomerModule } from '../customer/customer.module';

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
    LlmParserModule,
    ContractModule,
    AuthModule,
    FinanceModule,
    DeliveryModule,
    SalesModule,
    MarketModule,
    LegalModule,
    ExecutiveModule,
    TaggingModule,
    RiskEngineModule,
    VectorSearchModule,
    AnalyticsModule,
    AuditModule,
    UserModule,
    DepartmentModule,
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService, DateTimeScalar, DecimalScalar, JSONScalar],
})
export class AppModule {}
