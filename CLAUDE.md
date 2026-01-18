# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**智能合同全生命周期管理系统（i-CLMS）**

核心目标：**"一份合同签署，全流程数据就绪，全部门价值赋能"**

为财务、交付、业务、市场、法务、管理层6大部门提供智能合同数据服务。

---

## 工程流程：6阶段方法论

本项目采用完整的6阶段工程流程，从客户想法到交付验收。

```
Phase 1: 想法捕获     → 01-discovery/IDEA.md
Phase 2: 需求挖掘     → 02-requirements/PRD.md
Phase 3: 需求确认     → 02-requirements/PRD-SIGNED.md（待签署）
Phase 4: 技术拆解     → 03-specs/*.md
Phase 5: Ralph循环    → 05-ralph/（自动化执行）
Phase 6: 验收交付     → 06-delivery/
```

---

## 技术栈

```yaml
# Monorepo
构建系统: Nx
包管理: pnpm

# 后端
框架: NestJS 11
API: GraphQL (Apollo Server 5)
ORM: Prisma 7
数据库: PostgreSQL

# 前端
框架: React 19
构建: Vite
GraphQL: Apollo Client 4
状态: Recoil

# 测试
单元: Jest
E2E: Playwright

# 代码质量
Lint: ESLint + Prettier
类型: TypeScript 5.9 (strict mode)
```

---

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发
pnpm nx serve api          # 启动后端 (localhost:3000)
pnpm nx serve web          # 启动前端 (localhost:4200)
pnpm nx run-many -t serve  # 启动所有

# 测试
pnpm nx test api           # 后端全部测试
pnpm nx test web           # 前端全部测试
pnpm nx affected -t test   # 只测受影响的
pnpm nx test api -- --testPathPattern="contract" # 单个模块测试
pnpm nx test api -- --testNamePattern="should create" # 按测试名筛选

# E2E测试
pnpm nx e2e api-e2e        # 后端E2E
pnpm nx e2e web-e2e        # 前端E2E (Playwright)

# 代码质量
pnpm nx affected -t lint      # Lint
pnpm nx affected -t typecheck # 类型检查
pnpm nx affected -t build     # 构建

# 数据库
pnpm nx prisma:migrate api    # 运行迁移
pnpm nx prisma:generate api   # 生成Prisma Client
pnpm prisma db seed           # 填充初始数据

# GraphQL代码生成（前端hooks/types）
pnpm graphql-codegen          # 从schema.gql生成到libs/shared/src/generated/

# 基础设施
docker compose -f docker/docker-compose.yml up -d  # 启动PostgreSQL + MinIO

# 依赖图
pnpm nx graph
```

---

## 核心架构

### 后端模块结构 (apps/api/src/)

每个功能模块遵循 Service + Resolver 模式：
```
module/
├── module.module.ts   # NestJS模块定义，imports PrismaModule
├── module.service.ts  # 业务逻辑，注入PrismaService
├── module.resolver.ts # GraphQL入口，@Query/@Mutation装饰器
├── dto/               # Input types用于mutations
└── entities/          # GraphQL Object types (@ObjectType)
```

**16个功能模块**：auth, user, department, contract, finance, delivery, sales, market, legal, executive, tagging, audit, parser, storage, risk-engine, vector-search, analytics

**基础设施模块**：prisma (全局数据库), common (DateTime/Decimal/JSON标量), health, config

### 数据流

```
Frontend (.graphql文件) → codegen → 生成hooks到 @i-clms/shared
                                         ↓
Apollo Client ←──────────────────── useXxxQuery/useXxxMutation
     ↓
