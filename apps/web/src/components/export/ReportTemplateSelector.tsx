import { useState } from 'react';

export type ReportType = 'financial' | 'delivery' | 'sales' | 'contract' | 'customer';
export type ReportFormat = 'excel' | 'pdf';
export type ReportPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

interface ReportTemplate {
  id: string;
  type: ReportType;
  name: string;
  description: string;
  format: ReportFormat;
  period: ReportPeriod;
  sections: string[];
  preview?: string;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'financial-monthly',
    type: 'financial',
    name: '月度财务报表',
    description: '每月收入、成本、利润汇总',
    format: 'excel',
    period: 'monthly',
    sections: ['概览', '收入明细', '成本分析', '利润表', '现金流'],
  },
  {
    id: 'financial-quarterly',
    type: 'financial',
    name: '季度财务报表',
    description: '季度财务分析报告',
    format: 'pdf',
    period: 'quarterly',
    sections: ['财务概览', '同比分析', '环比分析', '趋势图表', '预测'],
  },
  {
    id: 'delivery-progress',
    type: 'delivery',
    name: '交付进度报表',
    description: '项目交付状态和进度跟踪',
    format: 'excel',
    period: 'monthly',
    sections: ['项目列表', '进度概览', '里程碑状态', '风险预警'],
  },
  {
    id: 'sales-performance',
    type: 'sales',
    name: '销售业绩报表',
    description: '销售数据和转化率分析',
    format: 'excel',
    period: 'monthly',
    sections: ['销售汇总', '客户分析', '产品分析', '漏斗分析'],
  },
  {
    id: 'sales-forecast',
    type: 'sales',
    name: '销售预测报表',
    description: '基于历史数据的销售预测',
    format: 'pdf',
    period: 'quarterly',
    sections: ['历史趋势', '预测模型', '季节性分析', '建议'],
  },
  {
    id: 'contract-summary',
    type: 'contract',
    name: '合同汇总报表',
    description: '合同签署和执行情况',
    format: 'excel',
    period: 'monthly',
    sections: ['新增合同', '执行中', '已完成', '即将到期'],
  },
  {
    id: 'customer-analysis',
    type: 'customer',
    name: '客户分析报表',
    description: '客户结构和价值分析',
    format: 'pdf',
    period: 'quarterly',
    sections: ['客户分布', '价值分级', '流失分析', '增长机会'],
  },
];

interface ReportTemplateSelectorProps {
  selectedType?: ReportType;
  onTemplateSelect?: (template: ReportTemplate) => void;
  excludeTypes?: ReportType[];
}

export function ReportTemplateSelector({
  selectedType,
  onTemplateSelect,
  excludeTypes = [],
}: ReportTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  const filteredTemplates = REPORT_TEMPLATES.filter(
    (t) => !excludeTypes.includes(t.type) && (!selectedType || t.type === selectedType)
  );

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<ReportType, ReportTemplate[]>);

  const handleSelectTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    onTemplateSelect?.(template);
  };

  const getTypeLabel = (type: ReportType) => {
    const labels: Record<ReportType, string> = {
      financial: '财务报表',
      delivery: '交付报表',
      sales: '销售报表',
      contract: '合同报表',
      customer: '客户报表',
    };
    return labels[type];
  };

  const getTypeIcon = (type: ReportType) => {
    const icons: Record<ReportType, string> = {
      financial: '💰',
      delivery: '🚀',
      sales: '📈',
      contract: '📄',
      customer: '👥',
    };
    return icons[type];
  };

  const getFormatIcon = (format: ReportFormat) => {
    return format === 'excel' ? '📊' : '📑';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>报表模板</h3>
        <span style={styles.subtitle}>选择报表模板开始生成</span>
      </div>

      <div style={styles.templatesList}>
        {Object.entries(groupedTemplates).map(([type, templates]) => (
          <div key={type} style={styles.typeGroup}>
            <div style={styles.typeHeader}>
              <span style={styles.typeIcon}>{getTypeIcon(type as ReportType)}</span>
              <span style={styles.typeLabel}>{getTypeLabel(type as ReportType)}</span>
            </div>
            <div style={styles.templatesGrid}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  style={{
                    ...styles.templateCard,
                    ...(selectedTemplate?.id === template.id && styles.templateCardSelected),
                  }}
                >
                  <div style={styles.templateHeader}>
                    <div style={styles.templateInfo}>
                      <span style={styles.templateName}>{template.name}</span>
                      <span style={styles.templateDescription}>{template.description}</span>
                    </div>
                    <span style={styles.templateFormat}>
                      {getFormatIcon(template.format)}
                    </span>
                  </div>
                  <div style={styles.templateMeta}>
                    <span style={styles.templatePeriod}>
                      {template.period === 'monthly' && '月度'}
                      {template.period === 'quarterly' && '季度'}
                      {template.period === 'yearly' && '年度'}
                    </span>
                    <span style={styles.templateSections}>
                      {template.sections.length} 个部分
                    </span>
                  </div>
                  <div style={styles.templateSectionsList}>
                    {template.sections.slice(0, 3).map((section, index) => (
                      <span key={index} style={styles.sectionTag}>
                        {section}
                      </span>
                    ))}
                    {template.sections.length > 3 && (
                      <span style={styles.sectionTag}>
                        +{template.sections.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📋</div>
          <div style={styles.emptyText}>没有可用的报表模板</div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  templatesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  typeGroup: {},
  typeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  typeIcon: {
    fontSize: '20px',
  },
  typeLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  templateCard: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  templateCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    boxShadow: '0 0 0 2px #3b82f6',
  },
  templateHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '4px',
  },
  templateDescription: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
  },
  templateFormat: {
    fontSize: '18px',
  },
  templateMeta: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
    fontSize: '12px',
  },
  templatePeriod: {
    color: '#6b7280',
  },
  templateSections: {
    color: '#6b7280',
  },
  templateSectionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  sectionTag: {
    padding: '2px 8px',
    fontSize: '11px',
    color: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderRadius: '4px',
  },
  empty: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};

export default ReportTemplateSelector;
