# 01-project-setup.md - 项目基础搭建

**优先级**: P0
**预估代码量**: ~300行配置文件
**依赖**: 无

---

## 1. 功能描述

初始化i-CLMS项目的Nx Monorepo工作区，创建前后端应用骨架和共享库，配置开发环境。

---

## 2. 具体任务

### 2.1 Nx Workspace初始化

```bash
# 在项目根目录创建Nx工作区
npx create-nx-workspace@latest i-clms --preset=integrated --pm=pnpm
```

工作区配置要求：
- 包管理器：pnpm
- 预设：integrated（集成式monorepo）
- 工作区名称：i-clms

### 2.2 创建后端应用 (api)

```bash
# 添加NestJS插件并创建应用
pnpm nx add @nx/nest
pnpm nx g @nx/nest:app api --directory=apps/api
```

后端应用要求：
- 应用名称：api
- 位置：apps/api
- 框架：NestJS
- 端口：3000

### 2.3 创建前端应用 (web)

```bash
# 添加React+Vite插件并创建应用
pnpm nx add @nx/react
pnpm nx g @nx/react:app web --directory=apps/web --bundler=vite --style=css
```

前端应用要求：
- 应用名称：web
- 位置：apps/web
- 构建工具：Vite
- 端口：4200

### 2.4 创建共享库

```bash
# 创建shared库
pnpm nx g @nx/js:lib shared --directory=libs/shared --bundler=tsc

# 在shared库下创建子目录结构
mkdir -p libs/shared/src/types
mkdir -p libs/shared/src/utils
mkdir -p libs/shared/src/constants
```

共享库结构：
```
libs/shared/src/
├── types/
│   └── index.ts       # 类型导出
├── utils/
│   └── index.ts       # 工具函数导出
├── constants/
│   └── index.ts       # 常量导出
└── index.ts           # 主入口
```

### 2.5 ESLint + Prettier配置

根目录 `.prettierrc`：
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

确保ESLint配置：
- TypeScript strict mode
- 禁止使用any
- React hooks规则
- 导入排序

### 2.6 Docker Compose开发环境

创建 `docker/docker-compose.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: iclms-postgres
    environment:
      POSTGRES_USER: iclms
      POSTGRES_PASSWORD: iclms_dev_123
      POSTGRES_DB: iclms
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    container_name: iclms-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

### 2.7 环境变量配置

创建 `.env.example`：
```env
# Database
DATABASE_URL=postgresql://iclms:iclms_dev_123@localhost:5432/iclms

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=contracts

# API
API_PORT=3000

# Web
VITE_API_URL=http://localhost:3000/graphql
```

### 2.8 Git初始化

```bash
git init
git add .
git commit -m "feat: initialize nx workspace with api and web apps"
```

`.gitignore` 需包含：
- node_modules/
- dist/
- .env
- .nx/cache

---

## 3. 输入/输出

### 输入
- 无（全新项目）

### 输出
```
i-clms/
├── apps/
│   ├── api/                 # NestJS后端应用
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── app.module.ts
│   │   │   │   ├── app.controller.ts
│   │   │   │   └── app.service.ts
│   │   │   └── main.ts
│   │   ├── project.json
│   │   └── tsconfig.app.json
│   └── web/                 # React前端应用
│       ├── src/
│       │   ├── app/
│       │   │   └── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── project.json
│       └── vite.config.ts
├── libs/
│   └── shared/              # 共享库
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   ├── constants/
│       │   └── index.ts
│       └── project.json
├── docker/
│   └── docker-compose.yml   # 开发环境容器
├── .env.example             # 环境变量示例
├── .prettierrc              # Prettier配置
├── .gitignore
├── nx.json
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## 4. 验收标准

### AC-01: Nx工作区创建成功
- [ ] 运行 `pnpm nx --version` 返回版本号
- [ ] `nx.json` 文件存在且配置正确

### AC-02: 后端应用可启动
- [ ] 运行 `pnpm nx serve api` 成功启动
- [ ] 访问 `http://localhost:3000/api` 返回响应
- [ ] 运行 `pnpm nx test api` 测试通过

### AC-03: 前端应用可启动
- [ ] 运行 `pnpm nx serve web` 成功启动
- [ ] 访问 `http://localhost:4200` 显示页面
- [ ] 运行 `pnpm nx test web` 测试通过

### AC-04: 共享库可用
- [ ] `libs/shared/src/index.ts` 存在
- [ ] 在api和web中可以导入 `@i-clms/shared`
- [ ] 运行 `pnpm nx build shared` 构建成功

### AC-05: Lint检查通过
- [ ] 运行 `pnpm nx run-many -t lint` 全部通过
- [ ] `.prettierrc` 配置正确

### AC-06: Docker环境可用
- [ ] `docker/docker-compose.yml` 文件存在
- [ ] 运行 `docker compose -f docker/docker-compose.yml up -d` 成功
- [ ] PostgreSQL可连接（端口5432）
- [ ] MinIO可访问（端口9000/9001）

### AC-07: 环境变量配置
- [ ] `.env.example` 文件存在且包含所有必要变量
- [ ] `.gitignore` 包含 `.env`

### AC-08: 构建成功
- [ ] 运行 `pnpm nx run-many -t build` 全部成功
- [ ] 无TypeScript编译错误

---

## 5. 技术约束

- Node.js版本：18.x 或 20.x
- pnpm版本：8.x 或 9.x
- Nx版本：最新稳定版
- TypeScript：strict mode必须开启
- 所有端口需可配置（通过环境变量）

---

## 6. 注意事项

1. **不要**安装GraphQL相关依赖（在02-database-schema和03-graphql-foundation中处理）
2. **不要**安装Prisma（在02-database-schema中处理）
3. **不要**创建复杂的业务逻辑，只搭建骨架
4. 确保所有生成的代码通过lint检查
5. 确保tsconfig.base.json中配置了正确的paths映射

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
