# 16-vector-search.md - 语义检索服务

## 概述

实现基于向量的语义检索服务和相似合同推荐（模拟实现，不依赖Milvus）。

**优先级**: P2
**预估代码量**: ~300行

## 功能需求

### 1. 向量化服务 (Vectorization)
- 文本向量化（模拟）
- 向量存储
- 批量处理

### 2. 语义检索 (SemanticSearch)
- 相似度搜索
- 多条件过滤
- 结果排序

### 3. 相似合同推荐 (SimilarContracts)
- 基于内容相似
- 基于客户相似
- 混合推荐

## API设计

```graphql
type SemanticSearchResult {
  contractId: String!
  contractNo: String!
  name: String!
  similarity: Float!
  highlights: [String!]!
}

type SimilarContract {
  contractId: String!
  contractNo: String!
  name: String!
  customerName: String!
  similarity: Float!
  matchReasons: [String!]!
}

type Query {
  semanticSearch(query: String!, limit: Int): [SemanticSearchResult!]!
  findSimilarContracts(contractId: String!, limit: Int): [SimilarContract!]!
}
```

## 验收标准

- [ ] AC-01: semanticSearch返回语义搜索结果
- [ ] AC-02: findSimilarContracts返回相似合同
- [ ] AC-03: lint + build 通过
