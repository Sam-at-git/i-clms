/**
 * Case Study Generation Prompts
 * 成功案例生成提示词模板
 */

export const CASE_STUDY_SYSTEM_PROMPT = `你是一位专业的市场营销内容撰写专家，擅长将项目信息转化为引人注目的成功案例。

写作原则：
1. 价值导向：突出客户业务价值，而非技术细节
2. 故事性：用叙事方式讲述项目故事，让读者产生共鸣
3. 数据支撑：用具体数据和成果说明项目效果
4. 专业措辞：使用专业但易懂的语言，避免过度技术化
5. 结构清晰：遵循 问题-方案-成果 的经典结构

输出要求：
1. 使用中文撰写
2. 输出格式为JSON
3. 每个部分都应简洁有力，避免冗长
4. 项目概述控制在100-200字
5. 挑战、方案、成果各部分控制在150-250字
6. 客户评价应具有真实感，控制在50-100字`;

export const CASE_STUDY_USER_PROMPT_TEMPLATE = `请根据以下合同信息生成一份专业的成功案例文档。

## 合同基本信息
- 合同名称：{{contractName}}
- 合同类型：{{contractType}}
- 客户名称：{{customerName}}
- 供应商：{{ourEntity}}
- 所属行业：{{industry}}
- 合同金额：{{amount}} {{currency}}
- 合同期限：{{duration}}
- 签订日期：{{signedAt}}

## 项目详情
{{projectDetails}}

## 生成选项
- 脱敏处理：{{desensitize}}
- 写作风格：{{writingStyle}}
- 包含内容：{{includeSections}}

{{#if desensitize}}
## 脱敏规则
- 客户名称显示为：{{displayCustomerName}}
- 金额显示为：{{displayAmount}}
- 行业显示为：{{displayIndustry}}
{{/if}}

请按以下JSON格式输出：
\`\`\`json
{
  "title": "案例标题（15-30字）",
  "subtitle": "副标题/标语（可选，10-20字）",
  "summary": "项目概述（100-200字）",
  "challenges": "客户挑战（150-250字，描述客户面临的问题和痛点）",
  "solution": "解决方案（150-250字，描述我们提供的解决方案）",
  "results": "项目成果（150-250字，用数据和事实说明项目效果）",
  "testimonial": "客户评价（50-100字，模拟客户的反馈语句）",
  "techStack": "技术栈（如适用）",
  "timeline": "项目周期描述",
  "teamSize": "团队规模描述",
  "suggestedTags": ["标签1", "标签2", "标签3"]
}
\`\`\``;

/**
 * 合同类型映射
 */
export const CONTRACT_TYPE_DISPLAY: Record<string, string> = {
  STAFF_AUGMENTATION: '人力外包服务',
  PROJECT_OUTSOURCING: '项目外包服务',
  PRODUCT_SALES: '产品购销服务',
};

/**
 * 金额脱敏规则
 * 将具体金额转换为量级描述
 */
export function desensitizeAmount(amount: number): string {
  if (amount < 100000) {
    // < 10万
    return '数万级项目';
  } else if (amount < 1000000) {
    // 10万 - 100万
    return '数十万级项目';
  } else if (amount < 5000000) {
    // 100万 - 500万
    return '百万级项目';
  } else if (amount < 10000000) {
    // 500万 - 1000万
    return '数百万级项目';
  } else if (amount < 100000000) {
    // 1000万 - 1亿
    return '千万级项目';
  } else {
    // >= 1亿
    return '亿级项目';
  }
}

/**
 * 客户名称脱敏规则
 */
