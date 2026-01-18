import { ObjectType, Field, Float, Int, registerEnumType } from '@nestjs/graphql';

export enum OverdueLevel {
  LOW = 'LOW',           // 1-30天
  MEDIUM = 'MEDIUM',     // 31-60天
  HIGH = 'HIGH',         // 61-90天
  CRITICAL = 'CRITICAL', // 90天以上
}

registerEnumType(OverdueLevel, {
  name: 'OverdueLevel',
  description: '逾期等级',
});

@ObjectType()
export class OverdueAlert {
  @Field(() => String)
  contractId!: string;

  @Field(() => String)
  contractNo!: string;

  @Field(() => String)
  customerName!: string;

  @Field(() => Date)
  expectedDate!: Date;

  @Field(() => Int)
  daysOverdue!: number;

  @Field(() => Float)
  amount!: number;

  @Field(() => OverdueLevel)
  level!: OverdueLevel;
}
