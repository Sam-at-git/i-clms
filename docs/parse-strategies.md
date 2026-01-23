# 合同解析策略详细说明

> 本文档详细描述了 i-CLMS 系统中实现的各种合同解析策略及其技术细节。

---

## 目录

1. [策略架构概览](#策略架构概览)
2. [规则解析策略 (RULE)](#规则解析策略-rule)
3. [LLM智能解析策略 (LLM)](#llm智能解析策略-llm)
4. [Docling解析策略 (DOCLING)](#docling解析策略-docling)
5. [RAG向量检索策略 (RAG)](#rag向量检索策略-rag)
6. [多策略交叉验证 (MULTI)](#多策略交叉验证-multi)
7. [混合解析策略 (Hybrid)](#混合解析策略-hybrid)
8. [策略选择与配置](#策略选择与配置)

---

## 策略架构概览

### 策略接口定义

所有解析策略都实现统一的 `ParseStrategyExecutor` 接口：

```typescript
interface ParseStrategyExecutor {
  readonly name: ParseStrategy;  // 策略名称
  parse(content: string, options: ParseOptions): Promise<ParseResult>;
  isAvailable(): boolean;        // 策略是否可用
  getPriority(): number;         // 优先级（数值越大越优先）
}

enum ParseStrategy {
  RULE = 'rule',      // 规则解析
  LLM = 'llm',        // LLM智能解析
  DOCLING = 'docling', // Docling解析
  RAG = 'rag',        // RAG向量检索
}
```

### 策略管理器 (StrategyManagerService)

`StrategyManagerService` 负责管理所有策略：

- **自动发现**：模块初始化时自动发现并注册所有策略
- **可用性检测**：检查每个策略的 `isAvailable()` 状态
- **优先级排序**：按 `getPriority()` 对可用策略排序
- **执行调度**：支持单策略、多策略并行、全部可用策略执行

### 策略对比

| 策略 | 速度 | 成本 | 准确率 | 适用场景 |
|------|------|------|--------|----------|
| RULE | 秒级 | 免费 | ~70% | 格式规范的合同 |
| LLM | 30-60秒 | 低-中 | ~90% | 复杂/格式灵活的合同 |
| DOCLING | 10-20秒 | 免费 | ~85% | 包含复杂表格/扫描件 |
| RAG | 5-15秒 | 低 | ~88% | 特定字段精准提取 |
| MULTI | 60-120秒 | 高 | ~95% | 高可靠性要求 |

---

## 规则解析策略 (RULE)

### 概述

基于正则表达式的快速解析，适合格式规范的合同。这是最快且零成本的解析方式。

### 实现位置

- **服务类**：`ParserService` (`apps/api/src/parser/parser.service.ts`)
- **字段提取器**：`FieldExtractorService` (`apps/api/src/parser/extractors/field-extractor.service.ts`)
- **文档提取器**：
  - `WordExtractor` - DOCX文档提取
  - `PdfExtractor` - PDF文档提取

### 提取字段

```typescript
// 支持提取的字段
const extractedFields = {
  // 基本信息字段
  contractNo: string,        // 合同编号
  name: string,              // 合同名称
  customerName: string,      // 客户名称（甲方）
  ourEntity: string,         // 我方主体（乙方）
  type: string,              // 合同类型

  // 财务字段
  amountWithTax: string,     // 含税金额
  amountWithoutTax: string,  // 不含税金额
  taxRate: string,           // 税率
  paymentTerms: string,      // 付款条件
  paymentMethod: string,     // 付款方式

  // 时间字段
  signedAt: string,          // 签订日期
  effectiveAt: string,       // 生效日期
  expiresAt: string,         // 到期日期
  duration: string,          // 合同期限

  // 其他字段
  salesPerson: string,       // 销售负责人
  industry: string,          // 所属行业
  signLocation: string,      // 签订地点
  copies: number,            // 合同份数
  currency: string,          // 币种
};
```

### 正则模式示例

```typescript
// 合同编号模式
/合同编号[：:]\s*([A-Z0-9\-]+)/

// 金额模式（支持千分位）
/合同金额[：:]\s*[¥￥]?\s*([0-9,.,，]+)/

// 日期模式
/(20\d{2})[-年](0?[1-9]|1[0-2])[-月](0?[1-9]|[12]\d|3[01])[日]?/
```

### 优缺点

**优点**：
- 极速解析（秒级响应）
- 完全免费，无外部依赖
- 可定制正则规则
- 对标准格式合同效果好

**缺点**：
- 仅支持固定格式
- 准确率依赖模板匹配
- 无法处理格式变化

### 使用场景

1. 供应商提供的标准格式合同
2. 历史合同批量处理
3. 快速预览合同信息

---

## LLM智能解析策略 (LLM)

### 概述

使用大语言模型进行智能提取，适合复杂和格式灵活的合同。支持多种LLM提供商（OpenAI、Ollama）。

### 实现位置

- **主服务**：`LlmParserService` (`apps/api/src/llm-parser/llm-parser.service.ts`)
- **LLM客户端**：`LlmClientService` (`apps/api/src/llm-parser/llm-client.service.ts`)
- **配置服务**：`LlmConfigService` (`apps/api/src/llm-parser/config/llm-config.service.ts`)
- **任务化解析器**：`TaskBasedParserService` (`apps/api/src/llm-parser/task-based-parser.service.ts`)

### 核心特性

#### 1. 任务化解析 (Task-Based Parsing)

将合同信息提取分解为8个独立任务，串行执行：

```typescript
enum InfoType {
  BASIC_INFO = 'BASIC_INFO',         // 基本信息
  FINANCIAL = 'FINANCIAL',           // 财务信息
  TIME_INFO = 'TIME_INFO',           // 时间信息
  MILESTONES = 'MILESTONES',         // 项目里程碑
  RATE_ITEMS = 'RATE_ITEMS',         // 人力费率
  LINE_ITEMS = 'LINE_ITEMS',         // 产品清单
  RISK_CLAUSES = 'RISK_CLAUSES',     // 风险条款
  DELIVERABLES = 'DELIVERABLES',     // 交付物
}
```

每个任务有：
- 专门的系统提示词
- 目标字段列表
- 独立的错误处理
- 进度跟踪支持

#### 2. 语义分段 (Semantic Chunking)

在LLM调用前进行智能分段：

```typescript
interface SemanticChunk {
  id: string;
  text: string;
  metadata: {
    type: 'header' | 'article' | 'schedule' | 'financial' | 'party' | 'signature' | 'other';
    title?: string;
    priority: number;
    fieldRelevance: string[];
  };
  position: {
    start: number;
    end: number;
    pageHint?: number;
  };
}
```

分段策略：
1. 优先按Markdown章节标题分割（`#`, `##`, `###`）
2. 回退到合同结构分割（header/financial/schedule/party/article）
3. 为每个chunk标记相关字段，支持RAG检索

#### 3. 分段策略 (Chunking Strategy)

根据文档长度智能选择：

```typescript
interface ChunkingResult {
  strategy: 'single' | 'multi-segment';
  chunks: TextChunk[];
  reason: string;
}
```

- **单次调用**：文档长度 ≤ 3000字符
- **多段分割**：文档长度 > 3000字符，按语义边界分割

### LLM提供商支持

#### OpenAI

```typescript
// 配置示例
{
  provider: 'openai',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'sk-xxx',
  model: 'gpt-4o',
  temperature: 0.1,
  maxTokens: 4000,
  timeout: 120000
}
```

#### Ollama (本地)

```typescript
// 配置示例
{
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  apiKey: 'ollama',  // Ollama不需要真实API Key
  model: 'gemma3:27b',
  temperature: 0.1,
  maxTokens: 4000,
  timeout: 120000
}
```

### 完整性检查机制

```typescript
interface CompletenessResult {
  score: number;           // 0-100分
  needsLlm: boolean;       // 是否需要LLM
  missingFields: string[]; // 缺失字段
  reason: string;          // 原因说明
}
```

**评分标准**（总分100）：
- 基本信息字段（合同编号、名称、双方）：40分
- 财务字段（金额、税率）：30分
- 时间字段（签订日期、期限）：20分
- 其他字段：10分

**决策逻辑**：
- **得分 ≥ 70**：直接使用程序解析结果
- **得分 50-69**：LLM验证模式（检查并修正）
- **得分 < 50**：LLM完整提取模式

### 提示词工程

#### 系统提示词模板

```
你是一个专业的合同信息提取助手。

请从合同文本中提取以下字段：
- contractNo: 合同编号
- contractName: 合同名称
- customerName: 客户名称（甲方）
- ourEntity: 我方主体（乙方）
- contractType: 合同类型（必须是: STAFF_AUGMENTATION/PROJECT_OUTSOURCING/PRODUCT_SALES之一）

严格按照JSON格式输出，未找到的字段设为null。
```

#### 用户提示词模板

```
请从以下合同文本中提取基本信息：

【合同文本】
${relevantText}

【需要提取的字段】
请提取以下字段并以JSON格式输出：
{
  "contractNumber": "合同编号",
  "contractName": "合同名称",
  ...
}
```

### 优缺点

**优点**：
- 准确率高（~90%）
- 支持各种格式
- 语义理解能力强
- 进度可跟踪

**缺点**：
- 需要LLM服务
- 有API成本（除非使用本地Ollama）
- 速度较慢（30-60秒）

### 使用场景

1. 格式不规范的合同
2. 需要高准确率的场景
3. 复杂合同结构

---

## Docling解析策略 (DOCLING)

### 概述

使用IBM Docling进行文档解析，支持复杂表格和OCR。适合包含大量表格或扫描件的合同。

### 实现位置

- **Docling服务**：`DoclingService` (`apps/api/src/docling/docling.service.ts`)
- **Docling策略**：`DoclingParseStrategy` (`apps/api/src/llm-parser/strategies/docling-parse.strategy.ts`)
- **Python包装器**：`scripts/docling_wrapper.py`

### 环境要求

```bash
# Python 3.8+
python3 --version

# 安装Docling
pip install docling

# 可选：OCR支持
pip install docling-legacy
```

### 核心功能

#### 1. 文档转Markdown

```typescript
interface DoclingConvertOptions {
  ocr?: boolean;            // 启用OCR（扫描件）
  withTables?: boolean;     // 提取表格
  withImages?: boolean;     // 提取图片
  preserveHeaders?: boolean; // 保留章节标题
}

interface DoclingConvertResult {
  markdown: string;         // Markdown文本
  tables: DoclingTable[];   // 提取的表格
  pages: number;            // 页数
  images: DoclingImage[];   // 提取的图片
  success: boolean;
  error?: string;
}
```

#### 2. 表格提取

Docling能够识别并提取表格，保留其Markdown格式：

```typescript
interface DoclingTable {
  markdown: string;  // Markdown格式的表格
  rows: number;      // 行数
  cols: number;      // 列数
}
```

#### 3. 字段提取

从Markdown输出中提取字段：

```typescript
// 字段配置
private readonly fieldConfigs: Record<string, DoclingFieldConfig> = {
  contractNo: {
    pattern: /合同编号[：:]\s*([^\n]+)/,
  },
  contractAmount: {
    pattern: /合同金额[：:]\s*[¥￥]?\s*([0-9,.,，]+)\s*/,
    transform: (v: string) => parseFloat(v.replace(/,/g, '').replace(/，/g, '')),
  },
  // ... 更多字段
};
```

### 表格数据提取

Docling策略特别擅长提取三种类型的表格数据：

#### 里程碑表格 (Milestones)

```markdown
| 名称 | 金额 | 比例 | 计划日期 |
|------|------|------|----------|
| 合同生效 | 468000 | 30% | 2024-01-15 |
| 原型完成 | 468000 | 30% | 2024-03-31 |
```

#### 费率表格 (Rate Items)

```markdown
| 角色 | 费率 | 单位 |
|------|------|------|
| 高级工程师 | 800 | HOURLY |
| 项目经理 | 45000 | MONTHLY |
```

#### 产品清单表格 (Line Items)

```markdown
| 产品名称 | 数量 | 单位 | 单价 |
|----------|------|------|------|
| 管理软件V1.0 | 100 | 用户 | 500 |
```

### 优缺点

**优点**：
- 表格识别能力强
- 支持扫描件（OCR）
- 格式保留好
- 完全免费

**缺点**：
- 需要Python环境
- 首次使用需安装
- 处理较慢

### 使用场景

1. 包含复杂表格的合同
2. 扫描件/PDF图片合同
3. 需要保留文档格式的场景

---

## RAG向量检索策略 (RAG)

### 概述

基于向量语义搜索的精准提取，通过语义分段和字段相关性匹配，只对相关chunks进行LLM提取。

### 实现位置

- **RAG解析服务**：`RagEnhancedParserService` (`apps/api/src/llm-parser/rag-enhanced-parser.service.ts`)
- **向量存储服务**：`VectorStoreService` (`apps/api/src/vector-store/vector-store.service.ts`)
- **RAG服务**：`RAGService` (`apps/api/src/rag/rag.service.ts`)

### 核心流程

```
1. 语义分段 (Semantic Chunking)
   ↓
2. 字段相关性计算 (Field Relevance)
   ↓
3. 提取策略决策 (Strategy Decision)
   ↓
4. 分组执行 (Grouped Execution)
   ├─ 直接提取 (Direct): 正则匹配
   ├─ LLM提取 (LLM): 使用相关chunks
   └─ 混合提取 (Hybrid): 先正则后LLM验证
```

### 字段相关性计算

```typescript
interface FieldExtractionPlan {
  field: string;
  relevantChunks: SemanticChunk[];
  strategy: 'direct' | 'llm' | 'hybrid';
  confidence: number;
}
```

计算因子：
1. **metadata.fieldRelevance**：chunk预设的相关字段 (权重0.5)
2. **类型匹配**：chunk类型与字段类型的匹配度 (权重0.3)
3. **关键词匹配**：TF-IDF简化的关键词出现次数 (权重0.2/次)

### 策略决策

```typescript
// 相关性得分 → 策略映射
if (topScore > 0.8) {
  strategy = 'direct';    // 直接正则提取
} else if (topScore > 0.4) {
  strategy = 'hybrid';    // 先正则，后LLM验证
} else {
  strategy = 'llm';       // 完全使用LLM
}
```

### 字段关键词词典

```typescript
private readonly FIELD_KEYWORDS: Record<string, string[]> = {
  contractNo: ['合同编号', '合同号', '协议编号', 'No.', 'contract No'],
  amountWithTax: ['含税金额', '合同总价', '总价款', '含税价'],
  signedAt: ['签订日期', '签署日期', '签字日期'],
  // ... 20+字段的完整词典
};
```

### 优缺点

**优点**：
- 语义理解强
- 可复用知识
- 适合特定字段
- 可索引历史合同

**缺点**：
- 需要向量数据库
- 需要Embedding模型
- 首次索引慢

### 使用场景

1. 特定字段的高精度提取
2. 历史合同的知识复用
3. 需要上下文理解的复杂字段

---

## 多策略交叉验证 (MULTI)

### 概述

使用多种策略解析并投票，最准确的结果。通过交叉验证提高可靠性，检测并解决解析冲突。

### 实现位置

- **多策略服务**：`MultiStrategyService` (`apps/api/src/llm-parser/multi-strategy.service.ts`)
- **投票服务**：`VotingService` (`apps/api/src/llm-parser/voting.service.ts`)
- **LLM评估器**：`LLMEvaluatorService` (`apps/api/src/llm-parser/evaluation/llm-evaluator.service.ts`)

### 核心流程

```
1. 并行执行多种策略
   ├─ RULE策略
   ├─ LLM策略
   ├─ DOCLING策略
   └─ RAG策略
   ↓
2. 收集所有策略结果
   ↓
3. 投票机制 (Voting)
   ├─ 一致性检测
   ├─ 多数表决
   └─ 置信度加权
   ↓
4. 冲突解决 (Conflict Resolution)
   ├─ LLM仲裁
   ├─ 用户选择
   └─ 优先级规则
   ↓
5. 合并最终结果
```

### 投票机制

```typescript
interface VoteConfig {
  strategy: 'majority' | 'weighted' | 'priority';
  weights: Record<ParseStrategy, number>;
  tieBreaker: 'highest-priority' | 'most-confident' | 'llm-decides';
}

interface VoteResult {
  fieldName: string;
  agreedValue: any;
  confidence: number;
  needsResolution: boolean;
  votes: Array<{
    strategy: ParseStrategy;
    value: any;
    confidence: number;
  }>;
  resolutionMethod?: 'llm' | 'user' | 'priority';
}
```

### 冲突解决

#### LLM仲裁

```typescript
// LLM评估冲突字段
interface ConflictEvaluation {
  fieldName: string;
  values: any[];
  evaluation: {
    value: any;
    confidence: number;
    reasoning: string;
  };
}
```

#### 用户选择

前端展示冲突，用户手动选择：
```
字段: contractAmount
  RULE: 1,500,000 (confidence: 0.7)
  LLM:  1,560,000 (confidence: 0.9)  ← 推荐
  DOCLING: 1,500,000 (confidence: 0.8)

[ ] 使用RULE值
[x] 使用LLM值 (推荐)
[ ] 使用DOCLING值
[ ] 自定义: _______
```

### 优缺点

**优点**：
- 准确率最高（~95%）
- 可靠性强
- 错误检测能力
- 可追溯来源

**缺点**：
- 耗时最长（60-120秒）
- 成本最高
- 需要多种策略可用

### 使用场景

1. 高价值合同
2. 法律合规要求
3. 审计场景

---

## 混合解析策略 (Hybrid)

### 概述

LlmParserService实现的默认策略，根据程序解析的完整性智能选择解析模式。

### 决策流程图

```
文档上传
    ↓
┌─────────────────────────────┐
│  阶段1: 程序解析            │
│  ParserService.extractText() │
└──────────┬──────────────────┘
           ↓
┌─────────────────────────────┐
│  阶段2: 完整性检查          │
│  CompletenessChecker.check() │
└──────────┬──────────────────┘
           ↓
     得分 >= 70?
    ┌─────┴─────┐
    ↓ Yes      ↓ No
 直接返回   得分 >= 50?
 程序结果   ┌─────┴─────┐
           ↓ Yes      ↓ No
        验证模式    完整提取
      (LLM修正)  (LLM全提取)
```

### 三种模式

#### 模式1: 直接使用 (DIRECT_USE)

**触发条件**：完整性得分 ≥ 70

```typescript
{
  usedLlm: false,
  usedValidation: false,
  reason: "程序解析得分85分，信息完整，无需LLM",
  programParseScore: 85
}
```

#### 模式2: LLM验证 (LLM_VALIDATION)

**触发条件**：50 ≤ 完整性得分 < 70

```typescript
// LLM验证程序提取的字段
const validationResult = await callLlmForValidation(text, programFields);

// 应用修正
const correctedFields = applyValidationCorrections(programFields, validationResult);
```

**验证字段**：
```json
{
  "validationResults": [
    {
      "field": "合同编号",
      "programValue": "ICLMS-2024-001",
      "isCorrect": true
    },
    {
      "field": "含税金额",
      "programValue": "1500000",
      "isCorrect": false,
      "correctedValue": "1560000",
      "reason": "合同中实际金额为156万元"
    }
  ]
}
```

#### 模式3: LLM完整提取 (LLM_FULL_EXTRACTION)

**触发条件**：完整性得分 < 50 或 验证失败

```typescript
// 确定优先提取的字段
const priorityFields = completenessChecker.identifyPriorityFields(missingFields);

// 确定分段策略
const chunkingResult = chunkingStrategy.determineStrategy(text, priorityFields);

// 调用LLM提取
if (USE_TASK_BASED_PARSING && taskBasedParser) {
  // 任务化解析（推荐）
  const result = await taskBasedParser.parseByTasks(text, undefined, sessionId);
} else if (chunkingResult.strategy === 'single') {
  // 单次LLM调用
  const result = await callLlmForFullExtraction(text, priorityFields);
} else {
  // 分段LLM调用
  const result = await callLlmForSegmentedExtraction(chunks, priorityFields);
}
```

### 结果合并

```typescript
interface MergedResult {
  // 程序解析的高置信度字段
  programFields: Record<string, any>;

  // LLM填补的缺失字段
  llmFields: Record<string, any>;

  // 合并策略：优先使用程序解析，LLM补充缺失
  mergeStrategy: 'program-priority';
}
```

### 优缺点

**优点**：
- 智能选择，成本优化
- 兼顾速度和准确率
- 透明度好，可解释

**缺点**：
- 逻辑复杂
- 需要调优阈值

---

## 策略选择与配置

### 策略选择服务 (ParseStrategyService)

提供策略信息和配置管理：

```typescript
interface StrategyInfo {
  type: ParseStrategyType;
  name: string;              // 显示名称
  description: string;       // 描述
  features: string[];        // 特性列表
  pros: string[];            // 优点
  cons: string[];            // 缺点
  available: boolean;        // 是否可用
  averageTime: number;       // 平均耗时（秒）
  accuracy: number;          // 准确率（%）
  cost: StrategyCost;        // 成本等级
  errorMessage?: string;     // 不可用原因
}

enum StrategyCost {
  FREE = 'FREE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}
```

### 获取可用策略

```typescript
const strategies = await parseStrategyService.getAvailableStrategies();
```

返回示例：

```json
[
  {
    "type": "RULE",
    "name": "规则解析",
    "description": "基于正则表达式的快速解析，适合格式规范的合同",
    "features": ["极速解析", "零成本", "支持标准格式"],
    "available": true,
    "averageTime": 1,
    "accuracy": 70,
    "cost": "FREE"
  },
  {
    "type": "LLM",
    "name": "LLM智能解析",
    "description": "使用大语言模型进行智能提取，适合复杂合同",
    "features": ["深度理解", "格式灵活", "任务化解析"],
    "available": true,
    "averageTime": 30,
    "accuracy": 90,
    "cost": "LOW"  // Ollama本地模型
  }
]
```

### 策略配置

```typescript
interface ParseStrategyConfig {
  defaultStrategy: ParseStrategyType;
  enabledStrategies: ParseStrategyType[];
  autoMultiStrategy: boolean;
  multiStrategyThreshold: number;  // 0-100
  multiStrategyVoters: ParseStrategyType[];
}
```

**更新配置**：

```typescript
const updatedConfig = parseStrategyService.updateStrategyConfig({
  defaultStrategy: ParseStrategyType.LLM,
  autoMultiStrategy: true,
  multiStrategyThreshold: 70,
  multiStrategyVoters: [
    ParseStrategyType.RULE,
    ParseStrategyType.LLM,
    ParseStrategyType.DOCLING
  ]
});
```

### 策略测试

```typescript
// 测试单个策略
const result = await parseStrategyService.testStrategyAvailability(ParseStrategyType.LLM);

// 测试所有策略
const allResults = await parseStrategyService.testAllStrategies();
```

---

## 附录

### A. 策略优先级

| 策略 | 优先级数值 | 说明 |
|------|-----------|------|
| RULE | 3 | 格式规范时优先 |
| DOCLING | 2 | 表格复杂时优先 |
| LLM | 1 | 通用智能解析 |
| RAG | 1 | 特定字段精准提取 |

### B. 配置环境变量

```bash
# LLM配置
ACTIVE_LLM_PROVIDER=ollama  # openai | ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=gemma3:27b
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=4000
LLM_TIMEOUT=120000

# Docling配置
DOCLING_ENABLED=true
DOCLING_PYTHON_COMMAND=python3

# RAG配置
RAG_ENABLED=true
RAG_EMBEDDING_PROVIDER=ollama  # openai | ollama
RAG_VECTOR_DB_PATH=./data/vectors
```

### C. 调试日志

```bash
# 查看LLM解析日志
cat /tmp/llm-parser-debug.log

# 查看任务化解析日志
cat /tmp/task-based-parser-debug.log
```

### D. 相关Spec

- Spec 18: 混合策略解析
- Spec 24: Docling集成
- Spec 25: Docling提取策略
- Spec 28: 策略选择器UI
- Spec 29: 多策略比较和投票机制
