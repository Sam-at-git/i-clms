# i-CLMS - 智能合同全生命周期管理系统

**Intelligent Contract Lifecycle Management System**

> "一份合同签署，全流程数据就绪，全部门价值赋能"

以合同签署为自动化起点的企业级数据中枢，为财务、交付、业务、市场、法务、管理层6大部门提供智能合同数据服务。

## 核心功能

### 智能解析引擎
- 多格式文档解析（Word/PDF/扫描件OCR）
- 合同类型自动识别（人力框架/项目外包/产品购销）
- 关键字段智能提取（准确率目标 >85%）
- 合同画像自动生成

### 六大部门赋能

| 部门 | 核心功能 |
|------|----------|
| **财务** | 收入确认、现金流预测、合规审计 |
| **交付/PMO** | 里程碑跟踪、资源协调、范围管理 |
| **业务/销售** | 客户360°视图、续约提醒、业绩跟踪 |
| **市场** | 智能检索、案例生成、趋势分析 |
| **法务/风控** | 条款合规扫描、风险评分、纠纷预防 |
| **管理层** | 健康度仪表盘、预测分析、KPI监控 |

## 技术栈

```
Monorepo     Nx + pnpm
后端         NestJS + GraphQL (Apollo Server) + Prisma
前端         React 19 + Vite + Apollo Client + Zustand
数据库       PostgreSQL
测试         Jest + Playwright
代码质量     TypeScript (strict) + ESLint + Prettier
```

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose（用于运行 PostgreSQL 和 MinIO）
- Python 3.9+（可选，用于增强 PDF 解析和 OCR）

### Python 依赖（可选）

系统使用 IBM Docling 库进行高级文档解析。**不安装也能运行**，PDF 解析会降级到基础模式。

| 功能 | 无 Python/Docling | 有 Docling |
|------|-------------------|------------|
| PDF 解析 | pdf-parse（基础文本提取） | Docling（表格/结构识别更优） |
| DOCX 解析 | mammoth/docx4js | mammoth/docx4js |
| OCR 扫描件 | 不支持 | 支持（rapidocr/easyocr/tesseract） |
| 中文识别 | 有限 | 优秀（推荐 rapidocr） |

**安装 Docling（推荐）：**

```bash
# 创建并激活虚拟环境（推荐，避免系统级安装限制）
python3 -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt
```

> **注意**：启动后端服务前需确保虚拟环境已激活，或将 `.venv/bin` 添加到 PATH。

**验证安装：**

```bash
python3 -c "import docling; print(docling.__version__)"
```

如果未安装，系统启动时会显示警告但不影响运行：
```
[DoclingService] Python/Docling not available. Docling features will be disabled.
```

### 1. 克隆与安装

```bash
# 克隆仓库
git clone <repository-url>
cd i-clms

# 安装依赖
pnpm install
```

### 2. 启动基础设施

使用 Docker Compose 启动 PostgreSQL 数据库和 MinIO 对象存储：

```bash
# 启动 PostgreSQL 和 MinIO
docker compose -f docker/docker-compose.yml up -d

# 验证服务状态
docker compose -f docker/docker-compose.yml ps
```

服务启动后：
- PostgreSQL: `localhost:5432`（用户：iclms，密码：iclms_dev_123）
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`（用户：minioadmin，密码：minioadmin123）

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 默认配置已可直接使用，无需修改
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
pnpm nx prisma:migrate api

# 生成 Prisma Client
pnpm nx prisma:generate api

# 填充初始数据（可选）
pnpm prisma db seed
```

### 5. 启动开发服务

```bash
# 启动后端服务（默认端口 3000）
pnpm nx serve api

# 启动前端服务（默认端口 4200）
pnpm nx serve web

# 或同时启动所有服务
pnpm nx run-many -t serve
```

启动成功后：
- 后端 API: http://localhost:3000/graphql
- 前端应用: http://localhost:4200

### 测试

```bash
# 运行后端测试
pnpm nx test api

# 运行前端测试
pnpm nx test web

# 只测试受影响的项目
pnpm nx affected -t test
```

### 代码质量检查

```bash
# Lint 检查
pnpm nx affected -t lint

# 类型检查
pnpm nx affected -t typecheck

# 构建
pnpm nx affected -t build
```

## 项目结构

```
i-clms/
├── apps/
│   ├── api/              # NestJS 后端服务
│   ├── api-e2e/          # 后端 E2E 测试
│   ├── web/              # React 前端应用
│   └── web-e2e/          # 前端 E2E 测试
├── libs/                 # 共享库
├── prisma/               # 数据库 Schema 与迁移
├── 01-discovery/         # 需求发现文档
├── 02-requirements/      # 需求规格文档
├── 03-specs/             # 技术规格文档
├── 05-ralph/             # 开发执行文档
└── 06-delivery/          # 验收交付文档
```

## 支持的合同类型

### 人力框架合同
基于工时计费：`总费用 = Σ(人员级别 × 工时 × 费率)`

### 项目外包合同
基于里程碑：`总费用 = 里程碑1金额 + 里程碑2金额 + ...`

### 产品购销合同
基于产品销售：`总费用 = Σ(产品单价 × 数量) + 服务费`

## API 文档

启动后端服务后，访问 GraphQL Playground：
```
http://localhost:3000/graphql
```

## 开发指南

详细开发规范请参阅 [CLAUDE.md](./CLAUDE.md)

## License

MIT
