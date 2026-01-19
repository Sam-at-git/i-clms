# 单元测试增量计划 (5% → 90%)

**创建日期**: 2026-01-19
**当前覆盖率**: ~5-6%
**目标覆盖率**: 90%
**策略**: 每次增加约5%，分17个增量完成

---

## 增量策略说明

### 优先级排序原则
1. **P0 - 核心基础设施** (Phase 1-3): 认证、授权、数据访问层
2. **P1 - 基础业务服务** (Phase 4-7): 部门、审计、存储、合同核心
3. **P2 - 业务模块** (Phase 8-12): 财务、交付、销售、市场、法务、管理层
4. **P3 - 智能引擎** (Phase 13-15): 解析、标签、风险、向量、分析
5. **P4 - GraphQL层** (Phase 16-17): Resolvers和边界用例补充

### 覆盖率估算方法
- 每个Service平均贡献: 3-5%覆盖率
- 每个Resolver平均贡献: 1-2%覆盖率
- 复杂服务需要更多测试用例以达到深度覆盖

---

## Phase 1: 10% (增加5%)
**目标模块**: 核心基础服务
**预计测试用例**: 15-20个

### 测试内容
- ✅ `auth.service.ts` (已完成 - 15测试)
- ✅ `user.service.ts` (已完成 - 12测试)
- ✅ `prisma.service.ts` (已完成 - 3测试)
- 🔲 `department.service.ts` - 部门CRUD和验证逻辑

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~10%
```

---

## Phase 2: 15% (增加5%)
**目标模块**: 基础设施服务
**预计测试用例**: 20-25个

### 测试内容
- 🔲 `audit.service.ts` - 审计日志记录和查询
- 🔲 `storage.service.ts` - 文件上传/下载/删除

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~15%
```

---

## Phase 3: 20% (增加5%)
**目标模块**: 合同核心服务
**预计测试用例**: 25-30个

### 测试内容
- 🔲 `contract.service.ts` - 合同CRUD、多态类型处理
  - 测试三种合同类型创建
  - 测试合同查询和过滤
  - 测试合同状态变更
  - 测试权限控制

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~20%
```

---

## Phase 4: 25% (增加5%)
**目标模块**: 财务服务
**预计测试用例**: 20-25个

### 测试内容
- 🔲 `finance.service.ts` - 财务数据聚合
  - 应收账款计算
  - 收款计划查询
  - 财务报表生成
  - 部门过滤逻辑

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~25%
```

---

## Phase 5: 30% (增加5%)
**目标模块**: 交付服务
**预计测试用例**: 20-25个

### 测试内容
- 🔲 `delivery.service.ts` - 交付数据查询
  - 交付计划查询
  - 里程碑追踪
  - 交付状态更新
  - 风险预警逻辑

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~30%
```

---

## Phase 6: 35% (增加5%)
**目标模块**: 销售服务
**预计测试用例**: 20-25个

### 测试内容
- 🔲 `sales.service.ts` - 销售数据分析
  - 销售业绩统计
  - 合同金额汇总
  - 客户分析
  - 趋势预测

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~35%
```

---

## Phase 7: 40% (增加5%)
**目标模块**: 市场和法务服务
**预计测试用例**: 30-35个

### 测试内容
- 🔲 `market.service.ts` - 市场数据分析
  - 商机追踪
  - 合同来源分析
- 🔲 `legal.service.ts` - 法务合规检查
  - 风险条款提取
  - 合规性验证

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~40%
```

---

## Phase 8: 45% (增加5%)
**目标模块**: 管理层服务
**预计测试用例**: 20-25个

### 测试内容
- 🔲 `executive.service.ts` - 高管仪表盘
  - 综合数据聚合
  - KPI计算
  - 部门对比分析

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~45%
```

---

## Phase 9: 50% (增加5%)
**目标模块**: 解析服务
**预计测试用例**: 25-30个

