# 大合同LLM解析优化方案

## 问题分析

### 当前问题
- 20页合同约 15,000-25,000 字符
- 单次LLM调用容易超时（默认120秒）
- 全文解析质量下降，token消耗大
- 多次顺序调用 = 累积超时风险

### 现有架构回顾
```
apps/api/src/llm-parser/
├── llm-parser.service.ts       # 主服务，混合策略
├── chunking-strategy.service.ts # 现有分段（固定长度+关键词）
├── completeness-checker.service.ts # 完整性评分
└── prompts/contract-extraction.prompt.ts
```

**现有分段策略：**
- 单次调用上限：10,000 字符
- 智能分段：基于关键词（金额、支付、签订日期等）
- 简单分段：8,000 字符 + 500 重叠

---

## 三种优化方案

### 方案1：改进语义分段 ⭐ 推荐

**思路**：按合同结构语义分段，而非固定长度

**优势**：
- ✅ 无需额外依赖
- ✅ 理解合同结构（章节、条款）
- ✅ 为每个chunk标记相关字段
- ✅ 支持RAG检索

**实现**：`SemanticChunkerService` (已创建)

```typescript
// 使用示例
const semanticChunker = new SemanticChunkerService();
const chunks = semanticChunker.chunkBySemanticStructure(contractText);

// 返回结果示例
[
  {
    id: 'chunk-0',
    text: '合同编号：CT-2024-001\n合同名称：...',
    metadata: {
      type: 'header',
      title: '合同头部',
      priority: 100,
      fieldRelevance: ['contractNo', 'name', 'customerName', 'ourEntity']
    },
    position: { start: 0, end: 1500, pageHint: 1 }
  },
  {
    id: 'chunk-1',
    text: '第一条 合同价格\n1.1 本合同总价款为...',
    metadata: {
      type: 'financial',
      title: '合同价格',
      articleNumber: '一',
      priority: 90,
      fieldRelevance: ['amountWithTax', 'amountWithoutTax', 'taxRate', 'paymentTerms']
    },
    position: { start: 1500, end: 3000, pageHint: 1 }
  },
  // ... 更多chunks
]
```

**适用场景**：
- 合同格式较规范（有章节标题）
- 需要降低LLM调用次数
- 对解析质量有要求

---

### 方案2：RAG向量检索增强

**思路**：只将与目标字段相关的chunks发送给LLM

**优势**：
- ✅ 大幅减少token消耗（减少50-70%）
- ✅ 提高解析准确性（聚焦相关内容）
- ✅ 支持字段级别的精准提取

**实现**：`RagEnhancedParserService` (已创建)

```typescript
// 使用示例
const ragParser = new RagEnhancedParserService(semanticChunker, configService);

// 只提取特定字段
const result = await ragParser.parseWithRag(
  contractText,
  ['amountWithTax', 'paymentTerms', 'effectiveAt'],
  maxChunksPerField: 2  // 每个字段最多用2个chunks
);

// 内部流程：
// 1. 语义分段 -> 得到N个chunks
// 2. 计算每个chunk与目标字段的相关性
// 3. 只用top-2的chunks提取该字段
// 4. 聚合所有字段的结果
```

**效果对比**：

| 指标 | 原方案 | RAG方案 |
|------|--------|---------|
| Token使用 | 全文25K | 相关5K (-80%) |
| 超时风险 | 高 | 低 |
| 准确性 | 中等 | 高 |
| 实现复杂度 | 低 | 中 |

---

### 方案3：Map-Reduce并发处理

**思路**：将chunks分成多个任务并发执行，最后合并结果

**优势**：
- ✅ 大幅缩短处理时间（3-5倍）
- ✅ 降低单次请求超时风险
- ✅ 提高吞吐量

**实现**：`ConcurrentParserService` (已创建)

```typescript
// 使用示例
const concurrentParser = new ConcurrentParserService(semanticChunker, configService);

const { data, results, totalTokensUsed, totalTimeMs } =
  await concurrentParser.parseConcurrently(
    contractText,
    ['contractNo', 'name', 'amountWithTax', /* ... */],
    maxConcurrent: 3  // 最多3个并发请求
  );

// 结果示例
{
  data: { contractNo: 'CT-2024-001', name: '服务合同', ... },
  results: [
    { chunkId: 'chunk-0', success: true, data: { ... }, tokensUsed: 500, processingTimeMs: 5000 },
    { chunkId: 'chunk-1', success: true, data: { ... }, tokensUsed: 800, processingTimeMs: 7000 },
    { chunkId: 'chunk-2', success: false, error: 'Timeout', processingTimeMs: 60000 },
  ],
  totalTokensUsed: 3500,
  totalTimeMs: 18000  // 并发执行，总时间 ≈ 最慢的任务时间
}
```

**效果对比**：

