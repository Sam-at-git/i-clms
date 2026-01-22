import { ObjectType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';

/**
 * Docling Table
 */
@ObjectType({ description: 'Docling提取的表格信息' })
export class DoclingTable {
  @Field(() => String, { description: 'Markdown格式的表格内容' })
  markdown!: string;

  @Field(() => Int, { description: '行数' })
  rows!: number;

  @Field(() => Int, { description: '列数' })
  cols!: number;
}

/**
 * Docling Image
 */
@ObjectType({ description: 'Docling提取的图片信息' })
export class DoclingImage {
  @Field(() => Int, { description: '页码' })
  page!: number;

  @Field(() => Int, { description: '宽度' })
  width!: number;

  @Field(() => Int, { description: '高度' })
  height!: number;
}

/**
 * Docling Convert Result
 */
@ObjectType({ description: 'Docling文档转换结果' })
export class DoclingConvertResult {
  @Field(() => String, { description: 'Markdown内容' })
  markdown!: string;

  @Field(() => [DoclingTable], { description: '提取的表格' })
  tables!: DoclingTable[];

  @Field(() => Int, { description: '页数' })
  pages!: number;

  @Field(() => [DoclingImage], { description: '提取的图片' })
  images!: DoclingImage[];

  @Field(() => Boolean, { description: '是否成功' })
  success!: boolean;

  @Field(() => String, { nullable: true, description: '错误信息' })
  error?: string;
}

/**
 * Docling Extract Result
 */
@ObjectType({ description: 'Docling字段提取结果' })
export class DoclingExtractResult {
  @Field(() => String, { description: 'JSON格式的字段数据' })
  fields!: string;

  @Field(() => Boolean, { description: '是否成功' })
  success!: boolean;

  @Field(() => String, { nullable: true, description: '错误信息' })
  error?: string;
}

/**
 * Docling Convert Options
 */
export enum DoclingOcrOption {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

registerEnumType(DoclingOcrOption, {
  name: 'DoclingOcrOption',
  description: 'Docling OCR选项'
});
