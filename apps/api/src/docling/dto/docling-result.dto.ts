import { ObjectType, Field, Int, registerEnumType, InputType } from '@nestjs/graphql';

/**
 * OCR Cleanup Result
 */
@ObjectType({ description: 'OCR清洗结果' })
export class OcrCleanupResult {
  @Field(() => String, { description: '清洗后的文本' })
  cleanedText!: string;

  @Field(() => Int, { description: '原始文本长度' })
  originalLength!: number;

  @Field(() => Int, { description: '清洗后文本长度' })
  cleanedLength!: number;

  @Field(() => Int, { description: '删除的行数' })
  linesRemoved!: number;

  @Field(() => [String], { description: '清洗操作描述' })
  corrections!: string[];

  @Field(() => String, { description: '清洗方法: rule/llm/hybrid' })
  method!: string;

  @Field(() => Int, { nullable: true, description: 'LLM消耗的token数' })
  llmTokensUsed?: number;
}

/**
 * Cleanup Result with Contract Update
 */
@ObjectType({ description: '清洗Markdown并更新合同的结果' })
export class CleanupMarkdownResult {
  @Field(() => String, { description: '清洗后的markdown文本' })
  markdown!: string;

  @Field(() => OcrCleanupResult, { description: '清洗详情' })
  cleanupInfo!: OcrCleanupResult;

  @Field(() => Boolean, { description: '是否成功' })
  success!: boolean;

  @Field(() => String, { nullable: true, description: '错误信息' })
  error?: string;
}
