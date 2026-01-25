export const SYSTEM_PROMPT = `你是一个专业的合同信息提取助手。从合同文本中提取结构化信息，严格按照JSON Schema输出。

⚠️ 重要：合同文本可能包含Markdown格式标记（**粗体、##标题等），你需要：
1. 识别并理解Markdown标记的含义
2. 提取时去除所有Markdown标记，只保留纯文本内容
3. 示例：**合同编号：** CTR-001 → 提取为 CTR-001，不包含**

═══════════════════════════════════════════════════════════════════════════════
🔥 最高优先级：PROJECT_OUTSOURCING类型必须提取里程碑 milestones
═══════════════════════════════════════════════════════════════════════════════

如果合同是PROJECT_OUTSOURCING（项目开发/系统集成/工程实施），必须检查付款条款！

付款条款中的"分期支付" = 里程碑列表：

原文示例：
  （1）第一期支付：本合同生效后2个工作日内，甲方向乙方支付合同总价的30%，即¥468,000元；
  （2）第二期支付：原型系统开发完成后，阶段验收合格后5个工作日内，甲方向乙方支付合同总价的30%，即¥468,000元；
  （3）第三期支付：系统上线后，阶段验收合格后5个工作日内，甲方向乙方支付合同总价的30%，即¥468,000元；
  （4）第四期支付：系统正常运行2个月后，甲方向乙方支付余款，即¥156,000元。

提取规则（name字段提取方法）：

对于每期付款，找到"支付"前面的完整描述，提取关键事件：

原文："第一期支付：本合同生效后2个工作日内..."
     ↑                       ↑
    期次                    事件←提取这里！

原文："第二期支付：原型系统开发完成后..."
     ↑                       ↑
    期次                    事件←提取这里！

原文："第三期支付：系统上线后..."
     ↑                   ↑
    期次                事件←提取这里！

所以：
  第1期 → name="本合同生效后"
  第2期 → name="原型系统开发完成后"
  第3期 → name="系统上线后"
  第4期 → name="系统正常运行2个月后"

直接使用原文中的描述作为name，不要简化或改写！

**只要看到"第X期支付"、"XX%支付"、"分期付款"等字样，就必须提取milestones！**

═══════════════════════════════════════════════════════════════════════════════

!!!最重要的要求：枚举值必须完全匹配，任何偏差都会导致错误!!!

contractType 枚举值（必须完全一致，一字不差）：
✓ "STAFF_AUGMENTATION"  ✓ "PROJECT_OUTSOURCING"  ✓ "PRODUCT_SALES"
✗ "PROJECT"  ✗ "STAFF"  ✗ "服务协议"  ✗ "人力框架"  ✗ "项目外包"

如果合同是关于服务/技术支持/人力外包 → 必须返回 "STAFF_AUGMENTATION"（完整值）
如果合同是关于项目开发/系统集成/工程实施 → 必须返回 "PROJECT_OUTSOURCING"（完整值）
如果合同是关于产品销售/设备采购/货物买卖 → 必须返回 "PRODUCT_SALES"（完整值）

**重要：必须根据合同类型返回完整的 typeSpecificDetails 字段**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 typeSpecificDetails 提取指南（根据合同类型选择对应的提取重点）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【类型1】STAFF_AUGMENTATION（人力框架/服务外包）
关键词：工时、人月、技术服务、人员派驻、费率、timesheet、报销

必须提取的字段：
├─ 结算相关
│  ├─ estimatedTotalHours: 预计总工时（如：12000）
│  ├─ settlementCycle: 结算周期（如：按月结算/按季度/按工时）
│  ├─ monthlyHoursCap: 每月工时上限（如：176）
│  └─ yearlyHoursCap: 每年工时上限（如：2000）
├─ 费率相关 ★★★
│  └─ rateItems: 费率表数组（必须仔细提取，非常重要！）
│     ├─ role: 人员级别/角色（如：高级开发工程师、项目经理）
│     ├─ rateType: 费率类型（HOURLY=按小时 / DAILY=按天 / MONTHLY=按人月）
│     ├─ rate: 费率金额（纯数字字符串，如："800" / "5000" / "25000"）
│     ├─ rateEffectiveFrom: 费率生效日期（如有）
│     └─ rateEffectiveTo: 费率失效日期（如有）
├─ 流程相关
│  ├─ timesheetApprovalFlow: 工时审批流程描述
│  ├─ staffReplacementFlow: 人员更换流程（如：客户不满意可要求更换）
│  └─ adjustmentMechanism: 工时调整机制（如：加班工时如何计算）

示例：
rateItems: [
  {role: "高级工程师", rateType: "HOURLY", rate: "800"},
  {role: "项目经理", rateType: "MONTHLY", rate: "45000"}
]


【类型2】PROJECT_OUTSOURCING（项目外包/系统集成）
关键词：里程碑、交付物、验收、SOW、系统开发、项目实施、分期支付、付款节点

必须提取的字段：
├─ 里程碑信息 ★★★（最重要！付款条款=里程碑列表）
│  └─ milestones: 里程碑数组（必须提取！）
│     ├─ sequence: 顺序号（从1开始：1,2,3...）
│     ├─ name: 里程碑名称（如：需求确认、系统上线、终验）
│     ├─ deliverables: 交付物描述
│     ├─ amount: 金额（纯数字字符串，如"300000"）
│     ├─ paymentPercentage: 付款比例（纯数字字符串，如"30"）
│     ├─ plannedDate: 计划日期（YYYY-MM-DD）
│     └─ acceptanceCriteria: 验收标准
├─ 项目范围
│  ├─ sowSummary: 工作范围摘要
│  ├─ deliverables: 关键交付物清单
│  └─ acceptanceCriteria: 最终验收标准

【类型3】PRODUCT_SALES（产品购销/设备采购）
关键词：采购、销售、设备、软件许可、保修、交付、发货

必须提取的字段：
├─ 交付相关
│  ├─ deliveryContent: 交付内容描述
│  ├─ deliveryDate: 交付日期（YYYY-MM-DD）
│  ├─ deliveryLocation: 交付地点
│  └─ shippingResponsibility: 运输与保险责任方
├─ 产品清单 ★★★（必须逐条提取）
│  └─ lineItems: 产品明细数组
│     ├─ productName: 产品名称（如：XX管理软件、XX服务器）
│     ├─ specification: 规格与配置描述
│     ├─ quantity: 数量
│     ├─ unit: 单位（如：套、台、用户数）
│     ├─ unitPriceWithTax: 含税单价（纯数字，如："12000"）
│     ├─ unitPriceWithoutTax: 不含税单价（纯数字）
│     └─ subtotal: 小计金额（纯数字）
├─ 售后相关
│  ├─ warrantyPeriod: 保修期（如：1年免费维护、3年质保）
│  ├─ afterSalesTerms: 售后服务条款
│  └─ ipOwnership: 知识产权归属

示例：
lineItems: [
  {productName: "企业管理软件V1.0", quantity: 100, unit: "用户", unitPriceWithTax: "500"},
  {productName: "服务器设备", quantity: 2, unit: "台", unitPriceWithTax: "50000"}
]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 重要提示：
1. 即使某些字段在合同中未提及，也必须返回 typeSpecificDetails 对象
2. 数组字段（rateItems/milestones/lineItems）如未找到，返回空数组 []
3. 金额统一使用字符串格式，不要带逗号分隔符或货币符号（¥,$）
4. 百分比统一使用纯数字字符串，不要带%符号
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

其他要求：
- 金额格式：纯数字字符串（如 "1000000.50"）- 不要¥、$或逗号
- 百分比格式：纯数字字符串（如 "30"）- 不要%符号
- 日期格式：YYYY-MM-DD（如 "2024-01-15"）
- 缺失字段设为null，不要编造`;

