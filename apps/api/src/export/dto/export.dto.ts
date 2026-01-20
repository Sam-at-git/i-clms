import { ObjectType, Field, Int } from '@nestjs/graphql';
import { registerEnumType } from '@nestjs/graphql';

export enum ExportFormat {
  EXCEL = 'EXCEL',
  PDF = 'PDF',
  CSV = 'CSV',
}

registerEnumType(ExportFormat, {
  name: 'ExportFormat',
  description: '导出文件格式',
});

export enum ExportEntityType {
  CONTRACTS = 'CONTRACTS',
  CUSTOMERS = 'CUSTOMERS',
  FINANCIAL = 'FINANCIAL',
  MILESTONES = 'MILESTONES',
}

registerEnumType(ExportEntityType, {
  name: 'ExportEntityType',
  description: '导出实体类型',
});

@ObjectType()
export class ExportResult {
  @Field(() => String)
  downloadUrl!: string;

  @Field(() => String)
  fileName!: string;

  @Field(() => Int)
  fileSize!: number;

  @Field(() => String)
  format!: string;

  @Field(() => Int)
  recordCount!: number;

  @Field(() => Date)
  generatedAt!: Date;
}

@ObjectType()
export class ExportOptions {
  @Field(() => ExportFormat, { nullable: true })
  format?: ExportFormat;

  @Field(() => String, { nullable: true })
  title?: string;

  @Field(() => Boolean, { nullable: true })
  includeHeaders?: boolean;

  @Field(() => [String], { nullable: true })
  columns?: string[];
}

@ObjectType()
export class ExportTask {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  entityType!: string;

  @Field(() => String)
  format!: string;

  @Field(() => String)
  status!: string;

  @Field(() => Int, { nullable: true })
  progress?: number;

  @Field(() => String, { nullable: true })
  downloadUrl?: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  completedAt?: Date;
}
