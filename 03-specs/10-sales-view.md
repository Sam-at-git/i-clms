# 10-sales-view.md - 销售部门视图

## 概述

为销售/业务部门构建专属视图，提供客户360°视图、续约看板、销售业绩指标等核心功能。

## 技术方案

- NestJS SalesModule
- GraphQL查询
- 客户关系统计
- 续约预测分析

## 功能清单

### 1. 客户360°视图
- 客户合同历史
- 客户总价值统计
- 客户活跃度分析
- 按行业/规模分布

### 2. 续约看板
- 即将到期合同列表
- 续约率统计
- 续约提醒预警
- 按优先级排序

### 3. 销售业绩指标
- 销售人员业绩排名
- 新签/续签金额统计
- 月度/季度趋势
- 目标完成率

## 目录结构

```
apps/api/src/sales/
├── dto/
│   ├── customer-360.dto.ts
│   ├── renewal-board.dto.ts
│   └── sales-performance.dto.ts
├── sales.service.ts
├── sales.resolver.ts
├── sales.module.ts
└── index.ts

apps/web/src/pages/sales/
├── index.tsx              # 销售仪表盘主页
└── components/
    ├── Customer360.tsx    # 客户360°视图
    ├── RenewalBoard.tsx   # 续约看板
    └── SalesMetrics.tsx   # 销售业绩指标
```

## GraphQL Schema

```graphql
type Customer360 {
  customerId: String!
  customerName: String!
  totalContracts: Int!
  totalValue: Float!
  activeContracts: Int!
  contractHistory: [ContractSummary!]!
  industry: String
  firstContractDate: DateTime
  lastContractDate: DateTime
}

type ContractSummary {
  id: String!
  contractNo: String!
  name: String!
  type: ContractType!
  status: ContractStatus!
  amount: Float!
  signedAt: DateTime
  expiresAt: DateTime
}

type CustomerOverview {
  totalCustomers: Int!
  activeCustomers: Int!
  newCustomersThisYear: Int!
  byIndustry: [IndustryCount!]!
  topCustomers: [Customer360!]!
}

type IndustryCount {
  industry: String!
  count: Int!
  totalValue: Float!
}

type RenewalItem {
  contractId: String!
  contractNo: String!
  customerName: String!
  amount: Float!
  expiresAt: DateTime!
  daysUntilExpiry: Int!
  renewalProbability: Float!
  priority: RenewalPriority!
}

enum RenewalPriority {
  HIGH
  MEDIUM
  LOW
}

type RenewalOverview {
  expiringThisMonth: Int!
  expiringThisQuarter: Int!
  totalRenewalValue: Float!
  renewalRate: Float!
  renewalItems: [RenewalItem!]!
}

type SalesPersonPerformance {
  salesPerson: String!
  totalContracts: Int!
  totalValue: Float!
  newSignValue: Float!
  renewalValue: Float!
}

type SalesPerformance {
  totalSalesValue: Float!
  newSignValue: Float!
  renewalValue: Float!
  monthlyTrend: [MonthlySales!]!
  bySalesPerson: [SalesPersonPerformance!]!
}

type MonthlySales {
  month: String!
  newSignValue: Float!
  renewalValue: Float!
  totalValue: Float!
}

type Query {
  customerOverview: CustomerOverview!
  customer360(customerId: String!): Customer360
  renewalOverview: RenewalOverview!
  salesPerformance(year: Int): SalesPerformance!
}
```

## 验收标准

- [ ] AC-01: CustomerOverview查询返回客户概览数据
- [ ] AC-02: Customer360查询返回单个客户详情
- [ ] AC-03: RenewalOverview查询返回续约看板数据
- [ ] AC-04: SalesPerformance查询返回销售业绩数据
- [ ] AC-05: 前端销售仪表盘页面显示完整
- [ ] AC-06: lint + build 通过

## 依赖

- 07-auth-rbac.md (需要认证保护)
- 06-contract-crud.md (合同数据)
- 02-database-schema.md (数据模型)