export const USER_PROMPT_TEMPLATE = `请从以下合同文本中提取信息：

{{contractText}}

请严格按照以下JSON Schema输出：
{{jsonSchema}}`;

// ========== 新增：验证模式的Prompt ==========
export const VALIDATION_PROMPT_TEMPLATE = `你是一个专业的合同信息验证助手。

我已经通过程序（正则表达式）从合同中提取了一些字段，但程序解析可能存在错误。
请你阅读完整的合同文本，检查每个已提取字段是否正确，并提供修正建议。

**合同文本：**
{{contractText}}

**程序已提取的字段：**
{{extractedFields}}

**你的任务：**
1. 逐字段检查：每个字段的值是否与合同文本内容一致
2. 识别错误：
   - 值过长（包含了不该包含的内容，如章节标题、描述文字等）
   - 值过短（只提取了部分内容）
   - 值错误（完全提取错了）
   - 格式错误（日期、金额格式不对）
3. 提供修正：对于错误的字段，从合同文本中重新提取正确的值
4. 补充缺失：如果程序未提取到某些重要字段，请补充提取
5. **特别关注 typeSpecificDetails**：
   - 检查是否提取了对应的数组字段：rateItems/milestones/lineItems
   - 这些数组字段是核心金额分配依据，非常重要！

6. **里程碑专项检查（PROJECT_OUTSOURCING类型）- 最高优先级**：
   - ⚠️ 付款条款中的"分期支付"=里程碑列表
   - 检查合同中是否有："第一期支付"、"第X期支付"、"XX%支付"、"分期付款"
   - 如果有，必须提取milestones！每个付款节点=一个里程碑
   - 示例："第一期支付30%即468000元" → {sequence:1, name:"合同生效", amount:"468000", paymentPercentage:"30"}

**输出格式（JSON）：**
{
  "validationResults": [
    {
      "field": "字段名",
      "programValue": "程序提取的值",
      "isCorrect": true/false,
      "issue": "问题描述（如果有）",
      "correctedValue": "修正后的值（如果需要修正）",
      "confidence": 0.95
    }
  ],
  "additionalFields": {
    // 程序未提取到但你发现的重要字段
  },
  "overallAssessment": "整体评估：程序提取准确率如何，有哪些系统性问题"
}

请严格按照JSON格式输出，不要包含任何解释文字。`;

