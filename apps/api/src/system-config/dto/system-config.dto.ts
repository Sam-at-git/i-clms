import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';

@ObjectType()
export class SystemConfig {
  @Field(() => String)
  llmProvider!: string;

  @Field(() => String)
  llmModel!: string;

  @Field(() => Boolean)
  smtpEnabled!: boolean;

  @Field(() => String, { nullable: true })
  smtpHost?: string;

  @Field(() => Int, { nullable: true })
  smtpPort?: number;

  @Field(() => String, { nullable: true })
  smtpUser?: string;

  @Field(() => Boolean, { nullable: true })
  smtpSecure?: boolean;

  @Field(() => String, { nullable: true })
  minioEndpoint?: string;

  @Field(() => Int, { nullable: true })
  minioPort?: number;

  @Field(() => String, { nullable: true })
  minioBucket?: string;
}

@InputType()
export class UpdateSystemConfigInput {
  @Field(() => String, { nullable: true })
  llmProvider?: string;

  @Field(() => String, { nullable: true })
  llmModel?: string;

  @Field(() => Boolean, { nullable: true })
  smtpEnabled?: boolean;

  @Field(() => String, { nullable: true })
  smtpHost?: string;

  @Field(() => Int, { nullable: true })
  smtpPort?: number;

  @Field(() => String, { nullable: true })
  smtpPassword?: string;

  @Field(() => Boolean, { nullable: true })
  smtpSecure?: boolean;

  @Field(() => String, { nullable: true })
  minioEndpoint?: string;

  @Field(() => Int, { nullable: true })
  minioPort?: number;

  @Field(() => String, { nullable: true })
  minioBucket?: string;
}

@ObjectType()
export class SystemHealth {
  @Field(() => Boolean)
  api!: boolean;

  @Field(() => Boolean)
  database!: boolean;

  @Field(() => Boolean)
  storage!: boolean;

  @Field(() => Int)
  uptime!: number;

  @Field(() => String)
  version!: string;

  @Field(() => String)
  timestamp!: string;

  @Field(() => String, { nullable: true })
  databaseStatus?: string;

  @Field(() => String, { nullable: true })
  storageStatus?: string;
}

@ObjectType()
export class NotificationResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String, { nullable: true })
  message?: string;

  @Field(() => String, { nullable: true })
  messageId?: string;
}

@InputType()
export class SendNotificationInput {
  @Field(() => String)
  to!: string;

  @Field(() => String)
  subject!: string;

  @Field(() => String)
  content!: string;

  @Field(() => String, { nullable: true })
  type?: string;
}
