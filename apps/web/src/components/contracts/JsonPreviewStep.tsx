import { useState } from 'react';

interface JsonPreviewStepProps {
  data: any;
  onBack: () => void;
  onContinue: () => void;
}

// InfoType 枚举定义
enum InfoType {
  BASIC_INFO = 'basic_info',
  FINANCIAL = 'financial',
  MILESTONES = 'milestones',
  RATE_ITEMS = 'rate_items',
  LINE_ITEMS = 'line_items',
  RISK_CLAUSES = 'risk_clauses',
  DELIVERABLES = 'deliverables',
  TIME_INFO = 'time_info',
}

// InfoType 显示名称和图标
const INFO_TYPE_CONFIG: Record<InfoType, { name: string; icon: string; color: string }> = {
  [InfoType.BASIC_INFO]: { name: '基本信息', icon: '📋', color: '#3b82f6' },
  [InfoType.FINANCIAL]: { name: '财务信息', icon: '💰', color: '#10b981' },
  [InfoType.MILESTONES]: { name: '里程碑信息', icon: '🎯', color: '#f59e0b' },
  [InfoType.RATE_ITEMS]: { name: '人力费率', icon: '👥', color: '#8b5cf6' },
  [InfoType.LINE_ITEMS]: { name: '产品清单', icon: '📦', color: '#ec4899' },
  [InfoType.RISK_CLAUSES]: { name: '风险条款', icon: '⚠️', color: '#ef4444' },
  [InfoType.DELIVERABLES]: { name: '交付物信息', icon: '📤', color: '#06b6d4' },
  [InfoType.TIME_INFO]: { name: '时间信息', icon: '📅', color: '#6366f1' },
};

// 解析策略显示名称映射
const STRATEGY_NAMES: Record<string, string> = {
  DIRECT_USE: '程序解析（直接使用）',
  LLM_VALIDATION: 'LLM验证模式',
  LLM_FULL_EXTRACTION: 'LLM完整提取',
};

// 字段显示名称映射
const FIELD_LABELS: Record<string, string> = {
  // 基本信息
  contractNo: '合同编号',
  contractName: '合同名称',
  ourEntity: '供应商',
  customerName: '客户名称',
  status: '合同状态',
  // 财务信息
  amountWithTax: '含税金额',
  amountWithoutTax: '不含税金额',
  taxRate: '税率',
  currency: '货币',
  paymentMethod: '付款方式',
  paymentTerms: '付款条件',
  // 时间信息
  signedAt: '签订日期',
  effectiveAt: '生效日期',
  expiresAt: '到期日期',
  duration: '合同期限',
  // 其他信息
  salesPerson: '销售负责人',
  industry: '所属行业',
  signLocation: '签订地点',
  copies: '合同份数',
  // 里程碑字段
  sequence: '序号',
  name: '名称',
  deliverables: '交付物',
  amount: '金额',
  paymentPercentage: '付款比例',
  plannedDate: '计划日期',
  acceptanceCriteria: '验收标准',
  // 费率字段
  role: '角色',
  rateType: '费率类型',
  rate: '费率',
  rateEffectiveFrom: '费率生效日期',
  rateEffectiveTo: '费率失效日期',
  // 产品字段
  productName: '产品名称',
  specification: '规格型号',
  quantity: '数量',
  unit: '单位',
  unitPriceWithTax: '含税单价',
  unitPriceWithoutTax: '不含税单价',
  subtotal: '小计',
};

// 获取字段的显示标签
function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key;
}

