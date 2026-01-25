/**
 * RAG Correction LLM Prompts
 * RAG字段修正功能的LLM提示词
 */

/**
 * 单字段修正系统提示词
 */
export const FIELD_CORRECTION_SYSTEM_PROMPT = `你是一个专业的合同信息提取专家。你的任务是基于检索到的合同原文片段，验证或修正给定的字段值。

核心原则：
1. 保守策略：原值优先，除非有明确证据证明需要修正
2. 只返回你有高置信度的结果
3. 如果证据不足，保持原值不变
4. 对于金额、日期等关键字段，需要更高的置信度阈值

输出格式要求：
- 必须返回有效的JSON格式
- shouldChange为布尔值，表示是否建议修改
- confidence为0-1之间的浮点数
- 如果shouldChange为false，suggestedValue应与originalValue相同`;

/**
 * 单字段修正用户提示词模板
 */
export const FIELD_CORRECTION_USER_PROMPT = `请基于以下合同原文片段，验证或修正指定的字段值。

【待验证字段】
字段名称: {{fieldDisplayName}}
字段英文名: {{fieldName}}
当前值: {{originalValue}}

【检索到的相关合同原文】
{{ragChunks}}

【字段说明】
{{fieldDescription}}

请分析上述原文，判断当前值是否正确。如果需要修正，请提供正确的值。

输出JSON格式：
{
  "fieldName": "{{fieldName}}",
  "fieldDisplayName": "{{fieldDisplayName}}",
  "originalValue": "{{originalValue}}",
  "suggestedValue": "<建议值，如果不修改则与原值相同>",
  "shouldChange": <是否建议修改，布尔值>,
  "confidence": <置信度0-1>,
  "evidence": "<从原文中找到的证据>",
  "reasoning": "<分析推理过程>"
}`;

/**
 * 可疑字段评估系统提示词
 */
export const EVALUATE_SUSPICIOUS_SYSTEM_PROMPT = `你是一个专业的合同数据质量检查专家。你的任务是评估合同中哪些字段的值可能存在问题，需要进一步验证。

评估标准：
1. 空值或占位符值（如 "待填写"、"TBD"、"N/A"）
2. 格式明显错误（如日期格式不对、金额格式异常）
3. 逻辑矛盾（如结束日期早于开始日期、不含税金额大于含税金额）
4. 值与字段不匹配（如客户名称字段填的是地址）
5. 异常值（如金额为负数、税率超过100%）

只返回真正可疑的字段，避免误报。`;

/**
 * 可疑字段评估用户提示词模板
 */
export const EVALUATE_SUSPICIOUS_USER_PROMPT = `请评估以下合同数据中哪些字段可能存在问题，需要进一步验证。

【合同当前数据】
{{contractData}}

【可RAG修正的字段列表】
{{ragSupportedFields}}

请分析上述数据，找出可疑字段。只返回支持RAG修正的字段。

输出JSON格式：
{
  "suspiciousFields": ["字段1英文名", "字段2英文名", ...],
  "reasoning": "<分析过程和可疑原因>"
}`;

/**
 * 字段RAG查询描述映射
 * 用于为每个字段生成更精准的RAG查询
 */
export const FIELD_RAG_QUERIES: Record<string, string> = {
  name: '合同名称、标题、文件名称',
  ourEntity: '乙方、受托方、承包方、供应商、卖方的公司全称',
  amountWithTax: '含税总金额、合同金额、交易金额、总价款',
  amountWithoutTax: '不含税金额、税前金额、净价',
  taxRate: '税率、增值税率、税点',
  paymentMethod: '付款方式、结算方式、支付方式',
  paymentTerms: '付款条件、付款条款、付款计划、账期',
  signedAt: '签订日期、签署日期、签约时间',
  effectiveAt: '生效日期、开始日期、有效起始时间',
  expiresAt: '终止日期、到期日期、有效截止时间',
  duration: '合同期限、有效期、服务周期',
  industry: '行业、业务领域、服务类型',
  salesPerson: '销售负责人、业务联系人、项目经理',
  signLocation: '签订地点、签署地',
  copies: '合同份数、签署份数',
};

/**
 * 字段类型描述，帮助LLM理解字段含义
 */
export const FIELD_DESCRIPTIONS: Record<string, string> = {
  name: '合同的正式名称或标题，通常出现在合同首页',
  ourEntity:
    '乙方/供应商，即合同中的受托方、承包方或卖方的公司名称。注意：甲方是客户/委托方，乙方是供应商/受托方',
  amountWithTax: '含税的合同总金额，通常包含增值税',
  amountWithoutTax: '不含税的合同金额，即税前金额',
  taxRate: '增值税税率，常见的有6%、9%、13%等',
  paymentMethod: '付款方式，如银行转账、现金、支票、承兑汇票等',
  paymentTerms: '付款条件或账期，描述付款的时间节点和条件',
  signedAt: '合同签订日期，格式为YYYY-MM-DD',
  effectiveAt: '合同生效日期，合同开始执行的时间',
  expiresAt: '合同终止/到期日期，合同结束的时间',
  duration: '合同期限的文字描述，如"一年"、"12个月"、"长期有效"',
  industry: '合同涉及的行业或业务领域',
  salesPerson: '负责该合同的销售人员或业务负责人姓名',
  signLocation: '合同签订的地点',
  copies: '合同签署的份数，如"一式两份"中的2',
};
