import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { ContractService } from './contract.service';
import { ContractResolver } from './contract.resolver';
import { ContractVectorizationService } from './contract-vectorization.service';
import { RAGModule } from '../rag/rag.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';
import { LlmParserModule } from '../llm-parser/llm-parser.module';

@Module({
  imports: [PrismaModule, RAGModule, VectorStoreModule, LlmParserModule],
  providers: [ContractService, ContractResolver, ContractVectorizationService],
  exports: [ContractService, ContractVectorizationService],
})
export class ContractModule {}
