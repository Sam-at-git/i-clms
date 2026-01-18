# 13-executive-view.md - 管理层视图

## 概述

为管理层提供公司整体健康度仪表盘、风险热力图和核心KPI指标，支持战略决策。

**优先级**: P1
**预估代码量**: ~400行

## 依赖

- 07-auth-rbac.md (认证与权限)
- 06-contract-crud.md (合同CRUD)
- 08-finance-view.md (财务数据)
- 12-legal-view.md (风险数据)

## 功能需求

### 1. 公司健康度仪表盘 (CompanyHealth)

- 综合健康评分（0-100）
- 各维度评分（财务/交付/客户/风险）
- 健康趋势（月度变化）
- 预警指标

### 2. 风险热力图 (RiskHeatmap)

- 按部门/客户/行业分布
- 风险等级着色
- 钻取详情
- 趋势分析

### 3. 核心KPI指标 (CoreKPIs)

- 合同总额/新签额/续签率
- 客户数/新客户/流失率
- 交付成功率/准时率
- 毛利率/回款率

## API设计

### GraphQL Types

```graphql
type HealthDimension {
  dimension: String!       # 维度名称
  score: Float!            # 得分
  trend: String!           # UP/DOWN/STABLE
  description: String!     # 描述
}

type CompanyHealth {
  overallScore: Float!     # 综合得分
  dimensions: [HealthDimension!]!
  alerts: [HealthAlert!]!
  trend: [MonthlyScore!]!
}

type HealthAlert {
  level: String!           # WARNING/CRITICAL
  message: String!
  dimension: String!
  value: Float!
}

type MonthlyScore {
  month: String!
  score: Float!
}

type RiskCell {
  category: String!        # 行/列标识
  subCategory: String!
  riskScore: Float!
  riskLevel: String!       # LOW/MEDIUM/HIGH/CRITICAL
  contractCount: Int!
  totalValue: Float!
}

type RiskHeatmap {
  rows: [String!]!         # 行标签（如部门）
  columns: [String!]!      # 列标签（如风险类型）
  cells: [RiskCell!]!
  summary: RiskSummary!
}

type RiskSummary {
  totalContracts: Int!
  highRiskCount: Int!
  criticalRiskCount: Int!
  avgRiskScore: Float!
}

type KPIMetric {
  name: String!
  value: Float!
  unit: String!
  target: Float
  achievement: Float       # 达成率
  trend: String!           # UP/DOWN/STABLE
  previousValue: Float
}

type KPICategory {
  category: String!
  metrics: [KPIMetric!]!
}

type CoreKPIs {
  period: String!          # 统计周期
  categories: [KPICategory!]!
  highlights: [String!]!   # 重点提示
}
```

### GraphQL Queries

```graphql
type Query {
  # 获取公司健康度
  companyHealth: CompanyHealth!

  # 获取风险热力图
  riskHeatmap(groupBy: String): RiskHeatmap!

  # 获取核心KPI
  coreKPIs(period: String): CoreKPIs!
}
```

## 实现规范

### ExecutiveModule

```typescript
// apps/api/src/executive/executive.module.ts
@Module({
  imports: [PrismaModule],
  providers: [ExecutiveService, ExecutiveResolver],
  exports: [ExecutiveService],
})
export class ExecutiveModule {}
```

### ExecutiveService

```typescript
// apps/api/src/executive/executive.service.ts
@Injectable()
export class ExecutiveService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyHealth(): Promise<CompanyHealth>;
  async getRiskHeatmap(groupBy?: string): Promise<RiskHeatmap>;
  async getCoreKPIs(period?: string): Promise<CoreKPIs>;
}
```

### 健康度评分算法

```typescript
// 健康维度及权重
const HEALTH_DIMENSIONS = {
  FINANCE: { weight: 0.30, name: '财务健康' },
  DELIVERY: { weight: 0.25, name: '交付质量' },
  CUSTOMER: { weight: 0.25, name: '客户满意' },
  RISK: { weight: 0.20, name: '风险控制' },
};
```

## 前端实现

### 管理层仪表盘页面

```typescript
// apps/web/src/pages/executive/ExecutivePage.tsx
export const ExecutivePage: React.FC = () => {
  return (
    <div>
      <HealthGauge />
      <RiskHeatmapChart />
      <KPIDashboard />
    </div>
  );
};
```

### 组件

1. **HealthGauge** - 健康度仪表盘（环形图+维度柱状图）
2. **RiskHeatmapChart** - 风险热力图
3. **KPIDashboard** - KPI卡片网格

## 验收标准

- [ ] AC-01: CompanyHealth查询返回健康度数据
- [ ] AC-02: RiskHeatmap查询返回热力图数据
- [ ] AC-03: CoreKPIs查询返回KPI指标
- [ ] AC-04: 前端管理层仪表盘页面显示完整
- [ ] AC-05: lint + build 通过

## 测试要点

1. 健康度评分在0-100范围内
2. 热力图数据按groupBy正确分组
3. KPI目标达成率计算正确
4. 仅管理层角色可访问
