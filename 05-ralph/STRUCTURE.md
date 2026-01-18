# STRUCTURE.md - 项目结构说明

## Nx Monorepo结构

```
i-clms/
├── apps/
│   ├── api/                     # NestJS后端应用
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── app.module.ts
│   │   │   │   └── app.resolver.ts
│   │   │   ├── modules/         # 功能模块
│   │   │   │   ├── contract/    # 合同模块
│   │   │   │   ├── customer/    # 客户模块
│   │   │   │   ├── auth/        # 认证模块
│   │   │   │   ├── finance/     # 财务模块
│   │   │   │   ├── delivery/    # 交付模块
│   │   │   │   ├── sales/       # 销售模块
│   │   │   │   ├── market/      # 市场模块
│   │   │   │   ├── legal/       # 法务模块
│   │   │   │   └── executive/   # 管理层模块
│   │   │   ├── engines/         # 智能引擎
│   │   │   │   ├── parser/      # 合同解析引擎
│   │   │   │   ├── tagger/      # 标签引擎
│   │   │   │   ├── risk/        # 风险引擎
│   │   │   │   └── insight/     # 洞察引擎
│   │   │   ├── common/          # 通用服务
│   │   │   │   ├── prisma/      # Prisma服务
│   │   │   │   ├── storage/     # 文件存储服务
│   │   │   │   └── notification/# 通知服务
│   │   │   └── main.ts
│   │   ├── test/                # 测试配置
│   │   └── project.json
│   │
│   ├── web/                     # React前端应用
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   └── routes.tsx
│   │   │   ├── pages/           # 页面组件
│   │   │   │   ├── contracts/
│   │   │   │   ├── customers/
│   │   │   │   ├── finance/
│   │   │   │   ├── delivery/
│   │   │   │   ├── sales/
│   │   │   │   ├── market/
│   │   │   │   ├── legal/
│   │   │   │   └── executive/
│   │   │   ├── components/      # 通用组件
│   │   │   │   ├── layout/
│   │   │   │   ├── forms/
│   │   │   │   └── charts/
│   │   │   ├── hooks/           # 自定义Hooks
│   │   │   ├── graphql/         # GraphQL查询/变更
│   │   │   │   ├── queries/
│   │   │   │   └── mutations/
│   │   │   ├── recoil/          # Recoil状态
│   │   │   │   ├── atoms/
│   │   │   │   └── selectors/
│   │   │   ├── utils/           # 工具函数
│   │   │   └── main.tsx
│   │   └── project.json
│   │
│   └── web-e2e/                 # E2E测试
│       ├── src/
│       │   └── e2e/
│       └── project.json
│
├── libs/
│   ├── shared/                  # 前后端共享
│   │   ├── types/               # TypeScript类型定义
│   │   │   ├── contract.ts
│   │   │   ├── customer.ts
│   │   │   └── index.ts
│   │   ├── utils/               # 工具函数
│   │   │   ├── format.ts
│   │   │   └── validate.ts
│   │   └── constants/           # 常量定义
│   │       ├── contract-types.ts
│   │       └── status.ts
│   │
│   ├── ui/                      # UI组件库
│   │   ├── src/
│   │   │   ├── button/
│   │   │   ├── table/
│   │   │   └── chart/
│   │   └── project.json
│   │
│   └── graphql-schema/          # GraphQL Schema定义
│       ├── src/
│       │   ├── contract.graphql
│       │   ├── customer.graphql
│       │   └── schema.graphql
│       └── project.json
│
├── prisma/
│   ├── schema.prisma            # 数据库Schema
│   ├── migrations/              # 数据库迁移
│   └── seed.ts                  # 种子数据
│
├── docker/
│   ├── docker-compose.yml       # 开发环境
│   └── docker-compose.prod.yml  # 生产环境
│
├── 01-discovery/                # Phase 1: 想法捕获
├── 02-requirements/             # Phase 2-3: 需求文档
├── 03-specs/                    # Phase 4: 技术规格
├── 05-ralph/                    # Phase 5: Ralph执行
├── 06-delivery/                 # Phase 6: 验收交付
│
├── nx.json                      # Nx配置
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json           # TypeScript基础配置
└── CLAUDE.md                    # 开发指南
```

---

## 模块结构详解

### 后端模块 (NestJS)
每个功能模块遵循以下结构：
```
modules/contract/
├── contract.module.ts           # 模块定义
├── contract.resolver.ts         # GraphQL解析器
├── contract.service.ts          # 业务逻辑
├── dto/
│   ├── create-contract.input.ts # 创建输入
│   ├── update-contract.input.ts # 更新输入
│   ├── contract.type.ts         # 输出类型
│   └── contract-filter.input.ts # 查询过滤
├── entities/
│   └── contract.entity.ts       # Prisma实体映射
└── __tests__/
    └── contract.service.spec.ts # 单元测试
```

### 前端页面 (React)
每个页面遵循以下结构：
```
pages/contracts/
├── index.tsx                    # 列表页
├── [id].tsx                     # 详情页
├── create.tsx                   # 创建页
├── components/                  # 页面专用组件
│   ├── ContractTable.tsx
│   ├── ContractForm.tsx
│   └── ContractStatusBadge.tsx
└── hooks/
    └── useContracts.ts          # 页面专用Hook
```

---

## 数据流

```
┌─────────────┐     GraphQL      ┌─────────────┐
│   React     │ ◄──────────────► │   NestJS    │
│   + Apollo  │                  │   + Apollo  │
│   + Recoil  │                  │   Server    │
└─────────────┘                  └─────────────┘
                                       │
                                       │ Prisma
                                       ▼
                                ┌─────────────┐
                                │ PostgreSQL  │
                                └─────────────┘
                                       │
                                       │
                                ┌─────────────┐
                                │   MinIO     │
                                │  (文件存储)  │
                                └─────────────┘
```

---

## 关键依赖关系

```
apps/web ──────► libs/ui
    │           libs/shared
    └─────────► libs/graphql-schema (types)

apps/api ──────► libs/shared
    └─────────► libs/graphql-schema (schema)
```

---

## 配置文件

| 文件 | 用途 |
|------|------|
| `nx.json` | Nx工作区配置 |
| `tsconfig.base.json` | TypeScript基础配置 |
| `apps/api/project.json` | 后端项目配置 |
| `apps/web/project.json` | 前端项目配置 |
| `prisma/schema.prisma` | 数据库模型定义 |
| `.env` | 环境变量（不提交） |
| `.env.example` | 环境变量示例 |
