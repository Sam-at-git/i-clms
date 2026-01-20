import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ProductLineItem {
  @Field(() => ID)
  id!: string;

  @Field()
  productName!: string;

  @Field(() => String, { nullable: true })
  specification?: string | null;

  @Field()
  quantity!: number;

  @Field()
  unit!: string;

  @Field()
  unitPriceWithTax!: string; // Decimal as string

  @Field(() => String, { nullable: true })
  unitPriceWithoutTax?: string | null;

  @Field()
  subtotal!: string; // Decimal as string
}

@ObjectType()
export class ProductSalesDetail {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  deliveryContent?: string | null;

  @Field(() => Date, { nullable: true })
  deliveryDate?: Date | null;

  @Field(() => String, { nullable: true })
  deliveryLocation?: string | null;

  @Field(() => String, { nullable: true })
  shippingResponsibility?: string | null;

  @Field(() => String, { nullable: true })
  ipOwnership?: string | null;

  @Field(() => String, { nullable: true })
  warrantyPeriod?: string | null;

  @Field(() => String, { nullable: true })
  afterSalesTerms?: string | null;

  @Field(() => [ProductLineItem])
  lineItems!: ProductLineItem[];
}
