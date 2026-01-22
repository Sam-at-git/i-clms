import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';
import { InfoType, InfoTypeNames } from '../parse-progress.service';

// 重新导出 InfoType 以便其他模块使用
export { InfoType, InfoTypeNames };

// 注册 GraphQL enum
registerEnumType(InfoType, {
  name: 'InfoType',
  description: '信息提取类型',
});

/**
 * 分块进度状态枚举
 */
export enum ChunkStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

registerEnumType(ChunkStatus, {
  name: 'ChunkStatus',
  description: '分块处理状态',
});

/**
 * 会话状态枚举
 */
export enum SessionStatus {
  INITIALIZING = 'initializing',
  UPLOADING = 'uploading',
  PARSING = 'parsing',
  CHUNKING = 'chunking',
  LLM_PROCESSING = 'llm_processing',
  MERGING = 'merging',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

registerEnumType(SessionStatus, {
  name: 'SessionStatus',
  description: '解析会话状态',
});

/**
 * 任务进度状态枚举
 */
export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: '任务处理状态',
});

/**
 * 单个任务的进度信息
 */
@ObjectType()
export class TaskProgressInfo {
  @Field(() => String)
  taskId!: string;

  @Field(() => InfoType)
  infoType!: InfoType;

  @Field(() => String)
  infoTypeName!: string; // 中文名称

  @Field(() => TaskStatus)
  status!: TaskStatus;

  @Field(() => Int, { nullable: true })
  startTime?: number;

  @Field(() => Int, { nullable: true })
  endTime?: number;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  data?: any; // 该任务提取的数据（可选）
}

/**
 * 单个分块的进度信息
 */
@ObjectType()
export class ChunkProgressInfo {
  @Field(() => String)
  chunkId!: string;

  @Field(() => Int)
  chunkIndex!: number;

  @Field(() => Int)
  totalChunks!: number;

  @Field(() => String)
  purpose!: string; // 如 "合同头部-基本信息", "财务条款" 等

  @Field(() => ChunkStatus)
  status!: ChunkStatus;

  @Field(() => Int, { nullable: true })
  startTime?: number;

  @Field(() => Int, { nullable: true })
  endTime?: number;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * 解析会话的完整进度信息
 */
@ObjectType()
export class ParseSessionProgressInfo {
  @Field(() => String)
  sessionId!: string;

  @Field(() => String)
  objectName!: string;

  @Field(() => SessionStatus)
  status!: SessionStatus;

  @Field(() => String)
  currentStage!: string;

  @Field(() => Int)
  totalChunks!: number;

  @Field(() => Int)
  completedChunks!: number;

  @Field(() => Int)
  currentChunkIndex!: number;

  @Field(() => Int)
  progressPercentage!: number;

  @Field(() => [ChunkProgressInfo])
  chunks!: ChunkProgressInfo[];

  // 新增：任务级别进度
  @Field(() => Int)
  totalTasks!: number;

  @Field(() => Int)
  completedTasks!: number;

  @Field(() => String, { nullable: true })
  currentTaskInfo?: string; // 当前正在处理的任务名称

  @Field(() => [TaskProgressInfo])
  tasks!: TaskProgressInfo[];

  @Field(() => Int)
  startTime!: number;

  @Field(() => Int, { nullable: true })
  estimatedEndTime?: number;

  @Field(() => Int, { nullable: true })
  processingTimeMs?: number;

  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => Int, { nullable: true })
  extractedFieldsCount?: number;

  @Field(() => Int, { nullable: true })
  estimatedRemainingSeconds?: number; // 预估剩余时间（秒）

  @Field(() => GraphQLJSONObject, { nullable: true })
  resultData?: any; // 存储解析完成后的完整结果
}
