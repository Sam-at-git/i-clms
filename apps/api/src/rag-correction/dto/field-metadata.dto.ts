import { ObjectType, Field, Float } from '@nestjs/graphql';

/**
 * 字段元数据DTO - 用于GraphQL API
 */
@ObjectType()
export class FieldMetadataDto {
  @Field()
  fieldName!: string;

  @Field()
  displayName!: string;

  @Field()
  fieldType!: string;

  @Field()
  group!: string;

  @Field()
  editable!: boolean;

  @Field()
  ragSupported!: boolean;

  @Field({ nullable: true })
  ragQuery?: string;

  @Field(() => Float, { nullable: true })
  conservativeThreshold?: number;
}
