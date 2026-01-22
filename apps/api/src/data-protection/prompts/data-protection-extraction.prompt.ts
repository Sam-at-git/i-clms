/**
 * 数据保护条款提取 Prompt
 * 用于从合同文本中提取数据保护相关条款
 */

export const DATA_PROTECTION_SYSTEM_PROMPT = `你是一位专业的数据保护合规分析师，擅长识别和评估合同中的数据保护条款。请仔细分析合同文本，识别数据保护相关条款和合规要求。`;

export const DATA_PROTECTION_EXTRACTION_PROMPT = `请从以下合同文本中提取数据保护相关条款信息。

## 提取字段

### 1. 是否涉及个人数据 (involvesPersonalData)
寻找关键词：个人数据、个人信息、用户数据、客户信息、身份证、姓名、电话、地址、生物识别、员工信息、隐私等
- 如果合同中任何条款提及处理个人/用户/客户信息，设为 true
- 否则设为 false

### 2. 个人数据类型 (personalDataType)
描述涉及的个人数据类型，如：
- "用户姓名、联系方式、身份证号"
- "员工档案、薪资信息、考勤记录"
- "客户基本信息、交易记录、行为数据"
- "生物识别信息、人脸识别数据"

### 3. 数据处理地点限制 (processingLocation)
寻找关键词：境内、本地、中国、不跨境、禁止出境、本地存储
- 示例："仅限中国大陆境内处理"、"禁止数据出境"、"数据本地化存储"

### 4. 跨境传输要求 (crossBorderTransfer)
寻找关键词：跨境传输、出境、境外、国际传输、合规、评估、单独同意
- 示例："需获得用户单独同意"、"需通过安全评估"、"符合GDPR要求"

### 5. 安全措施要求 (securityMeasures)
寻找关键词：加密、脱敏、访问控制、安全、保密、匿名化、假名化
- 示例："数据加密存储"、"访问权限控制"、"传输加密"

### 6. 数据保留期限 (dataRetention)
寻找关键词：保留、删除、销毁、保存期限、保存期限、合同终止后
- 示例："合同终止后3年"、"服务结束后30天内删除"、"法律要求的最短期限"

## 风险等级评估

根据以下规则评估 riskLevel：
- **HIGH**: 涉及敏感个人数据（身份证、生物识别、医疗健康、金融信用等）且有跨境传输
- **MEDIUM**: 涉及个人数据且有跨境传输，或涉及敏感个人数据但无跨境传输
- **LOW**: 涉及个人数据但无跨境传输，且数据类型不敏感
- **NONE**: 不涉及个人数据

敏感个人数据包括但不限于：
- 身份证号、护照号、社保号
- 生物识别信息（指纹、人脸、虹膜等）
- 医疗健康信息
- 金融信用信息
- 未成年人信息

## 输出格式

请以JSON格式输出：

\`\`\`json
{
  "involvesPersonalData": true | false,
  "personalDataType": "...",
  "processingLocation": "...",
  "crossBorderTransfer": "...",
  "securityMeasures": "...",
  "dataRetention": "...",
  "riskLevel": "NONE" | "LOW" | "MEDIUM" | "HIGH",
  "confidence": 0.85,
  "originalText": "相关条款原文..."
}
\`\`\`

## 注意事项

1. 如果合同完全没有提及个人数据，involvesPersonalData设为false，riskLevel设为NONE
2. confidence表示提取置信度(0-1)，根据信息完整程度确定
3. originalText应包含找到的相关原始文本片段，便于人工核实
4. 风险等级必须根据上述规则严格评估

【合同文本】
{{contractText}}`;

export const DATA_PROTECTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    involvesPersonalData: { type: 'boolean' },
    personalDataType: { type: 'string' },
    processingLocation: { type: 'string' },
    crossBorderTransfer: { type: 'string' },
    securityMeasures: { type: 'string' },
    dataRetention: { type: 'string' },
    riskLevel: {
      type: 'string',
      enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH'],
    },
    confidence: { type: 'number' },
    originalText: { type: 'string' },
  },
};