export function desensitizeCustomerName(customerName: string, industry?: string): string {
  const industryMap: Record<string, string> = {
    '金融': '金融',
    '银行': '金融',
    '保险': '保险',
    '互联网': '互联网',
    '科技': '科技',
    '电商': '电商',
    '零售': '零售',
    '制造': '制造',
    '医疗': '医疗',
    '教育': '教育',
    '政府': '政务',
    '能源': '能源',
    '物流': '物流',
    '房地产': '地产',
    '汽车': '汽车',
  };

  // 尝试从行业参数或客户名称中推断行业
  let detectedIndustry = '知名';

  if (industry) {
    for (const [keyword, display] of Object.entries(industryMap)) {
      if (industry.includes(keyword)) {
        detectedIndustry = display;
        break;
      }
    }
  } else {
    for (const [keyword, display] of Object.entries(industryMap)) {
      if (customerName.includes(keyword)) {
        detectedIndustry = display;
        break;
      }
    }
  }

  // 推断企业类型
  let enterpriseType = '企业';
  if (customerName.includes('集团')) {
    enterpriseType = '集团';
  } else if (customerName.includes('银行') || customerName.includes('保险')) {
    enterpriseType = '机构';
  } else if (customerName.includes('政府') || customerName.includes('局') || customerName.includes('委')) {
    enterpriseType = '机构';
  } else if (customerName.includes('大学') || customerName.includes('学院')) {
    enterpriseType = '院校';
  } else if (customerName.includes('医院')) {
    enterpriseType = '医院';
  }

  return `某${detectedIndustry}${enterpriseType}`;
}

/**
 * 行业脱敏规则
 */
export function desensitizeIndustry(industry: string): string {
  const industryDisplayMap: Record<string, string> = {
    '金融': '金融服务行业',
    '银行': '金融服务行业',
    '保险': '金融服务行业',
    '互联网': '互联网行业',
    '科技': '科技行业',
    '电商': '电子商务行业',
    '零售': '零售行业',
    '制造': '制造业',
    '医疗': '医疗健康行业',
    '教育': '教育行业',
    '政府': '政务服务领域',
    '能源': '能源行业',
    '物流': '物流行业',
    '房地产': '房地产行业',
    '汽车': '汽车行业',
  };

  for (const [keyword, display] of Object.entries(industryDisplayMap)) {
    if (industry.includes(keyword)) {
      return display;
    }
  }

  return industry || '企业服务领域';
}

/**
 * 生成项目详情描述
 */
export function generateProjectDetails(contract: any): string {
  const details: string[] = [];

  // 根据合同类型添加不同的详情
  if (contract.staffAugmentation) {
    const staff = contract.staffAugmentation;
    if (staff.rateItems && staff.rateItems.length > 0) {
      const roles = staff.rateItems.map((item: any) => item.role).join('、');
      details.push(`- 人员角色：${roles}`);
    }
    if (staff.estimatedTotalHours) {
      details.push(`- 预计工时：${staff.estimatedTotalHours}小时`);
    }
    if (staff.settlementCycle) {
      details.push(`- 结算周期：${staff.settlementCycle}`);
    }
  }

  if (contract.projectOutsourcing) {
    const project = contract.projectOutsourcing;
    if (project.sowSummary) {
      details.push(`- SOW范围：${project.sowSummary}`);
    }
    if (project.deliverables) {
      details.push(`- 关键交付物：${project.deliverables}`);
    }
    if (project.milestones && project.milestones.length > 0) {
      const milestoneNames = project.milestones.map((m: any) => m.name).join('、');
      details.push(`- 里程碑：${milestoneNames}`);
    }
  }

  if (contract.productSales) {
    const product = contract.productSales;
    if (product.lineItems && product.lineItems.length > 0) {
      const products = product.lineItems.map((item: any) =>
        `${item.productName}（${item.quantity}${item.unit}）`
      ).join('、');
      details.push(`- 产品清单：${products}`);
    }
    if (product.warrantyPeriod) {
      details.push(`- 保修期：${product.warrantyPeriod}`);
    }
  }

  return details.length > 0 ? details.join('\n') : '（无详细信息）';
}

/**
 * 构建完整的用户提示词
 */