// 格式化字段值显示
function formatFieldValue(key: string, value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (Array.isArray(value)) {
    return `(${value.length}项)`;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// InfoType 数据卡片组件
function InfoTypeCard({
  infoType,
  data,
}: {
  infoType: InfoType;
  data: any;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = INFO_TYPE_CONFIG[infoType];

  if (!data) {
    return null;
  }

  // 处理字符串类型数据（如交付物描述）
  if (typeof data === 'string') {
    if (!data.trim()) return null;
    return (
      <div style={styles.infoTypeCard}>
        <div
          style={styles.infoTypeCardHeader}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span style={styles.infoTypeIcon}>{config.icon}</span>
          <span style={styles.infoTypeName}>{config.name}</span>
          <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div style={styles.infoTypeCardContent}>
            <div style={styles.textFieldContainer}>
              <span style={styles.textFieldContent}>{data}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (typeof data === 'object' && Object.keys(data).length === 0) {
    return null;
  }

  // 处理数组类型数据（如里程碑、费率、产品）
  if (Array.isArray(data)) {
    if (data.length === 0) return null;

    return (
      <div style={styles.infoTypeCard}>
        <div
          style={styles.infoTypeCardHeader}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span style={styles.infoTypeIcon}>{config.icon}</span>
          <span style={styles.infoTypeName}>{config.name}</span>
          <span style={styles.infoTypeCount}>({data.length})</span>
          <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
        </div>
        {isExpanded && (
          <div style={styles.infoTypeCardContent}>
            {data.map((item: any, index: number) => (
              <div key={index} style={styles.arrayItem}>
                <div style={styles.arrayItemHeader}>
                  <span style={styles.arrayItemIndex}>#{index + 1}</span>
                </div>
                <div style={styles.arrayItemContent}>
                  {typeof item === 'object' && item !== null ? (
                    // 对象类型：显示所有字段
                    Object.entries(item).map(([key, value]) => (
                      <div key={key} style={styles.fieldRow}>
                        <span style={styles.fieldLabel}>{getFieldLabel(key)}:</span>
                        <span style={styles.fieldValue}>{formatFieldValue(key, value)}</span>
                      </div>
                    ))
                  ) : (
                    // 字符串或其他类型：直接显示内容
                    <div style={styles.textFieldContainer}>
                      <span style={styles.textFieldContent}>{String(item)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 处理对象类型数据
  const entries = Object.entries(data).filter(([_, value]) => value !== null && value !== undefined);
  if (entries.length === 0) return null;

  return (
    <div style={styles.infoTypeCard}>
      <div
        style={styles.infoTypeCardHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={styles.infoTypeIcon}>{config.icon}</span>
        <span style={styles.infoTypeName}>{config.name}</span>
        <span style={styles.infoTypeCount}>({entries.length})</span>
        <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div style={styles.infoTypeCardContent}>
          {entries.map(([key, value]) => (
            <div key={key} style={styles.fieldRow}>
              <span style={styles.fieldLabel}>{getFieldLabel(key)}:</span>
              <span style={styles.fieldValue}>{formatFieldValue(key, value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 按InfoType组织的数据展示组件
function InfoTypeDataDisplay({ extractedData }: { extractedData: any }) {
  if (!extractedData) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>📭</span>
        <span style={styles.emptyText}>暂无提取数据</span>
      </div>
    );
  }

  // 构建InfoType数据映射
  const infoTypeData: Array<{ type: InfoType; data: any }> = [];

  // 基本信息
  if (extractedData.basicInfo) {
    infoTypeData.push({ type: InfoType.BASIC_INFO, data: extractedData.basicInfo });
  }

  // 财务信息
  if (extractedData.financialInfo) {
    infoTypeData.push({ type: InfoType.FINANCIAL, data: extractedData.financialInfo });
  }

  // 时间信息
  if (extractedData.timeInfo) {
    infoTypeData.push({ type: InfoType.TIME_INFO, data: extractedData.timeInfo });
  }

  // 里程碑信息
  if (extractedData.typeSpecificDetails?.milestones) {
    infoTypeData.push({
      type: InfoType.MILESTONES,
      data: extractedData.typeSpecificDetails.milestones,
    });
  }

  // 人力费率
  if (extractedData.typeSpecificDetails?.rateItems) {
    infoTypeData.push({
      type: InfoType.RATE_ITEMS,
      data: extractedData.typeSpecificDetails.rateItems,
    });
  }

  // 产品清单
  if (extractedData.typeSpecificDetails?.lineItems) {
    infoTypeData.push({
      type: InfoType.LINE_ITEMS,
      data: extractedData.typeSpecificDetails.lineItems,
    });
  }

  // 交付物信息
  if (extractedData.typeSpecificDetails?.deliverables) {
    infoTypeData.push({
      type: InfoType.DELIVERABLES,
      data: extractedData.typeSpecificDetails.deliverables,
    });
  }

  // 风险条款
  if (extractedData.typeSpecificDetails?.riskClauses) {
    infoTypeData.push({
      type: InfoType.RISK_CLAUSES,
      data: extractedData.typeSpecificDetails.riskClauses,
    });
  }

  if (infoTypeData.length === 0) {
    return (
      <div style={styles.emptyState}>
        <span style={styles.emptyIcon}>📭</span>
        <span style={styles.emptyText}>暂无提取数据</span>
      </div>
    );
  }

  return (
    <div style={styles.infoTypeGrid}>
      {infoTypeData.map(({ type, data }) => (
        <InfoTypeCard key={type} infoType={type} data={data} />
      ))}
    </div>
  );
}

// JSON 语法高亮组件
function JsonSyntaxHighlight({ data }: { data: any }) {
  const jsonString = JSON.stringify(data, null, 2);

  // 简单的语法高亮
  const highlightJson = (json: string): string => {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(?:u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
        let cls = 'json-string';
        if (/:$/.test(match)) {
          cls = 'json-key';
        }
        return `<span class="${cls}">${match}</span>`;
      })
      .replace(/\b(true|false|null)\b/g, (match) => {
        return `<span class="json-boolean">${match}</span>`;
      })
      .replace(/\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, (match) => {
        return `<span class="json-number">${match}</span>`;
      });
  };

  return (
    <pre
      style={{
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        padding: '16px',
        borderRadius: '8px',
        overflow: 'auto',
        maxHeight: '400px',
        fontSize: '13px',
        lineHeight: '1.5',
        margin: 0,
      }}
    >
      <code
        dangerouslySetInnerHTML={{
          __html: highlightJson(jsonString),
        }}
      />
    </pre>
  );
}

// 可折叠的JSON节点
function JsonNode({ data, name = '' }: { data: any; name?: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (data === null) {
    return (
      <span style={{ color: '#808080' }}>
        {name && <span style={{ color: '#9cdcfe' }}>{name}</span>}
        <span style={{ color: '#808080' }}>null</span>
      </span>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <span>
        {name && <span style={{ color: '#9cdcfe' }}>{name}: </span>}
        <span style={{ color: '#569cd6' }}>{String(data)}</span>
      </span>
    );
  }

  if (typeof data === 'number') {
    return (
      <span>
        {name && <span style={{ color: '#9cdcfe' }}>{name}: </span>}
        <span style={{ color: '#b5cea8' }}>{String(data)}</span>
      </span>
    );
  }

  if (typeof data === 'string') {
    return (
      <span>
        {name && <span style={{ color: '#9cdcfe' }}>{name}: </span>}
        <span style={{ color: '#ce9178' }}>"{data}"</span>
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <span>
          {name && <span style={{ color: '#9cdcfe' }}>{name}: </span>}
          <span>[]</span>
        </span>
      );
    }

    return (
      <div style={{ marginLeft: name ? '16px' : '0' }}>
        {name && (
          <span
            style={{ color: '#9cdcfe', cursor: 'pointer' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {name}:{' '}
          </span>
        )}
        <span
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▼ [' : '▶ ['}
          {data.length}
          {isExpanded ? ']' : ']'}
        </span>
        {isExpanded && (
          <div style={{ marginLeft: '16px' }}>
            {data.map((item, index) => (
              <div key={index}>
                <JsonNode data={item} />
                {index < data.length - 1 && ','}
              </div>
            ))}
            ]</div>
        )}
      </div>
    );
  }

  // Object
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return (
      <span>
        {name && <span style={{ color: '#9cdcfe' }}>{name}: </span>}
        <span>{'{}'}</span>
      </span>
    );
  }

  return (
    <div style={{ marginLeft: name ? '16px' : '0' }}>
      {name && (
        <span
          style={{ color: '#9cdcfe', cursor: 'pointer' }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {name}:{' '}
        </span>
      )}
      <span
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '▼ {' : '▶ {'}
      </span>
      {isExpanded && (
        <div style={{ marginLeft: '16px' }}>
          {keys.map((key, index) => (
            <div key={key}>
              <JsonNode data={data[key]} name={key} />
              {index < keys.length - 1 && ','}
            </div>
          ))}
          {'}}'}
        </div>
      )}
    </div>
  );
}

export function JsonPreviewStep({ data, onBack, onContinue }: JsonPreviewStepProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 提取要显示的摘要信息
  const summary = {
    success: data?.success ?? false,
    llmModel: data?.llmModel,
    llmProvider: data?.llmProvider,
    strategyUsed: data?.strategyUsed,
    processingTimeMs: data?.processingTimeMs,
    llmTokensUsed: data?.llmTokensUsed,
    hybridStrategy: data?.hybridStrategy,
    completenessScore: data?.completenessScore,
    warnings: data?.warnings,
  };

  const strategyName = summary.strategyUsed
    ? STRATEGY_NAMES[summary.strategyUsed] || summary.strategyUsed
    : '未知';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>AI解析结果预览</h2>
        <button onClick={onBack} style={styles.closeButton}>
          ×
        </button>
      </div>

      {/* 解析摘要 */}
      <div style={styles.summarySection}>
        <h3 style={styles.sectionTitle}>📊 解析摘要</h3>
        <div style={styles.summaryGrid}>
          {summary.llmProvider && (
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>提供商:</span>
              <span style={styles.summaryValue}>{summary.llmProvider}</span>
            </div>
          )}
          {summary.llmModel && (
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>模型:</span>
              <span style={styles.summaryValue}>{summary.llmModel}</span>
            </div>
          )}
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>策略:</span>
            <span style={styles.summaryValue}>{strategyName}</span>
          </div>
          {summary.processingTimeMs && (
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>处理时间:</span>
              <span style={styles.summaryValue}>
                {(summary.processingTimeMs / 1000).toFixed(1)}秒
              </span>
            </div>
          )}
          {summary.llmTokensUsed && (
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>使用Token:</span>
              <span style={styles.summaryValue}>
                {summary.llmTokensUsed.toLocaleString()}
              </span>
            </div>
          )}
          {summary.hybridStrategy?.programParseScore !== undefined && (
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>程序解析得分:</span>
              <span style={styles.summaryValue}>
                {summary.hybridStrategy.programParseScore}/100
              </span>
            </div>
          )}
          {data?.extractedData?.metadata?.overallConfidence && (
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>整体置信度:</span>
              <span style={styles.summaryValue}>
                {(data.extractedData.metadata.overallConfidence * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {summary.warnings && summary.warnings.length > 0 && (
          <div style={styles.warnings}>
            {summary.warnings.map((warning: string, index: number) => (
              <div key={index} style={styles.warningItem}>
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 按InfoType分类的数据展示 */}
      <div style={styles.infoTypeSection}>
        <h3 style={styles.sectionTitle}>📁 提取数据（按类型分类）</h3>
        <InfoTypeDataDisplay extractedData={data?.extractedData} />
      </div>

      {/* JSON 数据展示 */}
      <div style={styles.jsonSection}>
        <div style={styles.jsonHeader}>
          <h3 style={styles.sectionTitle}>📄 完整JSON数据</h3>
          <button
            onClick={handleCopy}
            style={{
              ...styles.iconButton,
              backgroundColor: copied ? '#10b981' : '#374151',
            }}
          >
            {copied ? '✓ 已复制' : '📋 复制'}
          </button>
        </div>
        <JsonSyntaxHighlight data={data} />
      </div>

      {/* 操作按钮 */}
      <div style={styles.actions}>
        <button onClick={onBack} style={styles.cancelButton}>
          ← 返回修改
        </button>
        <button onClick={onContinue} style={styles.continueButton}>
          继续检查重复 →
        </button>
      </div>

      {/* CSS Styles for syntax highlighting */}
      <style>{`
        .json-key {
          color: #9cdcfe;
        }
        .json-string {
          color: #ce9178;
        }
        .json-number {
          color: #b5cea8;
        }
        .json-boolean {
          color: #569cd6;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  summarySection: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#374151',
    margin: 0,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 600,
  },
  warnings: {
    marginTop: '12px',
  },
  warningItem: {
    padding: '8px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '6px',
    fontSize: '13px',
    marginTop: '8px',
    '&:first-child': { marginTop: 0 },
  } as any,
  jsonSection: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  jsonHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  iconButton: {
    padding: '8px 16px',
    fontSize: '13px',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '20px 24px',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    color: '#374151',
  },
  continueButton: {
    padding: '10px 20px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    cursor: 'pointer',
  },
  // InfoType 数据展示样式
  infoTypeSection: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  infoTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  infoTypeCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  infoTypeCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    userSelect: 'none',
  },
  infoTypeIcon: {
    fontSize: '16px',
  },
  infoTypeName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    flex: 1,
  },
  infoTypeCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  expandIcon: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  infoTypeCardContent: {
    padding: '12px 16px',
    backgroundColor: '#fff',
  },
  fieldRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  fieldLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  fieldValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: 600,
    textAlign: 'right',
    wordBreak: 'break-word',
  },
  textFieldContainer: {
    padding: '8px 0',
  },
  textFieldContent: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  arrayItem: {
    marginBottom: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  arrayItemHeader: {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  arrayItemIndex: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#3b82f6',
  },
  arrayItemContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
  },
};

export default JsonPreviewStep;