### 测试内容
- 🔲 `parser.service.ts` - 合同解析引擎
  - PDF文本提取
  - 字段识别
  - 表格解析
  - 错误处理

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~50%
```

---

## Phase 10: 55% (增加5%)
**目标模块**: 标签服务
**预计测试用例**: 20-25个

### 测试内容
- 🔲 `tagging.service.ts` - 智能标签生成
  - 关键词提取
  - 标签分类
  - 标签推荐

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~55%
```

---

## Phase 11: 60% (增加5%)
**目标模块**: 风险引擎
**预计测试用例**: 25-30个

### 测试内容
- 🔲 `risk-engine.service.ts` - 风险评估
  - 风险规则引擎
  - 评分算法
  - 预警触发
  - 风险等级分类

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~60%
```

---

## Phase 12: 65% (增加5%)
**目标模块**: 向量搜索和分析服务
**预计测试用例**: 30-35个

### 测试内容
- 🔲 `vector-search.service.ts` - 向量搜索
  - 向量化逻辑
  - 相似度搜索
- 🔲 `analytics.service.ts` - 数据分析
  - 统计计算
  - 趋势分析

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~65%
```

---

## Phase 13: 70% (增加5%)
**目标模块**: 核心Resolvers (Auth, User, Department)
**预计测试用例**: 30-35个

### 测试内容
- 🔲 `auth.resolver.ts` - 认证GraphQL端点
  - login mutation测试
  - register mutation测试
  - changePassword mutation测试
  - JWT验证
- 🔲 `user.resolver.ts` - 用户管理GraphQL端点
- 🔲 `department.resolver.ts` - 部门管理GraphQL端点

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~70%
```

---

## Phase 14: 75% (增加5%)
**目标模块**: 业务Resolvers (Contract, Finance, Delivery)
**预计测试用例**: 30-35个

### 测试内容
- 🔲 `contract.resolver.ts` - 合同GraphQL端点
- 🔲 `finance.resolver.ts` - 财务GraphQL端点
- 🔲 `delivery.resolver.ts` - 交付GraphQL端点

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~75%
```

---

## Phase 15: 80% (增加5%)
**目标模块**: 业务Resolvers (Sales, Market, Legal, Executive)
**预计测试用例**: 35-40个

### 测试内容
- 🔲 `sales.resolver.ts`
- 🔲 `market.resolver.ts`
- 🔲 `legal.resolver.ts`
- 🔲 `executive.resolver.ts`

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~80%
```

---

## Phase 16: 85% (增加5%)
**目标模块**: 智能引擎Resolvers + 辅助模块
**预计测试用例**: 35-40个

### 测试内容
- 🔲 `parser.resolver.ts`
- 🔲 `tagging.resolver.ts`
- 🔲 `risk-engine.resolver.ts`
- 🔲 `vector-search.resolver.ts`
- 🔲 `analytics.resolver.ts`
- 🔲 `audit.resolver.ts`
- 🔲 `storage.resolver.ts`

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ~85%
```

---

## Phase 17: 90% (增加5%)
**目标模块**: 边界用例和集成测试补充
**预计测试用例**: 40-50个

### 测试内容
- 🔲 补充所有服务的边界用例
  - 错误处理场景
  - 并发操作
  - 事务回滚
  - 性能边界
- 🔲 补充所有Resolver的边界用例
  - 权限验证
  - 输入验证
  - 错误响应
- 🔲 集成测试（可选）
  - 跨服务调用
  - 端到端流程

### 验收标准
```bash
pnpm nx test api --coverage
# Coverage: ≥90% on all metrics (branches, functions, lines, statements)
```

---

## 测试模式和最佳实践

### Service测试模板
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { YourService } from './your.service';
import { PrismaService } from '../prisma/prisma.service';

