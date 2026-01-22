import { Test, TestingModule } from '@nestjs/testing';
import { RAGModule } from './rag.module';
import { RAGService } from './rag.service';
import { RAGResolver } from './rag.resolver';
import { SemanticChunkerService } from '../llm-parser/semantic-chunker.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { TopicRegistryService } from '../llm-parser/topics/topic-registry.service';

describe('RAGModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RAGModule],
    })
      .overrideProvider(SemanticChunkerService)
      .useValue({})
      .overrideProvider(VectorStoreService)
      .useValue({})
      .overrideProvider(TopicRegistryService)
      .useValue({})
      .compile();

    expect(module).toBeDefined();
    await module.close();
  });

  it('should provide RAGService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RAGModule],
    })
      .overrideProvider(SemanticChunkerService)
      .useValue({})
      .overrideProvider(VectorStoreService)
      .useValue({})
      .overrideProvider(TopicRegistryService)
      .useValue({})
      .compile();

    const service = module.get<RAGService>(RAGService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(RAGService);

    await module.close();
  });

  it('should provide RAGResolver', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RAGModule],
    })
      .overrideProvider(SemanticChunkerService)
      .useValue({})
      .overrideProvider(VectorStoreService)
      .useValue({})
      .overrideProvider(TopicRegistryService)
      .useValue({})
      .compile();

    const resolver = module.get<RAGResolver>(RAGResolver);
    expect(resolver).toBeDefined();
    expect(resolver).toBeInstanceOf(RAGResolver);

    await module.close();
  });
});