GraphQL请求 → NestJS Resolver → Service → Prisma → PostgreSQL
```

### 合同多态设计

Contract主表 + 三种类型特定详情表（1:1关系）：
- `StaffAugmentationDetail` + `StaffRateItem[]` → 人力框架（工时计费）
- `ProjectOutsourcingDetail` + `ProjectMilestone[]` → 项目外包（里程碑付款）
- `ProductSalesDetail` + `ProductLineItem[]` → 产品购销（商品销售）

### 共享库 (@i-clms/shared)

```
libs/shared/src/
├── types/index.ts       # 手写的TypeScript接口（ContractType, UserRole等枚举）
├── generated/graphql.ts # 自动生成的Apollo hooks和GraphQL类型
├── constants/           # 共享常量
└── utils/               # 工具函数
```

**重要**：修改GraphQL schema后必须运行 `pnpm graphql-codegen` 更新生成代码。

---

## 目录结构

```
i-clms/
├── apps/
│   ├── api/                # NestJS后端
│   │   └── src/schema.gql  # 自动生成的GraphQL Schema
│   ├── api-e2e/            # 后端E2E测试
│   ├── web/                # React前端
│   │   └── src/graphql/    # GraphQL查询定义文件
│   └── web-e2e/            # 前端E2E测试 (Playwright)
├── libs/shared/            # 共享类型和生成代码
├── prisma/schema.prisma    # 数据库Schema
├── codegen.ts              # GraphQL代码生成配置
├── 01-discovery/           # Phase 1: 想法捕获
├── 02-requirements/        # Phase 2-3: 需求文档
├── 03-specs/               # Phase 4: 技术规格
├── 05-ralph/               # Phase 5: Ralph执行
└── 06-delivery/            # Phase 6: 验收交付
```

---

## 开发工作流

### 添加新后端功能

1. **数据库变更**（如需要）：修改 `prisma/schema.prisma`，运行 `pnpm nx prisma:migrate api`
2. **创建模块**：在 `apps/api/src/` 下创建目录，包含 module/service/resolver
3. **注册模块**：在 `apps/api/src/app/app.module.ts` 的 imports 数组中添加
4. **GraphQL Schema会自动生成**：启动服务后 `apps/api/src/schema.gql` 自动更新
5. **前端类型生成**：运行 `pnpm graphql-codegen` 更新 `@i-clms/shared`

### 添加新前端功能

1. **定义GraphQL操作**：在 `apps/web/src/graphql/` 创建 `.graphql` 文件
2. **生成hooks**：运行 `pnpm graphql-codegen`
3. **使用生成的hooks**：从 `@i-clms/shared` 导入 `useXxxQuery` / `useXxxMutation`

---

## Ralph循环工作流

### 每次启动时

1. 读取 `03-specs/SEQUENCE.md` → 了解执行顺序
2. 读取 `05-ralph/progress.txt` → 了解当前进度
3. 读取 `05-ralph/BLOCKED.log` → 检查阻塞问题
4. 读取 `02-requirements/ASSUMPTIONS.md` → 回顾假设
5. 确定当前要处理的spec
6. 开始工作

### 处理单个Spec时

1. 读取spec文件，理解需求
2. 检查现有代码，理解上下文
3. 逐步实现：
   - 写代码 → 写测试 → `pnpm nx affected -t test`
   - 修复 → `pnpm nx affected -t lint`
   - 修复 → `pnpm nx affected -t build`
4. 全部通过后，git commit
5. 更新 `05-ralph/progress.txt`
6. 输出状态信号

### 背压检查（完成前必须通过）

```bash
pnpm nx affected -t test      # 测试
pnpm nx affected -t lint      # Lint
pnpm nx affected -t typecheck # 类型
pnpm nx affected -t build     # 构建
```

---

## 状态信号

```
完成:   <promise>COMPLETE</promise>
阻塞:   <promise>BLOCKED: [问题简述]</promise>
需澄清: <promise>CLARIFY: [问题简述]</promise>
```

---

## Git提交规范

```bash
feat(api): 新功能-后端
feat(web): 新功能-前端
fix(api): Bug修复-后端
fix(web): Bug修复-前端
refactor: 重构
docs: 文档
test: 测试
chore: 配置/依赖
```

---

## 核心原则

1. **循环迭代** - 小步快跑，每次迭代专注一个小目标
2. **背压优先** - 测试+Lint+构建全过才算完成
3. **文件即记忆** - 进度和问题通过文件系统持久化
4. **小步提交** - 每完成一个小功能立即commit

---

## 禁止事项

1. 不要一次性输出大量代码而不测试
2. 不要跳过测试直接声称完成
3. 不要在没有运行lint的情况下提交
4. 不要对不确定的需求做大胆假设而不记录
5. 不要删除或覆盖不理解的现有代码
6. 不要忽略测试失败继续前进
7. 不要手动编辑 `libs/shared/src/generated/` 下的自动生成文件

---

## 关键检查点

| 阶段    | 检查点        | 通过标准             |
|---------|---------------|----------------------|
| Phase 1 | IDEA.md完成   | 客户核心痛点已记录   |
| Phase 2 | PRD.md收敛    | 待澄清问题<5个       |
| Phase 3 | PRD签署       | 客户签字             |
| Phase 4 | Specs拆解完成 | 每个spec<500行代码量 |
| Phase 5 | Ralph执行完成 | 所有spec标记COMPLETE |
| Phase 6 | 验收通过      | 客户签收             |
