import { Field, ObjectType, Int, Float, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { EmbeddingProvider } from '../dto/embedding-config.dto';

registerEnumType(EmbeddingProvider, {
  name: 'EmbeddingProvider',
  description: 'Embedding model provider',
});

@ObjectType('EmbeddingModelInfo')
export class EmbeddingModelInfo {
  @Field(() => EmbeddingProvider)
  provider!: EmbeddingProvider;

  @Field(() => String)
  model!: string;

  @Field(() => Int)
  dimensions!: number;

  @Field(() => Boolean)
  available!: boolean;
}

@ObjectType('RetrievedChunk')
export class RetrievedChunk {
  @Field(() => String)
  content!: string;

  @Field(() => Float)
  similarity!: number;
}

@ObjectType('RAGExtractResult')
export class RAGExtractResult {
  @Field(() => String)
  topic!: string;

  @Field(() => String)
  query!: string;

  @Field(() => [RetrievedChunk])
  retrievedChunks!: RetrievedChunk[];

  @Field(() => GraphQLJSONObject)
  extractedData!: Record<string, unknown>;
}

@ObjectType('RAGContractChunk')
export class RAGContractChunk {
  @Field(() => Int)
  index!: number;

  @Field(() => String)
  content!: string;

  @Field(() => String)
  chunkType!: string;
}
