import { Field, ObjectType, InputType, Int, Float, registerEnumType } from '@nestjs/graphql';
import { CaseStudyStatus } from '@prisma/client';
import { GraphQLJSONObject } from 'graphql-scalars';

// Register CaseStudyStatus enum with GraphQL
registerEnumType(CaseStudyStatus, {
  name: 'CaseStudyStatus',
  description: '案例状态',
});

@ObjectType('GeneratedCaseStudy')
export class CaseStudyEntity {
  @Field()
  id!: string;

  @Field()
  contractId!: string;

  @Field()
  title!: string;

  @Field(() => String, { nullable: true })
  subtitle?: string | null;

  @Field(() => CaseStudyStatus)
  status!: CaseStudyStatus;

  @Field()
  summary!: string;

  @Field(() => String, { nullable: true })
  challenges?: string | null;

  @Field(() => String, { nullable: true })
  solution?: string | null;

  @Field(() => String, { nullable: true })
  results?: string | null;

  @Field(() => String, { nullable: true })
  testimonial?: string | null;

  @Field(() => String, { nullable: true })
  techStack?: string | null;

  @Field(() => String, { nullable: true })
  timeline?: string | null;

  @Field(() => String, { nullable: true })
  teamSize?: string | null;

  @Field()
  fullMarkdown!: string;

  // 脱敏配置
  @Field()
  isDesensitized!: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  desensitizeConfig?: any;

  @Field(() => String, { nullable: true })
  displayCustomerName?: string | null;

  @Field(() => String, { nullable: true })
  displayAmount?: string | null;

  @Field(() => String, { nullable: true })
  displayIndustry?: string | null;

  // LLM元数据
  @Field(() => String, { nullable: true })
  llmModel?: string | null;

  @Field(() => String, { nullable: true })
  llmProvider?: string | null;

  @Field(() => Date, { nullable: true })
  generatedAt?: Date | null;

  @Field(() => Float, { nullable: true })
  confidence?: number | null;

  // 编辑信息
  @Field()
  isManuallyEdited!: boolean;

  @Field(() => Date, { nullable: true })
  lastEditedAt?: Date | null;

  @Field(() => String, { nullable: true })
  lastEditedBy?: string | null;

  // 版本和标签
  @Field(() => Int)
  version!: number;

  @Field(() => [String])
  tags!: string[];

  // 创建者
  @Field()
  createdById!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  // 关联对象（可选）
  @Field(() => CaseStudyContract, { nullable: true, description: '关联合同' })
  contract?: any;

  @Field(() => CaseStudyUser, { nullable: true, description: '创建者' })
  createdBy?: any;
}

@ObjectType('GeneratedCaseStudyContract')
export class CaseStudyContract {
  @Field()
  id!: string;

  @Field()
  contractNo!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field()
  ourEntity!: string;
}

@ObjectType('GeneratedCaseStudyUser')
export class CaseStudyUser {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;
}

@ObjectType('GeneratedCaseStudiesResponse')
export class CaseStudiesResponse {
  @Field(() => [CaseStudyEntity])
  items!: CaseStudyEntity[];

  @Field(() => Int)
  total!: number;
}

@ObjectType('GeneratedCaseStudyResult')
export class CaseStudyGenerateResult {
  @Field()
  success!: boolean;

  @Field(() => CaseStudyEntity, { nullable: true })
  caseStudy?: CaseStudyEntity;

  @Field(() => String, { nullable: true })
  error?: string | null;
}
