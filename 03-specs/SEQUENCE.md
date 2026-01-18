# 开发顺序 (SEQUENCE)

本文档定义i-CLMS系统的开发顺序，遵循由基础到上层、由核心到扩展的原则。

技术栈：Nx Monorepo + NestJS + GraphQL + React + Apollo + Recoil + Vite

---

## 阶段一：基础平台与核心解析

### 01-project-setup.md
**优先级**: P0 | **状态**: 待开始
- Nx workspace初始化
- 创建api应用（NestJS + GraphQL）
- 创建web应用（React + Vite）
- 创建shared库（types, utils, constants）
- ESLint + Prettier配置
- Docker Compose开发环境（PostgreSQL、MinIO）

### 02-database-schema.md
**优先级**: P0 | **状态**: 待开始
- Prisma schema设计（合同、客户、用户）
- 数据库迁移配置
- 基础CRUD生成

### 03-graphql-foundation.md
**优先级**: P0 | **状态**: 待开始
- GraphQL schema设计
- Apollo Server配置（NestJS）
- Apollo Client配置（React）
- 代码生成器配置（graphql-codegen）

### 04-file-storage.md
**优先级**: P0 | **状态**: 待开始
- MinIO对象存储集成
- 文件上传GraphQL mutation
- 合同文档存储管理

### 05-contract-parser-basic.md
**优先级**: P0 | **状态**: 待开始
- PDF文本提取（pdf-parse / pdf.js）
- Word文档解析（mammoth.js）
- OCR集成（Tesseract.js）
- 基础字段提取规则

### 06-contract-crud.md
**优先级**: P0 | **状态**: 待开始
- 合同GraphQL类型定义
- 合同Resolver（Query/Mutation）
- 合同Service业务逻辑
- 前端合同列表页
- 前端合同详情页

---

## 阶段二：部门赋能视图

### 07-auth-rbac.md
**优先级**: P1 | **状态**: 待开始
- JWT认证（Passport.js）
- GraphQL Guard
- 角色权限管理（RBAC）
- Recoil用户状态管理
- 部门数据隔离

### 08-finance-view.md
**优先级**: P1 | **状态**: 待开始
- 收入全景仪表盘
- 现金流预测
- 付款逾期预警
- GraphQL Subscription实时更新

### 09-delivery-view.md
**优先级**: P1 | **状态**: 待开始
- 交付全景地图
- 里程碑跟踪器
- 资源利用率视图

### 10-sales-view.md
**优先级**: P1 | **状态**: 待开始
- 客户360°视图
- 续约看板
- 销售业绩指标

### 11-market-view.md
**优先级**: P1 | **状态**: 待开始
- 合同知识库（全文检索）
- 智能标签
- 案例生成工场

### 12-legal-view.md
**优先级**: P1 | **状态**: 待开始
- 条款合规扫描
- 风险评分模型
- 履约证据链

### 13-executive-view.md
**优先级**: P1 | **状态**: 待开始
- 公司健康度仪表盘
- 风险热力图
- 核心KPI指标

---

## 阶段三：智能引擎增强

### 14-tagging-engine.md
**优先级**: P2 | **状态**: 待开始
- 合同自动分类
- 智能标签提取
- 合同画像生成

### 15-risk-engine.md
**优先级**: P2 | **状态**: 待开始
- 风险评分算法
- 高风险条款识别
- 风险预警规则

### 16-vector-search.md
**优先级**: P2 | **状态**: 待开始
- Milvus向量库集成
- 语义检索服务
- 相似合同推荐

### 17-analytics-engine.md
**优先级**: P2 | **状态**: 待开始
- ClickHouse集成
- 多维分析查询
- 预测模型基础

---

## 阶段四：高级功能

### 18-notification-engine.md
**优先级**: P3 | **状态**: 待开始
- 预警消息推送（GraphQL Subscription）
- 邮件/企业微信通知
- 待办任务管理

### 19-integration-api.md
**优先级**: P3 | **状态**: 待开始
- 外部系统对接API
- Webhook支持
- 数据导入导出

### 20-mobile-view.md
**优先级**: P3 | **状态**: 待开始
- 响应式设计优化
- PWA支持
- 移动端轻量视图

---

## 执行规则

1. 按顺序执行，除非有明确依赖可以并行
2. 每个spec必须完全完成（测试通过+lint通过+构建成功）才能进入下一个
3. P0为必须完成，P1为核心功能，P2为增强功能，P3为可选功能
4. 阶段一完成后进行用户验收测试，再进入阶段二
5. 后端和前端功能可以在同一个spec中并行开发
