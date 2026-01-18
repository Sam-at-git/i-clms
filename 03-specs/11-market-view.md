# 11-market-view.md - 市场部门视图

## 概述

为市场部门构建专属视图，提供合同知识库全文检索、智能标签管理、案例生成工场等核心功能。

## 技术方案

- NestJS MarketModule
- GraphQL查询
- 全文检索 (PostgreSQL tsvector)
- 标签统计分析

## 功能清单

### 1. 合同知识库
- 合同全文搜索
- 按标签筛选
- 按类型/行业筛选
- 搜索结果高亮

### 2. 智能标签
- 标签使用统计
- 热门标签排行
- 按类别分组标签
- 标签关联分析

### 3. 案例视图
- 成功案例列表
- 按行业分类
- 案例详情展示
- 案例导出支持

## 目录结构

```
apps/api/src/market/
├── dto/
│   ├── contract-search.dto.ts
│   ├── tag-stats.dto.ts
│   └── case-study.dto.ts
├── market.service.ts
├── market.resolver.ts
├── market.module.ts
└── index.ts

apps/web/src/pages/market/
├── index.tsx              # 市场仪表盘主页
└── components/
    ├── ContractSearch.tsx # 合同搜索
    ├── TagCloud.tsx       # 标签云
    └── CaseList.tsx       # 案例列表
```

## GraphQL Schema

```graphql
type ContractSearchResult {
  id: String!
  contractNo: String!
  name: String!
  customerName: String!
  type: ContractType!
  industry: String
  amount: Float!
  signedAt: DateTime
  tags: [String!]!
  highlight: String
}

type SearchResponse {
  total: Int!
  results: [ContractSearchResult!]!
}

type TagStats {
  tagId: String!
  tagName: String!
  category: String
  color: String
  count: Int!
  totalValue: Float!
}

type TagOverview {
  totalTags: Int!
  topTags: [TagStats!]!
  byCategory: [CategoryTags!]!
}

type CategoryTags {
  category: String!
  tags: [TagStats!]!
}

type CaseStudy {
  id: String!
  contractNo: String!
  name: String!
  customerName: String!
  industry: String
  type: ContractType!
  amount: Float!
  signedAt: DateTime
  description: String
  highlights: [String!]!
  tags: [String!]!
}

type CaseOverview {
  totalCases: Int!
  byIndustry: [IndustryCases!]!
  featured: [CaseStudy!]!
}

type IndustryCases {
  industry: String!
  count: Int!
  totalValue: Float!
}

input ContractSearchInput {
  keyword: String
  tags: [String!]
  types: [ContractType!]
  industries: [String!]
  minAmount: Float
  maxAmount: Float
  limit: Int
  offset: Int
}

type Query {
  searchContracts(input: ContractSearchInput!): SearchResponse!
  tagOverview: TagOverview!
  caseOverview: CaseOverview!
}
```

## 验收标准

- [ ] AC-01: searchContracts查询返回搜索结果
- [ ] AC-02: tagOverview查询返回标签统计
- [ ] AC-03: caseOverview查询返回案例概览
- [ ] AC-04: 前端市场仪表盘页面显示完整
- [ ] AC-05: lint + build 通过

## 依赖

- 07-auth-rbac.md (需要认证保护)
- 06-contract-crud.md (合同数据)
- 02-database-schema.md (数据模型)
