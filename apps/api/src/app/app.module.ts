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
import { ContractTemplateModule } from '../contract-template/contract-template.module';
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
import { ExportModule } from '../export/export.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { CacheModule } from '../cache/cache.module';
import { DoclingModule } from '../docling/docling.module';
import { RAGModule } from '../rag/rag.module';
import { LegalClausesModule } from '../legal-clauses/legal-clauses.module';
import { DataProtectionModule } from '../data-protection/data-protection.module';
import { NotificationModule } from '../notification/notification.module';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // 生成到dist目录避免触发watch重启循环
      autoSchemaFile: join(process.cwd(), 'dist/apps/api/schema.gql'),
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
    // ContractTemplateModule, // TODO: Fix return type definitions for queries
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
    ExportModule,
    SystemConfigModule,
    VectorStoreModule,
    CacheModule,
    DoclingModule,
    RAGModule,
    LegalClausesModule,
    DataProtectionModule,
    NotificationModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService, DateTimeScalar, DecimalScalar, JSONScalar],
})
export class AppModule {}
