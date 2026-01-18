# 12-legal-view.md - 法务视图

## 概述

为法务部门提供合同条款合规扫描、风险评分和履约证据链管理功能。

**优先级**: P1
**预估代码量**: ~400行

## 依赖

- 07-auth-rbac.md (认证与权限)
- 06-contract-crud.md (合同CRUD)

## 功能需求

### 1. 条款合规扫描 (ClauseCompliance)

- 扫描合同关键条款（保密、违约金、知识产权等）
- 条款存在性检查
- 条款风险标记
- 合规建议

### 2. 风险评分模型 (RiskScore)

- 综合风险评分（0-100）
- 风险因子分析（金额/期限/客户/条款）
- 风险等级分类（低/中/高/严重）
- 风险趋势

### 3. 履约证据链 (EvidenceChain)

- 合同履约关键事件
- 证据文件管理
- 时间线展示
- 证据完整性评估

## API设计

### GraphQL Types

```graphql
type ClauseCheck {
  clauseType: String!        # 条款类型
  clauseName: String!        # 条款名称
  exists: Boolean!           # 是否存在
  riskLevel: RiskLevel       # 风险等级
  suggestion: String         # 建议
}

type ContractCompliance {
  contractId: String!
  contractNo: String!
  contractName: String!
  overallScore: Float!       # 合规得分
  clauses: [ClauseCheck!]!
  missingClauses: [String!]!
  riskyClauses: [String!]!
  lastScannedAt: DateTime
}

type RiskFactor {
  factor: String!            # 风险因子
  weight: Float!             # 权重
  score: Float!              # 得分
  description: String!       # 描述
}

type ContractRiskScore {
  contractId: String!
  contractNo: String!
  contractName: String!
  customerName: String!
  overallScore: Float!       # 综合得分 0-100
  riskLevel: RiskLevel!      # LOW/MEDIUM/HIGH/CRITICAL
  factors: [RiskFactor!]!
  trend: String              # UP/DOWN/STABLE
}

type RiskOverview {
  totalContracts: Int!
  byRiskLevel: [RiskLevelStats!]!
  highRiskContracts: [ContractRiskScore!]!
  avgRiskScore: Float!
}

type Evidence {
  id: String!
  eventType: String!         # 事件类型
  eventDate: DateTime!       # 事件日期
  description: String!       # 描述
  fileUrl: String            # 证据文件URL
  createdAt: DateTime!
}

type EvidenceChain {
  contractId: String!
  contractNo: String!
  contractName: String!
  customerName: String!
  evidences: [Evidence!]!
  completenessScore: Float!  # 完整性评分
  milestonesCovered: Int!
  totalMilestones: Int!
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

type RiskLevelStats {
  level: RiskLevel!
  count: Int!
  percentage: Float!
}
```

### GraphQL Queries

```graphql
type Query {
  # 获取合同合规扫描结果
  contractCompliance(contractId: String!): ContractCompliance!

  # 获取合规概览
  complianceOverview: ComplianceOverview!

  # 获取合同风险评分
  contractRiskScore(contractId: String!): ContractRiskScore!

  # 获取风险概览
  riskOverview: RiskOverview!

  # 获取履约证据链
  evidenceChain(contractId: String!): EvidenceChain!
}
```

## 实现规范

### LegalModule

```typescript
// apps/api/src/legal/legal.module.ts
@Module({
  imports: [PrismaModule],
  providers: [LegalService, LegalResolver],
  exports: [LegalService],
})
export class LegalModule {}
```

### LegalService

```typescript
// apps/api/src/legal/legal.service.ts
@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async getContractCompliance(contractId: string): Promise<ContractCompliance>;
  async getComplianceOverview(): Promise<ComplianceOverview>;
  async getContractRiskScore(contractId: string): Promise<ContractRiskScore>;
  async getRiskOverview(): Promise<RiskOverview>;
  async getEvidenceChain(contractId: string): Promise<EvidenceChain>;
}
```

### 风险评分算法

```typescript
// 风险因子及权重
const RISK_FACTORS = {
  AMOUNT: { weight: 0.25, name: '合同金额' },
  DURATION: { weight: 0.15, name: '合同期限' },
  CUSTOMER: { weight: 0.20, name: '客户信用' },
  CLAUSE: { weight: 0.25, name: '条款风险' },
  OVERDUE: { weight: 0.15, name: '逾期历史' },
};

// 风险等级划分
const RISK_LEVELS = {
  LOW: { min: 0, max: 30 },
  MEDIUM: { min: 30, max: 60 },
  HIGH: { min: 60, max: 80 },
  CRITICAL: { min: 80, max: 100 },
};
```

## 前端实现

### 法务仪表盘页面

```typescript
// apps/web/src/pages/legal/LegalPage.tsx
export const LegalPage: React.FC = () => {
  return (
    <div>
      <ComplianceScanner />
      <RiskMatrix />
      <EvidenceTimeline />
    </div>
  );
};
```

### 组件

1. **ComplianceScanner** - 合规扫描结果展示
2. **RiskMatrix** - 风险矩阵/热力图
3. **EvidenceTimeline** - 履约证据时间线

## 验收标准

- [ ] AC-01: ContractCompliance查询返回条款合规扫描结果
- [ ] AC-02: RiskOverview查询返回风险概览数据
- [ ] AC-03: EvidenceChain查询返回履约证据链
- [ ] AC-04: 前端法务仪表盘页面显示完整
- [ ] AC-05: lint + build 通过

## 测试要点

1. 合规扫描正确识别关键条款
2. 风险评分计算准确
3. 证据链按时间排序
4. 权限控制生效
