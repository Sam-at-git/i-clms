# 03-graphql-foundation.md - GraphQL基础设施

**优先级**: P0
**预估代码量**: ~500行
**依赖**: 02-database-schema.md

---

## 1. 功能描述

建立i-CLMS系统的GraphQL基础设施，包括后端Apollo Server配置、前端Apollo Client配置、基础Schema定义和代码生成器配置，为后续业务模块开发奠定基础。

---

## 2. 具体任务

### 2.1 安装后端依赖 (NestJS)

```bash
# GraphQL + Apollo Server
pnpm add @nestjs/graphql @nestjs/apollo @apollo/server graphql

# 日期处理
pnpm add graphql-scalars
```

### 2.2 安装前端依赖 (React)

```bash
# Apollo Client
pnpm add @apollo/client graphql --filter web
```

### 2.3 安装代码生成器依赖

```bash
# GraphQL Codegen
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo @graphql-codegen/introspection -w
```

### 2.4 配置Apollo Server (NestJS)

更新 `apps/api/src/app/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma';

@Module({
  imports: [
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/api/src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req, res }) => ({ req, res }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 2.5 创建GraphQL标量类型

创建 `apps/api/src/common/scalars/date.scalar.ts`：

```typescript
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('DateTime', () => Date)
export class DateTimeScalar implements CustomScalar<string, Date> {
  description = 'DateTime custom scalar type';

  parseValue(value: string): Date {
    return new Date(value);
  }

  serialize(value: Date): string {
    return value.toISOString();
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
}
```

创建 `apps/api/src/common/scalars/decimal.scalar.ts`：

```typescript
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { Decimal } from '@prisma/client/runtime/library';

@Scalar('Decimal', () => String)
export class DecimalScalar implements CustomScalar<string, Decimal> {
  description = 'Decimal custom scalar type';

  parseValue(value: string): Decimal {
    return new Decimal(value);
  }

  serialize(value: Decimal): string {
    return value.toString();
  }

  parseLiteral(ast: ValueNode): Decimal {
    if (ast.kind === Kind.STRING || ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return new Decimal(ast.kind === Kind.STRING ? ast.value : String(ast.value));
    }
    return null;
  }
}
```

创建 `apps/api/src/common/scalars/index.ts`：

```typescript
export * from './date.scalar';
export * from './decimal.scalar';
```

创建 `apps/api/src/common/index.ts`：

```typescript
export * from './scalars';
```

### 2.6 创建基础GraphQL类型定义

创建 `apps/api/src/graphql/types/enums.ts`：

```typescript
import { registerEnumType } from '@nestjs/graphql';

// 用户角色
export enum UserRole {
  USER = 'USER',
  DEPT_ADMIN = 'DEPT_ADMIN',
  ADMIN = 'ADMIN',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: '用户角色',
});

// 部门代码
export enum DepartmentCode {
  FINANCE = 'FINANCE',
  DELIVERY = 'DELIVERY',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  LEGAL = 'LEGAL',
  EXECUTIVE = 'EXECUTIVE',
}

registerEnumType(DepartmentCode, {
  name: 'DepartmentCode',
  description: '部门代码',
});

// 合同类型
export enum ContractType {
  STAFF_AUGMENTATION = 'STAFF_AUGMENTATION',
  PROJECT_OUTSOURCING = 'PROJECT_OUTSOURCING',
  PRODUCT_SALES = 'PRODUCT_SALES',
}

registerEnumType(ContractType, {
  name: 'ContractType',
  description: '合同类型',
});

// 合同状态
export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED',
  EXPIRED = 'EXPIRED',
}

registerEnumType(ContractStatus, {
  name: 'ContractStatus',
  description: '合同状态',
});

// 解析状态
export enum ParseStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

registerEnumType(ParseStatus, {
  name: 'ParseStatus',
  description: '解析状态',
});

// 费率类型
export enum RateType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

registerEnumType(RateType, {
  name: 'RateType',
  description: '费率类型',
});

// 里程碑状态
export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DELIVERED = 'DELIVERED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

