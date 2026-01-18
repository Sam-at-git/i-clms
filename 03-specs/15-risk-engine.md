# 15-risk-engine.md - 风险评分引擎

## 概述

实现风险评分算法、高风险条款识别和风险预警规则。

**优先级**: P2
**预估代码量**: ~350行

## 功能需求

### 1. 风险评分算法 (RiskScoring)
- 多因子风险模型
- 权重可配置
- 历史数据校准

### 2. 高风险条款识别 (RiskClauseDetection)
- 敏感条款扫描
- 异常条款标记
- 风险建议

### 3. 风险预警规则 (RiskAlertRules)
- 阈值触发
- 规则引擎
- 预警通知

## API设计

```graphql
type RiskAssessment {
  contractId: String!
  totalScore: Float!
  level: String!
  factors: [RiskFactorDetail!]!
  recommendations: [String!]!
}

type RiskClause {
  clauseType: String!
  content: String!
  riskLevel: String!
  suggestion: String!
}

type RiskAlert {
  id: String!
  contractId: String!
  alertType: String!
  severity: String!
  message: String!
  createdAt: DateTime!
}

type Query {
  assessContractRisk(contractId: String!): RiskAssessment!
  detectRiskClauses(contractId: String!): [RiskClause!]!
  getRiskAlerts(limit: Int): [RiskAlert!]!
}
```

## 验收标准

- [ ] AC-01: assessContractRisk返回风险评估
- [ ] AC-02: detectRiskClauses返回风险条款
- [ ] AC-03: getRiskAlerts返回风险预警
- [ ] AC-04: lint + build 通过