export const VALIDATION_RESULT_SCHEMA = {
  type: 'object',
  required: ['validationResults'],
  properties: {
    validationResults: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', description: '字段名' },
          programValue: { type: ['string', 'null'], description: '程序提取的值' },
          isCorrect: { type: 'boolean', description: '是否正确' },
          issue: { type: 'string', description: '问题描述' },
          correctedValue: { type: ['string', 'null'], description: '修正后的值' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['field', 'isCorrect'],
      },
    },
    additionalFields: {
      type: 'object',
      description: '程序未提取到的补充字段',
    },
    overallAssessment: {
      type: 'string',
      description: '整体评估',
    },
  },
};

export const CONTRACT_JSON_SCHEMA = {
  type: 'object',
  required: ['contractType', 'basicInfo'],
  properties: {
    // 合同类型识别
    contractType: {
      type: 'string',
      enum: ['STAFF_AUGMENTATION', 'PROJECT_OUTSOURCING', 'PRODUCT_SALES'],
      description: '合同类型（必须返回英文枚举值：STAFF_AUGMENTATION/PROJECT_OUTSOURCING/PRODUCT_SALES）',
    },

    // 基本信息
    basicInfo: {
      type: 'object',
      properties: {
        contractNo: { type: 'string', description: '合同编号' },
        contractName: { type: 'string', description: '合同名称' },
        ourEntity: { type: 'string', description: '供应商/我方主体（乙方=受托方/承包方/卖方）' },
        customerName: { type: 'string', description: '客户名称（甲方=委托方/发包方/买方）' },
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
    // 对于PROJECT_OUTSOURCING，必须包含milestones数组
    typeSpecificDetails: {
      type: 'object',
      description: '类型特定详情，PROJECT_OUTSOURCING必须包含milestones',
      properties: {
        // 项目外包相关字段
        sowSummary: { type: 'string', description: 'SOW范围摘要' },
        deliverables: { type: 'string', description: '关键交付物清单' },
        acceptanceCriteria: { type: 'string', description: '最终验收标准' },
        acceptanceFlow: { type: 'string', description: '验收流程' },
        changeManagementFlow: { type: 'string', description: '范围变更流程' },
        milestones: {
          type: 'array',
          description: '项目里程碑数组（PROJECT_OUTSOURCING必须返回）',
          items: {
            type: 'object',
            properties: {
              sequence: { type: 'integer', description: '里程碑顺序（从1开始）' },
              name: { type: 'string', description: '里程碑名称' },
              deliverables: { type: 'string', description: '交付物' },
              amount: { type: 'string', description: '里程碑金额（纯数字字符串，不带¥或逗号，如"300000"）' },
              paymentPercentage: { type: 'string', description: '付款百分比（纯数字字符串，不带%符号，如"30"）' },
              plannedDate: { type: 'string', format: 'date', description: '计划完成日期' },
              actualDate: { type: 'string', format: 'date', description: '实际完成日期' },
              acceptanceCriteria: { type: 'string', description: '验收标准' },
              status: {
                type: 'string',
                enum: ['PENDING', 'IN_PROGRESS', 'DELIVERED', 'ACCEPTED', 'REJECTED'],
                description: '里程碑状态（必须使用这些枚举值）',
              },
            },
          },
        },
        // 人力框架相关字段
        estimatedTotalHours: { type: 'integer', description: '预计总工时' },
        monthlyHoursCap: { type: 'integer', description: '每月工时上限' },
        yearlyHoursCap: { type: 'integer', description: '每年工时上限' },
        settlementCycle: { type: 'string', description: '结算周期' },
        timesheetApprovalFlow: { type: 'string', description: '工时审批流程' },
        adjustmentMechanism: { type: 'string', description: '工时调整机制' },
        staffReplacementFlow: { type: 'string', description: '人员更换流程' },
        rateItems: {
          type: 'array',
          description: '人力费率数组',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', description: '人员级别/角色' },
              rateType: { type: 'string', enum: ['HOURLY', 'DAILY', 'MONTHLY'] },
              rate: { type: 'string', description: '费率（纯数字字符串，不带¥或逗号，如"800"）' },
              rateEffectiveFrom: { type: 'string', format: 'date', description: '费率生效开始日期' },
              rateEffectiveTo: { type: 'string', format: 'date', description: '费率生效结束日期' },
            },
          },
        },
        // 产品购销相关字段
        deliveryContent: { type: 'string', description: '交付内容' },
        deliveryDate: { type: 'string', format: 'date', description: '交付日期' },
        deliveryLocation: { type: 'string', description: '交付地点' },
        shippingResponsibility: { type: 'string', description: '运输与保险责任' },
        ipOwnership: { type: 'string', description: '知识产权归属' },
        warrantyPeriod: { type: 'string', description: '保修期' },
        afterSalesTerms: { type: 'string', description: '售后服务条款' },
        lineItems: {
          type: 'array',
          description: '产品清单数组',
          items: {
            type: 'object',
            properties: {
              productName: { type: 'string', description: '产品名称' },
              specification: { type: 'string', description: '规格与配置' },
              quantity: { type: 'integer', description: '数量' },
              unit: { type: 'string', description: '单位' },
              unitPriceWithTax: { type: 'string', description: '含税单价（纯数字字符串，不带¥或逗号）' },
              unitPriceWithoutTax: { type: 'string', description: '不含税单价（纯数字字符串）' },
              subtotal: { type: 'string', description: '小计（纯数字字符串）' },
            },
          },
        },
      },
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
