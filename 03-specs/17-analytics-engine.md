# 17-analytics-engine.md - 多维分析引擎

## 概述

实现多维分析查询和预测模型基础（使用PostgreSQL，不依赖ClickHouse）。

**优先级**: P2
**预估代码量**: ~350行

## 功能需求

### 1. 多维分析 (OLAP)
- 时间维度聚合
- 多维度下钻
- 透视分析

### 2. 趋势分析 (TrendAnalysis)
- 同比/环比
- 移动平均
- 趋势预测

### 3. 预测模型 (Forecasting)
- 收入预测
- 续约预测
- 风险预测

## API设计

```graphql
type AnalyticsDimension {
  dimension: String!
  value: String!
  metrics: AnalyticsMetrics!
}

type AnalyticsMetrics {
  count: Int!
  totalValue: Float!
  avgValue: Float!
}

type TrendPoint {
  period: String!
  value: Float!
  growth: Float
}

type ForecastResult {
  metric: String!
  currentValue: Float!
  forecastValue: Float!
  confidence: Float!
  trend: String!
}

type Query {
  analyzeByDimension(dimension: String!, groupBy: String): [AnalyticsDimension!]!
  getTrend(metric: String!, periods: Int): [TrendPoint!]!
  forecast(metric: String!): ForecastResult!
}
```

## 验收标准

- [ ] AC-01: analyzeByDimension返回多维分析结果
- [ ] AC-02: getTrend返回趋势数据
- [ ] AC-03: forecast返回预测结果
- [ ] AC-04: lint + build 通过
