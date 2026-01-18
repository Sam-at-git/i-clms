# 06-contract-crud.md

## 概述
实现合同核心CRUD操作，包括后端GraphQL API和前端列表/详情页面。

## 依赖
- 02-database-schema.md (Prisma Schema)
- 03-graphql-foundation.md (GraphQL基础设施)
- 04-file-storage.md (文件存储)
- 05-contract-parser-basic.md (文档解析)

## 目录结构
```
apps/api/src/
├── contract/
│   ├── index.ts
│   ├── contract.module.ts
│   ├── contract.service.ts
│   ├── contract.resolver.ts
│   ├── models/
│   │   ├── index.ts
│   │   ├── contract.model.ts
│   │   ├── customer.model.ts
│   │   └── pagination.model.ts
│   └── dto/
│       ├── index.ts
│       ├── create-contract.input.ts
│       ├── update-contract.input.ts
│       └── contract-filter.input.ts

apps/web/src/
├── pages/
│   ├── contracts/
│   │   ├── index.tsx          # 合同列表页
│   │   └── [id].tsx           # 合同详情页
├── components/
│   └── contracts/
│       ├── ContractList.tsx
│       ├── ContractCard.tsx
│       ├── ContractDetail.tsx
│       └── ContractFilter.tsx
└── graphql/
    └── contracts.graphql      # GraphQL查询定义
```

## 实现内容

### 1. GraphQL Types (Code-First)

#### Contract Model
```typescript
@ObjectType()
export class Contract {
  @Field(() => ID)
  id: string;

  @Field()
  contractNo: string;

  @Field()
  name: string;

  @Field(() => ContractType)
  type: ContractType;

  @Field(() => ContractStatus)
  status: ContractStatus;

  @Field()
  ourEntity: string;

  @Field(() => Customer)
  customer: Customer;

  @Field(() => GraphQLDecimal)
  amountWithTax: Decimal;

  @Field({ nullable: true })
  signedAt?: Date;

  // ... 其他字段
}
```

#### Pagination
```typescript
@ObjectType()
export class ContractConnection {
  @Field(() => [Contract])
  nodes: Contract[];

  @Field(() => Int)
  totalCount: number;

  @Field()
  hasNextPage: boolean;
}
```

### 2. GraphQL Operations

```graphql
type Query {
  # 获取合同列表（分页）
  contracts(
    filter: ContractFilterInput
    skip: Int
    take: Int
    orderBy: ContractOrderInput
  ): ContractConnection!

  # 获取单个合同详情
  contract(id: ID!): Contract

  # 按编号查找合同
  contractByNo(contractNo: String!): Contract
}

type Mutation {
  # 创建合同（上传后自动解析）
  createContract(input: CreateContractInput!): Contract!

  # 更新合同
  updateContract(id: ID!, input: UpdateContractInput!): Contract!

  # 删除合同
  deleteContract(id: ID!): Boolean!

  # 触发重新解析
  reprocessContract(id: ID!): Contract!
}
```

### 3. Contract Service
- CRUD操作
- 分页查询
- 过滤/排序
- 与Parser集成

### 4. 前端页面

#### 合同列表页
- 表格展示合同列表
- 分页控件
- 筛选器（类型/状态/日期）
- 搜索框
- 新增合同按钮

#### 合同详情页
- 基本信息展示
- 类型特定详情Tab
- 文件预览/下载
- 编辑/删除操作

## 验收标准

### AC-01: GraphQL类型定义
- [ ] Contract ObjectType完整
- [ ] Customer ObjectType完整
- [ ] 枚举类型注册
- [ ] 分页类型定义

### AC-02: Query实现
- [ ] contracts列表查询
- [ ] contract详情查询
- [ ] contractByNo查询
- [ ] 分页正常工作
- [ ] 过滤正常工作

### AC-03: Mutation实现
- [ ] createContract正常
- [ ] updateContract正常
- [ ] deleteContract正常

### AC-04: 前端列表页
- [ ] 合同列表展示
- [ ] 分页功能
- [ ] 基础筛选

### AC-05: 前端详情页
- [ ] 合同详情展示
- [ ] 编辑功能入口

### AC-06: 背压检查
- [ ] pnpm nx affected -t lint 通过
- [ ] pnpm nx affected -t build 通过

## 注意事项
1. 使用Code-First方式定义GraphQL Schema
2. Decimal类型使用自定义标量
3. 日期使用DateTime标量
4. 前端使用Apollo Client + codegen生成的hooks
5. 列表页暂不实现完整筛选，仅基础展示

## 预估工作量
- 代码量: ~800行
- 新文件: 15个
- 修改文件: 3个
