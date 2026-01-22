import { Field, InputType, Int, Float } from '@nestjs/graphql';

/**
 * Topic query for RAG extraction
 */
@InputType()
export class TopicQueryDto {
  @Field(() => String, { description: 'Topic name (e.g., BASIC_INFO, FINANCIAL)' })
  topic!: string;

  @Field(() => String, { description: 'Natural language query for the topic' })
  query!: string;

  @Field(() => Int, { nullable: true, description: 'Number of chunks to retrieve' })
  topK?: number;

  @Field(() => Float, { nullable: true, description: 'Similarity threshold (0-1)' })
  threshold?: number;
}

/**
 * RAG extraction options
 */
export interface RAGOptions {
  contractId?: number;
  topics?: string[];
  topK?: number;
  threshold?: number;
}
