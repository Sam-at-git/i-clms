# 09-delivery-view.md - 交付/PMO部门视图

## 概述

为交付/PMO部门构建专属视图，提供交付全景地图、里程碑跟踪器、资源利用率视图等核心功能。

## 技术方案

- NestJS DeliveryModule
- GraphQL查询
- 里程碑状态跟踪
- 资源分配统计

## 功能清单

### 1. 交付全景地图
- 所有项目外包合同概览
- 按状态分布统计
- 按客户分组视图
- 交付进度总览

### 2. 里程碑跟踪器
- 里程碑时间线视图
- 逾期/风险里程碑高亮
- 里程碑完成率统计
- 按项目筛选

### 3. 资源利用率视图
- 人力框架合同工时统计
- 按角色/级别分布
- 月度工时趋势

## 目录结构

```
apps/api/src/delivery/
├── dto/
│   ├── project-overview.dto.ts
│   ├── milestone-tracker.dto.ts
│   └── resource-utilization.dto.ts
├── delivery.service.ts
├── delivery.resolver.ts
├── delivery.module.ts
└── index.ts

apps/web/src/pages/delivery/
├── index.tsx              # 交付仪表盘主页
└── components/
    ├── ProjectMap.tsx     # 项目全景地图
    ├── MilestoneTracker.tsx # 里程碑跟踪
    └── ResourceChart.tsx  # 资源利用率
```

## GraphQL Schema

```graphql
type ProjectOverview {
  totalProjects: Int!
  byStatus: [StatusCount!]!
  byCustomer: [CustomerProjects!]!
  completionRate: Float!
}

type StatusCount {
  status: ContractStatus!
  count: Int!
}

type CustomerProjects {
  customerId: String!
  customerName: String!
  projectCount: Int!
  activeCount: Int!
}

type MilestoneOverview {
  totalMilestones: Int!
  completedCount: Int!
  pendingCount: Int!
  overdueCount: Int!
  upcomingMilestones: [MilestoneItem!]!
  overdueMilestones: [MilestoneItem!]!
}

type MilestoneItem {
  id: String!
  name: String!
  contractNo: String!
  customerName: String!
  plannedDate: DateTime
  actualDate: DateTime
  status: MilestoneStatus!
  amount: Float
  daysOverdue: Int
}

type ResourceUtilization {
  totalStaffContracts: Int!
  byRole: [RoleUtilization!]!
  monthlyTrend: [MonthlyUtilization!]!
}

type RoleUtilization {
  role: String!
  count: Int!
  totalValue: Float!
}

type MonthlyUtilization {
  month: String!
  hoursAllocated: Int!
  value: Float!
}

type Query {
  projectOverview: ProjectOverview!
  milestoneOverview: MilestoneOverview!
  resourceUtilization: ResourceUtilization!
}
```

## 验收标准

- [ ] AC-01: ProjectOverview查询返回项目概览数据
- [ ] AC-02: MilestoneOverview查询返回里程碑统计
- [ ] AC-03: ResourceUtilization查询返回资源利用率
- [ ] AC-04: 前端交付仪表盘页面显示完整
- [ ] AC-05: lint + build 通过

## 依赖

- 07-auth-rbac.md (需要认证保护)
- 06-contract-crud.md (合同数据)
- 02-database-schema.md (数据模型)