describe('YourService', () => {
  let service: YourService;
  let prismaService: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    prismaService = mockDeep<PrismaClient>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  describe('methodName', () => {
    it('should handle normal case', async () => {
      // Arrange
      prismaService.model.method.mockResolvedValue(mockData as any);

      // Act
      const result = await service.method();

      // Assert
      expect(result).toEqual(expectedValue);
    });

    it('should throw error when validation fails', async () => {
      // Test error cases
    });
  });
});
```

### Resolver测试模板
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourResolver } from './your.resolver';
import { YourService } from './your.service';

describe('YourResolver', () => {
  let resolver: YourResolver;
  let service: jest.Mocked<YourService>;

  beforeEach(async () => {
    const mockService = {
      method: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourResolver,
        {
          provide: YourService,
          useValue: mockService,
        },
      ],
    }).compile();

    resolver = module.get<YourResolver>(YourResolver);
    service = module.get(YourService);
  });

  describe('query/mutation', () => {
    it('should call service and return result', async () => {
      service.method.mockResolvedValue(mockData);

      const result = await resolver.query(args);

      expect(service.method).toHaveBeenCalledWith(expectedArgs);
      expect(result).toEqual(expectedValue);
    });
  });
});
```

---

## 每个Phase的执行检查清单

### 开发阶段
- [ ] 创建.spec.ts文件
- [ ] 编写测试用例（覆盖正常流程）
- [ ] 补充边界用例测试
- [ ] 补充错误场景测试

### 验证阶段
- [ ] `pnpm nx test api` - 所有测试通过
- [ ] `pnpm nx test api --coverage` - 覆盖率达到目标
- [ ] `pnpm nx affected -t lint` - Lint检查通过
- [ ] `pnpm nx affected -t build` - 构建成功

### 提交阶段
- [ ] Git commit测试文件
- [ ] 更新TEST-STATUS-REPORT.md
- [ ] 输出当前覆盖率报告

---

## 覆盖率监控

### 查看详细覆盖率报告
```bash
pnpm nx test api --coverage
open coverage/apps/api/index.html
```

### 检查特定文件覆盖率
```bash
pnpm nx test api --coverage --coverageReporters=text
```

### 只测试特定模块
```bash
pnpm nx test api --testPathPattern="contract"
```

---

## 风险和缓解措施

### 风险1: Prisma类型复杂度
**缓解**: 持续使用jest-mock-extended，必要时使用`as any`

### 风险2: 覆盖率增长不均衡
**缓解**: 每个Phase后检查详细报告，识别低覆盖区域

### 风险3: 测试维护成本高
**缓解**: 抽取公共测试工具函数到test-helpers/

### 风险4: Mock数据过多
**缓解**: 创建factories或fixtures统一管理mock数据

---

## 预计总工作量

- **总测试套件**: ~35个 (19服务 + 18resolvers - 2已完成)
- **总测试用例**: ~500-600个
- **预计时间**: 按每个Phase 2-3小时，总计约40-50小时
- **分17个迭代**: 每个迭代增加约30-35个测试用例

---

## 成功标准

### 数量指标
- ✅ 覆盖率 ≥ 90% (branches, functions, lines, statements)
- ✅ 所有Service都有对应.spec.ts文件
- ✅ 所有Resolver都有对应.spec.ts文件
- ✅ 每个Service至少10个测试用例
- ✅ 每个Resolver至少5个测试用例

### 质量指标
- ✅ 所有测试通过
- ✅ 无console.warn/error输出
- ✅ Lint检查通过
- ✅ 构建成功

### 可维护性指标
- ✅ 测试代码有清晰的AAA结构（Arrange-Act-Assert）
- ✅ Mock数据有复用性
- ✅ 测试描述清晰（it语句易懂）
- ✅ 无重复代码

---

## 开始执行

准备就绪后，从Phase 1开始执行：

```bash
# 开始Phase 1
echo "Starting Phase 1: Department Service Tests"
pnpm nx test api --testFile=department.service.spec.ts --watch
```

**当前状态**: 📋 计划已制定，等待确认后开始Phase 1
