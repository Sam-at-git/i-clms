import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class FileUploadResult {
  @Field(() => String)
  objectName!: string;

  @Field(() => String)
  originalName!: string;

  @Field(() => String)
  mimeType!: string;

  @Field(() => Int)
  size!: number;

  @Field(() => String)
  url!: string;
}

@ObjectType()
export class PresignedUrl {
  @Field(() => String)
  url!: string;

  @Field(() => String)
  objectName!: string;

  @Field(() => Int)
  expiresIn!: number;
}
