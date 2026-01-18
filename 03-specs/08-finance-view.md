# 08-finance-view.md - 财务部门视图

## 概述

为财务部门构建专属视图，提供收入全景仪表盘、现金流预测、付款逾期预警等核心功能。

## 技术方案

- NestJS模块化设计
- GraphQL查询/订阅
- 聚合统计服务
- React可视化组件

## 功能清单

### 1. 收入全景仪表盘
- 按月/季度/年度收入统计
- 按合同类型收入分布
- 按客户收入排名
- 收入趋势图

### 2. 现金流预测
- 基于合同付款计划的现金流预测
- 按月预测收款金额
- 考虑已收/待收状态

### 3. 付款逾期预警
- 识别逾期未付款的合同
- 计算逾期天数和金额
- 按逾期程度分级预警

## 目录结构

```
apps/api/src/finance/
├── dto/
│   ├── revenue-stats.dto.ts
│   ├── cash-flow.dto.ts
│   └── overdue-alert.dto.ts
├── finance.service.ts
├── finance.resolver.ts
├── finance.module.ts
└── index.ts

apps/web/src/pages/finance/
├── index.tsx              # 财务仪表盘主页
└── components/
    ├── RevenueChart.tsx   # 收入图表
    ├── CashFlowChart.tsx  # 现金流图表
    └── OverdueList.tsx    # 逾期预警列表
```

## GraphQL Schema

```graphql
type RevenueStats {
  totalRevenue: Float!
  byMonth: [MonthlyRevenue!]!
  byContractType: [TypeRevenue!]!
  byCustomer: [CustomerRevenue!]!
}

type MonthlyRevenue {
  month: String!
  amount: Float!
  count: Int!
}

type TypeRevenue {
  type: ContractType!
  amount: Float!
  percentage: Float!
}

type CustomerRevenue {
  customerId: String!
  customerName: String!
  amount: Float!
  contractCount: Int!
}

type CashFlowForecast {
  month: String!
  expectedIncome: Float!
  receivedAmount: Float!
  pendingAmount: Float!
}

type OverdueAlert {
  contractId: String!
  contractNo: String!
  customerName: String!
  expectedDate: DateTime!
  daysOverdue: Int!
  amount: Float!
  level: OverdueLevel!
}

enum OverdueLevel {
  LOW       # 1-30天
  MEDIUM    # 31-60天
  HIGH      # 61-90天
  CRITICAL  # 90天以上
}

type Query {
  revenueStats(year: Int, startDate: DateTime, endDate: DateTime): RevenueStats!
  cashFlowForecast(months: Int): [CashFlowForecast!]!
  overdueAlerts: [OverdueAlert!]!
}
```

## 验收标准

- [ ] AC-01: RevenueStats查询返回正确的统计数据
- [ ] AC-02: CashFlowForecast查询返回未来N个月预测
- [ ] AC-03: OverdueAlerts查询返回逾期预警列表
- [ ] AC-04: 前端仪表盘页面显示完整
- [ ] AC-05: lint + build 通过

## 依赖

- 07-auth-rbac.md (需要认证保护)
- 06-contract-crud.md (合同数据)
- 02-database-schema.md (数据模型)
