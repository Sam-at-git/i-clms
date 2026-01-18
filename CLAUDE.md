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
框架: NestJS
API: GraphQL (Apollo Server)
ORM: Prisma
数据库: PostgreSQL

# 前端
框架: React 18
构建: Vite
GraphQL: Apollo Client
状态: Recoil

# 测试
单元: Jest
E2E: Playwright

# 代码质量
Lint: ESLint + Prettier
类型: TypeScript (strict)
```

---

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发
pnpm nx serve api          # 启动后端
pnpm nx serve web          # 启动前端
pnpm nx run-many -t serve  # 启动所有

# 测试
pnpm nx test api           # 后端测试
pnpm nx test web           # 前端测试
pnpm nx affected -t test   # 只测受影响的

# 代码质量
pnpm nx affected -t lint      # Lint
pnpm nx affected -t typecheck # 类型检查
pnpm nx affected -t build     # 构建

# 数据库
pnpm nx prisma:migrate api    # 迁移
pnpm nx prisma:generate api   # 生成客户端

# 依赖图
pnpm nx graph
```

---

## 目录结构

```
i-clms/
├── 01-discovery/           # Phase 1: 想法捕获
│   ├── IDEA.md             # 客户原始想法
│   ├── QUESTIONS.md        # 待澄清问题
│   └── meeting-notes/      # 会议记录
│
├── 02-requirements/        # Phase 2-3: 需求文档
│   ├── PRD.md              # 需求文档
│   ├── ASSUMPTIONS.md      # 假设清单
│   └── ACCEPTANCE-CRITERIA.md  # 验收标准
│
├── 03-specs/               # Phase 4: 技术规格
│   ├── SEQUENCE.md         # 执行顺序
│   └── *.md                # 各功能规格
│
├── 04-code/                # 代码占位（实际用apps/libs）
├── apps/                   # Nx应用
│   ├── api/                # NestJS后端
│   └── web/                # React前端
├── libs/                   # Nx共享库
│   ├── shared/             # 类型、工具、常量
│   ├── ui/                 # UI组件库
│   └── graphql-schema/     # GraphQL Schema
│
├── 05-ralph/               # Phase 5: Ralph执行
│   ├── PROMPT.md           # Prompt模板
│   ├── STYLE.md            # 代码风格
│   ├── STRUCTURE.md        # 项目结构
│   ├── progress.txt        # 进度记录
│   └── BLOCKED.log         # 阻塞记录
│
├── 06-delivery/            # Phase 6: 验收交付
│   └── change-requests/    # 变更请求
│
├── prisma/                 # 数据库
│   └── schema.prisma
└── CLAUDE.md               # 本文件
```

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