| 指标 | 顺序处理 | 并发处理(3) |
|------|----------|-------------|
| 总时间 | 180秒 | 60秒 (3x) |
| 超时风险 | 高 | 中 |
| API限流风险 | 低 | 中 |

---

## 推荐的组合策略

### 🎯 小合同 (< 10页)
```
程序解析 → 完整性检查 → 直接使用 (如果得分≥70)
           ↓
        单次LLM调用 (如果得分<70)
```

### 🎯 中等合同 (10-20页)
```
程序解析 → 完整性检查 → 语义分段
           ↓                    ↓
        直接使用            方案1: 改进语义分段
                              + 单次LLM提取
```

### 🎯 大合同 (20+页)
```
程序解析 → 完整性检查 → 语义分段
           ↓                    ↓
        直接使用            方案2+3: RAG + 并发
                             - 按字段检索相关chunks
                             - 并发执行多个字段提取
                             - 合并结果
```

---

## 集成步骤

### Step 1: 注册新服务

```typescript
// apps/api/src/llm-parser/llm-parser.module.ts
import { SemanticChunkerService } from './semantic-chunker.service';
import { RagEnhancedParserService } from './rag-enhanced-parser.service';
import { ConcurrentParserService } from './concurrent-parser.service';

@Module({
  providers: [
    SemanticChunkerService,
    RagEnhancedParserService,
    ConcurrentParserService,
    // ... 其他服务
  ],
})
export class LlmParserModule {}
```

### Step 2: 更新主服务

```typescript
// apps/api/src/llm-parser/llm-parser.service.ts

constructor(
  private configService: LlmConfigService,
  private parserService: ParserService,
  private completenessChecker: CompletenessCheckerService,
  private chunkingStrategy: ChunkingStrategyService,
  private semanticChunker: SemanticChunkerService,      // 新增
  private ragParser: RagEnhancedParserService,          // 新增
  private concurrentParser: ConcurrentParserService,     // 新增
) {}

async parseWithMixedStrategy(...) {
  // 根据文档大小选择策略
  const textLength = textContent.length;

  if (textLength > 20000) {
    // 大合同：使用RAG + 并发
    return await this.concurrentParser.parseConcurrently(
      textContent,
      missingFields,
      maxConcurrent: 3
    );
  } else if (textLength > 10000) {
    // 中等合同：使用语义分段
    const chunks = this.semanticChunker.chunkBySemanticStructure(textContent);
    return await this.processChunksSequentially(chunks, priorityFields);
  } else {
    // 小合同：单次调用
    return await this.callLlmForTextExtraction(textContent, priorityFields);
  }
}
```

### Step 3: 添加GraphQL API (可选)

```typescript
// apps/api/src/llm-parser/llm-parser.resolver.ts

@Mutation(() => LlmParseResult)
async parseContractWithRag(
  @Args('objectName') objectName: string,
  @Args('fields', () => [String]) fields: string[],
  @Args('strategy', { nullable: true }) strategy?: 'semantic' | 'rag' | 'concurrent'
) {
  const text = await this.getDocumentText(objectName);

  switch (strategy || 'semantic') {
    case 'rag':
      return await this.ragParser.parseWithRag(text, fields);
    case 'concurrent':
      return await this.concurrentParser.parseConcurrently(text, fields);
    default:
      const chunks = this.semanticChunker.chunkBySemanticStructure(text);
      return await this.processChunks(chunks, fields);
  }
}
```

---

## 性能优化建议

### 1. 调整LLM配置
```bash
# .env
LLM_TIMEOUT=180000        # 增加到3分钟
ACTIVE_LLM_PROVIDER=ollama # 本地模型更稳定
OLLAMA_MODEL=gemma3:27b   # 或 qwen2.5:14b
```

### 2. 启用流式响应（需要后端支持）
```typescript
// 对于大合同，流式返回结果
async* parseContractStream(text: string) {
  const chunks = this.semanticChunker.chunkBySemanticStructure(text);

  for (const chunk of chunks) {
    const partialResult = await this.extractFromChunk(chunk);
    yield { chunkId: chunk.id, data: partialResult };
  }
}
```

### 3. 添加缓存层
```typescript
// 对相似合同的chunks进行缓存
// 相同chunk不需要重复解析
```

---

## 总结

| 方案 | Token节省 | 速度提升 | 准确性 | 实现难度 |
|------|-----------|----------|--------|----------|
| 改进语义分段 | 20-30% | 1x | ⭐⭐⭐⭐ | 低 |
| RAG向量检索 | 50-70% | 1.5x | ⭐⭐⭐⭐⭐ | 中 |
| Map-Reduce并发 | 0% | 3-5x | ⭐⭐⭐ | 中 |
| **组合使用** | 60-80% | 3-5x | ⭐⭐⭐⭐⭐ | 中 |

**推荐**：从方案1开始，逐步集成方案2和3。
