# 14-tagging-engine.md - 智能标签引擎

## 概述

实现合同自动分类、智能标签提取和合同画像生成功能。

**优先级**: P2
**预估代码量**: ~350行

## 功能需求

### 1. 合同自动分类 (AutoClassify)
- 基于合同内容自动识别类型
- 行业分类
- 规模分级

### 2. 智能标签提取 (TagExtraction)
- 关键词提取
- 实体识别（客户/产品/技术栈）
- 标签推荐

### 3. 合同画像生成 (ContractProfile)
- 合同特征向量
- 相似度计算基础
- 画像标签聚合

## API设计

```graphql
type ClassificationResult {
  contractType: String!
  confidence: Float!
  industry: String
  scale: String!
}

type ExtractedTag {
  name: String!
  category: String!
  confidence: Float!
  source: String!
}

type ContractProfile {
  contractId: String!
  tags: [String!]!
  keywords: [String!]!
  features: [FeatureScore!]!
}

type Mutation {
  autoClassifyContract(contractId: String!): ClassificationResult!
  extractTags(contractId: String!): [ExtractedTag!]!
  generateProfile(contractId: String!): ContractProfile!
}
```

## 验收标准

- [ ] AC-01: autoClassifyContract返回分类结果
- [ ] AC-02: extractTags返回提取的标签
- [ ] AC-03: generateProfile返回合同画像
- [ ] AC-04: lint + build 通过
