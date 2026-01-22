import { registerEnumType } from '@nestjs/graphql';
import { Field, ObjectType, InputType, Int, Float } from '@nestjs/graphql';

/**
 * Parse Strategy Type Enum
 * Defines all available parsing strategies
 */
export enum ParseStrategyType {
  RULE = 'RULE', // 规则解析（最快，免费）
  LLM = 'LLM', // LLM智能解析（推荐）
  DOCLING = 'DOCLING', // Docling解析（新增）
  RAG = 'RAG', // RAG向量检索（新增）
  MULTI = 'MULTI', // 多策略交叉验证（最准确）
}

registerEnumType(ParseStrategyType, {
  name: 'ParseStrategyType',
  description: '合同解析策略类型',
});

/**
 * Strategy Cost Level
 */
export enum StrategyCost {
  FREE = 'free',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

registerEnumType(StrategyCost, {
  name: 'StrategyCost',
  description: '策略成本级别',
});

/**
 * Strategy Info
 * Provides information about a parsing strategy
 */
@ObjectType()
export class StrategyInfo {
  @Field(() => ParseStrategyType)
  type!: ParseStrategyType;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => [String], { defaultValue: [] })
  features!: string[];

  @Field(() => [String], { defaultValue: [] })
  pros!: string[];

  @Field(() => [String], { defaultValue: [] })
  cons!: string[];

  @Field(() => Boolean)
  available!: boolean;

  @Field(() => Int, { nullable: true })
  averageTime?: number; // 平均处理时间（秒）

  @Field(() => Int, { nullable: true })
  accuracy?: number; // 预估准确率（百分比 0-100）

  @Field(() => StrategyCost, { nullable: true })
  cost?: StrategyCost;

  @Field(() => String, { nullable: true })
  errorMessage?: string;
}

/**
 * Parse Strategy Configuration
 */
@ObjectType()
export class ParseStrategyConfig {
  @Field(() => ParseStrategyType, { nullable: true })
  defaultStrategy?: ParseStrategyType;

  @Field(() => [ParseStrategyType], { defaultValue: [] })
  enabledStrategies!: ParseStrategyType[];

  @Field(() => Boolean, { defaultValue: false })
  autoMultiStrategy?: boolean; // 自动启用多策略验证

  @Field(() => Int, { nullable: true, defaultValue: 70 })
  multiStrategyThreshold?: number; // 启用多策略的分数阈值

  @Field(() => [ParseStrategyType], { nullable: true, defaultValue: [] })
  multiStrategyVoters?: ParseStrategyType[]; // 参与投票的策略
}

/**
 * Input for updating parse strategy configuration
 */
@InputType()
export class UpdateParseStrategyConfigInput {
  @Field(() => ParseStrategyType, { nullable: true })
  defaultStrategy?: ParseStrategyType;

  @Field(() => [ParseStrategyType], { nullable: true })
  enabledStrategies?: ParseStrategyType[];

  @Field(() => Boolean, { nullable: true })
  autoMultiStrategy?: boolean;

  @Field(() => Int, { nullable: true })
  multiStrategyThreshold?: number;

  @Field(() => [ParseStrategyType], { nullable: true })
  multiStrategyVoters?: ParseStrategyType[];
}

/**
 * Strategy Test Result
 */
@ObjectType()
export class StrategyTestResult {
  @Field(() => ParseStrategyType)
  strategy!: ParseStrategyType;

  @Field(() => Boolean)
  available!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => Int, { nullable: true })
  latency?: number; // 测试延迟（毫秒）
}

/**
 * Single Strategy Result
 * Must be defined before StrategyComparisonResult to avoid initialization errors
 */
@ObjectType()
export class StrategyResult {
  @Field(() => ParseStrategyType)
  strategy!: ParseStrategyType;

  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  contractType?: string;

  @Field(() => Int, { nullable: true })
  fieldsExtracted?: number;

  @Field(() => Float, { nullable: true })
  confidence?: number;

  @Field(() => Int, { nullable: true })
  processingTimeMs?: number;

  @Field(() => String, { nullable: true })
  error?: string;
}

/**
 * Strategy Comparison Result
 * Used for multi-strategy voting
 */
@ObjectType()
export class StrategyComparisonResult {
  @Field(() => String)
  sessionId!: string;

  @Field(() => [StrategyResult], { defaultValue: [] })
  results!: StrategyResult[];

  @Field(() => StrategyResult, { nullable: true })
  consensus?: StrategyResult; // 共识结果

  @Field(() => Float)
  agreementScore!: number; // 一致性分数 0-1

  @Field(() => Int)
  totalTokensUsed!: number;
}

/**
 * Parse Result
 * Result from a single parse strategy execution
 *
 * @see Spec 25 - Docling Extraction Strategy
 */
@ObjectType()
export class ParseResultDto {
  @Field(() => ParseStrategyType)
  strategy!: ParseStrategyType;

  @Field(() => String)
  fields!: string; // JSON string of extracted fields

  @Field(() => Int)
  completeness!: number; // 0-100

  @Field(() => Int)
  confidence!: number; // 0-100

  @Field(() => [String], { defaultValue: [] })
  warnings!: string[];

  @Field(() => Int)
  duration!: number; // milliseconds

  @Field(() => String, { nullable: true })
  timestamp?: string; // ISO date string
}

/**
 * Field Value
 * Represents a field value from a specific strategy
 */
@ObjectType()
export class FieldValue {
  @Field(() => ParseStrategyType)
  strategy!: ParseStrategyType;

  @Field(() => String)
  value!: string; // JSON string

  @Field(() => Int)
  confidence!: number;
}

/**
 * Field Conflict
 * Represents a conflict in field values across strategies
 */
@ObjectType()
export class FieldConflict {
  @Field(() => String)
  fieldName!: string;

  @Field(() => [FieldValue], { defaultValue: [] })
  values!: FieldValue[];

  @Field(() => Boolean)
  needsResolution!: boolean;
}

/**
 * Multi Strategy Result
 * Result from executing multiple parse strategies
 *
 * @see Spec 25 - Docling Extraction Strategy
 */
@ObjectType()
export class MultiStrategyResult {
  @Field(() => [ParseResultDto], { defaultValue: [] })
  results!: ParseResultDto[];

  @Field(() => ParseResultDto, { nullable: true })
  bestMatch?: ParseResultDto;

  @Field(() => [FieldConflict], { defaultValue: [] })
  conflicts!: FieldConflict[];
}

/**
 * Parse With Input
 * Input for parsing with a specific strategy
 */
@InputType()
export class ParseWithInput {
  @Field(() => ParseStrategyType)
  strategy!: ParseStrategyType;

  @Field(() => String)
  content!: string;

  @Field(() => String, { nullable: true })
  options?: string; // JSON string of options
}

/**
 * Parse With Multi Input
 * Input for parsing with multiple strategies
 */
@InputType()
export class ParseWithMultiInput {
  @Field(() => [ParseStrategyType])
  strategies!: ParseStrategyType[];

  @Field(() => String)
  content!: string;

  @Field(() => String, { nullable: true })
  options?: string; // JSON string of options
}