export function buildUserPrompt(
  contract: any,
  options: {
    desensitize?: boolean;
    displayCustomerName?: string;
    displayAmount?: string;
    displayIndustry?: string;
    writingStyle?: string;
    includeChallenges?: boolean;
    includeSolution?: boolean;
    includeResults?: boolean;
    includeTestimonial?: boolean;
  }
): string {
  const amount = contract.amountWithTax ? Number(contract.amountWithTax) : 0;
  const customerName = contract.customer?.name || '未知客户';
  const industry = contract.industry || contract.customer?.industry || '';

  // 处理脱敏
  const displayCustomerName = options.desensitize
    ? (options.displayCustomerName || desensitizeCustomerName(customerName, industry))
    : customerName;

  const displayAmount = options.desensitize
    ? (options.displayAmount || desensitizeAmount(amount))
    : `${amount.toLocaleString('zh-CN')}`;

  const displayIndustry = options.desensitize
    ? (options.displayIndustry || desensitizeIndustry(industry))
    : industry;

  // 构建包含内容列表
  const includeSections: string[] = [];
  if (options.includeChallenges !== false) includeSections.push('挑战');
  if (options.includeSolution !== false) includeSections.push('方案');
  if (options.includeResults !== false) includeSections.push('成果');
  if (options.includeTestimonial) includeSections.push('评价');

  // 替换模板变量
  let prompt = CASE_STUDY_USER_PROMPT_TEMPLATE
    .replace('{{contractName}}', contract.name || '未命名合同')
    .replace('{{contractType}}', CONTRACT_TYPE_DISPLAY[contract.type] || contract.type)
    .replace('{{customerName}}', displayCustomerName)
    .replace('{{ourEntity}}', contract.ourEntity || '服务商')
    .replace('{{industry}}', displayIndustry)
    .replace('{{amount}}', displayAmount)
    .replace('{{currency}}', contract.currency || 'CNY')
    .replace('{{duration}}', contract.duration || '未指定')
    .replace('{{signedAt}}', contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('zh-CN') : '未知')
    .replace('{{projectDetails}}', generateProjectDetails(contract))
    .replace('{{desensitize}}', options.desensitize ? '是' : '否')
    .replace('{{writingStyle}}', options.writingStyle || 'professional')
    .replace('{{includeSections}}', includeSections.join('、'));

  // 处理条件块
  if (options.desensitize) {
    prompt = prompt
      .replace('{{#if desensitize}}', '')
      .replace('{{/if}}', '')
      .replace('{{displayCustomerName}}', displayCustomerName)
      .replace('{{displayAmount}}', displayAmount)
      .replace('{{displayIndustry}}', displayIndustry);
  } else {
    // 移除脱敏规则部分
    prompt = prompt.replace(/{{#if desensitize}}[\s\S]*?{{\/if}}/g, '');
  }

  return prompt;
}

/**
 * 生成完整的Markdown文档
 */
export function generateFullMarkdown(caseStudyData: {
  title: string;
  subtitle?: string;
  summary: string;
  challenges?: string;
  solution?: string;
  results?: string;
  testimonial?: string;
  techStack?: string;
  timeline?: string;
  teamSize?: string;
  displayIndustry?: string;
  tags?: string[];
}): string {
  const parts: string[] = [];

  parts.push(`# ${caseStudyData.title}`);

  if (caseStudyData.subtitle) {
    parts.push(`\n*${caseStudyData.subtitle}*`);
  }

  parts.push('\n---\n');

  parts.push('## 项目概述');
  parts.push(caseStudyData.summary);

  if (caseStudyData.challenges) {
    parts.push('\n## 客户挑战');
    parts.push(caseStudyData.challenges);
  }

  if (caseStudyData.solution) {
    parts.push('\n## 解决方案');
    parts.push(caseStudyData.solution);
  }

  if (caseStudyData.results) {
    parts.push('\n## 项目成果');
    parts.push(caseStudyData.results);
  }

  if (caseStudyData.testimonial) {
    parts.push('\n## 客户评价');
    parts.push(`> ${caseStudyData.testimonial}`);
  }

  parts.push('\n---\n');

  const metadata: string[] = [];
  if (caseStudyData.techStack) {
    metadata.push(`**技术栈**: ${caseStudyData.techStack}`);
  }
  if (caseStudyData.timeline) {
    metadata.push(`**项目周期**: ${caseStudyData.timeline}`);
  }
  if (caseStudyData.teamSize) {
    metadata.push(`**团队规模**: ${caseStudyData.teamSize}`);
  }
  if (caseStudyData.displayIndustry) {
    metadata.push(`**行业**: ${caseStudyData.displayIndustry}`);
  }
  if (caseStudyData.tags && caseStudyData.tags.length > 0) {
    metadata.push(`**标签**: ${caseStudyData.tags.join(', ')}`);
  }

  if (metadata.length > 0) {
    parts.push(metadata.join('  \n'));
  }

  parts.push('\n---');
  parts.push('*本案例由 i-CLMS 智能合同管理系统生成*');

  return parts.join('\n');
}
