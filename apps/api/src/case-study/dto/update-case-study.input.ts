import { Field, InputType } from '@nestjs/graphql';
import { CaseStudyStatus } from '@prisma/client';
import { GraphQLJSONObject } from 'graphql-scalars';

@InputType('UpdateCaseStudyInput')
export class UpdateCaseStudyInput {
  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => String, { nullable: true })
  subtitle?: string;

  @Field(() => String, { nullable: true })
  summary?: string;

  @Field(() => String, { nullable: true })
  challenges?: string;

  @Field(() => String, { nullable: true })
  solution?: string;

  @Field(() => String, { nullable: true })
  results?: string;

  @Field(() => String, { nullable: true })
  testimonial?: string;

  @Field(() => String, { nullable: true })
  techStack?: string;

  @Field(() => String, { nullable: true })
  timeline?: string;

  @Field(() => String, { nullable: true })
  teamSize?: string;

  @Field(() => String, { nullable: true })
  fullMarkdown?: string;

  // 脱敏配置
  @Field({ nullable: true })
  isDesensitized?: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  desensitizeConfig?: any;

  @Field(() => String, { nullable: true })
  displayCustomerName?: string;

  @Field(() => String, { nullable: true })
  displayAmount?: string;

  @Field(() => String, { nullable: true })
  displayIndustry?: string;

  // 标签
  @Field(() => [String], { nullable: true })
  tags?: string[];
}

@InputType('UpdateCaseStudyStatusInput')
export class UpdateCaseStudyStatusInput {
  @Field(() => CaseStudyStatus)
  status!: CaseStudyStatus;
}
