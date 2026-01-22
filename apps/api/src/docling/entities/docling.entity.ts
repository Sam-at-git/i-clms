import { Field, ObjectType, Int, InputType } from '@nestjs/graphql';

@ObjectType('DoclingTable')
export class DoclingTable {
  @Field(() => String)
  markdown!: string;

  @Field(() => Int)
  rows!: number;

  @Field(() => Int)
  cols!: number;
}

@ObjectType('DoclingImage')
export class DoclingImage {
  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  width!: number;

  @Field(() => Int)
  height!: number;
}

@ObjectType('DoclingConvertResult')
export class DoclingConvertResult {
  @Field(() => String)
  markdown!: string;

  @Field(() => [DoclingTable])
  tables!: DoclingTable[];

  @Field(() => Int)
  pages!: number;

  @Field(() => [DoclingImage])
  images!: DoclingImage[];

  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

@ObjectType('DoclingExtractResult')
export class DoclingExtractResult {
  @Field(() => String, { description: 'Extracted fields as JSON string' })
  fields!: string;

  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  error?: string;
}

@InputType()
export class DoclingConvertOptions {
  @Field(() => Boolean, { nullable: true })
  ocr?: boolean;

  @Field(() => Boolean, { nullable: true })
  withTables?: boolean;

  @Field(() => Boolean, { nullable: true })
  withImages?: boolean;
}
