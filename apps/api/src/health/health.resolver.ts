import { Resolver, Query, ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class HealthCheck {
  @Field(() => String)
  status!: string;

  @Field(() => String)
  timestamp!: string;

  @Field(() => String)
  version!: string;
}

@Resolver(() => HealthCheck)
export class HealthResolver {
  @Query(() => HealthCheck, { description: '健康检查' })
  health(): HealthCheck {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
