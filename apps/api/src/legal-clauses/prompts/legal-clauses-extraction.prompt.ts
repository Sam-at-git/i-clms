/**
 * 法务条款提取 Prompt
 * 用于从合同文本中提取四类核心法务条款
 */

export const LEGAL_CLAUSES_SYSTEM_PROMPT = `你是一位专业的合同法务分析师，擅长识别和提取合同中的法务条款信息。
请仔细分析合同文本，提取四类法务条款信息。`;

export const LEGAL_CLAUSES_EXTRACTION_PROMPT = `请从以下合同文本中提取四类法务条款信息。

## 提取规则

### 1. 知识产权条款 (INTELLECTUAL_PROPERTY)
寻找关键词：知识产权、IP、专利、商标、著作权、许可、授权、知识产权归属
- licenseType: 许可类型 (独占/非独占/普通/排他)
- licenseFee: 许可费用描述（如"免费"、"按实际使用量"、"固定金额100万元"等）

### 2. 担保条款 (GUARANTEE)
寻找关键词：担保、保证、连带责任、一般保证、质押、抵押
- guarantor: 担保方 (甲方-FIRST_PARTY/乙方-SECOND_PARTY/第三方-THIRD_PARTY)
- guaranteeType: 担保类型 (一般保证-GENERAL/连带责任-JOINT_AND_SEVERAL)
- guaranteeAmount: 担保金额数字（单位：元）
- guaranteePeriod: 担保期限描述（如"合同履行期内"、"质保期2年"）

### 3. 责任限制条款 (LIABILITY_LIMITATION)
寻找关键词：责任限制、责任上限、赔偿、除外责任、不可抗力、违约责任
- liabilityLimit: 责任上限金额数字（单位：元）
- exclusions: 除外责任类型描述（如"因不可抗力造成的损失"、"间接损失"等）
- compensationMethod: 赔偿计算方式（如"实际损失"、"违约金比例"等）

### 4. 终止与争议条款 (TERMINATION_DISPUTE)
寻找关键词：终止、解除、违约、争议、仲裁、诉讼、管辖法院
- terminationNotice: 便利终止通知期（如"30天"、"60天"、"提前三个月"）
- breachLiability: 违约责任描述（如"违约方应赔偿守约方损失"、"支付违约金"等）
- disputeResolution: 争议解决方式 (仲裁-ARBITRATION/诉讼-LITIGATION/协商-NEGOTIATION)
- disputeLocation: 争议解决地点（如"北京"、"新加坡"、"甲方所在地"）

## 输出格式

请以JSON格式输出，对每种条款类型，如果找到相关信息则输出对象，否则返回null：

\`\`\`json
{
  "intellectualProperty": {
    "licenseType": "独占",
    "licenseFee": "500万元",
    "confidence": 0.9,
    "originalText": "甲方授予乙方独占许可权，许可费用500万元"
  } | null,
  "guarantee": {
    "guarantor": "SECOND_PARTY",
    "guaranteeType": "JOINT_AND_SEVERAL",
    "guaranteeAmount": 1000000,
    "guaranteePeriod": "合同履行期内",
    "confidence": 0.95,
    "originalText": "乙方提供连带责任保证，保证金额100万元"
  } | null,
  "liabilityLimitation": {
    "liabilityLimit": 500000,
    "exclusions": "因不可抗力、间接损失、利润损失",
    "compensationMethod": "实际直接损失",
    "confidence": 0.85,
    "originalText": "双方责任上限为50万元，不包括间接损失"
  } | null,
  "terminationDispute": {
    "terminationNotice": "30天",
    "breachLiability": "违约方应赔偿守约方因此遭受的全部损失",
    "disputeResolution": "ARBITRATION",
    "disputeLocation": "北京",
    "confidence": 0.9,
    "originalText": "任何一方可提前30天书面通知终止合同。争议提交北京仲裁委员会仲裁"
  } | null
}
\`\`\`

## 注意事项

1. 如果合同中没有某类条款，该字段返回null
2. confidence表示提取置信度(0-1)，根据信息完整程度确定
3. originalText应包含找到的相关原始文本片段，便于人工核实
4. 金额统一转换为数字（单位：元）
5. 争议解决方式必须是ARBITRATION/LITIGATION/NEGOTIATION之一

【合同文本】
{{contractText}}`;

export const LEGAL_CLAUSES_JSON_SCHEMA = {
  type: 'object',
  properties: {
    intellectualProperty: {
      type: ['object', 'null'],
      properties: {
        licenseType: { type: 'string' },
        licenseFee: { type: 'string' },
        confidence: { type: 'number' },
        originalText: { type: 'string' },
      },
    },
    guarantee: {
      type: ['object', 'null'],
      properties: {
        guarantor: { type: 'string', enum: ['FIRST_PARTY', 'SECOND_PARTY', 'THIRD_PARTY'] },
        guaranteeType: { type: 'string', enum: ['GENERAL', 'JOINT_AND_SEVERAL'] },
        guaranteeAmount: { type: 'number' },
        guaranteePeriod: { type: 'string' },
        confidence: { type: 'number' },
        originalText: { type: 'string' },
      },
    },
    liabilityLimitation: {
      type: ['object', 'null'],
      properties: {
        liabilityLimit: { type: 'number' },
        exclusions: { type: 'string' },
        compensationMethod: { type: 'string' },
        confidence: { type: 'number' },
        originalText: { type: 'string' },
      },
    },
    terminationDispute: {
      type: ['object', 'null'],
      properties: {
        terminationNotice: { type: 'string' },
        breachLiability: { type: 'string' },
        disputeResolution: { type: 'string', enum: ['ARBITRATION', 'LITIGATION', 'NEGOTIATION'] },
        disputeLocation: { type: 'string' },
        confidence: { type: 'number' },
        originalText: { type: 'string' },
      },
    },
  },
};