registerEnumType(MilestoneStatus, {
  name: 'MilestoneStatus',
  description: '里程碑状态',
});
```

创建 `apps/api/src/graphql/types/index.ts`：

```typescript
export * from './enums';
```

创建 `apps/api/src/graphql/index.ts`：

```typescript
export * from './types';
```

### 2.7 创建健康检查Resolver（用于测试）

创建 `apps/api/src/health/health.resolver.ts`：

```typescript
import { Resolver, Query } from '@nestjs/graphql';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class HealthCheck {
  @Field()
  status: string;

  @Field()
  timestamp: string;

  @Field()
  version: string;
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
```

创建 `apps/api/src/health/health.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { HealthResolver } from './health.resolver';

@Module({
  providers: [HealthResolver],
})
export class HealthModule {}
```

创建 `apps/api/src/health/index.ts`：

```typescript
export * from './health.module';
export * from './health.resolver';
```

### 2.8 更新AppModule导入

更新 `apps/api/src/app/app.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma';
import { HealthModule } from '../health';
import { DateTimeScalar, DecimalScalar } from '../common/scalars';

@Module({
  imports: [
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'apps/api/src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
      context: ({ req, res }) => ({ req, res }),
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, DateTimeScalar, DecimalScalar],
})
export class AppModule {}
```

### 2.9 配置Apollo Client (React)

创建 `apps/web/src/lib/apollo/client.ts`：

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql',
  credentials: 'include',
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
```

创建 `apps/web/src/lib/apollo/index.ts`：

```typescript
export * from './client';
```

创建 `apps/web/src/lib/index.ts`：

```typescript
export * from './apollo';
```

### 2.10 更新React App入口

更新 `apps/web/src/main.tsx`：

```typescript
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apollo';
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </StrictMode>
);
```

### 2.11 配置GraphQL Codegen

创建 `codegen.ts`（项目根目录）：

```typescript
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'apps/api/src/schema.gql',
  documents: ['apps/web/src/**/*.graphql', 'apps/web/src/**/*.tsx'],
  generates: {
    'libs/shared/src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
        scalars: {
          DateTime: 'string',
          Decimal: 'string',
        },
      },
    },
    'libs/shared/src/generated/schema.json': {
      plugins: ['introspection'],
    },
  },
  ignoreNoDocuments: true,
};

export default config;
```

创建 `libs/shared/src/generated/.gitkeep`（空文件占位）。

更新 `package.json` 添加codegen脚本：

```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  }
}
```

### 2.12 创建示例GraphQL查询文件

创建 `apps/web/src/graphql/health.graphql`：

```graphql
query Health {
  health {
    status
    timestamp
    version
  }
}
```

创建 `apps/web/src/graphql/index.ts`：

```typescript
// GraphQL queries, mutations, and subscriptions
// Auto-generated types will be in libs/shared/src/generated/graphql.ts
export {};
```

### 2.13 更新环境变量配置

创建/更新 `apps/web/.env.example`：

```env
VITE_GRAPHQL_URL=http://localhost:3000/graphql
```

创建 `apps/web/.env`（开发环境）：

```env
VITE_GRAPHQL_URL=http://localhost:3000/graphql
```

---

## 3. 输入/输出

### 输入
- 已配置的NestJS应用（apps/api）
- 已配置的React应用（apps/web）
- Prisma数据库模型

### 输出
```
apps/api/src/
├── app/
│   └── app.module.ts          # 更新：导入GraphQL模块
├── common/
│   ├── scalars/
│   │   ├── date.scalar.ts     # DateTime标量
│   │   ├── decimal.scalar.ts  # Decimal标量
│   │   └── index.ts
│   └── index.ts
├── graphql/
│   ├── types/
│   │   ├── enums.ts           # 枚举类型
│   │   └── index.ts
│   └── index.ts
├── health/
│   ├── health.resolver.ts     # 健康检查Resolver
│   ├── health.module.ts       # 健康检查模块
│   └── index.ts
└── schema.gql                 # 自动生成的Schema

apps/web/src/
├── lib/
│   ├── apollo/
│   │   ├── client.ts          # Apollo Client配置
│   │   └── index.ts
│   └── index.ts
├── graphql/
│   ├── health.graphql         # 示例查询
│   └── index.ts
├── main.tsx                   # 更新：ApolloProvider
└── .env                       # 环境变量

libs/shared/src/
├── generated/
│   ├── graphql.ts             # 生成的类型和hooks
│   ├── schema.json            # Schema introspection
│   └── .gitkeep
└── index.ts                   # 更新导出

codegen.ts                     # GraphQL Codegen配置
```

---

## 4. 验收标准

### AC-01: GraphQL依赖安装成功
- [ ] `pnpm list @nestjs/graphql @nestjs/apollo` 显示已安装
- [ ] `pnpm list @apollo/client --filter web` 显示已安装
- [ ] `pnpm list @graphql-codegen/cli` 显示已安装

### AC-02: Apollo Server配置正确
- [ ] `apps/api/src/app/app.module.ts` 包含GraphQLModule配置
- [ ] 应用启动后自动生成 `apps/api/src/schema.gql`
- [ ] GraphQL Playground可访问（http://localhost:3000/graphql）

### AC-03: 标量类型工作正常
- [ ] DateTime标量正确序列化/反序列化日期
- [ ] Decimal标量正确处理金额

### AC-04: 枚举类型定义完整
- [ ] 所有Prisma枚举在GraphQL中有对应定义
- [ ] 枚举在schema.gql中正确生成

### AC-05: 健康检查Resolver工作正常
- [ ] `health` 查询返回正确响应
- [ ] GraphQL Playground中可执行查询

### AC-06: Apollo Client配置正确
- [ ] `apps/web/src/lib/apollo/client.ts` 存在且配置正确
- [ ] `apps/web/src/main.tsx` 使用ApolloProvider包装
- [ ] 前端能连接后端GraphQL端点

### AC-07: Codegen配置正确
- [ ] `codegen.ts` 存在且配置正确
- [ ] 运行 `pnpm codegen` 生成类型文件
- [ ] 生成的类型可以在项目中导入使用

### AC-08: 背压检查通过
- [ ] 运行 `pnpm nx affected -t lint` 通过
- [ ] 运行 `pnpm nx affected -t test` 通过
- [ ] 运行 `pnpm nx affected -t build` 通过

---

## 5. 技术约束

- NestJS GraphQL使用code-first方式
- Apollo Server 4.x（通过@nestjs/apollo）
- Apollo Client 3.x
- GraphQL Codegen 5.x
- 所有金额使用Decimal标量
- 所有日期使用DateTime标量

---

## 6. 注意事项

1. **不要**创建完整的业务Resolver（在后续spec中处理）
2. **不要**实现认证/授权逻辑（在07-auth-rbac中处理）
3. 确保schema.gql自动生成且不需手动维护
4. Apollo Client配置要支持credentials（为后续认证准备）
5. Codegen配置要生成React hooks以简化前端开发
6. 环境变量使用VITE_前缀（Vite要求）

---

## 7. 完成信号

当所有验收标准（AC-01到AC-08）全部满足时，输出：
```
<promise>COMPLETE</promise>
```

如果遇到阻塞问题，记录到 `05-ralph/BLOCKED.log` 并输出：
```
<promise>BLOCKED: [问题描述]</promise>
```
