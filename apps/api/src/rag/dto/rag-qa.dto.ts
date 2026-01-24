import { Field, ObjectType, Float, ID } from '@nestjs/graphql';

/**
 * RAG问答结果的chunk元数据
 */
@ObjectType()
export class RAGChunkMetadata {
  @Field(() => String, { nullable: true, description: '章节标题' })
  title?: string;

  @Field(() => String, { nullable: true, description: '条款编号' })
  articleNumber?: string;

  @Field(() => String, { nullable: true, description: 'chunk类型' })
  chunkType?: string;
}

/**
 * RAG问答结果项
 */
@ObjectType()
export class RAGQuestionAnswerResult {
  @Field(() => ID, { description: '合同ID' })
  contractId!: string;

  @Field(() => String, { description: '合同编号' })
  contractNo!: string;

  @Field(() => String, { description: '合同名称' })
  contractName!: string;

  @Field(() => String, { description: '客户名称' })
  customerName!: string;

  @Field(() => String, { description: '相关文本片段' })
  chunkContent!: string;

  @Field(() => Float, { description: '相似度得分 (0-1)' })
  similarity!: number;

  @Field(() => RAGChunkMetadata, { nullable: true, description: 'chunk元数据' })
  chunkMetadata?: RAGChunkMetadata;
}
