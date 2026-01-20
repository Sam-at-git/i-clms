import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { ContractType, ContractStatus, ParseStatus } from './enums';
import { Customer } from '../../customer/entities/customer.entity';
import { UserDto } from '../../user/dto/user.dto';
import { DepartmentDto } from '../../department/dto/department.dto';
import { StaffAugmentationDetail } from '../entities/staff-augmentation-detail.entity';
import { ProjectOutsourcingDetail } from '../entities/project-outsourcing-detail.entity';
import { ProductSalesDetail } from '../entities/product-sales-detail.entity';

@ObjectType()
export class Contract {
  @Field(() => ID)
  id!: string;

  @Field()
  contractNo!: string;

  @Field()
  name!: string;

  @Field(() => ContractType)
  type!: ContractType;

  @Field(() => ContractStatus)
  status!: ContractStatus;

  @Field()
  ourEntity!: string;

  @Field(() => Customer)
  customer!: Customer;

  @Field()
  amountWithTax!: string; // Decimal as string

  @Field(() => String, { nullable: true })
  amountWithoutTax?: string | null;

  @Field({ defaultValue: 'CNY' })
  currency!: string;

  @Field(() => String, { nullable: true })
  taxRate?: string | null;

  @Field(() => String, { nullable: true })
  taxAmount?: string | null;

  @Field(() => String, { nullable: true })
  paymentMethod?: string | null;

  @Field(() => String, { nullable: true })
  paymentTerms?: string | null;

  @Field(() => Date, { nullable: true })
  signedAt?: Date | null;

  @Field(() => Date, { nullable: true })
  effectiveAt?: Date | null;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date | null;

  @Field(() => String, { nullable: true })
  duration?: string | null;

  @Field(() => String, { nullable: true })
  fileUrl?: string | null;

  @Field(() => String, { nullable: true })
  fileType?: string | null;

  @Field(() => Int, { nullable: true })
  copies?: number | null;

  @Field(() => String, { nullable: true })
  signLocation?: string | null;

  @Field(() => String, { nullable: true })
  industry?: string | null;

  @Field(() => DepartmentDto)
  department!: DepartmentDto;

  @Field(() => String, { nullable: true })
  salesPerson?: string | null;

  @Field(() => ParseStatus)
  parseStatus!: ParseStatus;

  @Field(() => Date, { nullable: true })
  parsedAt?: Date | null;

  @Field(() => Float, { nullable: true })
  parseConfidence?: number | null;

  @Field()
  needsManualReview!: boolean;

  @Field(() => Contract, { nullable: true })
  parentContract?: Contract | null;

  @Field(() => [Contract])
  supplements!: Contract[];

  @Field(() => UserDto)
  uploadedBy!: UserDto;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  // Contract type-specific details
  @Field(() => StaffAugmentationDetail, { nullable: true })
  staffAugmentationDetail?: StaffAugmentationDetail | null;

  @Field(() => ProjectOutsourcingDetail, { nullable: true })
  projectOutsourcingDetail?: ProjectOutsourcingDetail | null;

  @Field(() => ProductSalesDetail, { nullable: true })
  productSalesDetail?: ProductSalesDetail | null;
}
