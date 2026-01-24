import { Field, ObjectType, InputType, Int } from '@nestjs/graphql';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { GraphQLJSONObject } from 'graphql-scalars';
import { UserDto } from '../../user/dto/user.dto';

@ObjectType('Notification')
export class Notification {
  @Field()
  id!: string;

  @Field(() => NotificationType)
  type!: NotificationType;

  @Field(() => NotificationPriority)
  priority!: NotificationPriority;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field(() => String, { nullable: true })
  link?: string | null;

  @Field()
  userId!: string;

  @Field()
  inApp!: boolean;

  @Field()
  email!: boolean;

  @Field()
  sms!: boolean;

  @Field(() => Date, { nullable: true })
  readAt?: Date | null;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: any;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => UserDto, { nullable: true })
  user?: any;
}

@ObjectType('NotificationPreference')
export class NotificationPreference {
  @Field()
  id!: string;

  @Field()
  userId!: string;

  @Field()
  enableInApp!: boolean;

  @Field()
  enableEmail!: boolean;

  @Field()
  enableSms!: boolean;

  @Field()
  contractExpiry!: boolean;

  @Field()
  paymentOverdue!: boolean;

  @Field()
  contractApproval!: boolean;

  @Field()
  milestoneDue!: boolean;

  @Field()
  riskAlert!: boolean;

  @Field()
  systemAnnouncement!: boolean;

  @Field()
  mention!: boolean;

  @Field()
  taskAssigned!: boolean;

  @Field()
  documentShared!: boolean;

  @Field(() => String, { nullable: true })
  quietHoursStart?: string | null;

  @Field(() => String, { nullable: true })
  quietHoursEnd?: string | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType('NotificationsResponse')
export class NotificationsResponse {
  @Field(() => [Notification])
  items!: Notification[];

  @Field(() => Int)
  total!: number;
}

@InputType('CreateNotificationInput')
export class CreateNotificationInput {
  @Field(() => NotificationType)
  type!: NotificationType;

  @Field(() => NotificationPriority, { nullable: true })
  priority?: NotificationPriority;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field(() => String, { nullable: true })
  link?: string;

  @Field()
  userId!: string;

  @Field({ nullable: true })
  inApp?: boolean;

  @Field({ nullable: true })
  email?: boolean;

  @Field({ nullable: true })
  sms?: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: any;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}

@InputType('CreateBulkNotificationsInput')
export class CreateBulkNotificationsInput {
  @Field(() => NotificationType)
  type!: NotificationType;

  @Field(() => NotificationPriority, { nullable: true })
  priority?: NotificationPriority;

  @Field()
  title!: string;

  @Field()
  message!: string;

  @Field(() => String, { nullable: true })
  link?: string;

  @Field(() => [String])
  userIds!: string[];

  @Field({ nullable: true })
  inApp?: boolean;

  @Field({ nullable: true })
  email?: boolean;

  @Field({ nullable: true })
  sms?: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  metadata?: any;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}

@InputType('UpdateNotificationPreferencesInput')
export class UpdateNotificationPreferencesInput {
  @Field({ nullable: true })
  enableInApp?: boolean;

  @Field({ nullable: true })
  enableEmail?: boolean;

  @Field({ nullable: true })
  enableSms?: boolean;

  @Field({ nullable: true })
  contractExpiry?: boolean;

  @Field({ nullable: true })
  paymentOverdue?: boolean;

  @Field({ nullable: true })
  contractApproval?: boolean;

  @Field({ nullable: true })
  milestoneDue?: boolean;

  @Field({ nullable: true })
  riskAlert?: boolean;

  @Field({ nullable: true })
  systemAnnouncement?: boolean;

  @Field({ nullable: true })
  mention?: boolean;

  @Field({ nullable: true })
  taskAssigned?: boolean;

  @Field({ nullable: true })
  documentShared?: boolean;

  @Field(() => String, { nullable: true })
  quietHoursStart?: string;

  @Field(() => String, { nullable: true })
  quietHoursEnd?: string;
}

@ObjectType('SuccessResponse')
export class SuccessResponse {
  @Field()
  success!: boolean;
}
