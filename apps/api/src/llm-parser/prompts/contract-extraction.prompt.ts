export const SYSTEM_PROMPT = `你是一个专业的合同信息提取助手。你需要从合同文本中提取结构化信息，严格按照JSON Schema输出。

关键要求：
1. 准确识别合同类型（人力框架/项目外包/产品购销）
2. 提取所有核心字段（基本信息、财务、时间）
3. 提取类型特定详情（里程碑、费率、产品清单）
4. 金额格式：数字字符串，去除逗号和货币符号（如 "1000000.50"）
5. 日期格式：YYYY-MM-DD（如 "2024-01-15"）
6. 置信度：为每个提取字段提供0-1的置信度分数
7. 如果某个字段未找到，设为null，不要编造

合同类型识别规则：
- 人力框架（STAFF_AUGMENTATION）：包含工时、费率、人员级别等关键词
- 项目外包（PROJECT_OUTSOURCING）：包含里程碑、交付物、验收标准等关键词
- 产品购销（PRODUCT_SALES）：包含产品清单、数量、单价、交付等关键词`;

export const USER_PROMPT_TEMPLATE = `请从以下合同文本中提取信息：

{{contractText}}

请严格按照以下JSON Schema输出：
{{jsonSchema}}`;

export const CONTRACT_JSON_SCHEMA = {
  type: 'object',
  required: ['contractType', 'basicInfo'],
  properties: {
    // 合同类型识别
    contractType: {
      type: 'string',
      enum: ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'],
      description: '合同类型',
    },

    // 基本信息
    basicInfo: {
      type: 'object',
      properties: {
        contractNo: { type: 'string', description: '合同编号' },
        contractName: { type: 'string', description: '合同名称' },
        ourEntity: { type: 'string', description: '我方主体（乙方）' },
        customerName: { type: 'string', description: '客户名称（甲方）' },
        status: {
          type: 'string',
          enum: ['DRAFT', 'ACTIVE', 'PENDING_APPROVAL'],
          description: '合同状态',
          default: 'DRAFT',
        },
      },
    },

    // 财务信息
    financialInfo: {
      type: 'object',
      properties: {
        amountWithTax: { type: 'string', description: '含税金额' },
        amountWithoutTax: { type: 'string', description: '不含税金额' },
        taxRate: { type: 'string', description: '税率（如 0.06）' },
        currency: { type: 'string', default: 'CNY' },
        paymentMethod: { type: 'string', description: '付款方式' },
        paymentTerms: { type: 'string', description: '付款条件' },
      },
    },

    // 时间信息
    timeInfo: {
      type: 'object',
      properties: {
        signedAt: { type: 'string', format: 'date', description: '签订日期' },
        effectiveAt: { type: 'string', format: 'date', description: '生效日期' },
        expiresAt: { type: 'string', format: 'date', description: '终止日期' },
        duration: { type: 'string', description: '合同期限描述' },
      },
    },

    // 其他信息
    otherInfo: {
      type: 'object',
      properties: {
        salesPerson: { type: 'string', description: '销售负责人' },
        industry: { type: 'string', description: '所属行业' },
        signLocation: { type: 'string', description: '签订地点' },
        copies: { type: 'integer', description: '合同份数' },
      },
    },

    // 类型特定详情（根据contractType决定）
    typeSpecificDetails: {
      oneOf: [
        {
          // 人力框架详情
          type: 'object',
          properties: {
            estimatedTotalHours: { type: 'integer', description: '预计总工时' },
            monthlyHoursCap: { type: 'integer', description: '每月工时上限' },
            yearlyHoursCap: { type: 'integer', description: '每年工时上限' },
            settlementCycle: { type: 'string', description: '结算周期' },
            timesheetApprovalFlow: { type: 'string', description: '工时审批流程' },
            adjustmentMechanism: { type: 'string', description: '工时调整机制' },
            staffReplacementFlow: { type: 'string', description: '人员更换流程' },
            rateItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', description: '人员级别/角色' },
                  rateType: { type: 'string', enum: ['HOURLY', 'DAILY', 'MONTHLY'] },
                  rate: { type: 'string', description: '费率' },
                  rateEffectiveFrom: { type: 'string', format: 'date', description: '费率生效开始日期' },
                  rateEffectiveTo: { type: 'string', format: 'date', description: '费率生效结束日期' },
                },
              },
            },
          },
        },
        {
          // 项目外包详情
          type: 'object',
          properties: {
            sowSummary: { type: 'string', description: 'SOW范围摘要' },
            deliverables: { type: 'string', description: '关键交付物清单' },
            acceptanceCriteria: { type: 'string', description: '最终验收标准' },
            acceptanceFlow: { type: 'string', description: '验收流程' },
            changeManagementFlow: { type: 'string', description: '范围变更流程' },
            milestones: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sequence: { type: 'integer', description: '里程碑顺序' },
                  name: { type: 'string', description: '里程碑名称' },
                  deliverables: { type: 'string', description: '交付物' },
                  amount: { type: 'string', description: '里程碑金额' },
                  paymentPercentage: { type: 'string', description: '付款百分比' },
                  plannedDate: { type: 'string', format: 'date', description: '计划完成日期' },
                  actualDate: { type: 'string', format: 'date', description: '实际完成日期' },
                  acceptanceCriteria: { type: 'string', description: '验收标准' },
                  status: {
                    type: 'string',
                    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ACCEPTED', 'DELAYED'],
                    description: '里程碑状态',
                  },
                },
              },
            },
          },
        },
        {
          // 产品购销详情
          type: 'object',
          properties: {
            deliveryContent: { type: 'string', description: '交付内容' },
            deliveryDate: { type: 'string', format: 'date', description: '交付日期' },
            deliveryLocation: { type: 'string', description: '交付地点' },
            shippingResponsibility: { type: 'string', description: '运输与保险责任' },
            ipOwnership: { type: 'string', description: '知识产权归属' },
            warrantyPeriod: { type: 'string', description: '保修期' },
            afterSalesTerms: { type: 'string', description: '售后服务条款' },
            lineItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productName: { type: 'string', description: '产品名称' },
                  specification: { type: 'string', description: '规格与配置' },
                  quantity: { type: 'integer', description: '数量' },
                  unit: { type: 'string', description: '单位' },
                  unitPriceWithTax: { type: 'string', description: '含税单价' },
                  unitPriceWithoutTax: { type: 'string', description: '不含税单价' },
                  subtotal: { type: 'string', description: '小计' },
                },
              },
            },
          },
        },
      ],
    },

    // 置信度元数据
    metadata: {
      type: 'object',
      properties: {
        overallConfidence: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: '整体提取置信度',
        },
        fieldConfidences: {
          type: 'object',
          description: '每个字段的置信度映射',
        },
      },
    },
  },
};
