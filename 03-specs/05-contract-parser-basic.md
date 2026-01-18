# 05-contract-parser-basic.md

## 概述
实现合同文档解析服务，支持从PDF和Word文档中提取文本内容和基础合同字段。

## 依赖
- 04-file-storage.md (文件存储服务)

## 技术选型
- **PDF解析**: pdf-parse (基于pdf.js)
- **Word解析**: mammoth.js
- **字段提取**: 正则表达式 + 规则引擎

## 目录结构
```
apps/api/src/
├── parser/
│   ├── index.ts
│   ├── parser.module.ts
│   ├── parser.service.ts
│   ├── parser.resolver.ts
│   ├── extractors/
│   │   ├── index.ts
│   │   ├── pdf.extractor.ts
│   │   ├── word.extractor.ts
│   │   └── field.extractor.ts
│   └── dto/
│       ├── index.ts
│       ├── parse-result.dto.ts
│       └── extracted-fields.dto.ts
```

## 实现内容

### 1. 依赖安装
```bash
pnpm add pdf-parse mammoth
pnpm add -D @types/pdf-parse
```

### 2. PDF文本提取 (pdf.extractor.ts)
```typescript
export class PdfExtractor {
  async extract(buffer: Buffer): Promise<ExtractedContent> {
    // 使用pdf-parse提取文本
    // 返回: text, pageCount, metadata
  }
}
```

### 3. Word文档解析 (word.extractor.ts)
```typescript
export class WordExtractor {
  async extract(buffer: Buffer): Promise<ExtractedContent> {
    // 使用mammoth.js提取文本和结构
    // 返回: text, paragraphs, metadata
  }
}
```

### 4. 字段提取器 (field.extractor.ts)
基础合同字段提取规则：
- 合同编号: `合同编号[:：]\s*([A-Z0-9-]+)`
- 合同名称: `合同名称[:：]\s*(.+)`
- 甲方: `甲方[:：]\s*(.+)`
- 乙方: `乙方[:：]\s*(.+)`
- 签订日期: `签订日期[:：]\s*(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})`
- 合同金额: `合同金额[:：]\s*[¥￥]?\s*([\d,]+\.?\d*)`
- 有效期: `有效期[:：]\s*(.+)`

### 5. Parser服务 (parser.service.ts)
```typescript
@Injectable()
export class ParserService {
  async parseDocument(objectName: string): Promise<ParseResult>
  async parseBuffer(buffer: Buffer, mimeType: string): Promise<ParseResult>
  async extractFields(text: string): Promise<ExtractedFields>
}
```

### 6. GraphQL Resolver
```graphql
type ParseResult {
  success: Boolean!
  text: String
  pageCount: Int
  extractedFields: ExtractedFields
  error: String
}

type ExtractedFields {
  contractNumber: String
  contractName: String
  partyA: String
  partyB: String
  signDate: String
  amount: String
  validPeriod: String
  rawMatches: [FieldMatch!]!
}

type FieldMatch {
  field: String!
  value: String!
  confidence: Float!
}

type Query {
  parseDocument(objectName: String!): ParseResult!
}

type Mutation {
  parseAndExtract(objectName: String!): ParseResult!
}
```

## 验收标准

### AC-01: 依赖安装成功
- [ ] pdf-parse安装并可用
- [ ] mammoth安装并可用
- [ ] 类型定义完整

### AC-02: PDF解析功能
- [ ] 能够从PDF Buffer提取文本
- [ ] 返回页数信息
- [ ] 处理解析错误

### AC-03: Word解析功能
- [ ] 支持.doc格式 (通过mammoth)
- [ ] 支持.docx格式
- [ ] 提取纯文本内容

### AC-04: 字段提取功能
- [ ] 提取合同编号
- [ ] 提取甲乙方信息
- [ ] 提取签订日期
- [ ] 提取合同金额
- [ ] 返回匹配置信度

### AC-05: GraphQL集成
- [ ] parseDocument查询可用
- [ ] parseAndExtract mutation可用
- [ ] 错误处理完善

### AC-06: 背压检查
- [ ] pnpm nx affected -t lint 通过
- [ ] pnpm nx affected -t build 通过

## 注意事项
1. PDF解析可能消耗较多内存，需要考虑文件大小限制
2. 中文合同字段提取需要考虑多种格式变体
3. 字段提取置信度基于正则匹配完整度
4. OCR功能(Tesseract.js)暂不在本spec实现，留待后续增强

## 预估工作量
- 代码量: ~400行
- 新文件: 10个
- 修改文件: 2个 (app.module.ts, index exports)
