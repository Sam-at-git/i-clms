import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

@InputType('GenerateCaseStudyInput')
export class GenerateCaseStudyInput {
  @Field()
  contractId!: string;

  // 脱敏选项
  @Field({ nullable: true, defaultValue: true })
  desensitize?: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true, description: '脱敏配置：可指定哪些字段需要脱敏' })
  desensitizeConfig?: any;

  // 自定义脱敏值
  @Field(() => String, { nullable: true, description: '自定义显示的客户名称（脱敏后）' })
  customDisplayCustomerName?: string;

  @Field(() => String, { nullable: true, description: '自定义显示的金额（脱敏后）' })
  customDisplayAmount?: string;

  @Field(() => String, { nullable: true, description: '自定义显示的行业' })
  customDisplayIndustry?: string;

  // 内容生成选项
  @Field({ nullable: true, defaultValue: true, description: '是否生成挑战部分' })
  includeChallenges?: boolean;

  @Field({ nullable: true, defaultValue: true, description: '是否生成解决方案部分' })
  includeSolution?: boolean;

  @Field({ nullable: true, defaultValue: true, description: '是否生成成果部分' })
  includeResults?: boolean;

  @Field({ nullable: true, defaultValue: false, description: '是否生成客户评价部分' })
  includeTestimonial?: boolean;

  // 风格选项
  @Field(() => String, { nullable: true, defaultValue: 'professional', description: '写作风格：professional, casual, technical' })
  writingStyle?: string;

  // 标签
  @Field(() => [String], { nullable: true, defaultValue: [] })
  tags?: string[];
}

@InputType('RegenerateCaseStudyInput')
export class RegenerateCaseStudyInput {
  // 可以指定只重新生成部分内容
  @Field({ nullable: true, defaultValue: false })
  regenerateChallenges?: boolean;

  @Field({ nullable: true, defaultValue: false })
  regenerateSolution?: boolean;

  @Field({ nullable: true, defaultValue: false })
  regenerateResults?: boolean;

  @Field({ nullable: true, defaultValue: false })
  regenerateTestimonial?: boolean;

  @Field({ nullable: true, defaultValue: true, description: '是否全部重新生成' })
  regenerateAll?: boolean;

  // 脱敏选项（重新生成时可调整）
  @Field({ nullable: true })
  desensitize?: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  desensitizeConfig?: any;

  // 自定义脱敏值
  @Field(() => String, { nullable: true })
  customDisplayCustomerName?: string;

  @Field(() => String, { nullable: true })
  customDisplayAmount?: string;

  @Field(() => String, { nullable: true })
  customDisplayIndustry?: string;

  // 风格选项
  @Field(() => String, { nullable: true })
  writingStyle?: string;
}
